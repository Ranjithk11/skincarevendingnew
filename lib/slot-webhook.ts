// Centralized helpers for pushing vending-machine slot state to Make.com.
//
// Same inventory webhook for:
//  1. Every slot assign / remove / quantity change (full 60-slot map)
//  2. Scheduled snapshots at 9:00 AM IST and 6:00 PM IST (full 60 slots)
//
// All work is best-effort: failures are logged and never bubble up to the
// admin flow. On Vercel (no SQLite) everything is a no-op.

import {
  getMorningSlotInventoryWebhookUrl,
  sendSlotUpdateWebhook,
} from "@/utils/webhook";

const IS_VERCEL = process.env.VERCEL === "1";

const DAILY_SYNC_SETTING_KEY = "slot_webhook_last_full_sync";
/** Tracks IST date+window already sent, e.g. "2026-09-10:am" / "2026-09-10:pm". */
const SCHEDULED_INVENTORY_SETTING_KEY = "slot_webhook_inventory_ist_window";
const TOTAL_SLOTS = 60;
const MORNING_SYNC_HOUR_IST = 9;
const EVENING_SYNC_HOUR_IST = 18;

/** Map a single DB slot row into the webhook slot payload shape. */
function mapSlot(slot: any, slotId: number) {
  return {
    slot_id: slotId,
    product_id: slot?.product_id ?? null,
    product_name: slot?.product_name || "",
    category: slot?.category || "",
    retail_price: slot?.retail_price ?? null,
    discount_value: slot?.discount_value ?? null,
    image_url: slot?.image_url || "",
    quantity: Number(slot?.quantity) || 0,
    last_updated: slot?.last_updated || null,
  };
}

/** Always emit slots 1..60 so Make receives a full machine picture. */
function mapAllSixtySlots(allSlots: Record<number, any>) {
  const slots = [];
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    slots.push(mapSlot(allSlots?.[i], i));
  }
  return slots;
}

function mapSlots(allSlots: Record<number, any>) {
  return mapAllSixtySlots(allSlots);
}

async function resolveMachineMeta() {
  const { sqliteDb } = await import("@/lib/sqlite-db");
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
  return { machineLocation, machineName, machineId };
}

function inventoryWebhookUrl() {
  return getMorningSlotInventoryWebhookUrl();
}

/**
 * Send the complete set of slots to the inventory webhook.
 * Called on every slot assign / remove / quantity update / manual sync.
 */
