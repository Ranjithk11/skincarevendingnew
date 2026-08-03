import { NextRequest, NextResponse } from "next/server";
import { sqliteDb } from "@/lib/sqlite-db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body?.orderId || "").trim();
    const paymentId = String(body?.paymentId || "").trim();
    const qrCodeId = String(body?.qrCodeId || "").trim();

    const keys = [orderId, paymentId, qrCodeId].filter(Boolean);
    if (keys.length === 0) {
      return NextResponse.json(
        { success: false, error: "orderId, paymentId, or qrCodeId is required" },
        { status: 400 }
      );
    }

    const invoiceNo = sqliteDb.allocateInvoiceNo(keys);
    return NextResponse.json({ success: true, invoiceNo });
  } catch (err: any) {
    console.error("[invoice/allocate] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to allocate invoice number" },
      { status: 500 }
    );
  }
}
