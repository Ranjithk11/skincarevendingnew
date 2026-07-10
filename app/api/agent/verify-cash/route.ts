import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Verifies an agent's credentials before allowing a cash sale + dispense.
// The password is validated server-side so the secret never ships in the
// client bundle. Override the default via the AGENT_CASH_PASSWORD env var.
const DEFAULT_AGENT_CASH_PASSWORD = "BeautyPod@2026";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agentName = String(body?.agentName || "").trim();
    const password = String(body?.password || "");

    if (!agentName) {
      return NextResponse.json(
        { success: false, message: "Agent name is required" },
        { status: 400 }
      );
    }

    const expected = process.env.AGENT_CASH_PASSWORD || DEFAULT_AGENT_CASH_PASSWORD;

    if (password !== expected) {
      return NextResponse.json(
        { success: false, message: "Invalid agent password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, agentName });
  } catch (error) {
    console.error("[verify-cash] Error:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
