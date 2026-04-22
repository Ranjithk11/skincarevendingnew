/**
 * POSIFLY Integration Module
 * 
 * This module handles the integration with POSIFLY POS system for GHIAL.
 * It transforms Leafwater order data into POSIFLY's required format and sends it via API.
 * 
 * Required Environment Variables (to be set once POSIFLY provides them):
 * - POSIFLY_API_URL: The API endpoint URL
 * - POSIFLY_API_KEY: Authentication API key
 * - POSIFLY_OUTLET_REF_ID: Outlet identifier assigned by POSIFLY
 * - POSIFLY_POS_TERMINAL_ID: POS terminal/till ID
 */

// ============================================================================
// Types
// ============================================================================

export interface PosiflyBillDetails {
  outletRefId: string;
  posTerminalId: string;
  billNumber: string;
  billDate: string; // Format: dd/mm/yyyy
  billTime: string; // Format: hh:mm (24-hour)
  billType: "SALE" | "REFUND";
  billValue: string;
  netAmount: string;
  taxAmount: string;
  billStatus: "COMPLETED" | "CANCELED";
  billDiscountValue?: number;
  ShiftNumber?: string;
  businessDate?: string;
  isComplementBill?: boolean;
  currency?: string;
  customerName?: string;
  customerMobile?: string;
  salesPersonName?: string;
  flightNumber?: string;
  PNRNumber?: string;
  journeyFrom?: string;
  journeyTo?: string;
  gateNumber?: string;
}

export interface PosiflyTax {
  name: string;
  value: string;
}

export interface PosiflyItem {
  itemRefId: string;
  name: string;
  uom: string;
  uomValue: number;
  mrp: number;
  sp: number;
  quantity: number;
  taxes: PosiflyTax[];
  brand?: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  hsnCode?: string;
  discountValue?: number;
}

export interface PosiflyItemDetails {
  billNumber: string;
  outletRefId: string;
  items: PosiflyItem[];
}

export interface PosiflyPaymentMode {
  mode: string;
  value: number;
}

export interface PosiflyPaymentDetails {
  billNumber: string;
  outletRefId: string;
  paymentModes: PosiflyPaymentMode[];
}

export interface PosiflyCharge {
  mode: string;
  value: number;
}

export interface PosiflyChargesDetails {
  billNumber: string;
  outletRefId: string;
  charges: PosiflyCharge[];
}

export interface PosiflyPayload {
  bill_details: PosiflyBillDetails;
  item_details: PosiflyItemDetails;
  payment_details: PosiflyPaymentDetails;
  charges_details: PosiflyChargesDetails;
}

// Leafwater order types (input)
export interface LeafwaterOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  slotId?: number;
  category?: string;
  brand?: string;
  hsnCode?: string;
}

export interface LeafwaterOrder {
  orderId: string;
  items: LeafwaterOrderItem[];
  totalAmount: number;
  discountAmount?: number;
  paymentId?: string;
  razorpayOrderId?: string;
  paymentMode?: string;
  customerName?: string;
  customerMobile?: string;
  createdAt?: Date | string;
}

// ============================================================================
// Configuration
// ============================================================================

