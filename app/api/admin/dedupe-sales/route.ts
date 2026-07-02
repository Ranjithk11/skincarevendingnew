import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";
import { findAnalyticsDuplicateTransactions } from "@/lib/analytics-duplicate-report";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dedupe-sales
 * Preview duplicate rows in local SQLite (and optional analytics report).
 *
 * Query params:
 * - analytics=1  include read-only LW Analytics duplicate report
 * - machine_id=  override machine filter for analytics report
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAnalytics = searchParams.get("analytics") === "1";
    const machineId = searchParams.get("machine_id") || undefined;

    const local = adminDb.previewSalesDuplicates();
    const response: Record<string, unknown> = {
      success: true,
      local,
      message:
        "POST to this endpoint to delete duplicate local sales data. Analytics dashboard duplicates require backend DB cleanup.",
    };

    if (includeAnalytics) {
      response.analytics = await findAnalyticsDuplicateTransactions(machineId);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Dedupe Sales] Preview error:", error?.message || error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to preview duplicates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/dedupe-sales
 * Remove duplicate orders, POSIFLY bills, and transactions from local SQLite.
 */
export async function POST() {
  try {
    const result = adminDb.dedupeAllSalesData();
    return NextResponse.json({
      success: true,
      message: "Local duplicate sales data cleaned up",
      result,
    });
  } catch (error: any) {
    console.error("[Dedupe Sales] Cleanup error:", error?.message || error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to dedupe sales data" },
      { status: 500 }
    );
  }
}
