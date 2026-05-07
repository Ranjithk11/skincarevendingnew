// Webhook utilities for forwarding events to external automation platforms
// (e.g., Make.com / Zapier).
//
// The endpoint can be overridden via NEXT_PUBLIC_SCAN_COMPLETED_WEBHOOK_URL.

const DEFAULT_SCAN_COMPLETED_WEBHOOK_URL =
  "https://hook.eu1.make.com/2jsb7s7vin1sohcbdc0ttfv31p9mofhu";

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
