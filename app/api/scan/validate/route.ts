import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IS_VERCEL = process.env.VERCEL === "1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const consentId = String(body?.consentId || "").trim();
    const hasIdentifiableFace = Boolean(body?.hasIdentifiableFace);

    if (!consentId) {
      return NextResponse.json(
        { ok: false, error: "Scan consent is required before processing." },
        { status: 400 }
      );
    }

    if (!hasIdentifiableFace) {
      return NextResponse.json(
        { ok: false, error: "No identifiable face was found. Scan was not processed." },
        { status: 400 }
      );
    }

    if (IS_VERCEL) {
      return NextResponse.json({ ok: true, source: "session" });
    }

    try {
      const { sqliteDb } = await import("@/lib/sqlite-db");
      const record = sqliteDb.getScanConsentRecord(consentId);
      if (record && !record.scanConsent) {
        return NextResponse.json(
          { ok: false, error: "Scan consent is required before processing." },
          { status: 403 }
        );
      }
    } catch (error) {
      console.warn("[Scan Validate API] sqlite lookup skipped:", error);
    }

    return NextResponse.json({ ok: true, source: "database" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Scan could not be validated";
    console.error("[Scan Validate API] POST error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
