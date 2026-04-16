import { NextRequest, NextResponse } from "next/server";
import {
  getPosSummary,
  getPosBills,
  getPosItems,
  getPosPayments,
  getPosCharges,
  getDashboardSummary,
  getDashboardTransactions,
  getDashboardProductsSold,
  getDashboardScans,
  getDashboardTopProducts,
  getDashboardRevenueTrend,
  getDashboardMachineStatus,
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
} from "@/lib/analytics-api";

/**
 * GET /api/analytics/dashboard
 *
 * Unified proxy for all analytics dashboard read APIs.
 *
 * Query params:
 * - endpoint: which dashboard API to call (required)
 * - date_from: YYYY-MM-DD
 * - date_to: YYYY-MM-DD
 * - machine_id: optional machine filter
 * - page: pagination page number
 * - page_size: pagination page size
 *
 * Supported endpoints:
 *   posifly/summary, posifly/bills, posifly/items, posifly/payments, posifly/charges,
 *   summary, transactions, products-sold, scans, top-products, revenue-trend,
 *   machine-status, machines
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    const date_from = searchParams.get("date_from") || "";
    const date_to = searchParams.get("date_to") || "";
    const machine_id = searchParams.get("machine_id") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const page_size = parseInt(searchParams.get("page_size") || "50");

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "endpoint query param is required" },
        { status: 400 }
      );
    }

    const dateParams = { date_from, date_to, machine_id };
    const paginatedParams = { ...dateParams, page, page_size };

    let data: any;

    switch (endpoint) {
      // POS Dashboard APIs
      case "posifly/summary":
        data = await getPosSummary(dateParams);
        break;
      case "posifly/bills":
        data = await getPosBills(paginatedParams);
        break;
      case "posifly/items":
        data = await getPosItems(paginatedParams);
        break;
      case "posifly/payments":
        data = await getPosPayments(paginatedParams);
        break;
      case "posifly/charges":
        data = await getPosCharges(paginatedParams);
        break;

      // General Vending Dashboard APIs
      case "summary":
        data = await getDashboardSummary(dateParams);
        break;
      case "transactions":
        data = await getDashboardTransactions(paginatedParams);
        break;
      case "products-sold":
        data = await getDashboardProductsSold(paginatedParams);
        break;
      case "scans":
        data = await getDashboardScans(paginatedParams);
        break;
      case "top-products":
        data = await getDashboardTopProducts(dateParams);
        break;
      case "revenue-trend":
        data = await getDashboardRevenueTrend(dateParams);
        break;
      case "machine-status":
        data = await getDashboardMachineStatus(dateParams);
        break;
      case "machines":
        data = await getMachines();
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown endpoint: ${endpoint}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[Analytics Dashboard] Error:", error?.message);
    const status = error?.message?.includes("401") ? 401
      : error?.message?.includes("422") ? 422
      : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Dashboard fetch failed" },
      { status }
    );
  }
}

/**
 * POST /api/analytics/dashboard
 *
 * Proxy for creating machines.
 * Body: { action: "create-machine", ...machineData }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...rest } = body;

    if (action === "create-machine") {
      if (!rest.machine_id) {
        return NextResponse.json(
          { success: false, error: "machine_id is required" },
          { status: 400 }
        );
      }
      const data = await createMachine({
        machine_id: rest.machine_id,
        machine_name: rest.machine_name || rest.machine_id,
        location: rest.location || "",
        version: rest.version || "v2",
        api_key: rest.api_key || "",
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === "update-machine") {
      if (!rest.machine_id) {
        return NextResponse.json(
          { success: false, error: "machine_id is required" },
          { status: 400 }
        );
      }
      const { machine_id, ...updateData } = rest;
      const data = await updateMachine(machine_id, updateData);
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete-machine") {
      if (!rest.machine_id) {
        return NextResponse.json(
          { success: false, error: "machine_id is required" },
          { status: 400 }
        );
      }
      const data = await deleteMachine(rest.machine_id);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Analytics Dashboard POST] Error:", error?.message);
    const status = error?.message?.includes("409") ? 409 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Action failed" },
      { status }
    );
  }
}
