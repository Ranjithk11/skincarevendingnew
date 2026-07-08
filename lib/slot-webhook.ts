// Centralized helpers for pushing vending-machine slot state to the
// slot-update webhook (Make.com).
//
// Responsibilities:
//  1. sendAllSlotsUpdate() – send the FULL slot map on every change
//     (assign / remove / quantity update / manual sync).
//  2. maybeDailyFullSync() – guarantee the full slot map is pushed at least
//     once per calendar day, even when nothing was changed. The last-sent date
//     is persisted in app_settings so restarts / concurrent requests do not
//     cause duplicate daily sends.
//
// All work is best-effort: failures are logged and never bubble up to the
// admin flow. On Vercel (no SQLite) everything is a no-op.

import { sendSlotUpdateWebhook } from "@/utils/webhook";

const IS_VERCEL = process.env.VERCEL === "1";

const DAILY_SYNC_SETTING_KEY = "slot_webhook_last_full_sync";

/** Map the raw DB slot map into the webhook slot payload shape. */
function mapSlots(allSlots: Record<number, any>) {
  return Object.values(allSlots || {}).map((slot: any) => ({
    slot_id: slot.slot_id,
    product_id: slot.product_id,
    product_name: slot.product_name,
    category: slot.category,
    retail_price: slot.retail_price,
    discount_value: slot.discount_value,
    image_url: slot.image_url,
    quantity: slot.quantity,
    last_updated: slot.last_updated,
  }));
}

/**
 * Send the complete set of slots to the webhook. Called on every slot change
 * so Make.com always receives the full, current inventory picture together
 * with which slot(s) triggered the update.
 */
export async function sendAllSlotsUpdate(
  affectedSlotIds: number[] = [],
  updateType: string = "slot_assignment"
): Promise<void> {
  if (IS_VERCEL) return;
  try {
    const { adminDb } = await import("@/lib/admin-db");
    const { sqliteDb } = await import("@/lib/sqlite-db");

    const slots = mapSlots(adminDb.getAllSlots());
    const machineLocation =
      sqliteDb.getMachineLocation() ||
      process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
      "LeafWater Vending Machine";
    const machineName =
      sqliteDb.getMachineName() ||
      process.env.NEXT_PUBLIC_MACHINE_NAME ||
      "Vending Machine";
    const machineId =
      sqliteDb.getMachineId() ||
      process.env.NEXT_PUBLIC_MACHINE_ID ||
      "";

    await sendSlotUpdateWebhook({
      slots,
      updateType,
      affectedSlotIds,
      timestamp: new Date().toISOString(),
      machineLocation,
      machineName,
      machineId,
    });
    console.log(
      `[slot-webhook] Sent ${slots.length} slots (${updateType}) affected=[${affectedSlotIds.join(",")}]`
    );
  } catch (error) {
    console.error("[slot-webhook] sendAllSlotsUpdate error:", error);
  }
}

let dailySyncInFlight = false;

/** Local YYYY-MM-DD date string used as the once-per-day key. */
function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Push the full slot map to the webhook once per calendar day. Safe to call on
 * every request (e.g. from GET /api/admin/slots which the machine polls
 * regularly) – it only actually sends when a new day has started.
 */
export async function maybeDailyFullSync(): Promise<void> {
  if (IS_VERCEL || dailySyncInFlight) return;
  try {
    const { sqliteDb } = await import("@/lib/sqlite-db");
    const today = todayKey();
    const last = sqliteDb.getSetting(DAILY_SYNC_SETTING_KEY);
    if (last === today) return;

    // Reserve today's slot up-front so overlapping requests don't double-send.
    dailySyncInFlight = true;
    sqliteDb.setSetting(
      DAILY_SYNC_SETTING_KEY,
      today,
      "Last date the full slot map was pushed to the slot-update webhook"
    );

    await sendAllSlotsUpdate([], "daily_full_sync");
    console.log(`[slot-webhook] Daily full sync sent for ${today}`);
  } catch (error) {
    console.error("[slot-webhook] maybeDailyFullSync error:", error);
  } finally {
    dailySyncInFlight = false;
  }
}
