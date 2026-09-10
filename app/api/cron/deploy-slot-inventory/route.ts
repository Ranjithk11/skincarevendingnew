import { NextResponse } from "next/server";
import { sendAllSlotsUpdate } from "@/lib/slot-webhook";

export const dynamic = "force-dynamic";

/**
 * Called once after update-and-restart.bat brings the server up.
 * Pushes all 60 slots to the inventory Make webhook (deploy_sync).
 * Does not affect 9 AM / 6 PM scheduled windows or per-assignment sends.
 */
async function runDeploySync() {
  if (process.env.VERCEL === "1") {
    return NextResponse.json({ success: true, sent: false, reason: "vercel" });
  }

  const ok = await sendAllSlotsUpdate([], "deploy_sync");
  return NextResponse.json({
    success: ok,
    sent: ok,
    updateType: "deploy_sync",
  });
}

export async function GET() {
  try {
    return await runDeploySync();
  } catch (error) {
    console.error("[deploy-slot-inventory] failed:", error);
    return NextResponse.json(
      { success: false, error: String((error as Error)?.message || error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
