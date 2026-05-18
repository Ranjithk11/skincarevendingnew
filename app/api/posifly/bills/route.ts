import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";
import { transformOrderToPosifly, LeafwaterOrder, getPosiflyConfig } from "@/lib/posifly";
import { localBillToAnalyticsSyncPayload, pushPosSyncToAnalytics, pushSaleToVendingSync } from "@/lib/analytics-sync";

/**
 * GET /api/posifly/bills - Read-only access to POSIFLY bill data
 * 
 * Query params:
 * - billNumber: Get a specific bill with all details
 * - limit: Number of bills to return (default 100)
 * - offset: Offset for pagination (default 0)
 * - full: If "true", return all related data (items, payments, charges)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billNumber = searchParams.get("billNumber");
    const full = searchParams.get("full") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (billNumber) {
      if (full) {
        const data = adminDb.getPosiflyFullBill(billNumber);
        if (!data) {
          return NextResponse.json(
            { success: false, error: { message: "Bill not found" } },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data });
      }

      const bill = adminDb.getPosiflyBillByNumber(billNumber);
      if (!bill) {
        return NextResponse.json(
          { success: false, error: { message: "Bill not found" } },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: bill });
    }

    if (full) {
      const data = adminDb.getAllPosiflyData(limit, offset);
      return NextResponse.json({ success: true, data, count: data.length });
    }

    const bills = adminDb.getPosiflyBills(limit, offset);
    return NextResponse.json({ success: true, data: bills, count: bills.length });
  } catch (error: any) {
    console.error("[POSIFLY Bills] Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Failed to fetch bills" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posifly/bills - Save POSIFLY bill data after successful payment
 * 
 * This is called internally after a payment is completed.
 * It transforms the order data into POSIFLY format and saves it to the DB.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.orderId) {
      return NextResponse.json(
        { success: false, error: { message: "orderId is required" } },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "items array is required" } },
        { status: 400 }
      );
    }

    if (typeof body.totalAmount !== "number" || body.totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { message: "totalAmount must be a positive number" } },
        { status: 400 }
      );
    }

    // Build LeafwaterOrder
    const order: LeafwaterOrder = {
      orderId: body.orderId,
      items: body.items.map((item: any) => ({
        productId: item.productId || "",
        productName: item.productName || item.name || "Unknown",
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        slotId: item.slotId,
        category: item.category || "Skincare",
        brand: item.brand || "",
        hsnCode: item.hsnCode || "",
      })),
      totalAmount: body.totalAmount,
      discountAmount: body.discountAmount || 0,
      paymentId: body.paymentId,
      razorpayOrderId: body.razorpayOrderId,
      paymentMode: body.paymentMode || "live",
      customerName: body.customerName,
      customerMobile: body.customerMobile,
      createdAt: body.createdAt || new Date(),
    };

    // Transform to POSIFLY format
    const posiflyPayload = transformOrderToPosifly(order);
    const config = getPosiflyConfig();

    // Prepare items for DB insertion
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

    // Save to POSIFLY tables
    const billNumber = adminDb.savePosiflyBill({
      billDetails: posiflyPayload.bill_details,
      items: itemsForDb,
      paymentDetails: posiflyPayload.payment_details,
      chargesDetails: posiflyPayload.charges_details,
    });

    console.log("[POSIFLY Bills] Saved bill:", billNumber);

    const withTimeout = async <T,>(
      label: string,
      promiseFactory: (signal: AbortSignal) => Promise<T>,
      timeoutMs: number
    ): Promise<T> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await promiseFactory(controller.signal);
      } catch (err: any) {
        if (controller.signal.aborted) {
          throw new Error(`${label} timed out after ${timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(t);
      }
    };

    const retryOnce = async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        return await fn();
      }
    };

    // Also push to LW Analytics backend (best-effort, but reliable)
    try {
      const unprefixBillNumber = (bn: string): string => {
        if (!bn) return bn;
        const m = bn.match(/^LW-\d{8}-(.+)$/);
        return m?.[1] || bn;
      };

      const candidates = Array.from(
        new Set([
          billNumber,
          posiflyPayload.bill_details.billNumber,
          body.orderId,
          unprefixBillNumber(billNumber),
          unprefixBillNumber(posiflyPayload.bill_details.billNumber),
        ].filter(Boolean))
      );

      let fullBill: any = null;
      for (const bn of candidates) {
        fullBill = adminDb.getPosiflyFullBill(bn);
        if (fullBill) break;
      }

      if (fullBill) {
        const posSyncPromise = withTimeout(
          "POS sync",
          async (signal) => {
            const payload = localBillToAnalyticsSyncPayload(fullBill);
            return pushPosSyncToAnalytics(payload, { signal });
          },
          8000
        );

        const vendingSyncPromise = retryOnce(() =>
          withTimeout(
            "Vending sync",
            async (signal) => pushSaleToVendingSync(fullBill, { signal }),
            12000
          )
        );

        const [posRes, vendingRes] = await Promise.allSettled([
          posSyncPromise,
          vendingSyncPromise,
        ]);

        if (posRes.status === "fulfilled") {
          console.log("[Analytics] POS synced:", (posRes.value as any)?.bill_number || billNumber);
        } else {
          console.warn("[Analytics] POS sync failed (non-blocking):", posRes.reason?.message || posRes.reason);
        }

        if (vendingRes.status === "fulfilled") {
          console.log("[Analytics] Vending synced:", (vendingRes.value as any)?.sync_id || billNumber);
        } else {
          console.warn(
            "[Analytics] Vending sync failed (non-blocking):",
            vendingRes.reason?.message || vendingRes.reason
          );
        }
      }
    } catch (analyticsErr: any) {
      console.warn("[Analytics] POS sync prep failed (non-blocking):", analyticsErr?.message);
    }

    return NextResponse.json({
      success: true,
      billNumber,
      message: "POSIFLY bill saved successfully",
    });
  } catch (error: any) {
    console.error("[POSIFLY Bills] Error saving:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Failed to save bill" } },
      { status: 500 }
    );
  }
}
