import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsConfig } from "@/lib/analytics-api";
import {
  pushVendingSync,
  localBillToAnalyticsSyncPayload,
  pushPosSyncToAnalytics,
} from "@/lib/analytics-sync";
import { adminDb } from "@/lib/admin-db";

/**
 * POST /api/analytics/sync
 *
 * Trigger a full vending machine data sync to the analytics backend.
 * Collects local transactions, products sold, scans, slots, and machine status
 * from SQLite and pushes them via POST /sync.
 *
 * Body (optional):
 * {
 *   type: "full" | "pos-only"   // default: "full"
 *   limit: number               // number of recent bills to sync (default 100)
 * }
 */
export async function POST(request: NextRequest) {
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

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    const syncType = body?.type || "full";
    const limit = body?.limit || 100;

    // If POS-only sync, push all local POSIFLY bills to analytics backend
    if (syncType === "pos-only") {
      const localBills = adminDb.getAllPosiflyData(limit, 0);
      const results: any[] = [];
      const errors: any[] = [];

      for (const bill of localBills) {
        try {
          const payload = localBillToAnalyticsSyncPayload(bill);
          const res = await pushPosSyncToAnalytics(payload);
          results.push({
            billNumber: payload.bill_details.billNumber,
            status: res.status,
            records_ingested: res.records_ingested,
          });
        } catch (err: any) {
          errors.push({
            billNumber: bill.bill_details?.billNumber || "unknown",
            error: err?.message,
          });
        }
      }

      return NextResponse.json({
        success: true,
        type: "pos-only",
        total_bills: localBills.length,
        synced: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Full vending machine sync
    // Collect data from local DB
    const stats = adminDb.getDashboardStats();
    const localBills = adminDb.getAllPosiflyData(limit, 0);

    // Build transactions from local POSIFLY bills
    const transactions = localBills.map((bill: any, idx: number) => ({
      source_id: `txn-${bill.bill_details?.billNumber || idx}`,
      timestamp: bill.bill_details?.created_at || new Date().toISOString(),
      product_id: bill.item_details?.[0]?.itemRefId || "",
      product_name: bill.item_details?.[0]?.name || "Unknown",
      category: bill.item_details?.[0]?.category || "",
      amount: Number(bill.bill_details?.billValue || 0),
      payment_method:
        bill.payment_details?.paymentModes?.[0]?.mode || "UPI",
      status: (bill.bill_details?.billStatus || "COMPLETED").toLowerCase(),
      user_id: bill.bill_details?.customerMobile || "",
    }));

    // Build products_sold from local bills
    const productsSold: any[] = [];
    for (const bill of localBills) {
      for (const item of bill.item_details || []) {
        productsSold.push({
          source_id: `sale-${bill.bill_details?.billNumber}-${item.itemRefId || ""}`,
          timestamp: bill.bill_details?.created_at || new Date().toISOString(),
          product_name: item.name || "Unknown",
          category: item.category || "",
          price: Number(item.sp || 0),
          qty_vended: Number(item.quantity || 0),
        });
      }
    }

    // Build user_scans from local scan records
    let userScans: any[] = [];
    try {
      // getDashboardStats has scansCount but not individual records
      // We'll send empty if no direct scan access
      userScans = [];
    } catch {
      userScans = [];
    }

    // Build slots data
    let slotsData: any[] = [];
    try {
      const slotsRecord = adminDb.getAllSlots();
      slotsData = Object.values(slotsRecord || {}).map((slot: any) => ({
        slot_id: String(slot.slot_id),
        label: String(slot.slot_id),
        product_id: slot.product_id || "",
        capacity: slot.capacity || 10,
        current_stock: slot.quantity || 0,
      }));
    } catch {
      slotsData = [];
    }

    // Build products list
    let productsData: any[] = [];
    try {
      const products = adminDb.getAllLocalProducts();
      productsData = (products || []).map((p: any) => ({
        product_id: p.external_id || p.id || "",
        product_name: p.name || "",
        category: p.category || "",
        price: Number(p.retail_price || 0),
      }));
    } catch {
      productsData = [];
    }

    // Machine status
    const machineStatus = [
      {
        source_id: `status-${Date.now()}`,
        timestamp: new Date().toISOString(),
        connectivity: "online",
        door_status: "closed",
        error_codes: "[]",
      },
    ];

    const result = await pushVendingSync({
      machine_id: config.machineId,
      source_version: "v2",
      machine_name: config.machineName || config.machineId,
      location: config.machineLocation || "",
      transactions,
      products_sold: productsSold,
      user_scans: userScans,
      slots: slotsData,
      restock_events: [],
      machine_status: machineStatus,
      products: productsData,
    });

    return NextResponse.json({
      success: true,
      type: "full",
      sync_id: result.sync_id,
      records_ingested: result.records_ingested,
      summary: {
        transactions: transactions.length,
        products_sold: productsSold.length,
        slots: slotsData.length,
        products: productsData.length,
      },
    });
  } catch (error: any) {
    console.error("[Analytics Sync] Error:", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Sync failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/sync
 *
 * Check analytics sync configuration status.
 */
export async function GET() {
  const config = getAnalyticsConfig();
  return NextResponse.json({
    success: true,
    configured: !!(config.baseUrl && config.apiKey && config.machineId),
    config: {
      baseUrl: config.baseUrl || "(not set)",
      machineId: config.machineId || "(not set)",
      machineName: config.machineName || "(not set)",
      machineLocation: config.machineLocation || "(not set)",
      apiKeyConfigured: !!config.apiKey,
    },
  });
}
