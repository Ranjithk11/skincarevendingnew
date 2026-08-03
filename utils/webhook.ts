// Webhook utilities for forwarding events to external automation platforms
// (e.g., Make.com / Zapier).
//
// The endpoint can be overridden via NEXT_PUBLIC_SCAN_COMPLETED_WEBHOOK_URL.

import type { SpinWheelWebhookPayload } from "@/lib/spin-wheel/webhook";

const DEFAULT_SCAN_COMPLETED_WEBHOOK_URL =
  "https://hook.eu1.make.com/2jsb7s7vin1sohcbdc0ttfv31p9mofhu";

/**
 * Fetch machine location from database (Settings)
 * Falls back to environment variable if not set in database
 */
export async function getMachineLocation(): Promise<string> {
  try {
    const response = await fetch("/api/admin/machine-name");
    const data = await response.json();
    if (data.success && data.machineLocation) {
      return data.machineLocation;
    }
  } catch (err) {
    console.warn("[webhook] Failed to fetch machine location:", err);
  }
  // Fallback to environment variable
  return process.env.NEXT_PUBLIC_MACHINE_LOCATION || process.env.LW_MACHINE_LOCATION || "LeafWater Vending Machine";
}

const DEFAULT_DISPENSE_ERROR_WEBHOOK_URL =
  "https://hook.eu1.make.com/lsphkpfoosnyvhvjew1a180q3oi6c645";

const DEFAULT_PAYMENT_WEBHOOK_URL =
  "https://hook.eu1.make.com/q38x43z4ddv0x654fedj5n661ls8pvig";

const DEFAULT_DISPENSE_WEBHOOK_URL =
  "https://hook.eu1.make.com/bel61vvl1lpvleljhuzpyc5osor8fnz3";

const DEFAULT_SLOT_UPDATE_WEBHOOK_URL =
  "https://hook.eu1.make.com/5x7cho9eq99j2chogcjedhd3bj0959lg";

const DEFAULT_RESULT_BASE_URL = "https://skincare.leafwater.in";

export interface ScanCompletedPayload {
  name?: string;
  email?: string;
  phone?: string;
  userId?: string;
  /**
   * Optional override for the result URL. If not provided, one will be
   * built from {@link DEFAULT_RESULT_BASE_URL} and the userId.
   */
  resultUrl?: string;
  /** ISO 8601 string. Defaults to the current time. */
  scanTime?: string;
  /** Machine name where the scan occurred */
  machineName?: string;
  /** Machine location where the scan occurred */
  machineLocation?: string;
  /** Sent only to the secondary detailed webhook */
  skinType?: string;
  detectedAttributes?: string[];
  highRecommendation?: unknown[];
}

/** Normalize recommend-skin-care / fetch-recommendations API shapes for webhooks. */
export function extractScanAnalysisFields(apiResponse: unknown): {
  skinType?: string;
  detectedAttributes: string[];
  highRecommendation: unknown[];
} {
  const root = (apiResponse as { data?: unknown })?.data ?? apiResponse;
  const nested = (root as { data?: unknown })?.data;
  const record =
    (Array.isArray(nested) ? nested[0] : null) ||
    (nested && typeof nested === "object" ? nested : null) ||
    (root as { productRecommendation?: unknown })?.productRecommendation ||
    root;

  const rec = record as Record<string, unknown> | null;
  const recommendedProducts =
    (rec?.recommendedProducts as Record<string, unknown> | undefined) ||
    (rec?.recommended_products as Record<string, unknown> | undefined);

  const detectedRaw =
    rec?.detectedAttributes ?? rec?.detected_attributes ?? [];
  const highRecommendation = recommendedProducts?.highRecommendation;

  return {
    skinType:
      (rec?.skinType as string | undefined) ||
      (rec?.skin_type as string | undefined),
    detectedAttributes: Array.isArray(detectedRaw) ? (detectedRaw as string[]) : [],
    highRecommendation: Array.isArray(highRecommendation)
      ? (highRecommendation as unknown[])
      : [],
  };
}

const DEFAULT_SCAN_COMPLETED_WEBHOOK_URL_2 =
  "https://hook.eu1.make.com/mnjehjt01i8p52qh78dzdx3i6crgyivt";

/**
 * Best-effort POST of a `scan_completed` event to the configured webhook.
 *
 * Failures are swallowed and logged so they never block the user-facing flow.
 * A simple in-memory + sessionStorage de-duplication guard prevents the same
 * userId from triggering multiple webhook fires within a single session.
 */
const firedUserIds = new Set<string>();
const SESSION_KEY = "scan_completed_webhook_fired_users";

