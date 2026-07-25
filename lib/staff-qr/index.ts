export type {
  CashAuthMethod,
  CashAuthResult,
  StaffQrVerifyFailure,
  StaffQrVerifyRequest,
  StaffQrVerifyResult,
  StaffQrVerifySuccess,
  StaffRole,
  VerifiedStaff,
} from "./types";

export {
  getStaffQrVerifyApiKey,
  getStaffQrVerifyUpstreamUrl,
  isStaffQrVerifyConfigured,
  STAFF_QR_VERIFY_PROXY_PATH,
} from "./config";

export {
  extractHashFromQrText,
  normalizeStaffFromUpstream,
  toVerifyFailure,
} from "./normalize";

export { verifyStaffQr } from "./client";
