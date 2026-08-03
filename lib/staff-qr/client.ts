import { STAFF_QR_VERIFY_PROXY_PATH } from "./config";
import { extractHashFromQrText, toVerifyFailure } from "./normalize";
import type { StaffQrVerifyRequest, StaffQrVerifyResult } from "./types";

/** In-flight dedupe: rapid double-scans of the same hash share one request. */
const inflight = new Map<string, Promise<StaffQrVerifyResult>>();

function machineContext(): Pick<
  StaffQrVerifyRequest,
  "machineId" | "machineName" | "machineLocation"
> {
  if (typeof window === "undefined") return {};
  try {
    return {
      machineId:
        window.sessionStorage.getItem("kiosk_machine_id") ||
        process.env.NEXT_PUBLIC_MACHINE_ID ||
        undefined,
      machineName:
        window.sessionStorage.getItem("kiosk_machine_name") ||
        process.env.NEXT_PUBLIC_MACHINE_NAME ||
        undefined,
      machineLocation:
        window.sessionStorage.getItem("kiosk_machine_location") ||
        process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
        undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Verify a staff QR payload via the Next.js proxy.
 * Accepts raw QR text; hash extraction is handled here.
 */
export async function verifyStaffQr(
  qrTextOrHash: string
): Promise<StaffQrVerifyResult> {
  const hash = extractHashFromQrText(qrTextOrHash);
  if (!hash) {
    return toVerifyFailure("invalid_hash", "Could not read a valid staff QR code.");
  }

  const existing = inflight.get(hash);
  if (existing) return existing;

  const request: StaffQrVerifyRequest = {
    hash,
    ...machineContext(),
  };

  const promise = (async (): Promise<StaffQrVerifyResult> => {
    try {
      const res = await fetch(STAFF_QR_VERIFY_PROXY_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data = (await res.json().catch(() => null)) as
        | StaffQrVerifyResult
        | { success?: boolean; message?: string }
        | null;

      if (data && typeof data === "object" && "ok" in data) {
        return data as StaffQrVerifyResult;
      }

      // Legacy-ish shape safety
      if (res.ok && data && (data as any).staff) {
        return { ok: true, staff: (data as any).staff };
      }

      return toVerifyFailure(
        res.status === 404 ? "not_found" : "unknown",
        (data as any)?.message || "Staff verification failed."
      );
    } catch {
      return toVerifyFailure(
        "network",
        "Unable to reach verification service. Check network and try again."
      );
    } finally {
      inflight.delete(hash);
    }
  })();

  inflight.set(hash, promise);
  return promise;
}
