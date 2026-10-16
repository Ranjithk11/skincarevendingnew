export const SCAN_CONSENT_VERSION = "lw-scan-consent-v1";
export const SCAN_CONSENT_STORAGE_KEY = "kiosk_scan_consent";

export type ScanConsentRecord = {
  consentId: string;
  version: string;
  scanConsent: boolean;
  marketingConsent: boolean;
  machineName?: string;
  createdAt: string;
};
