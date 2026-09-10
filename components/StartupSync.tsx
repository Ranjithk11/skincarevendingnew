"use client";

import { useEffect, useRef } from "react";

/** Poll every 5 minutes so 9 AM / 6 PM IST inventory webhooks can fire while the kiosk is on. */
const MORNING_INVENTORY_TICK_MS = 5 * 60 * 1000;

/**
 * Fires once on app startup to sync slot discounts from the external API.
 * Also periodically ticks the 9 AM + 6 PM IST 60-slot inventory webhook scheduler.
 * No UI rendered.
 */
export default function StartupSync() {
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    fetch("/api/admin/slots/sync-discounts", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log(`[StartupSync] Discounts synced: ${data.updated} updated, ${data.skipped} skipped`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const tickMorningInventory = () => {
      fetch("/api/cron/morning-slot-inventory", { cache: "no-store" }).catch(() => {});
    };

    // Immediate check (covers restart after a schedule window), then every 5 minutes.
    tickMorningInventory();
    const id = window.setInterval(tickMorningInventory, MORNING_INVENTORY_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
