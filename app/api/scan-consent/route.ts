import { NextRequest, NextResponse } from "next/server";
import { SCAN_CONSENT_VERSION } from "@/lib/scan-consent-types";

export const dynamic = "force-dynamic";

const IS_VERCEL = process.env.VERCEL === "1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const consentId = String(body?.consentId || "").trim();
    const version = String(body?.version || "").trim();
    const scanConsent = Boolean(body?.scanConsent);
    const marketingConsent = Boolean(body?.marketingConsent);
    const machineName = String(body?.machineName || "").trim();
    const createdAt = String(body?.createdAt || new Date().toISOString());

    if (!consentId || !scanConsent) {
      return NextResponse.json(
        { ok: false, error: "Scan consent is required." },
        { status: 400 }
      );
    }

    if (version && version !== SCAN_CONSENT_VERSION) {
      return NextResponse.json(
        { ok: false, error: "Consent version is not accepted." },
        { status: 400 }
      );
    }

    if (IS_VERCEL) {
      return NextResponse.json({
        ok: true,
        consentId,
        source: "session",
      });
    }

    const { sqliteDb } = await import("@/lib/sqlite-db");
    sqliteDb.saveScanConsentRecord({
      consentId,
      version: version || SCAN_CONSENT_VERSION,
      scanConsent,
      marketingConsent,
      machineName,
      createdAt,
    });

    return NextResponse.json({
      ok: true,
      consentId,
      source: "database",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save scan consent";
    console.error("[Scan Consent API] POST error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
