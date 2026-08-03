import { NextRequest, NextResponse } from "next/server";
import {
  getStaffQrVerifyApiKey,
  getStaffQrVerifyUpstreamUrl,
  normalizeStaffFromUpstream,
  toVerifyFailure,
  unwrapUpstreamPayload,
  type StaffQrVerifyResult,
} from "@/lib/staff-qr";

export const dynamic = "force-dynamic";

async function callMakeVerify(
  upstream: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal
): Promise<{ res: Response; rawText: string; payload: Record<string, unknown> | null }> {
  const res = await fetch(upstream, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  const rawText = await res.text().catch(() => "");
  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }
  const payload = unwrapUpstreamPayload(parsed) as Record<string, unknown> | null;
  return { res, rawText, payload };
}

function truthySuccess(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function isMakeSuccess(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  if (truthySuccess(payload.success) || truthySuccess(payload.ok)) return true;
  if (Number(payload.code) === 200 && (payload.data || payload.staffname)) return true;
  // staffname present at top level or under data
  const data = payload.data as Record<string, unknown> | undefined;
  if (typeof payload.staffname === "string" && payload.staffname.includes("|")) {
    return true;
  }
  if (data && typeof data.staffname === "string" && data.staffname.includes("|")) {
    return true;
  }
  return false;
}

function isMakeFailure(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  // Never treat as failure if success payload is present
  if (isMakeSuccess(payload)) return false;
  if (
    payload.success === false ||
    payload.success === "false" ||
    payload.ok === false ||
    payload.found === false
  ) {
    return true;
  }
  if (Number(payload.code) === 400) return true;
  return false;
}

/**
 * POST /api/agent/verify-qr
 * Body: { hash }
 *
 * Proxies to Make QRAUTH webhook and normalizes staffname pipe format.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    // Keep original casing for Make lookup; only trim
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
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      // Single request — Make docs: { "hash": "..." }
      const { res, rawText, payload } = await callMakeVerify(
        upstream,
        headers,
        { hash },
        controller.signal
      );

      console.log("[verify-qr] Make response", {
        hash,
        httpStatus: res.status,
        preview: rawText.slice(0, 500),
        parsedSuccess: payload?.success,
        parsedCode: payload?.code,
      });

      if (isMakeSuccess(payload)) {
        const staff = normalizeStaffFromUpstream(hash, payload);
        if (!staff) {
          return NextResponse.json(
            {
              ...toVerifyFailure(
                "not_found",
                "Make returned success but staffname could not be parsed."
              ),
              hash,
              make_status: res.status,
              make_raw: rawText.slice(0, 1000),
            },
            { status: 502 }
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
      }

      if (isMakeFailure(payload) || !res.ok) {
        const message =
          (payload &&
            (payload.message || payload.error || payload.detail)) ||
          "Invalid QR code or staff not found.";
        return NextResponse.json(
          {
            ...toVerifyFailure("not_found", String(message)),
            hash,
            // Prove what Make returned to the kiosk (for Make team debugging)
            make_status: res.status,
            make_raw: rawText.slice(0, 1000),
          },
          { status: 404 }
        );
      }

      if (rawText.trim().toLowerCase() === "accepted") {
        return NextResponse.json(
          {
            ...toVerifyFailure(
              "misconfigured",
              "Make returned Accepted without staff data. The Webhook Response module must return success + data.staffname to the caller."
            ),
            hash,
            make_status: res.status,
            make_raw: rawText.slice(0, 1000),
          },
          { status: 502 }
        );
      }

      // Last resort: try normalize whatever we got
      const staff = normalizeStaffFromUpstream(hash, payload ?? rawText);
      if (staff?.active) {
        return NextResponse.json({ ok: true, staff } satisfies StaffQrVerifyResult);
      }

      return NextResponse.json(
        {
          ...toVerifyFailure(
            "not_found",
            "Could not verify staff QR from Make response."
          ),
          hash,
          make_status: res.status,
          make_raw: rawText.slice(0, 1000),
        },
        { status: 404 }
      );
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
  } catch (error) {
    console.error("[verify-qr] Error:", error);
    return NextResponse.json(
      toVerifyFailure("unknown", "Verification failed. Please try again."),
      { status: 500 }
    );
  }
}
