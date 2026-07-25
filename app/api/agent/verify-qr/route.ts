import { NextRequest, NextResponse } from "next/server";
import {
  getStaffQrVerifyApiKey,
  getStaffQrVerifyUpstreamUrl,
  normalizeStaffFromUpstream,
  toVerifyFailure,
  type StaffQrVerifyResult,
} from "@/lib/staff-qr";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/verify-qr
 * Body: { hash, machineId?, machineName?, machineLocation? }
 *
 * Proxies to STAFF_QR_VERIFY_URL (Make.com or custom).
 * Set STAFF_QR_DEV_MOCK=1 to exercise the UI without an upstream API.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const hash = String(body?.hash || "").trim();

    if (!hash || hash.length < 8) {
      return NextResponse.json(
        toVerifyFailure("invalid_hash", "Invalid QR code. Please scan again."),
        { status: 400 }
      );
    }

    const upstream = getStaffQrVerifyUpstreamUrl();
    const useMock = process.env.STAFF_QR_DEV_MOCK === "1";

    if (!upstream && useMock) {
      const result: StaffQrVerifyResult = {
        ok: true,
        staff: {
          hash,
          name: "Demo Staff",
          phone: "9999999999",
          role: "Sales Executive",
          branch: "Demo Branch",
          active: true,
        },
      };
      return NextResponse.json(result);
    }

    if (!upstream) {
      return NextResponse.json(
        toVerifyFailure(
          "misconfigured",
          "Staff QR verification is not configured. Set STAFF_QR_VERIFY_URL."
        ),
        { status: 503 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const apiKey = getStaffQrVerifyApiKey();
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstream, {
        method: "POST",
        headers,
        body: JSON.stringify({
          hash,
          machine_id: body?.machineId || "",
          machine_name: body?.machineName || "",
          machine_location: body?.machineLocation || "",
        }),
        signal: controller.signal,
      });
    } catch (err: any) {
      const aborted = err?.name === "AbortError";
      return NextResponse.json(
        toVerifyFailure(
          "network",
          aborted
            ? "Verification timed out. Please try again."
            : "Unable to reach staff verification service."
        ),
        { status: 502 }
      );
    } finally {
      clearTimeout(timer);
    }

    const payload = await upstreamRes.json().catch(() => null);

    if (!upstreamRes.ok) {
      const message =
        (payload && (payload.message || payload.error || payload.detail)) ||
        "Invalid QR code or staff not found.";
      return NextResponse.json(
        toVerifyFailure(
          upstreamRes.status === 404 ? "not_found" : "unknown",
          String(message)
        ),
        { status: upstreamRes.status === 401 ? 401 : 404 }
      );
    }

    // Explicit failure flags from Make scenarios
    if (
      payload?.success === false ||
      payload?.ok === false ||
      payload?.found === false
    ) {
      return NextResponse.json(
        toVerifyFailure(
          "not_found",
          String(payload?.message || "Invalid QR code or staff not found.")
        ),
        { status: 404 }
      );
    }

    const staff = normalizeStaffFromUpstream(hash, payload);
    if (!staff) {
      return NextResponse.json(
        toVerifyFailure("not_found", "Invalid QR code or staff not found."),
        { status: 404 }
      );
    }

    if (!staff.active) {
      return NextResponse.json(
        toVerifyFailure(
          "inactive",
          "This staff QR is inactive. Contact admin."
        ),
        { status: 403 }
      );
    }

    const result: StaffQrVerifyResult = { ok: true, staff };
    return NextResponse.json(result);
  } catch (error) {
    console.error("[verify-qr] Error:", error);
    return NextResponse.json(
      toVerifyFailure("unknown", "Verification failed. Please try again."),
      { status: 500 }
    );
  }
}
