/**
 * Staff QR auth configuration.
 * Server-side only — never expose the Make URL to the browser.
 *
 * QRAUTH Make webhook:
 *   POST { "hash": "<qr hash>" }
 *   success → { success: true, data: { staffname: "Rajesh|9960278391|Aiportm4" } }
 *   failure → { success: false, code: 400, message: "QR Code not found", data: null }
 */

const DEFAULT_STAFF_QR_VERIFY_URL =
  "https://hook.eu1.make.com/57gbgavipbzvqczkur4lqckoj69u6mos";

export function getStaffQrVerifyUpstreamUrl(): string {
  return (
    process.env.STAFF_QR_VERIFY_URL ||
    process.env.NEXT_PUBLIC_STAFF_QR_VERIFY_URL ||
    DEFAULT_STAFF_QR_VERIFY_URL
  ).trim();
}

export function getStaffQrVerifyApiKey(): string {
  return (process.env.STAFF_QR_VERIFY_API_KEY || "").trim();
}

/** Client always hits our proxy — swap upstream without touching UI. */
export const STAFF_QR_VERIFY_PROXY_PATH = "/api/agent/verify-qr";

export function isStaffQrVerifyConfigured(): boolean {
  return getStaffQrVerifyUpstreamUrl().length > 0;
}
