import { NextResponse } from "next/server";
import { getAnalyticsConfig } from "@/lib/analytics-api";
import { sendHeartbeat } from "@/lib/analytics-sync";

/**
 * POST /api/analytics/heartbeat
 *
 * Send a machine heartbeat to the LW Analytics backend.
 * Called periodically by the frontend or a cron job.
 */
export async function POST() {
  try {
    const config = getAnalyticsConfig();

    if (!config.machineId || !config.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "LW_MACHINE_ID and LW_MACHINE_API_KEY must be configured",
        },
        { status: 400 }
      );
    }

    const result = await sendHeartbeat();

    return NextResponse.json({
      success: true,
      machine_id: result.machine_id,
      status: result.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Analytics Heartbeat] Error:", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Heartbeat failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/heartbeat
 *
 * Check heartbeat configuration status.
 */
export async function GET() {
  const config = getAnalyticsConfig();
  return NextResponse.json({
    success: true,
    configured: !!(config.baseUrl && config.apiKey && config.machineId),
    machine_id: config.machineId || "(not set)",
  });
}
