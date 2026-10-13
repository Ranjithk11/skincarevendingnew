import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IS_VERCEL = process.env.VERCEL === "1";

/** GET — whether the landing shop overlay is on for this machine. */
export async function GET() {
  if (IS_VERCEL) {
    return NextResponse.json({
      success: true,
      shopEnabled: false,
      source: "env",
    });
  }

  try {
    const { sqliteDb } = await import("@/lib/sqlite-db");
    return NextResponse.json({
      success: true,
      shopEnabled: sqliteDb.getLandingShopEnabled(),
      source: "database",
    });
  } catch (error: unknown) {
    console.error("[Landing Shop API] GET error:", error);
    return NextResponse.json({
      success: true,
      shopEnabled: false,
      source: "fallback",
    });
  }
}

/** POST — show or hide the landing shop overlay (kiosk only). */
export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json(
      {
        success: false,
        error: "Landing shop toggle is only available on the kiosk machine.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const shopEnabled = Boolean(body?.shopEnabled);

    const { sqliteDb } = await import("@/lib/sqlite-db");
    sqliteDb.setLandingShopEnabled(shopEnabled);

    return NextResponse.json({
      success: true,
      shopEnabled,
      message: shopEnabled
        ? "Landing shop ON - deals overlay is visible"
        : "Landing shop OFF - home stays on the current landing",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update landing shop setting";
    console.error("[Landing Shop API] POST error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
