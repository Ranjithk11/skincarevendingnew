import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

/**
 * GET /api/posifly/charges - Read-only access to POSIFLY charges details
 * 
 * Query params:
 * - billNumber (required): Get charges for a specific bill
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billNumber = searchParams.get("billNumber");

    if (!billNumber) {
      return NextResponse.json(
        { success: false, error: { message: "billNumber query param is required" } },
        { status: 400 }
      );
    }

    const charges = adminDb.getPosiflyChargesByBill(billNumber);
    if (!charges) {
      return NextResponse.json(
        { success: false, error: { message: "Charges details not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: charges });
  } catch (error: any) {
    console.error("[POSIFLY Charges] Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Failed to fetch charges" } },
      { status: 500 }
    );
  }
}
