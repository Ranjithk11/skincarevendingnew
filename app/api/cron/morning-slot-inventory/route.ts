import { NextResponse } from "next/server";
import { maybeMorningInventorySync } from "@/lib/slot-webhook";

export const dynamic = "force-dynamic";

/**
 * Lightweight tick for the ~9 AM IST morning slot inventory webhook.
 * Called periodically by the kiosk UI so the send still happens even when
 * nobody is browsing /admin/slots.
 */
export async function GET() {
  try {
    if (process.env.VERCEL === "1") {
      return NextResponse.json({ success: true, sent: false, reason: "vercel" });
    }
    const result = await maybeMorningInventorySync();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[morning-inventory] tick failed:", error);
    return NextResponse.json(
      { success: false, error: String((error as Error)?.message || error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
