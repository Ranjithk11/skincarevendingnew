// Webhook utilities for forwarding events to external automation platforms
// (e.g., Make.com / Zapier).
//
// The endpoint can be overridden via NEXT_PUBLIC_SCAN_COMPLETED_WEBHOOK_URL.

const DEFAULT_SCAN_COMPLETED_WEBHOOK_URL =
  "https://hook.eu1.make.com/2jsb7s7vin1sohcbdc0ttfv31p9mofhu";

const DEFAULT_DISPENSE_ERROR_WEBHOOK_URL =
  "https://hook.eu1.make.com/lsphkpfoosnyvhvjew1a180q3oi6c645";

const DEFAULT_PAYMENT_WEBHOOK_URL =
  "https://hook.eu1.make.com/q38x43z4ddv0x654fedj5n661ls8pvig";

const DEFAULT_DISPENSE_WEBHOOK_URL =
  "https://hook.eu1.make.com/bel61vvl1lpvleljhuzpyc5osor8fnz3";

const DEFAULT_SLOT_UPDATE_WEBHOOK_URL =
  "https://hook.eu1.make.com/2g5m8urqau04sgnynlxk4i7cdvjgdmoc";

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
}

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
    const url =
      process.env.NEXT_PUBLIC_SCAN_COMPLETED_WEBHOOK_URL ||
      DEFAULT_SCAN_COMPLETED_WEBHOOK_URL;

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

    const body = {
      event: "scan_completed",
      name: payload.name || "",
      email: payload.email || "",
      phone: payload.phone || "",
      result_url: resultUrl,
      scan_time: payload.scanTime || new Date().toISOString(),
      machine_name: payload.machineName || "",
      machine_location: payload.machineLocation || "",
    };

    // Fire-and-forget. Use keepalive so the request survives navigation.
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch((err) => {
      console.warn("[scan_completed webhook] request failed:", err);
    });

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
  /** Optional dedup key. If the same key was reported in this session, the
   *  webhook will not fire again. Defaults to a hash of errorMessage + orderId. */
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
      `${payload.errorMessage}::${payload.payment?.orderId || ""}`;

    loadDispenseErrorFiredFromSession();
    if (dispenseErrorFiredKeys.has(dedupeKey)) {
      return;
    }

    const body = {
      event: "dispense_error",
      error_message: payload.errorMessage || "Unknown dispense error",
      occurred_at: new Date().toISOString(),
      machine_location: payload.machineLocation || "",
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
      console.warn("[dispense_error webhook] request failed:", err);
    });

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
      `payment::${payload.transaction?.orderId || ""}`;

    loadPaymentFiredFromSession();
    if (paymentFiredKeys.has(dedupeKey)) {
      return;
    }

    const body = {
      event: "payment_success",
      occurred_at: new Date().toISOString(),
      machine_location: payload.machineLocation || "",
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
      console.warn("[payment webhook] request failed:", err);
    });

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
  /** Optional dedup key. If the same key was reported in this session, the
   *  webhook will not fire again. Defaults to a hash of orderId + productId. */
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
      `dispense::${payload.transaction?.orderId || ""}::${payload.command?.productId || ""}`;

    loadDispenseSuccessFiredFromSession();
    if (dispenseSuccessFiredKeys.has(dedupeKey)) {
      return;
    }

    const body = {
      event: "dispense_success",
      occurred_at: new Date().toISOString(),
      machine_location: payload.machineLocation || "",
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
      console.warn("[dispense_success webhook] request failed:", err);
    });

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
  /** Type of update: 'slot_assignment' or 'product_modification' */
  updateType?: 'slot_assignment' | 'product_modification';
  /** Slot IDs affected by this update */
  affectedSlotIds?: number[];
  /** Timestamp of the update */
  timestamp?: string;
  /** Machine location where the update occurred */
  machineLocation?: string;
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

    const body = {
      event: payload.updateType || "slot_update",
      occurred_at: payload.timestamp || new Date().toISOString(),
      slots: payload.slots || [],
      product: payload.product || null,
      affected_slot_ids: payload.affectedSlotIds || [],
      machine_location: payload.machineLocation || process.env.NEXT_PUBLIC_MACHINE_LOCATION || "LeafWater Vending Machine",
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