function loadFiredFromSession(): Set<string> {
  if (typeof window === "undefined") return firedUserIds;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      parsed.forEach((id) => firedUserIds.add(id));
    }
  } catch {
    // ignore
  }
  return firedUserIds;
}

function persistFiredToSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(Array.from(firedUserIds))
    );
  } catch {
    // ignore
  }
}

export async function sendScanCompletedWebhook(
  payload: ScanCompletedPayload
): Promise<void> {
  try {
    const primaryUrl =
      process.env.NEXT_PUBLIC_SCAN_COMPLETED_WEBHOOK_URL ||
      DEFAULT_SCAN_COMPLETED_WEBHOOK_URL;
    const detailedUrl =
      process.env.NEXT_PUBLIC_SCAN_COMPLETED_WEBHOOK_URL_2 ||
      DEFAULT_SCAN_COMPLETED_WEBHOOK_URL_2;

    const userId = (payload.userId || "").trim();

    // De-dupe by userId per browser session
    if (userId) {
      loadFiredFromSession();
      if (firedUserIds.has(userId)) {
        return;
      }
    }

    // Always prefer the public production URL so external services (Make.com,
    // CRM, email automations) receive a clickable link, even when this code
    // runs on localhost during development.
    const baseUrl =
      process.env.NEXT_PUBLIC_RESULT_BASE_URL || DEFAULT_RESULT_BASE_URL;

    const resultUrl =
      payload.resultUrl ||
      (userId
        ? `${baseUrl}/admin/view-skincare-report?userId=${encodeURIComponent(userId)}`
        : "");

    const scanTime = payload.scanTime || new Date().toISOString();

    const primaryBody = {
      event: "scan_completed",
      name: payload.name || "",
      email: payload.email || "",
      phone: payload.phone || "",
      result_url: resultUrl,
      scan_time: scanTime,
      machine_name: payload.machineName || "",
      machine_location: payload.machineLocation || "",
    };

    const detailedBody = {
      event: "scan_completed",
      userId,
      name: payload.name || "",
      email: payload.email || "",
      phone: payload.phone || "",
      result_url: resultUrl,
      scan_time: scanTime,
      machine_name: payload.machineName || "",
      machine_location: payload.machineLocation || "",
      skinType: payload.skinType || "",
      detectedAttributes: payload.detectedAttributes || [],
      highRecommendation: payload.highRecommendation || [],
    };

    const postWebhook = (url: string, body: object) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch((err) => {
        console.warn("[scan_completed webhook] request failed:", url, err);
      });

    await Promise.all([
      postWebhook(primaryUrl, primaryBody),
      detailedUrl !== primaryUrl
        ? postWebhook(detailedUrl, detailedBody)
        : Promise.resolve(),
    ]);

    if (userId) {
      firedUserIds.add(userId);
      persistFiredToSession();
    }
  } catch (err) {
    console.warn("[scan_completed webhook] unexpected error:", err);
  }
}

// ---------------------------------------------------------------------------
// Dispense error webhook
// ---------------------------------------------------------------------------

export interface DispenseErrorUserInfo {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface DispenseErrorProductInfo {
  id?: string;
  name?: string;
  quantity?: number;
  slotId?: string | number;
  retailPrice?: number;
  amount?: number;
}

export interface DispenseErrorPaymentInfo {
  orderId?: string;
  paymentId?: string;
  qrCodeId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
}

export interface DispenseErrorPayload {
  errorMessage: string;
  user?: DispenseErrorUserInfo;
  products?: DispenseErrorProductInfo[];
  payment?: DispenseErrorPaymentInfo;
  /** Optional raw response from STM32 / dispense API for debugging */
  raw?: unknown;
  /** Machine location where the error occurred */
  machineLocation?: string;
  /** Machine name where the error occurred */
  machineName?: string;
  /** Optional dedup key. If the same key was reported in this session, the
   *  webhook will not fire again. Defaults to paymentId + orderId. */
  dedupeKey?: string;
}

const dispenseErrorFiredKeys = new Set<string>();
const DISPENSE_ERROR_SESSION_KEY = "dispense_error_webhook_fired_keys";

function loadDispenseErrorFiredFromSession(): Set<string> {
  if (typeof window === "undefined") return dispenseErrorFiredKeys;
  try {
    const raw = window.sessionStorage.getItem(DISPENSE_ERROR_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      parsed.forEach((id) => dispenseErrorFiredKeys.add(id));
    }
  } catch {
    // ignore
  }
  return dispenseErrorFiredKeys;
}

function persistDispenseErrorFiredToSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      DISPENSE_ERROR_SESSION_KEY,
      JSON.stringify(Array.from(dispenseErrorFiredKeys))
    );
  } catch {
    // ignore
  }
}

