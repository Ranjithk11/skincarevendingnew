import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IS_VERCEL = process.env.VERCEL === "1";

/** GET — whether this machine is blocking buys due to a dispense issue. */
export async function GET() {
  if (IS_VERCEL) {
    return NextResponse.json({
      success: true,
      issueEnabled: false,
      source: "env",
    });
  }

  try {
    const { sqliteDb } = await import("@/lib/sqlite-db");
    return NextResponse.json({
      success: true,
      issueEnabled: sqliteDb.getDispenseIssueEnabled(),
      source: "database",
    });
  } catch (error: unknown) {
    console.error("[Dispense Issue API] GET error:", error);
    return NextResponse.json({
      success: true,
      issueEnabled: false,
      source: "fallback",
    });
  }
}

/** POST — enable/disable the dispense-issue buy block (kiosk only). */
export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json(
      {
        success: false,
        error: "Dispense issue toggle is only available on the kiosk machine.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const issueEnabled = Boolean(body?.issueEnabled);

    const { sqliteDb } = await import("@/lib/sqlite-db");
    sqliteDb.setDispenseIssueEnabled(issueEnabled);

    return NextResponse.json({
      success: true,
      issueEnabled,
      message: issueEnabled
        ? "Dispense issue ON - customers cannot buy on this machine"
        : "Dispense issue OFF - buying and payments work as usual",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update dispense issue setting";
    console.error("[Dispense Issue API] POST error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
