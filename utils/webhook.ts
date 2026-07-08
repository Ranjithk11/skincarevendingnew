// Webhook utilities for forwarding events to external automation platforms
// (e.g., Make.com / Zapier).
//
// The endpoint can be overridden via NEXT_PUBLIC_SCAN_COMPLETED_WEBHOOK_URL.

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

/**
 * Best-effort POST of a `dispense_error` event to the configured webhook.
 *
 * Failures are swallowed and logged so they never block the user-facing flow.
 * A simple in-memory + sessionStorage de-duplication guard prevents the same
 * (errorMessage + orderId) combination from triggering multiple webhook fires
 * within a single session.
 */
export async function sendDispenseErrorWebhook(
  payload: DispenseErrorPayload
): Promise<void> {
  try {
    const url =
      process.env.NEXT_PUBLIC_DISPENSE_ERROR_WEBHOOK_URL ||
      DEFAULT_DISPENSE_ERROR_WEBHOOK_URL;

    const dedupeKey =
      payload.dedupeKey ||
      `dispense_error::${payload.payment?.paymentId || payload.payment?.orderId || ""}::${payload.errorMessage}`;

    loadDispenseErrorFiredFromSession();
    if (dispenseErrorFiredKeys.has(dedupeKey)) {
      console.warn("[dispense_error webhook] skipped duplicate:", dedupeKey);
      return;
    }

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

    dispenseErrorFiredKeys.add(dedupeKey);
    persistDispenseErrorFiredToSession();
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

/**
 * Best-effort POST of a `payment_success` event to the configured webhook.
 *
 * Failures are swallowed and logged so they never block the user-facing flow.
 * A simple in-memory + sessionStorage de-duplication guard prevents the same
 * orderId from triggering multiple webhook fires within a single session.
 */
export async function sendPaymentWebhook(
  payload: PaymentPayload
): Promise<void> {
  try {
    const url =
      process.env.NEXT_PUBLIC_PAYMENT_WEBHOOK_URL ||
      DEFAULT_PAYMENT_WEBHOOK_URL;

    const dedupeKey =
      payload.dedupeKey ||
      `payment_success::${payload.transaction?.paymentId || payload.transaction?.orderId || ""}`;

    loadPaymentFiredFromSession();
    if (paymentFiredKeys.has(dedupeKey)) {
      console.warn("[payment webhook] skipped duplicate:", dedupeKey);
      return;
    }

    const body = {
      event: "payment_success",
      occurred_at: new Date().toISOString(),
      machine_location: payload.machineLocation || "",
      machine_name: payload.machineName || "",
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
      },
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

    paymentFiredKeys.add(dedupeKey);
    persistPaymentFiredToSession();
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

/**
 * Best-effort POST of a `dispense_success` event to the configured webhook.
 *
 * Failures are swallowed and logged so they never block the user-facing flow.
 * A simple in-memory + sessionStorage de-duplication guard prevents the same
 * (orderId + productId) combination from triggering multiple webhook fires
 * within a single session.
 */
export async function sendDispenseSuccessWebhook(
  payload: DispenseSuccessPayload
): Promise<void> {
  try {
    const url =
      process.env.NEXT_PUBLIC_DISPENSE_WEBHOOK_URL ||
      DEFAULT_DISPENSE_WEBHOOK_URL;

    const dedupeKey =
      payload.dedupeKey ||
      `dispense_success::${payload.transaction?.paymentId || payload.transaction?.orderId || ""}::${payload.command?.slotId ?? payload.command?.productId ?? ""}`;

    loadDispenseSuccessFiredFromSession();
    if (dispenseSuccessFiredKeys.has(dedupeKey)) {
      console.warn("[dispense_success webhook] skipped duplicate:", dedupeKey);
      return;
    }

    const body = {
      event: "dispense_success",
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
      transaction: {
        order_id: payload.transaction?.orderId || "",
        payment_id: payload.transaction?.paymentId || "",
        amount: payload.transaction?.amount ?? null,
        currency: payload.transaction?.currency || "INR",
        status: payload.transaction?.status || "",
        method: payload.transaction?.method || "",
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

    dispenseSuccessFiredKeys.add(dedupeKey);
    persistDispenseSuccessFiredToSession();
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