export function dispenseErrorWebhookDedupeKeys(payment?: {
  orderId?: string;
  paymentId?: string;
  qrCodeId?: string;
}, errorMessage?: string): string[] {
  const msg = String(errorMessage || "unknown").trim();
  const keys: string[] = [];
  const orderId = String(payment?.orderId || "").trim();
  const paymentId = String(payment?.paymentId || "").trim();
  const qrCodeId = String(payment?.qrCodeId || "").trim();
  if (orderId) keys.push(`dispense_error::order::${orderId}::${msg}`);
  if (paymentId) keys.push(`dispense_error::pay::${paymentId}::${msg}`);
  if (qrCodeId) keys.push(`dispense_error::qr::${qrCodeId}::${msg}`);
  if (keys.length === 0) keys.push(`dispense_error::msg::${msg}`);
  return keys;
}

function claimDispenseErrorWebhookKeys(keys: string[]): boolean {
  if (keys.length === 0) return false;
  loadDispenseErrorFiredFromSession();
  if (keys.some((k) => dispenseErrorFiredKeys.has(k))) return false;
  keys.forEach((k) => dispenseErrorFiredKeys.add(k));
  persistDispenseErrorFiredToSession();
  return true;
}

/**
 * Best-effort POST of a `dispense_error` event to the configured webhook.
 * Dedupes by order/payment/qr + message; claim is synchronous before fetch.
 */
export async function sendDispenseErrorWebhook(
  payload: DispenseErrorPayload
): Promise<void> {
  try {
    const url =
      process.env.NEXT_PUBLIC_DISPENSE_ERROR_WEBHOOK_URL ||
      DEFAULT_DISPENSE_ERROR_WEBHOOK_URL;

    const keys = payload.dedupeKey
      ? [
          payload.dedupeKey,
          ...dispenseErrorWebhookDedupeKeys(payload.payment, payload.errorMessage),
        ]
      : dispenseErrorWebhookDedupeKeys(payload.payment, payload.errorMessage);
    const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));

    if (!claimDispenseErrorWebhookKeys(uniqueKeys)) {
      console.warn(
        "[dispense_error webhook] skipped duplicate:",
        uniqueKeys.join(" | ")
      );
      return;
    }

    const dedupeKey = uniqueKeys[0];
    const body = {
      event: "dispense_error",
      error_message: payload.errorMessage || "Unknown dispense error",
      occurred_at: new Date().toISOString(),
      machine_location: payload.machineLocation || "",
      machine_name: payload.machineName || "",
      user: {
        user_id: payload.user?.userId || "",
        name: payload.user?.name || "",
        email: payload.user?.email || "",
        phone: payload.user?.phone || "",
      },
      products: (payload.products || []).map((p) => ({
        id: p.id || "",
        name: p.name || "",
        quantity: p.quantity ?? 1,
        slot_id: p.slotId ?? "",
        retail_price: p.retailPrice ?? null,
        amount: p.amount ?? null,
      })),
      payment: {
        order_id: payload.payment?.orderId || "",
        payment_id: payload.payment?.paymentId || "",
        amount: payload.payment?.amount ?? null,
        currency: payload.payment?.currency || "INR",
        status: payload.payment?.status || "",
        method: payload.payment?.method || "",
      },
      raw: payload.raw ?? null,
    };

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch((err) => {
      console.warn("[dispense_error webhook] request failed:", url, err);
    });

    console.log("[dispense_error webhook] sent:", dedupeKey, "→", url);
  } catch (err) {
    console.warn("[dispense_error webhook] unexpected error:", err);
  }
}

// ---------------------------------------------------------------------------
// Payment success webhook
// ---------------------------------------------------------------------------

export interface PaymentUserInfo {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface PaymentProductInfo {
  id?: string;
  name?: string;
  quantity?: number;
  slotId?: string | number;
  retailPrice?: number;
  amount?: number;
}

export interface PaymentTransactionInfo {
  orderId?: string;
  paymentId?: string;
  qrCodeId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  /** Agent who authorized a cash sale */
  agentName?: string;
  /** How cash staff was authenticated */
  staffAuthMethod?: "qr" | "password";
  staffHash?: string;
  staffRole?: string;
  staffBranch?: string;
  staffPhone?: string;
}

export interface PaymentPayload {
  user?: PaymentUserInfo;
  products?: PaymentProductInfo[];
  transaction?: PaymentTransactionInfo;
  /** Selected slot IDs for the purchased products */
  selectedSlots?: (string | number)[];
  /** Machine location where payment occurred */
  machineLocation?: string;
  /** Machine name where payment occurred */
  machineName?: string;
  /** Spin wheel reward / coupon details applied at checkout */
  spinWheel?: SpinWheelWebhookPayload | null;
  /** Optional dedup key. If the same key was reported in this session, the
   *  webhook will not fire again. Defaults to a hash of orderId. */
  dedupeKey?: string;
}

const paymentFiredKeys = new Set<string>();
const PAYMENT_SESSION_KEY = "payment_webhook_fired_keys";

function loadPaymentFiredFromSession(): Set<string> {
  if (typeof window === "undefined") return paymentFiredKeys;
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      parsed.forEach((id) => paymentFiredKeys.add(id));
    }
  } catch {
    // ignore
  }
  return paymentFiredKeys;
}

function persistPaymentFiredToSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      PAYMENT_SESSION_KEY,
      JSON.stringify(Array.from(paymentFiredKeys))
    );
  } catch {
    // ignore
  }
}

/** All identity keys for one payment — order / payment / qr — so enriching IDs can't double-fire. */
export function paymentWebhookDedupeKeys(transaction?: {
  orderId?: string;
  paymentId?: string;
  qrCodeId?: string;
}): string[] {
  const keys: string[] = [];
  const orderId = String(transaction?.orderId || "").trim();
  const paymentId = String(transaction?.paymentId || "").trim();
  const qrCodeId = String(transaction?.qrCodeId || "").trim();
  if (orderId) keys.push(`payment_success::order::${orderId}`);
  if (paymentId) keys.push(`payment_success::pay::${paymentId}`);
  if (qrCodeId) keys.push(`payment_success::qr::${qrCodeId}`);
  return keys;
}

function claimPaymentWebhookKeys(keys: string[]): boolean {
  if (keys.length === 0) return false;
  loadPaymentFiredFromSession();
  if (keys.some((k) => paymentFiredKeys.has(k))) {
    return false;
  }
  keys.forEach((k) => paymentFiredKeys.add(k));
  persistPaymentFiredToSession();
  return true;
}

/**
 * Best-effort POST of a `payment_success` event to the configured webhook.
 *
 * Failures are swallowed and logged so they never block the user-facing flow.
 * Dedupes by orderId / paymentId / qrCodeId (claimed synchronously before fetch
 * so concurrent cart + feedback callers cannot all send).
 */
export async function sendPaymentWebhook(
  payload: PaymentPayload
): Promise<void> {
  try {
    const url =
      process.env.NEXT_PUBLIC_PAYMENT_WEBHOOK_URL ||
      DEFAULT_PAYMENT_WEBHOOK_URL;

    const keys = payload.dedupeKey
      ? [
          payload.dedupeKey,
          ...paymentWebhookDedupeKeys(payload.transaction),
        ]
      : paymentWebhookDedupeKeys(payload.transaction);

    const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
    if (uniqueKeys.length === 0) {
      console.warn("[payment webhook] skipped — no order/payment id");
      return;
    }

    // Claim BEFORE any await so parallel callers see the same lock.
    if (!claimPaymentWebhookKeys(uniqueKeys)) {
      console.warn(
        "[payment webhook] skipped duplicate:",
        uniqueKeys.join(" | ")
      );
      return;
    }

    const agentName = payload.transaction?.agentName || "";
<<<<<<< HEAD
    const dedupeKey = uniqueKeys[0];
=======
    const agentPhone = payload.transaction?.staffPhone || "";
    const agentBranch = payload.transaction?.staffBranch || "";
    // Slack-friendly pipe string matching Make QRAUTH staffname format
    const agentStaffname = [agentName, agentPhone, agentBranch]
      .filter(Boolean)
      .join("|");
>>>>>>> QRCASH

    const body = {
      event: "payment_success",
      occurred_at: new Date().toISOString(),
      machine_location: payload.machineLocation || "",
      machine_name: payload.machineName || "",
      agent_name: agentName,
      agent_phone: agentPhone,
      agent_branch: agentBranch,
      agent_staffname: agentStaffname,
      staff_auth_method: payload.transaction?.staffAuthMethod || "",
      amount: payload.transaction?.amount ?? null,
      selected_slots: payload.selectedSlots || [],
      user: {
        user_id: payload.user?.userId || "",
        name: payload.user?.name || "",
        email: payload.user?.email || "",
        phone: payload.user?.phone || "",
      },
      products: (payload.products || []).map((p) => ({
        id: p.id || "",
        name: p.name || "",
        quantity: p.quantity ?? 1,
        slot_id: p.slotId ?? "",
        retail_price: p.retailPrice ?? null,
        amount: p.amount ?? null,
      })),
      transaction: {
        order_id: payload.transaction?.orderId || "",
        payment_id: payload.transaction?.paymentId || "",
        amount: payload.transaction?.amount ?? null,
        currency: payload.transaction?.currency || "INR",
        status: payload.transaction?.status || "",
        method: payload.transaction?.method || "",
        agent_name: agentName,
        agent_phone: agentPhone,
        agent_branch: agentBranch,
        agent_staffname: agentStaffname,
        staff_auth_method: payload.transaction?.staffAuthMethod || "",
      },
      spin_wheel: payload.spinWheel ?? null,
    };

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch((err) => {
      console.warn("[payment webhook] request failed:", url, err);
    });

    console.log("[payment webhook] sent:", dedupeKey, "→", url);
  } catch (err) {
    console.warn("[payment webhook] unexpected error:", err);
  }
}

