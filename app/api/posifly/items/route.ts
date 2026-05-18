import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

/**
 * GET /api/posifly/items - Read-only access to POSIFLY item details
 * 
 * Query params:
 * - billNumber (required): Get items for a specific bill
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

    const items = adminDb.getPosiflyItemsByBill(billNumber);
    return NextResponse.json({ success: true, data: items, count: items.length });
  } catch (error: any) {
    console.error("[POSIFLY Items] Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Failed to fetch items" } },
      { status: 500 }
    );
  }
}