export async function sendAllSlotsUpdate(
  affectedSlotIds: number[] = [],
  updateType: string = "slot_assignment"
): Promise<boolean> {
  if (IS_VERCEL) return false;
  try {
    const { adminDb } = await import("@/lib/admin-db");
    const slots = mapSlots(adminDb.getAllSlots());
    const { machineLocation, machineName, machineId } = await resolveMachineMeta();
    const webhookUrl = inventoryWebhookUrl();

    const ok = await sendSlotUpdateWebhook({
      slots,
      updateType,
      affectedSlotIds,
      timestamp: new Date().toISOString(),
      machineLocation,
      machineName,
      machineId,
      webhookUrl,
    });

    console.log(
      `[slot-webhook] Sent ${slots.length} slots (${updateType}) affected=[${affectedSlotIds.join(",")}] ok=${ok} → ${webhookUrl}`
    );
    return ok;
  } catch (error) {
    console.error("[slot-webhook] sendAllSlotsUpdate error:", error);
    return false;
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

/** IST calendar date + clock parts (Asia/Kolkata). */
function getIstClock(now = new Date()): {
  dateKey: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "0";

  const hourRaw = Number(get("hour"));
  const hour = hourRaw === 24 ? 0 : hourRaw;

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute: Number(get("minute")),
  };
}

type ScheduleWindow = "am" | "pm";

function windowSettingKey(dateKey: string, window: ScheduleWindow) {
  return `${dateKey}:${window}`;
}

/**
 * Push the full slot map once per local calendar day (legacy daily sync).
 * Safe to call often — only sends when a new day has started.
 */
export async function maybeDailyFullSync(): Promise<void> {
  if (IS_VERCEL || dailySyncInFlight) return;
  try {
    const { sqliteDb } = await import("@/lib/sqlite-db");
    const today = todayKey();
    const last = sqliteDb.getSetting(DAILY_SYNC_SETTING_KEY);
    if (last === today) return;

    dailySyncInFlight = true;
    const ok = await sendAllSlotsUpdate([], "daily_full_sync");
    if (ok) {
      sqliteDb.setSetting(
        DAILY_SYNC_SETTING_KEY,
        today,
        "Last date the full slot map was pushed to the inventory webhook"
      );
      console.log(`[slot-webhook] Daily full sync sent for ${today}`);
    }
  } catch (error) {
    console.error("[slot-webhook] maybeDailyFullSync error:", error);
  } finally {
    dailySyncInFlight = false;
  }
}

let scheduledSyncInFlight = false;

async function sendScheduledWindow(
  dateKey: string,
  window: ScheduleWindow
): Promise<boolean> {
  const { sqliteDb } = await import("@/lib/sqlite-db");
  const settingVal = windowSettingKey(dateKey, window);
  const last = sqliteDb.getSetting(SCHEDULED_INVENTORY_SETTING_KEY);
  // Support multiple windows stored as comma-separated keys in one setting,
  // plus legacy single-date morning key.
  const sentSet = new Set(
    String(last || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (sentSet.has(settingVal) || (window === "am" && last === dateKey)) {
    return false;
  }

  const { adminDb } = await import("@/lib/admin-db");
  const slots = mapAllSixtySlots(adminDb.getAllSlots());
  const { machineLocation, machineName, machineId } = await resolveMachineMeta();
  const webhookUrl = inventoryWebhookUrl();
  const updateType =
    window === "am" ? "morning_inventory_sync" : "evening_inventory_sync";

  const ok = await sendSlotUpdateWebhook({
    slots,
    updateType,
    affectedSlotIds: [],
    timestamp: new Date().toISOString(),
    machineLocation,
    machineName,
    machineId,
    webhookUrl,
  });

  if (!ok) {
    console.warn(
      `[slot-webhook] Scheduled ${window.toUpperCase()} inventory sync FAILED for ${dateKey} — will retry`
    );
    return false;
  }

  sentSet.add(settingVal);
  // Keep only today's windows in the setting to avoid unbounded growth.
  const pruned = [...sentSet].filter((k) => k.startsWith(`${dateKey}:`));
  sqliteDb.setSetting(
    SCHEDULED_INVENTORY_SETTING_KEY,
    pruned.join(","),
    "IST date windows already sent for inventory webhook (am/pm)"
  );

  console.log(
    `[slot-webhook] Scheduled ${window.toUpperCase()} inventory sync sent for ${dateKey} IST (${slots.length} slots) → ${webhookUrl}`
  );
  return true;
}

/**
 * At/after 9:00 AM IST and 6:00 PM IST, POST all 60 slots to the inventory
 * webhook. Safe to call often — one send per window per IST day, only marked
 * after a successful POST.
 */
export async function maybeMorningInventorySync(): Promise<{
  sent: boolean;
  reason?: string;
  dateKey?: string;
  windowsSent?: string[];
}> {
  if (IS_VERCEL) return { sent: false, reason: "vercel" };
  if (scheduledSyncInFlight) return { sent: false, reason: "in_flight" };

  try {
    const ist = getIstClock();
    const windowsSent: string[] = [];

    scheduledSyncInFlight = true;

    // Morning window: due from 09:00 IST onward (catch-up if kiosk was off at 9).
    if (ist.hour >= MORNING_SYNC_HOUR_IST) {
      const sentAm = await sendScheduledWindow(ist.dateKey, "am");
      if (sentAm) windowsSent.push("am");
    }

    // Evening window: due from 18:00 IST onward.
    if (ist.hour >= EVENING_SYNC_HOUR_IST) {
      const sentPm = await sendScheduledWindow(ist.dateKey, "pm");
      if (sentPm) windowsSent.push("pm");
    }

    if (ist.hour < MORNING_SYNC_HOUR_IST) {
      return { sent: false, reason: "before_9am_ist", dateKey: ist.dateKey };
    }

    if (windowsSent.length === 0) {
      return {
        sent: false,
        reason: ist.hour < EVENING_SYNC_HOUR_IST ? "am_already_sent_or_pending" : "already_sent",
        dateKey: ist.dateKey,
      };
    }

    return { sent: true, dateKey: ist.dateKey, windowsSent };
  } catch (error) {
    console.error("[slot-webhook] maybeMorningInventorySync error:", error);
    return { sent: false, reason: "error" };
  } finally {
    scheduledSyncInFlight = false;
  }
}
