/**
 * Staff QR auth configuration.
 * Point STAFF_QR_VERIFY_URL at Make.com or any verify endpoint later.
 * Server-side only secrets stay on the Next route — never expose the Make URL to the client.
 */

export function getStaffQrVerifyUpstreamUrl(): string {
  return (
    process.env.STAFF_QR_VERIFY_URL ||
    process.env.NEXT_PUBLIC_STAFF_QR_VERIFY_URL ||
    ""
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
