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
//  3. maybeMorningInventorySync() – around 9:00 AM IST each day, push all 60
//     slots (name / slot / price / qty) to the morning inventory Make webhook.
//
// All work is best-effort: failures are logged and never bubble up to the
// admin flow. On Vercel (no SQLite) everything is a no-op.

import {
  getMorningSlotInventoryWebhookUrl,
  sendSlotUpdateWebhook,
} from "@/utils/webhook";

const IS_VERCEL = process.env.VERCEL === "1";

const DAILY_SYNC_SETTING_KEY = "slot_webhook_last_full_sync";
const MORNING_INVENTORY_SETTING_KEY = "slot_webhook_morning_inventory_ist";
const TOTAL_SLOTS = 60;
/** First eligible hour (IST) for the morning inventory snapshot. */
const MORNING_SYNC_HOUR_IST = 9;

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

/** Map the raw DB slot map into the webhook slot payload shape. */
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
    const slots = mapSlots(adminDb.getAllSlots());
    const { machineLocation, machineName, machineId } = await resolveMachineMeta();

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
  // Some environments emit "24" for midnight; normalize to 0.
  const hour = hourRaw === 24 ? 0 : hourRaw;

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute: Number(get("minute")),
  };
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

let morningSyncInFlight = false;

/**
 * Around 9:00 AM IST each day, POST all 60 slots (product name, slot, price,
 * quantity) to the morning inventory Make webhook. Safe to call often — only
 * one send per IST calendar day after 09:00.
 */
export async function maybeMorningInventorySync(): Promise<{
  sent: boolean;
  reason?: string;
  dateKey?: string;
}> {
  if (IS_VERCEL) return { sent: false, reason: "vercel" };
  if (morningSyncInFlight) return { sent: false, reason: "in_flight" };

  try {
    const ist = getIstClock();
    if (ist.hour < MORNING_SYNC_HOUR_IST) {
      return { sent: false, reason: "before_9am_ist", dateKey: ist.dateKey };
    }

    const { sqliteDb } = await import("@/lib/sqlite-db");
    const last = sqliteDb.getSetting(MORNING_INVENTORY_SETTING_KEY);
    if (last === ist.dateKey) {
      return { sent: false, reason: "already_sent", dateKey: ist.dateKey };
    }

    morningSyncInFlight = true;
    sqliteDb.setSetting(
      MORNING_INVENTORY_SETTING_KEY,
      ist.dateKey,
      "Last IST date the morning 60-slot inventory webhook was sent"
    );

    const { adminDb } = await import("@/lib/admin-db");
    const slots = mapAllSixtySlots(adminDb.getAllSlots());
    const { machineLocation, machineName, machineId } = await resolveMachineMeta();
    const webhookUrl = getMorningSlotInventoryWebhookUrl();

    await sendSlotUpdateWebhook({
      slots,
      updateType: "morning_inventory_sync",
      affectedSlotIds: [],
      timestamp: new Date().toISOString(),
      machineLocation,
      machineName,
      machineId,
      webhookUrl,
    });

    console.log(
      `[slot-webhook] Morning inventory sync sent for ${ist.dateKey} IST (${slots.length} slots) → ${webhookUrl}`
    );
    return { sent: true, dateKey: ist.dateKey };
  } catch (error) {
    console.error("[slot-webhook] maybeMorningInventorySync error:", error);
    return { sent: false, reason: "error" };
  } finally {
    morningSyncInFlight = false;
  }
}