// ---------------------------------------------------------------------------
// Dispense success webhook
// ---------------------------------------------------------------------------

export interface DispenseSuccessUserInfo {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface DispenseSuccessProductInfo {
  id?: string;
  name?: string;
  quantity?: number;
  slotId?: string | number;
  retailPrice?: number;
  amount?: number;
}

export interface DispenseSuccessTransactionInfo {
  orderId?: string;
  paymentId?: string;
  qrCodeId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  agentName?: string;
}

export interface DispenseSuccessCommandInfo {
  productId?: string;
  productName?: string;
  slotId?: string | number;
  command?: string;
  timestamp?: string;
}

export interface DispenseSuccessPayload {
  user?: DispenseSuccessUserInfo;
  products?: DispenseSuccessProductInfo[];
  transaction?: DispenseSuccessTransactionInfo;
  /** Command info - which product was dispensed and from which slot */
  command?: DispenseSuccessCommandInfo;
  /** Agent name (set for cash sales authorized by an agent) */
  agentName?: string;
  /** Machine location where dispense occurred */
  machineLocation?: string;
  /** Machine name where dispense occurred */
  machineName?: string;
  /** Optional dedup key. If the same key was reported in this session, the
   *  webhook will not fire again. Defaults to paymentId + orderId. */
  dedupeKey?: string;
}

const dispenseSuccessFiredKeys = new Set<string>();
const DISPENSE_SUCCESS_SESSION_KEY = "dispense_success_webhook_fired_keys";

function loadDispenseSuccessFiredFromSession(): Set<string> {
  if (typeof window === "undefined") return dispenseSuccessFiredKeys;
  try {
    const raw = window.sessionStorage.getItem(DISPENSE_SUCCESS_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      parsed.forEach((id) => dispenseSuccessFiredKeys.add(id));
    }
  } catch {
    // ignore
  }
  return dispenseSuccessFiredKeys;
}

function persistDispenseSuccessFiredToSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      DISPENSE_SUCCESS_SESSION_KEY,
      JSON.stringify(Array.from(dispenseSuccessFiredKeys))
    );
  } catch {
    // ignore
  }
}

export function dispenseSuccessWebhookDedupeKeys(transaction?: {
  orderId?: string;
  paymentId?: string;
  qrCodeId?: string;
}, slotOrProductKey?: string): string[] {
  const slotKey = String(slotOrProductKey || "").trim();
  const keys: string[] = [];
  const orderId = String(transaction?.orderId || "").trim();
  const paymentId = String(transaction?.paymentId || "").trim();
  const qrCodeId = String(transaction?.qrCodeId || "").trim();
  const suffix = slotKey ? `::${slotKey}` : "";
  if (orderId) keys.push(`dispense_success::order::${orderId}${suffix}`);
  if (paymentId) keys.push(`dispense_success::pay::${paymentId}${suffix}`);
  if (qrCodeId) keys.push(`dispense_success::qr::${qrCodeId}${suffix}`);
  return keys;
}

function claimDispenseSuccessWebhookKeys(keys: string[]): boolean {
  if (keys.length === 0) return false;
  loadDispenseSuccessFiredFromSession();
  if (keys.some((k) => dispenseSuccessFiredKeys.has(k))) return false;
  keys.forEach((k) => dispenseSuccessFiredKeys.add(k));
  persistDispenseSuccessFiredToSession();
  return true;
}

/**
 * Best-effort POST of a `dispense_success` event to the configured webhook.
 * Dedupes by order/payment/qr (+ slot); claim is synchronous before fetch.
 */
