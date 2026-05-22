"use client";

import { useEffect, useRef } from "react";

/**
 * Fires once on app startup to sync slot discounts from the external API.
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

  return null;
}
