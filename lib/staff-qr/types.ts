/**
 * Staff QR authentication domain types.
 * Keep API-agnostic so Make.com / custom backends can map into these shapes.
 */

export type StaffRole = string;

export type VerifiedStaff = {
  /** Opaque hash from the QR payload (never PII). */
  hash: string;
  name: string;
  phone?: string;
  role?: StaffRole;
  branch?: string;
  active: boolean;
  /** Optional QR image URL (for admin/print flows — not required at kiosk). */
  qrUrl?: string;
  /** Raw upstream payload for debugging / future fields. */
  raw?: Record<string, unknown>;
};

export type StaffQrVerifyRequest = {
  hash: string;
  machineId?: string;
  machineName?: string;
  machineLocation?: string;
};

export type StaffQrVerifySuccess = {
  ok: true;
  staff: VerifiedStaff;
};

export type StaffQrVerifyFailure = {
  ok: false;
  code:
    | "invalid_hash"
    | "not_found"
    | "inactive"
    | "network"
    | "misconfigured"
    | "unknown";
  message: string;
};

export type StaffQrVerifyResult = StaffQrVerifySuccess | StaffQrVerifyFailure;

export type CashAuthMethod = "qr" | "password";

/** Result handed to checkout after successful staff authorization. */
export type CashAuthResult = {
  agentName: string;
  method: CashAuthMethod;
  staff?: VerifiedStaff;
};
