const JOURNEY_KEY = "kiosk_journey";
export const SCAN_OFFER_PERCENT = 10;

export type KioskJourneyPath = "scan" | "direct";
export type KioskJourneySource =
  | "landing_scan"
  | "catalog"
  | "slots"
  | "report"
  | "post_dispense_crosssell";

export type KioskJourneyProfile = {
  name?: string;
  email?: string;
  phone?: string;
};

export type KioskJourney = {
  journeyId: string;
  path: KioskJourneyPath;
  source: KioskJourneySource;
  scanId?: string;
  bundleId?: string;
  offerPending: boolean;
  offerClaimed: boolean;
  offerPercent: number;
  dismissedBridge: boolean;
  profile?: KioskJourneyProfile;
  startedAt: number;
  scanCompletedAt?: number;
};

export type KioskJourneyWebhook = {
  journey_id: string;
  path: KioskJourneyPath;
  source: KioskJourneySource;
  scan_id: string;
  bundle_id: string;
  offer: string;
  offer_claimed: boolean;
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function readJourney(): KioskJourney | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(JOURNEY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KioskJourney;
    if (!parsed?.journeyId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeJourney(next: KioskJourney): KioskJourney {
  if (canUseStorage()) {
    try {
      window.sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }
  return next;
}

export function getJourney(): KioskJourney | null {
  return readJourney();
}

export function patchJourney(partial: Partial<KioskJourney>): KioskJourney | null {
  const current = readJourney();
  if (!current) {
    if (!partial.path || !partial.source) return null;
    return beginKioskJourney(partial.path, partial.source, partial);
  }
  return writeJourney({ ...current, ...partial });
}

export function beginKioskJourney(
  path: KioskJourneyPath,
  source: KioskJourneySource,
  extras?: Partial<KioskJourney>
): KioskJourney {
  const next: KioskJourney = {
    journeyId: newId("jny"),
    offerPending: false,
    offerClaimed: false,
    offerPercent: SCAN_OFFER_PERCENT,
    dismissedBridge: false,
    startedAt: Date.now(),
    ...extras,
    path,
    source,
  };
  return writeJourney(next);
}

/** Catalog / slots visitor taps the Direct-to-Scan bridge. */
export function beginScanFromDirect(): KioskJourney {
  const current = readJourney();
  if (!current) {
    return beginKioskJourney("direct", "catalog", { offerPending: true });
  }
  return writeJourney({
    ...current,
    path: current.scanCompletedAt ? "scan" : "direct",
    offerPending: true,
    dismissedBridge: false,
  });
}

/** Back from questionnaire / selfie before a scan actually finished. */
export function restoreBrowseIfScanAbandoned(): KioskJourney | null {
  const current = readJourney();
  if (!current) return null;
  if (current.scanCompletedAt || current.offerClaimed) return current;
  if (current.source !== "catalog" && current.source !== "slots") return current;
  if (current.path !== "scan") return current;
  return writeJourney({
    ...current,
    path: "direct",
    dismissedBridge: false,
  });
}

export function dismissDirectToScanBridge(): void {
  patchJourney({ dismissedBridge: true });
}

export function setJourneyProfile(profile: KioskJourneyProfile): void {
  const current = readJourney();
  patchJourney({
    profile: {
      ...(current?.profile || {}),
      ...profile,
    },
  });
}

export function setJourneyBundleId(bundleId: string | null | undefined): void {
  patchJourney({ bundleId: bundleId || "" });
}

export function setJourneySource(source: KioskJourneySource): void {
  patchJourney({ source });
}

export function markScanCompleted(input?: {
  scanId?: string;
  concerns?: string[];
}): string {
  const current = readJourney() || beginKioskJourney("scan", "landing_scan");
  const scanId = input?.scanId || current.scanId || newId("scan");
  writeJourney({
    ...current,
    path: "scan",
    scanId,
    scanCompletedAt: Date.now(),
    offerPending: false,
    offerClaimed: Boolean(current.offerPending || current.offerClaimed),
  });
  return scanId;
}

export function isScanOfferClaimed(): boolean {
  return Boolean(readJourney()?.offerClaimed);
}

export function shouldShowDirectToScanBridge(): boolean {
  const journey = readJourney();
  if (!journey) return true;
  if (journey.scanCompletedAt || journey.offerClaimed) return false;
  if (journey.path === "direct") return true;
  // Unfinished scan started from slots/products — show the invite again on back.
  return (
    journey.path === "scan" &&
    (journey.source === "catalog" || journey.source === "slots")
  );
}

export function getScanOfferDiscount(subtotal: number): number {
  if (!isScanOfferClaimed()) return 0;
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return Math.round(subtotal * (SCAN_OFFER_PERCENT / 100));
}

export function toJourneyWebhook(
  journey?: KioskJourney | null
): KioskJourneyWebhook | null {
  const j = journey ?? readJourney();
  if (!j) return null;
  return {
    journey_id: j.journeyId,
    path: j.path,
    source: j.source,
    scan_id: j.scanId || "",
    bundle_id: j.bundleId || "",
    offer: j.offerClaimed ? `scan_bridge_${j.offerPercent}` : "",
    offer_claimed: Boolean(j.offerClaimed),
  };
}

export function stampCheckoutSummary<T extends Record<string, unknown>>(
  summary: T
): T & {
  journey: KioskJourneyWebhook | null;
  source: string;
  slot: string | number | "";
  slots: Array<string | number>;
  bundle_id: string;
  scan_id: string;
  journey_id: string;
} {
  const journey = toJourneyWebhook();
  const rawItems = (summary as unknown as { items?: unknown }).items;
  const items = Array.isArray(rawItems) ? rawItems : [];
  const slots = items
    .map((item) => {
      if (!item || typeof item !== "object") return undefined;
      return (item as { slotId?: string | number }).slotId;
    })
    .filter((slot): slot is string | number => slot !== undefined && slot !== "");
  return {
    ...summary,
    journey,
    source: journey?.source || "",
    slot: slots[0] ?? "",
    slots,
    bundle_id: journey?.bundle_id || "",
    scan_id: journey?.scan_id || "",
    journey_id: journey?.journey_id || "",
  };
}

export function clearKioskJourney(): void {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(JOURNEY_KEY);
  } catch {
    /* ignore */
  }
}
