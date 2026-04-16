import { NextRequest, NextResponse } from "next/server";
import {
  pushSaleWithRetry,
  LeafwaterOrder,
  PosiflyPayload,
  transformOrderToPosifly,
  getPosiflyConfig,
} from "@/lib/posifly";
import { adminDb } from "@/lib/admin-db";
import { localBillToAnalyticsSyncPayload, pushPosSyncToAnalytics } from "@/lib/analytics-sync";

/**
 * POST /api/posifly/push-sale
 * 
 * Pushes a completed sale to POSIFLY POS system.
 * This endpoint is called after a successful payment and order recording.
 * 
 * Request Body:
 * {
 *   orderId: string,
 *   items: Array<{ productId, productName, quantity, price, category?, brand? }>,
 *   totalAmount: number,
 *   discountAmount?: number,
 *   paymentId?: string,
 *   razorpayOrderId?: string,
 *   paymentMode?: string,
 *   customerName?: string,
 *   customerMobile?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.orderId) {
      return NextResponse.json(
        { success: false, error: { message: "orderId is required" } },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "items array is required and must not be empty" } },
        { status: 400 }
      );
    }

    if (typeof body.totalAmount !== "number" || body.totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { message: "totalAmount must be a positive number" } },
        { status: 400 }
      );
    }

    // Build the order object
    const order: LeafwaterOrder = {
      orderId: body.orderId,
      items: body.items.map((item: any) => ({
        productId: item.productId || "",
        productName: item.productName || item.name || "Unknown Product",
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        slotId: item.slotId,
        category: item.category,
        brand: item.brand,
        hsnCode: item.hsnCode,
      })),
      totalAmount: body.totalAmount,
      discountAmount: body.discountAmount || 0,
      paymentId: body.paymentId,
      razorpayOrderId: body.razorpayOrderId,
      paymentMode: body.paymentMode,
      customerName: body.customerName,
      customerMobile: body.customerMobile,
      createdAt: body.createdAt || new Date(),
    };

    console.log("[POSIFLY API] Received push-sale request:", order.orderId);

    // Save to local POSIFLY tables (regardless of external push success)
    try {
      const posiflyPayload = transformOrderToPosifly(order);
      const config = getPosiflyConfig();
      const itemsForDb = posiflyPayload.item_details.items.map((item) => ({
        billNumber: posiflyPayload.bill_details.billNumber,
        outletRefId: config.outletRefId,
        itemRefId: item.itemRefId,
        name: item.name,
        brand: item.brand || "",
        barcode: item.barcode || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
        hsnCode: item.hsnCode || "",
        uom: item.uom,
        uomValue: item.uomValue,
        mrp: item.mrp,
        sp: item.sp,
        discountValue: item.discountValue || 0,
        quantity: item.quantity,
        taxes: item.taxes,
      }));

      adminDb.savePosiflyBill({
        billDetails: posiflyPayload.bill_details,
        items: itemsForDb,
        paymentDetails: posiflyPayload.payment_details,
        chargesDetails: posiflyPayload.charges_details,
      });
      console.log("[POSIFLY API] Saved bill to local DB:", posiflyPayload.bill_details.billNumber);

      // Also push to LW Analytics backend (fire-and-forget)
      try {
        const fullBill = adminDb.getPosiflyFullBill(posiflyPayload.bill_details.billNumber);
        if (fullBill) {
          const analyticsPayload = localBillToAnalyticsSyncPayload(fullBill);
          pushPosSyncToAnalytics(analyticsPayload)
            .then((res) => console.log("[Analytics] POS synced:", res.bill_number))
            .catch((err) => console.warn("[Analytics] POS sync failed (non-blocking):", err?.message));
        }
      } catch (analyticsErr: any) {
        console.warn("[Analytics] POS sync prep failed (non-blocking):", analyticsErr?.message);
      }
    } catch (dbErr) {
      console.warn("[POSIFLY API] Failed to save to local DB:", dbErr);
    }

    // Push to POSIFLY with retry logic
    const result = await pushSaleWithRetry(order, 3, 1000);

    if (result.success) {
      console.log("[POSIFLY API] Successfully pushed sale:", order.orderId);
      return NextResponse.json({
        success: true,
        message: "Sale pushed to POSIFLY successfully",
        data: result.data,
      });
    } else {
      console.error("[POSIFLY API] Failed to push sale:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("[POSIFLY API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error?.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posifly/push-sale
 * 
 * Test endpoint to verify POSIFLY configuration.
 * Returns the current configuration status (without exposing sensitive data).
 */
export async function GET() {
  const apiUrl = process.env.POSIFLY_API_URL;
  const apiKey = process.env.POSIFLY_API_KEY;
  const outletRefId = process.env.POSIFLY_OUTLET_REF_ID;
  const posTerminalId = process.env.POSIFLY_POS_TERMINAL_ID;

  return NextResponse.json({
    success: true,
    config: {
      apiUrlConfigured: !!apiUrl,
      apiKeyConfigured: !!apiKey,
      outletRefId: outletRefId || "LEAFWATER_001 (default)",
      posTerminalId: posTerminalId || "VENDING_01 (default)",
    },
    message: apiUrl && apiKey
      ? "POSIFLY integration is configured and ready"
      : "POSIFLY integration is not fully configured. Set POSIFLY_API_URL and POSIFLY_API_KEY environment variables.",
  });
}

/**
 * POST /api/posifly/push-sale/test
 * 
 * Test transformation without actually sending to POSIFLY.
 * Useful for validating payload format.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const order: LeafwaterOrder = {
      orderId: body.orderId || `TEST-${Date.now()}`,
      items: body.items || [
        {
          productId: "SAMPLE-001",
          productName: "Sample Product",
          quantity: 1,
          price: 500,
          category: "Skincare",
        },
      ],
      totalAmount: body.totalAmount || 500,
      discountAmount: body.discountAmount || 0,
      paymentId: body.paymentId || "test_payment_id",
      paymentMode: body.paymentMode || "live",
      createdAt: new Date(),
    };

    const payload: PosiflyPayload = transformOrderToPosifly(order);

    return NextResponse.json({
      success: true,
      message: "Test transformation successful. This payload would be sent to POSIFLY:",
      payload,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { message: error?.message || "Transformation failed" },
      },
      { status: 500 }
    );
  }
}
