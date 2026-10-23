"use client";

import { useEffect, useState } from "react";

export type KioskFlagName = "dispenseIssue" | "landingShop";

const ENDPOINTS: Record<KioskFlagName, { url: string; field: string }> = {
  dispenseIssue: { url: "/api/admin/dispense-issue", field: "issueEnabled" },
  landingShop: { url: "/api/admin/landing-shop", field: "shopEnabled" },
};

const STORE_VERSION = 3;

type FlagEntry = {
  value: boolean;
  done: boolean;
  inFlight: Promise<boolean> | null;
  listeners: Set<(value: boolean) => void>;
};

type FlagStore = Record<KioskFlagName, FlagEntry>;

type FlagGlobal = {
  __lwKioskFlagStore?: FlagStore;
  __lwKioskFlagStoreVersion?: number;
};

function createEntry(): FlagEntry {
  return {
    value: false,
    done: false,
    inFlight: null,
    listeners: new Set(),
  };
}

function getStore(): FlagStore {
  const g = globalThis as typeof globalThis & FlagGlobal;
  if (g.__lwKioskFlagStoreVersion !== STORE_VERSION) {
    const prev = g.__lwKioskFlagStore as Record<string, { timer?: number | null }> | undefined;
    if (prev) {
      Object.values(prev).forEach((entry) => {
        if (entry?.timer != null) window.clearInterval(entry.timer);
      });
    }
    g.__lwKioskFlagStore = {
      dispenseIssue: createEntry(),
      landingShop: createEntry(),
    };
    g.__lwKioskFlagStoreVersion = STORE_VERSION;
  }
  return g.__lwKioskFlagStore as FlagStore;
}

async function pullFlagOnce(name: KioskFlagName): Promise<boolean> {
  const entry = getStore()[name];
  if (entry.done) return entry.value;
  if (entry.inFlight) return entry.inFlight;

  const spec = ENDPOINTS[name];
  entry.inFlight = (async () => {
    try {
      const res = await fetch(spec.url, { cache: "no-store" });
      const json = await res.json();
      const next = Boolean(json?.[spec.field]);
      const changed = next !== entry.value;
      entry.value = next;
      if (changed) {
        entry.listeners.forEach((listener) => listener(next));
      }
      return next;
    } catch {
      return entry.value;
    } finally {
      entry.done = true;
      entry.inFlight = null;
    }
  })();

  return entry.inFlight;
}

export function subscribeKioskFlag(
  name: KioskFlagName,
  listener: (value: boolean) => void
): () => void {
  const entry = getStore()[name];
  entry.listeners.add(listener);
  listener(entry.value);
  void pullFlagOnce(name);

  return () => {
    entry.listeners.delete(listener);
  };
}

export function useKioskAdminFlag(name: KioskFlagName): boolean {
  const [value, setValue] = useState(() => getStore()[name].value);
  useEffect(() => subscribeKioskFlag(name, setValue), [name]);
  return value;
}
