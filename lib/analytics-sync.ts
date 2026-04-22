/**
 * Analytics Sync Module
 *
 * Handles pushing POS data, vending machine data, and heartbeat
 * to the LW Analytics backend using X-API-Key authentication.
 *
 * These are machine-facing endpoints (not dashboard/JWT).
 */

import crypto from "crypto";
import { getAnalyticsConfig } from "./analytics-api";

// ============================================================================
// Types
// ============================================================================

export interface PosSyncBillDetails {
  outletRefId: string;
  posTerminalId?: string;
  billNumber: string;
  billDate: string;      // DD/MM/YYYY
  billTime: string;      // HH:MM
  billType: string;
  billValue: number;
  netAmount: number;
  taxAmount: number;
  billDiscountValue?: number;
  shiftNumber?: string;
  businessDate?: string;  // DD/MM/YYYY
  billStatus: string;
  isComplementBill?: boolean;
  currency?: string;
  customerName?: string;
  customerMobile?: string;
}

export interface PosSyncItem {
  itemRefId?: string;
  name: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  barcode?: string;
  hsnCode?: string;
  uom?: string;
  uomValue?: number;
  mrp?: number;
  sp?: number;
  quantity: number;
  discountValue?: number;
  taxes?: Array<{ name: string; value: string }>;
}

export interface PosSyncPaymentMode {
  mode: string;
  value: number;
}

export interface PosSyncCharge {
  mode: string;
  value: number;
}

export interface PosSyncPayload {
  machine_id: string;
  machine_name: string;
  location: string;
  bill_details: PosSyncBillDetails;
  item_details: {
    billNumber: string;
    outletRefId: string;
    items: PosSyncItem[];
  };
  payment_details: {
    billNumber: string;
    outletRefId: string;
    paymentModes: PosSyncPaymentMode[];
  };
  charges_details: {
    billNumber: string;
    outletRefId: string;
    charges: PosSyncCharge[];
  };
}

export interface VendingSyncPayload {
  machine_id: string;
  source_version: "v1" | "v2";
  sync_id: string;
  synced_at: string;
  payload_hash: string;
  machine_name: string;
  location: string;
  transactions?: Array<{
    source_id: string;
    timestamp: string;
    product_id: string;
    product_name: string;
    category?: string;
    amount: number;
    payment_method: string;
    status: string;
    user_id?: string;
  }>;
  products_sold?: Array<{
    source_id: string;
    timestamp: string;
    product_name: string;
    category?: string;
    price: number;
    qty_vended: number;
  }>;
  user_scans?: Array<{
    source_id: string;
    user_id: string;
    scan_timestamp: string;
    scan_method?: string;
  }>;
  slots?: Array<{
    slot_id: string;
    label?: string;
    product_id?: string;
    capacity?: number;
    current_stock?: number;
  }>;
  restock_events?: Array<{
    source_id: string;
    timestamp: string;
    slot_id: string;
    product_id?: string;
    qty_added: number;
    restocked_by?: string;
  }>;
  machine_status?: Array<{
    source_id: string;
    timestamp: string;
    temperature?: number;
    door_status?: string;
    connectivity?: string;
    error_codes?: string;
  }>;
  products?: Array<{
    product_id: string;
    product_name: string;
    category?: string;
    price?: number;
  }>;
}

// ============================================================================
// Helpers
// ============================================================================

function machineHeaders(): Record<string, string> {
  const config = getAnalyticsConfig();
  if (!config.apiKey) {
    throw new Error("[Analytics Sync] LW_MACHINE_API_KEY is not configured");
  }
  return {
    "Content-Type": "application/json",
    "X-API-Key": config.apiKey,
  };
}

function isConfigured(): boolean {
  const config = getAnalyticsConfig();
  return !!(config.baseUrl && config.apiKey && config.machineId);
}

/**
 * Recursively sort object keys (to match Python json.dumps sort_keys=True).
 */
function sortKeysDeep(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)])
    );
  }
  return obj;
}

