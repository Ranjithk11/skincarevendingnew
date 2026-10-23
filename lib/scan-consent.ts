import {
  SCAN_CONSENT_STORAGE_KEY,
  SCAN_CONSENT_VERSION,
  type ScanConsentRecord,
} from "@/lib/scan-consent-types";
import {
  FREE_CONSULTATION_FLOW,
  isFreeConsultationFlow,
  selfiePathForConsultation,
  selfiePathForFlow,
} from "@/lib/consultationFlow";
import { getJourney } from "@/lib/kiosk-journey";
import { APP_ROUTES } from "@/utils/routes";

/** Temporary: skip /scan-consent and go straight to the scan. */
export const SKIP_SCAN_CONSENT_PAGE = true;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function newConsentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `consent_${crypto.randomUUID()}`;
  }
  return `consent_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function readScanConsent(): ScanConsentRecord | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(SCAN_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScanConsentRecord;
    if (!parsed?.consentId || !parsed.scanConsent) return null;
    if (parsed.version !== SCAN_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasValidScanConsent(): boolean {
  return Boolean(readScanConsent()?.scanConsent);
}

export function ensureScanConsentForProceed(): ScanConsentRecord {
  const existing = readScanConsent();
  if (existing) return existing;
  return saveScanConsent({ marketingConsent: false });
}

export function saveScanConsent(input: {
  marketingConsent: boolean;
  machineName?: string;
}): ScanConsentRecord {
  const record: ScanConsentRecord = {
    consentId: newConsentId(),
    version: SCAN_CONSENT_VERSION,
    scanConsent: true,
    marketingConsent: Boolean(input.marketingConsent),
    machineName: input.machineName || "",
    createdAt: new Date().toISOString(),
  };
  if (canUseStorage()) {
    try {
      window.sessionStorage.setItem(SCAN_CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* ignore quota */
    }
  }
  return record;
}

export function clearScanConsent(): void {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(SCAN_CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function scanConsentPathForFlow(
  flow?: string | null,
  preferredTime?: string | null
): string {
  const params = new URLSearchParams();
  if (isFreeConsultationFlow(flow)) {
    params.set("flow", FREE_CONSULTATION_FLOW);
    if (preferredTime) params.set("preferredTime", preferredTime);
  }
  if (SKIP_SCAN_CONSENT_PAGE) {
    return selfiePathFromConsentSearch(params);
  }
  const qs = params.toString();
  return qs ? `${APP_ROUTES.SCAN_CONSENT}?${qs}` : APP_ROUTES.SCAN_CONSENT;
}

export function skipScanBrowsePath(): string {
  const journey = getJourney();
  if (journey?.source === "catalog") return APP_ROUTES.PRODUCTS;
  return APP_ROUTES.SLOTS;
}

export function selfiePathFromConsentSearch(search: URLSearchParams): string {
  const returnTo = search.get("returnTo");
  if (returnTo && returnTo.startsWith("/skinanalysis/selfie")) {
    return returnTo;
  }
  const flow = search.get("flow");
  const preferredTime = search.get("preferredTime") || "";
  if (isFreeConsultationFlow(flow) && preferredTime) {
    return selfiePathForConsultation(preferredTime);
  }
  return selfiePathForFlow(flow);
}

export function consentPathFromSelfieSearch(search: string): string {
  const params = new URLSearchParams(search);
  const returnTo = `${"/skinanalysis/selfie"}${search || ""}`;
  params.set("returnTo", returnTo);
  if (isFreeConsultationFlow(params.get("flow")) && !params.get("flow")) {
    params.set("flow", FREE_CONSULTATION_FLOW);
  }
  if (SKIP_SCAN_CONSENT_PAGE) {
    return returnTo;
  }
  return `${APP_ROUTES.SCAN_CONSENT}?${params.toString()}`;
}

export async function persistScanConsent(record: ScanConsentRecord): Promise<void> {
  try {
    await fetch("/api/scan-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch {
    // Session consent is enough to continue the kiosk flow.
  }
}

export async function validateScanProcessing(input: {
  hasIdentifiableFace: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const consent = readScanConsent();
  if (!consent?.scanConsent) {
    return { ok: false, error: "Scan consent is required before processing." };
  }
  if (!input.hasIdentifiableFace) {
    return { ok: false, error: "No identifiable face was found. Scan was not processed." };
  }
  try {
    const res = await fetch("/api/scan/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentId: consent.consentId,
        hasIdentifiableFace: true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      return {
        ok: false,
        error: json?.error || "Scan could not be validated.",
      };
    }
    return { ok: true };
  } catch {
    // Offline kiosk: session consent + face check still apply.
    return { ok: true };
  }
}
