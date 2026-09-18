import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IS_VERCEL = process.env.VERCEL === "1";

/** GET — whether travel kits are staff-enabled on this machine. */
export async function GET() {
  if (IS_VERCEL) {
    return NextResponse.json({
      success: true,
      staffAvailable: true,
      source: "env",
    });
  }

  try {
    const { sqliteDb } = await import("@/lib/sqlite-db");
    return NextResponse.json({
      success: true,
      staffAvailable: sqliteDb.getTravelKitsStaffAvailable(),
      source: "database",
    });
  } catch (error: unknown) {
    console.error("[Travel Kits API] GET error:", error);
    return NextResponse.json({
      success: true,
      staffAvailable: true,
      source: "fallback",
    });
  }
}

/** POST — toggle travel kits staff availability (kiosk only). */
export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json(
      {
        success: false,
        error: "Travel kit staff toggle is only available on the kiosk machine.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const staffAvailable = Boolean(body?.staffAvailable);

    const { sqliteDb } = await import("@/lib/sqlite-db");
    sqliteDb.setTravelKitsStaffAvailable(staffAvailable);

    return NextResponse.json({
      success: true,
      staffAvailable,
      message: staffAvailable
        ? "Travel kits enabled (within staff hours)"
        : "Travel kits hidden until staff is available",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update travel kits setting";
    console.error("[Travel Kits API] POST error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