/**
 * Mimic Python's json.dumps() default separators (', ' and ': ')
 * by walking the compact JSON string and inserting spaces only at
 * structural positions (not inside quoted strings).
 */
function pyStyleSerialize(obj: any): string {
  const compact = JSON.stringify(obj);
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < compact.length; i++) {
    const ch = compact[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === "\\" && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (!inString && ch === ":") { result += ": "; continue; }
    if (!inString && ch === ",") { result += ", "; continue; }
    result += ch;
  }
  return result;
}

/**
 * Build SHA-256 payload hash for /sync as per spec (Section 11).
 * Backend uses Python json.dumps(data, sort_keys=True) with default
 * separators (', ' / ': ') to compute the hash.
 */
export function buildPayloadHash(payload: Partial<VendingSyncPayload>): string {
  const allRecords = [
    ...(payload.transactions || []),
    ...(payload.products_sold || []),
    ...(payload.user_scans || []),
    ...(payload.slots || []),
    ...(payload.restock_events || []),
    ...(payload.machine_status || []),
    ...(payload.products || []),
  ];
  const serialised = pyStyleSerialize(sortKeysDeep(allRecords));
  return crypto.createHash("sha256").update(serialised).digest("hex");
}

// ============================================================================
// POS Ingestion APIs (Section 9)
// ============================================================================

/**
 * Push a combined POS bill to the analytics backend via POST /posifly/sync
 */