export async function sendDispenseSuccessWebhook(
  payload: DispenseSuccessPayload
): Promise<void> {
  try {
    const url =
      process.env.NEXT_PUBLIC_DISPENSE_WEBHOOK_URL ||
      DEFAULT_DISPENSE_WEBHOOK_URL;

    const slotKey =
      payload.command?.slotId ?? payload.command?.productId ?? "";
    const keys = payload.dedupeKey
      ? [
          payload.dedupeKey,
          ...dispenseSuccessWebhookDedupeKeys(payload.transaction, String(slotKey)),
        ]
      : dispenseSuccessWebhookDedupeKeys(payload.transaction, String(slotKey));
    const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));

    if (uniqueKeys.length === 0) {
      console.warn("[dispense_success webhook] skipped — no order/payment id");
      return;
    }

    if (!claimDispenseSuccessWebhookKeys(uniqueKeys)) {
      console.warn(
        "[dispense_success webhook] skipped duplicate:",
        uniqueKeys.join(" | ")
      );
      return;
    }

    const agentName =
      payload.agentName || payload.transaction?.agentName || "";
    const dedupeKey = uniqueKeys[0];

    const body = {
      event: "dispense_success",
      occurred_at: new Date().toISOString(),
      machine_location: payload.machineLocation || "",
      machine_name: payload.machineName || "",
      agent_name: agentName,
      amount: payload.transaction?.amount ?? null,
      user: {
        user_id: payload.user?.userId || "",
        name: payload.user?.name || "",
        email: payload.user?.email || "",
        phone: payload.user?.phone || "",
      },
      products: (payload.products || []).map((p) => ({
        id: p.id || "",
        name: p.name || "",
        quantity: p.quantity ?? 1,
        slot_id: p.slotId ?? "",
        retail_price: p.retailPrice ?? null,
        amount: p.amount ?? null,
      })),
      transaction: {
        order_id: payload.transaction?.orderId || "",
        payment_id: payload.transaction?.paymentId || "",
        amount: payload.transaction?.amount ?? null,
        currency: payload.transaction?.currency || "INR",
        status: payload.transaction?.status || "",
        method: payload.transaction?.method || "",
        agent_name: agentName,
      },
      command: {
        product_id: payload.command?.productId || "",
        product_name: payload.command?.productName || "",
        slot_id: payload.command?.slotId ?? "",
        command: payload.command?.command || "",
        timestamp: payload.command?.timestamp || new Date().toISOString(),
      },
    };

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch((err) => {
      console.warn("[dispense_success webhook] request failed:", url, err);
    });

    console.log("[dispense_success webhook] sent:", dedupeKey, "→", url);
  } catch (err) {
    console.warn("[dispense_success webhook] unexpected error:", err);
  }
}

// ---------------------------------------------------------------------------
// Slot/Product update webhook
// ---------------------------------------------------------------------------

export interface SlotUpdateProductInfo {
  id?: string;
  name?: string;
  category?: string;
  retail_price?: number;
  discount_value?: number;
  image_url?: string;
  quantity?: number;
}

export interface SlotUpdateSlotInfo {
  slot_id: number;
  product_id?: string | null;
  product_name?: string;
  category?: string;
  retail_price?: number;
  discount_value?: number;
  image_url?: string;
  quantity: number;
  last_updated?: string;
}

export interface SlotUpdatePayload {
  /** All slots with their product information */
  slots?: SlotUpdateSlotInfo[];
  /** Updated product information (if product modification occurred) */
  product?: SlotUpdateProductInfo;
  /** Type of update, e.g. 'slot_assignment', 'slot_removed', 'quantity_update',
   *  'product_modification', 'daily_full_sync', 'manual_sync'. */
  updateType?: string;
  /** Slot IDs affected by this update */
  affectedSlotIds?: number[];
  /** Timestamp of the update */
  timestamp?: string;
  /** Machine location where the update occurred */
  machineLocation?: string;
  /** Machine name where the update occurred */
  machineName?: string;
  /** Machine identifier (analytics backend id) */
  machineId?: string;
}

/**
 * Best-effort POST of slot/product update data to the configured webhook.
 *
 * This webhook is called when:
 * 1. A product is assigned to a slot (slot_assignment)
 * 2. A product is modified in admin (product_modification)
 *
 * Failures are swallowed and logged so they never block the user-facing flow.
 */
export async function sendSlotUpdateWebhook(
  payload: SlotUpdatePayload
): Promise<void> {
  try {
    const url =
      process.env.NEXT_PUBLIC_SLOT_UPDATE_WEBHOOK_URL ||
      DEFAULT_SLOT_UPDATE_WEBHOOK_URL;

    const machineName = payload.machineName || process.env.NEXT_PUBLIC_MACHINE_NAME || "";
    const machineLocation = payload.machineLocation || process.env.NEXT_PUBLIC_MACHINE_LOCATION || "LeafWater Vending Machine";
    const machineId = payload.machineId || process.env.NEXT_PUBLIC_MACHINE_ID || "";

    const body = {
      event: payload.updateType || "slot_update",
      occurred_at: payload.timestamp || new Date().toISOString(),
      total_slots: (payload.slots || []).length,
      slots: payload.slots || [],
      product: payload.product || null,
      affected_slot_ids: payload.affectedSlotIds || [],
      // Machine identity (flat fields kept for backward compatibility)
      machine_name: machineName,
      machine_location: machineLocation,
      machine_id: machineId,
      machine: {
        name: machineName,
        location: machineLocation,
        id: machineId,
      },
    };

    console.log("[slot_update webhook] Sending webhook to:", url);
    console.log("[slot_update webhook] Payload:", JSON.stringify(body, null, 2));

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch((err) => {
      console.warn("[slot_update webhook] request failed:", err);
    });
  } catch (err) {
    console.warn("[slot_update webhook] unexpected error:", err);
  }
}

