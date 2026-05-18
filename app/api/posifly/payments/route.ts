import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

/**
 * GET /api/posifly/payments - Read-only access to POSIFLY payment details
 * 
 * Query params:
 * - billNumber (required): Get payment details for a specific bill
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

    const payment = adminDb.getPosiflyPaymentByBill(billNumber);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: { message: "Payment details not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    console.error("[POSIFLY Payments] Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Failed to fetch payment details" } },
      { status: 500 }
    );
  }
}