export async function pushPosSyncToAnalytics(
  payload: PosSyncPayload,
  options?: { signal?: AbortSignal }
): Promise<{ status: string; machine_id: string; bill_number: string; records_ingested: number }> {
  if (!isConfigured()) {
    console.warn("[Analytics Sync] Not configured, skipping POS sync");
    throw new Error("Analytics backend not configured");
  }

  const config = getAnalyticsConfig();
  const url = `${config.baseUrl}/posifly/sync`;

  const res = await fetch(url, {
    method: "POST",
    headers: machineHeaders(),
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(
      `[Analytics Sync] POS sync failed (${res.status}): ${JSON.stringify(errBody) || res.statusText}`
    );
  }

  return res.json();
}

/**
 * Push bill details only
 */
export async function pushBillDetails(billDetails: PosSyncBillDetails) {
  const config = getAnalyticsConfig();
  const url = `${config.baseUrl}/posifly/bill-details`;

  const res = await fetch(url, {
    method: "POST",
    headers: machineHeaders(),
    body: JSON.stringify({
      machine_id: config.machineId,
      machine_name: config.machineName,
      location: config.machineLocation,
      bill_details: billDetails,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(`[Analytics Sync] Bill details push failed (${res.status}): ${JSON.stringify(errBody)}`);
  }

  return res.json();
}

/**
 * Push item details only
 */
export async function pushItemDetails(
  billNumber: string,
  outletRefId: string,
  items: PosSyncItem[]
) {
  const config = getAnalyticsConfig();
  const url = `${config.baseUrl}/posifly/item-details`;

  const res = await fetch(url, {
    method: "POST",
    headers: machineHeaders(),
    body: JSON.stringify({
      machine_id: config.machineId,
      machine_name: config.machineName,
      location: config.machineLocation,
      billNumber,
      outletRefId,
      items,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(`[Analytics Sync] Item details push failed (${res.status}): ${JSON.stringify(errBody)}`);
  }

  return res.json();
}

/**
 * Push payment details only
 */
export async function pushPaymentDetails(
  billNumber: string,
  outletRefId: string,
  paymentModes: PosSyncPaymentMode[]
) {
  const config = getAnalyticsConfig();
  const url = `${config.baseUrl}/posifly/payment-details`;

  const res = await fetch(url, {
    method: "POST",
    headers: machineHeaders(),
    body: JSON.stringify({
      machine_id: config.machineId,
      machine_name: config.machineName,
      location: config.machineLocation,
      billNumber,
      outletRefId,
      paymentModes,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(`[Analytics Sync] Payment details push failed (${res.status}): ${JSON.stringify(errBody)}`);
  }

  return res.json();
}

/**
 * Push charges details only
 */
export async function pushChargesDetails(
  billNumber: string,
  outletRefId: string,
  charges: PosSyncCharge[]
) {
  const config = getAnalyticsConfig();
  const url = `${config.baseUrl}/posifly/charges-details`;

  const res = await fetch(url, {
    method: "POST",
    headers: machineHeaders(),
    body: JSON.stringify({
      machine_id: config.machineId,
      machine_name: config.machineName,
      location: config.machineLocation,
      billNumber,
      outletRefId,
      charges,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(`[Analytics Sync] Charges details push failed (${res.status}): ${JSON.stringify(errBody)}`);
  }

  return res.json();
}

// ============================================================================
// Vending Machine Sync (Section 10)
// ============================================================================

/**
 * Full vending machine sync - POST /sync
 */
export async function pushVendingSync(
  payload: Omit<VendingSyncPayload, "payload_hash" | "synced_at" | "sync_id">,
  options?: { signal?: AbortSignal }
): Promise<{ status: string; records_ingested: number; sync_id: string }> {
  if (!isConfigured()) {
    console.warn("[Analytics Sync] Not configured, skipping vending sync");
    throw new Error("Analytics backend not configured");
  }

  const config = getAnalyticsConfig();
  const syncId = `sync-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now()}`;
  const syncedAt = new Date().toISOString();

  const fullPayload: VendingSyncPayload = {
    ...payload,
    sync_id: syncId,
    synced_at: syncedAt,
    payload_hash: buildPayloadHash(payload),
  };

  const url = `${config.baseUrl}/sync`;

  const res = await fetch(url, {
    method: "POST",
    headers: machineHeaders(),
    body: JSON.stringify(fullPayload),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(
      `[Analytics Sync] Vending sync failed (${res.status}): ${JSON.stringify(errBody) || res.statusText}`
    );
  }

  return res.json();
}

// ============================================================================
// Machine Heartbeat (Section 10.2)
// ============================================================================

/**
 * Send machine heartbeat - POST /machines/heartbeat
 */
export async function sendHeartbeat(): Promise<{ status: string; machine_id: string }> {
  if (!isConfigured()) {
    console.warn("[Analytics Sync] Not configured, skipping heartbeat");
    throw new Error("Analytics backend not configured");
  }

  const config = getAnalyticsConfig();
  const url = `${config.baseUrl}/machines/heartbeat`;

  const res = await fetch(url, {
    method: "POST",
    headers: machineHeaders(),
    body: JSON.stringify({
      machine_id: config.machineId,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(
      `[Analytics Sync] Heartbeat failed (${res.status}): ${JSON.stringify(errBody) || res.statusText}`
    );
  }

  return res.json();
}
// Convenience: Push single sale to /sync (for Dashboard + Transactions pages)
// ============================================================================

/**
 * Push a single sale as a vending sync so it appears on the Dashboard
 * and Transactions pages (not just POS Sync).
 */
export async function pushSaleToVendingSync(
  localBill: any,
  options?: { signal?: AbortSignal }
): Promise<any> {
  if (!isConfigured()) return null;

  const config = getAnalyticsConfig();
  const bd = localBill.bill_details || localBill;
  const items = localBill.item_details || [];
  const payments = localBill.payment_details?.paymentModes || [];

  const billNumber = bd.billNumber || "";
  const timestamp = bd.created_at || new Date().toISOString();

  // Build transaction record (one per bill)
  const transactions = [{
    source_id: `txn-${billNumber}`,
    timestamp,
    product_id: items[0]?.itemRefId || "",
    product_name: items[0]?.name || "Unknown",
    category: items[0]?.category || "",
    amount: Number(bd.billValue || 0),
    payment_method: payments[0]?.mode || "UPI",
    status: (bd.billStatus || "COMPLETED").toLowerCase(),
    user_id: bd.customerMobile || "",
  }];

  // Build products_sold records (one per item)
  const products_sold = items.map((item: any) => ({
    source_id: `sale-${billNumber}-${item.itemRefId || ""}`,
    timestamp,
    product_name: item.name || "Unknown",
    category: item.category || "",
    price: Number(item.sp || 0),
    qty_vended: Number(item.quantity || 0),
  }));

  return pushVendingSync({
    machine_id: config.machineId,
    source_version: "v2",
    machine_name: config.machineName || config.machineId,
    location: config.machineLocation || "",
    transactions,
    products_sold,
    user_scans: [],
    slots: [],
    restock_events: [],
    machine_status: [],
    products: [],
  }, options);
}

// ============================================================================
// Convenience: Transform local POSIFLY data to analytics sync format
// ============================================================================

/**
 * Convert a locally-saved POSIFLY bill (from SQLite) to an analytics POS sync payload.
 */
export function localBillToAnalyticsSyncPayload(localBill: any): PosSyncPayload {
  const config = getAnalyticsConfig();

  return {
    machine_id: config.machineId,
    machine_name: config.machineName,
    location: config.machineLocation,
    bill_details: {
      outletRefId: localBill.bill_details?.outletRefId || localBill.outletRefId || "",
      posTerminalId: localBill.bill_details?.posTerminalId || localBill.posTerminalId || "",
      billNumber: localBill.bill_details?.billNumber || localBill.billNumber || "",
      billDate: localBill.bill_details?.billDate || localBill.billDate || "",
      billTime: localBill.bill_details?.billTime || localBill.billTime || "",
      billType: localBill.bill_details?.billType || localBill.billType || "SALE",
      billValue: Number(localBill.bill_details?.billValue || localBill.billValue || 0),
      netAmount: Number(localBill.bill_details?.netAmount || localBill.netAmount || 0),
      taxAmount: Number(localBill.bill_details?.taxAmount || localBill.taxAmount || 0),
      billDiscountValue: Number(localBill.bill_details?.billDiscountValue || localBill.billDiscountValue || 0),
      businessDate: localBill.bill_details?.businessDate || localBill.businessDate || localBill.bill_details?.billDate || "",
      billStatus: localBill.bill_details?.billStatus || localBill.billStatus || "COMPLETED",
      currency: localBill.bill_details?.currency || localBill.currency || "INR",
      customerName: localBill.bill_details?.customerName || localBill.customerName || "",
      customerMobile: localBill.bill_details?.customerMobile || localBill.customerMobile || "",
    },
    item_details: {
      billNumber: localBill.bill_details?.billNumber || localBill.billNumber || "",
      outletRefId: localBill.bill_details?.outletRefId || localBill.outletRefId || "",
      items: (localBill.item_details || []).map((item: any) => ({
        itemRefId: item.itemRefId || "",
        name: item.name || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
        brand: item.brand || "",
        barcode: item.barcode || "",
        hsnCode: item.hsnCode || "",
        uom: item.uom || "UNIT",
        uomValue: item.uomValue || 1,
        mrp: Number(item.mrp || 0),
        sp: Number(item.sp || 0),
        quantity: Number(item.quantity || 0),
        discountValue: Number(item.discountValue || 0),
        taxes: Array.isArray(item.taxes) ? item.taxes : [],
      })),
    },
    payment_details: {
      billNumber: localBill.bill_details?.billNumber || localBill.billNumber || "",
      outletRefId: localBill.bill_details?.outletRefId || localBill.outletRefId || "",
      paymentModes: Array.isArray(localBill.payment_details?.paymentModes)
        ? localBill.payment_details.paymentModes
        : [],
    },
    charges_details: {
      billNumber: localBill.bill_details?.billNumber || localBill.billNumber || "",
      outletRefId: localBill.bill_details?.outletRefId || localBill.outletRefId || "",
      charges: Array.isArray(localBill.charges_details?.charges)
        ? localBill.charges_details.charges
        : [],
    },
  };
}