// ---------------------------------------------------------------------------
// Free consultation lead webhook
// All consultation requests (report popup, free-consultation flow, spin free consultation, selfie, etc.)
// → https://hook.eu1.make.com/l35iie6ib0pdzol0hlv7jztdeonumrkg
// → https://hook.eu1.make.com/l35iie6ib0pdzol0hlv7jztdeonumrkg
// ---------------------------------------------------------------------------

const DEFAULT_CONSULTATION_WEBHOOK_URL =
  "https://hook.eu1.make.com/l35iie6ib0pdzol0hlv7jztdeonumrkg";

export interface ConsultationUserInfo {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface ConsultationPayload {
  user?: ConsultationUserInfo;
  /** Preferred consultation time slot label from the questionnaire. */
  preferredTime?: string;
  /** Detected skin attribute codes / labels from the AI analysis. */
  detectedAttributes?: unknown;
  /** Prioritised key concerns from the report. */
  keyConcerns?: unknown;
  /** Per-metric skin scores. */
  skinMetrics?: unknown;
  /** Resolved skin type (e.g. OILY_SKIN). */
  skinType?: string | null;
  /** Overall skin health score / rating shown to the user. */
  overallScore?: number | string | null;
  overallRating?: string | null;
  /** Clickable public report URL. */
  resultUrl?: string;
  /** Machine name where the lead was captured. */
  machineName?: string;
  /** Machine location where the lead was captured. */
  machineLocation?: string;
  /** Where the lead originated (e.g. report_popup, spin_wheel). */
  source?: string;
  /** Optional spin-wheel reward context when lead came from the wheel. */
  spinWheel?: {
    couponCode?: string;
    rewardType?: string;
    title?: string;
    segmentId?: string;
  };
}

/**
 * Best-effort POST of a `free_consultation_request` lead to the configured
 * webhook. Captures the full user + analysis context so the sales team can
 * follow up. Failures are swallowed so the UI is never blocked.
 */
export async function sendConsultationWebhook(
  payload: ConsultationPayload
): Promise<boolean> {
  try {
    const url =
      process.env.NEXT_PUBLIC_CONSULTATION_WEBHOOK_URL ||
      DEFAULT_CONSULTATION_WEBHOOK_URL;

    const body = {
      event: "free_consultation_request",
      requested_at: new Date().toISOString(),
      source: payload.source || "",
      user: {
        user_id: payload.user?.userId || "",
        name: payload.user?.name || "",
        email: payload.user?.email || "",
        phone: payload.user?.phone || "",
      },
      detected_attributes: payload.detectedAttributes ?? [],
      key_concerns: payload.keyConcerns ?? [],
      skin_metrics: payload.skinMetrics ?? [],
      skin_type: payload.skinType || "",
      overall_score: payload.overallScore ?? null,
      overall_rating: payload.overallRating || "",
      result_url: payload.resultUrl || "",
      preferred_time: payload.preferredTime || "",
      machine_name: payload.machineName || "",
      machine_location: payload.machineLocation || "",
      spin_wheel: payload.spinWheel
        ? {
            coupon_code: payload.spinWheel.couponCode || "",
            reward_type: payload.spinWheel.rewardType || "",
            title: payload.spinWheel.title || "",
            segment_id: payload.spinWheel.segmentId || "",
          }
        : null,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });

    return res.ok;
  } catch (err) {
    console.warn("[consultation webhook] request failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Spin-wheel offer webhook (birthday, next-purchase, cart discounts, etc.)
// All non-consultation spin offers → https://hook.eu1.make.com/gimljdauory9hjmmh3tzp8jotqwq67jd
// Consultation leads use sendConsultationWebhook (separate Make hook).
// ---------------------------------------------------------------------------

const DEFAULT_SPIN_WHEEL_LEAD_WEBHOOK_URL =
  "https://hook.eu1.make.com/gimljdauory9hjmmh3tzp8jotqwq67jd";

/** @deprecated Prefer DEFAULT_SPIN_WHEEL_LEAD_WEBHOOK_URL — kept for older env names. */
const DEFAULT_BIRTHDAY_OFFER_WEBHOOK_URL = DEFAULT_SPIN_WHEEL_LEAD_WEBHOOK_URL;

export type SpinWheelLeadEvent =
  | "birthday_offer_lead"
  | "next_purchase_offer_lead"
  | "spin_wheel_discount_lead"
  | "spin_wheel_no_prize"
  | "spin_wheel_offer_lead";

export interface BirthdayOfferUserInfo {
  userId?: string;
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  email?: string;
}

export interface BirthdayOfferPayload {
  /** Defaults to birthday_offer_lead. */
  event?: SpinWheelLeadEvent;
  user?: BirthdayOfferUserInfo;
  machineName?: string;
  machineLocation?: string;
  spinWheel?: {
    couponCode?: string;
    rewardType?: string;
    title?: string;
    description?: string;
    segmentId?: string;
    appliesToCart?: boolean;
    wonAt?: number;
  };
}

function resolveSpinWheelLeadWebhookUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SPIN_WHEEL_LEAD_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_BIRTHDAY_OFFER_WEBHOOK_URL ||
    DEFAULT_SPIN_WHEEL_LEAD_WEBHOOK_URL
  );
}

/** Resolve machine name/location for spin-wheel / consultation webhooks. */
export async function fetchMachineContext(): Promise<{
  machineName: string;
  machineLocation: string;
}> {
  const fallbackName =
    process.env.NEXT_PUBLIC_MACHINE_NAME || "Vending Machine";
  const fallbackLocation =
    process.env.NEXT_PUBLIC_MACHINE_LOCATION || "LeafWater Vending Machine";

  try {
    const res = await fetch("/api/admin/machine-name");
    const data = await res.json();
    if (data?.success) {
      return {
        machineName: String(data.machineName || "").trim() || fallbackName,
        machineLocation:
          String(data.machineLocation || "").trim() || fallbackLocation,
      };
    }
  } catch {
    // ignore — use env fallbacks
  }

  return { machineName: fallbackName, machineLocation: fallbackLocation };
}

/** Map a won reward type to the Make `event` field (consultation is not sent here). */
export function spinWheelLeadEventForRewardType(
  rewardType?: string
): SpinWheelLeadEvent {
  switch (rewardType) {
    case "PERCENT_BIRTHDAY_15":
      return "birthday_offer_lead";
    case "FLAT_100":
      return "next_purchase_offer_lead";
    case "PERCENT_EXTRA_5":
    case "FLAT_200_MIN_2999":
      return "spin_wheel_discount_lead";
    case "NO_PRIZE":
      return "spin_wheel_no_prize";
    default:
      return "spin_wheel_offer_lead";
  }
}

/**
 * Best-effort POST of any non-consultation spin-wheel offer
 * (birthday, ₹100 next purchase, cart discounts, …) to the spin-wheel Make webhook.
 * Includes user info, machine location, and full offer details.
 * Failures are swallowed so the UI is never blocked.
 */
export async function sendSpinWheelLeadWebhook(
  payload: BirthdayOfferPayload
): Promise<boolean> {
  try {
    const url = resolveSpinWheelLeadWebhookUrl();

    const body = {
      event:
        payload.event ||
        spinWheelLeadEventForRewardType(payload.spinWheel?.rewardType) ||
        "birthday_offer_lead",
      requested_at: new Date().toISOString(),
      source: "spin_wheel",
      user: {
        user_id: payload.user?.userId || "",
        name: payload.user?.name || "",
        phone: payload.user?.phone || "",
        email: payload.user?.email || "",
        date_of_birth: payload.user?.dateOfBirth || "",
      },
      machine_name: payload.machineName || "",
      machine_location: payload.machineLocation || "",
      spin_wheel: {
        coupon_code: payload.spinWheel?.couponCode || "",
        reward_type: payload.spinWheel?.rewardType || "",
        title: payload.spinWheel?.title || "",
        description: payload.spinWheel?.description || "",
        segment_id: payload.spinWheel?.segmentId || "",
        applies_to_cart: Boolean(payload.spinWheel?.appliesToCart),
        won_at: payload.spinWheel?.wonAt
          ? new Date(payload.spinWheel.wonAt).toISOString()
          : "",
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });

    return res.ok;
  } catch (err) {
    console.warn("[spin-wheel lead webhook] request failed:", err);
    return false;
  }
}

/**
 * @deprecated Use {@link sendSpinWheelLeadWebhook}. Kept so existing callers keep working.
 */
export async function sendBirthdayOfferWebhook(
  payload: BirthdayOfferPayload
): Promise<boolean> {
  return sendSpinWheelLeadWebhook(payload);
}