export function getPosiflyConfig() {
  return {
    apiUrl: process.env.POSIFLY_API_URL || "",
    apiKey: process.env.POSIFLY_API_KEY || "",
    outletRefId: process.env.POSIFLY_OUTLET_REF_ID || "LEAFWATER_001",
    posTerminalId: process.env.POSIFLY_POS_TERMINAL_ID || "VENDING_01",
    // Tax configuration (GST rates)
    cgstRate: 9, // 9% CGST
    sgstRate: 9, // 9% SGST
    // Default values
    currency: "INR",
    uom: "UNIT",
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a Date to IST (UTC+5:30) to avoid relying on system timezone
 */
function toIST(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 60 * 60000);
}

/**
 * Format date as dd/mm/yyyy (IST)
 */
function formatDate(date: Date): string {
  const ist = toIST(date);
  const day = String(ist.getDate()).padStart(2, "0");
  const month = String(ist.getMonth() + 1).padStart(2, "0");
  const year = ist.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format time as hh:mm (24-hour, IST)
 */
function formatTime(date: Date): string {
  const ist = toIST(date);
  const hours = String(ist.getHours()).padStart(2, "0");
  const minutes = String(ist.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Generate a unique bill number
 */
export function generateBillNumber(orderId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  // Use orderId or generate a unique suffix
  const suffix = orderId || `${Date.now()}`;
  return `LW-${year}${month}${day}-${suffix}`;
}

/**
 * Calculate tax breakdown from total amount
 * Assumes inclusive GST (18% = 9% CGST + 9% SGST)
 */
function calculateTaxBreakdown(totalAmount: number, cgstRate: number, sgstRate: number) {
  const totalTaxRate = cgstRate + sgstRate;
  const netAmount = totalAmount / (1 + totalTaxRate / 100);
  const taxAmount = totalAmount - netAmount;
  const cgstAmount = (netAmount * cgstRate) / 100;
  const sgstAmount = (netAmount * sgstRate) / 100;
  
  return {
    netAmount: Number(netAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
  };
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Transform Leafwater order to POSIFLY bill_details
 */
export function transformToBillDetails(
  order: LeafwaterOrder,
  config: ReturnType<typeof getPosiflyConfig>
): PosiflyBillDetails {
  const now = order.createdAt ? new Date(order.createdAt) : new Date();
  const { netAmount, taxAmount } = calculateTaxBreakdown(
    order.totalAmount,
    config.cgstRate,
    config.sgstRate
  );

  return {
    outletRefId: config.outletRefId,
    posTerminalId: config.posTerminalId,
    billNumber: generateBillNumber(order.orderId),
    billDate: formatDate(now),
    billTime: formatTime(now),
    billType: "SALE",
    billValue: order.totalAmount.toFixed(2),
    netAmount: netAmount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    billStatus: "COMPLETED",
    billDiscountValue: order.discountAmount || 0,
    currency: config.currency,
    customerName: order.customerName || "",
    customerMobile: order.customerMobile || "",
  };
}

/**
 * Transform Leafwater order items to POSIFLY item_details
 */
export function transformToItemDetails(
  order: LeafwaterOrder,
  billNumber: string,
  config: ReturnType<typeof getPosiflyConfig>
): PosiflyItemDetails {
  const items: PosiflyItem[] = order.items.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    const { cgstAmount, sgstAmount } = calculateTaxBreakdown(
      itemTotal,
      config.cgstRate,
      config.sgstRate
    );

    return {
      itemRefId: item.productId || `ITEM-${index + 1}`,
      name: item.productName,
      uom: config.uom,
      uomValue: 1,
      mrp: item.price,
      sp: item.price,
      quantity: item.quantity,
      taxes: [
        { name: "CGST", value: String(config.cgstRate) },
        { name: "SGST", value: String(config.sgstRate) },
      ],
      brand: item.brand || "",
      category: item.category || "Skincare",
      hsnCode: item.hsnCode || "",
      discountValue: 0,
    };
  });

  return {
    billNumber,
    outletRefId: config.outletRefId,
    items,
  };
}

/**
 * Transform payment info to POSIFLY payment_details
 */
export function transformToPaymentDetails(
  order: LeafwaterOrder,
  billNumber: string,
  config: ReturnType<typeof getPosiflyConfig>
): PosiflyPaymentDetails {
  // Map Razorpay payment to POSIFLY payment mode
  const paymentMode = order.paymentMode === "live" ? "UPI" : "UPI"; // Default to UPI for vending machine
  
  return {
    billNumber,
    outletRefId: config.outletRefId,
    paymentModes: [
      {
        mode: paymentMode,
        value: order.totalAmount,
      },
    ],
  };
}

/**
 * Transform charges to POSIFLY charges_details
 */
export function transformToChargesDetails(
  order: LeafwaterOrder,
  billNumber: string,
  config: ReturnType<typeof getPosiflyConfig>
): PosiflyChargesDetails {
  // No additional charges for vending machine sales
  return {
    billNumber,
    outletRefId: config.outletRefId,
    charges: [],
  };
}

/**
 * Transform complete Leafwater order to POSIFLY payload
 */
export function transformOrderToPosifly(order: LeafwaterOrder): PosiflyPayload {
  const config = getPosiflyConfig();
  const billDetails = transformToBillDetails(order, config);
  const billNumber = billDetails.billNumber;

  return {
    bill_details: billDetails,
    item_details: transformToItemDetails(order, billNumber, config),
    payment_details: transformToPaymentDetails(order, billNumber, config),
    charges_details: transformToChargesDetails(order, billNumber, config),
  };
}

// ============================================================================
// API Functions
// ============================================================================

export interface PosiflyApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: {
    code?: string;
    message: string;
  };
}

/**
 * Send sale data to POSIFLY API
 * 
 * NOTE: Update this function once POSIFLY provides:
 * - Exact API endpoint URL
 * - Authentication method and credentials
 * - Request headers
 * - Response format
 */
export async function pushSaleToPosifly(
  order: LeafwaterOrder
): Promise<PosiflyApiResponse> {
  const config = getPosiflyConfig();

  // Check if POSIFLY is configured
  if (!config.apiUrl) {
    console.warn("[POSIFLY] API URL not configured. Skipping push.");
    return {
      success: false,
      error: { message: "POSIFLY API URL not configured" },
    };
  }

  if (!config.apiKey) {
    console.warn("[POSIFLY] API Key not configured. Skipping push.");
    return {
      success: false,
      error: { message: "POSIFLY API Key not configured" },
    };
  }

  try {
    const payload = transformOrderToPosifly(order);
    
    console.log("[POSIFLY] Sending sale data:", JSON.stringify(payload, null, 2));

    // TODO: Update headers based on POSIFLY's authentication requirements
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      // Possible auth headers (update based on POSIFLY response):
      // "Authorization": `Bearer ${config.apiKey}`,
      // "X-API-Key": config.apiKey,
      // "Api-Key": config.apiKey,
    };

    // Add API key header (format TBD by POSIFLY)
    headers["X-API-Key"] = config.apiKey;

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("[POSIFLY] API error:", response.status, responseData);
      return {
        success: false,
        error: {
          code: String(response.status),
          message: responseData?.message || `HTTP ${response.status}`,
        },
      };
    }

    console.log("[POSIFLY] Sale pushed successfully:", responseData);
    return {
      success: true,
      data: responseData,
    };
  } catch (error: any) {
    console.error("[POSIFLY] Failed to push sale:", error);
    return {
      success: false,
      error: {
        message: error?.message || "Failed to push sale to POSIFLY",
      },
    };
  }
}

/**
 * Retry wrapper for pushing sales
 * Useful for handling transient network failures
 */
export async function pushSaleWithRetry(
  order: LeafwaterOrder,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<PosiflyApiResponse> {
  let lastError: PosiflyApiResponse | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await pushSaleToPosifly(order);
    
    if (result.success) {
      return result;
    }

    lastError = result;
    console.warn(`[POSIFLY] Attempt ${attempt}/${maxRetries} failed:`, result.error?.message);

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  return lastError || { success: false, error: { message: "Max retries exceeded" } };
}
