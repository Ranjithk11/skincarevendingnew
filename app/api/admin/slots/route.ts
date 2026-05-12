import { NextRequest, NextResponse } from "next/server";

// Check if we're running on Vercel (serverless) or locally
const IS_VERCEL = process.env.VERCEL === "1";

// Flag to track if startup sync has been done
let startupSyncDone = false;

// Sync all slots to webhook on first server startup (for first-time deployment)
async function performStartupSync() {
  if (startupSyncDone || IS_VERCEL) {
    return;
  }

  try {
    const { adminDb } = await import("@/lib/admin-db");
    const allSlots = adminDb.getAllSlots();

    if (Object.keys(allSlots).length === 0) {
      console.log("[startup sync] No slots to sync");
      startupSyncDone = true;
      return;
    }

    const slotsArray = Object.values(allSlots).map(slot => ({
      slot_id: slot.slot_id,
      product_id: slot.product_id,
      product_name: slot.product_name,
      category: slot.category,
      retail_price: slot.retail_price,
      discount_value: slot.discount_value,
      image_url: slot.image_url,
      quantity: slot.quantity,
      last_updated: slot.last_updated,
    }));

    await sendSlotUpdateWebhook(slotsArray, undefined);
    console.log(`[startup sync] Synced ${slotsArray.length} slots to webhook`);
    startupSyncDone = true;
  } catch (error) {
    console.error("[startup sync] Error:", error);
  }
}

// GET all vending slots
export async function GET() {
  try {
    if (IS_VERCEL) {
      // Return empty slots object when on Vercel (SQLite not available)
      return NextResponse.json({});
    }

    const { adminDb } = await import("@/lib/admin-db");
    const slots = adminDb.getAllSlots();

    // Perform startup sync on first GET request
    if (!startupSyncDone) {
      performStartupSync();
    }

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json({});
  }
}

// Send webhook for slot updates
async function sendSlotUpdateWebhook(slots: any[], affectedSlotId?: number) {
  try {
    const { sendSlotUpdateWebhook } = await import("@/utils/webhook");

    await sendSlotUpdateWebhook({
      slots: slots,
      updateType: 'slot_assignment',
      affectedSlotIds: affectedSlotId ? [affectedSlotId] : [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[sendSlotUpdateWebhook] Error:", error);
  }
}

// Fetch product discount from external API
async function fetchProductDiscount(productId: string, productName: string): Promise<number | null> {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL;
    const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;

    if (!API_BASE) {
      console.warn('[fetchProductDiscount] NEXT_PUBLIC_API_URL not set');
      return null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (DB_TOKEN) {
      headers['x-db-token'] = DB_TOKEN;
    }

    // Try to fetch product by ID
    let url = `${API_BASE}/product/fetch-by-filter?limit=50`;
    console.log(`[fetchProductDiscount] Fetching from: ${url}`);
    const response = await fetch(url, { headers, cache: 'no-store' });

    if (!response.ok) {
      console.warn(`[fetchProductDiscount] API request failed: ${response.status}`);
      return null;
    }

    const result = await response.json();
    const products = result?.data?.[0]?.products || result?.data || [];
    console.log(`[fetchProductDiscount] Fetched ${products.length} products`);

    // Clean product ID - remove "products/" prefix if present
    const cleanProductId = productId.replace(/^products\//, '');
    console.log(`[fetchProductDiscount] Looking for product_id: ${productId} (clean: ${cleanProductId}), name: ${productName}`);

    // Try to find product by ID or name
    let product = products.find((p: any) => {
      const pid = String(p._id || p.id).replace(/^products\//, '');
      return pid === cleanProductId || pid === productId;
    });

    if (!product && productName) {
      const cleanName = productName.toUpperCase().trim();
      console.log(`[fetchProductDiscount] Trying to find by name: ${cleanName}`);
      product = products.find((p: any) => {
        return p.name && p.name.toUpperCase().trim() === cleanName;
      });
    }

    if (!product) {
      console.warn(`[fetchProductDiscount] Product not found: ${productId} / ${productName}`);
      return null;
    }

    console.log(`[fetchProductDiscount] Found product:`, product.name, product._id || product.id);
    const discount = product?.discount;
    const discountValue = discount?.value || discount?.percentage || discount;

    console.log(`[fetchProductDiscount] Discount data:`, discount);

    if (discountValue && Number(discountValue) > 0) {
      const finalDiscount = Number(discountValue);
      console.log(`[fetchProductDiscount] Returning discount: ${finalDiscount}%`);
      return finalDiscount;
    }

    console.log(`[fetchProductDiscount] No valid discount found`);
    return null;
  } catch (error) {
    console.error('[fetchProductDiscount] Error:', error);
    return null;
  }
}

// POST to assign product to slot
export async function POST(request: NextRequest) {
  try {
    if (IS_VERCEL) {
      return NextResponse.json(
        { success: false, message: "Database not available in this environment" },
        { status: 503 }
      );
    }

    const { adminDb } = await import("@/lib/admin-db");
    const body = await request.json();
    const { slot_id, product_id, quantity = 0, product_name, category, retail_price, image_url, discount_value } = body;

    console.log(`[POST /api/admin/slots] Request body:`, body);

    if (!slot_id) {
      return NextResponse.json(
        { success: false, message: "Slot ID is required" },
        { status: 400 }
      );
    }

    // Auto-fetch discount from API if not provided and product_id is given
    let finalDiscountValue = discount_value !== undefined && discount_value !== null && discount_value !== "" ? parseFloat(discount_value) : undefined;

    console.log(`[POST /api/admin/slots] Initial discount_value: ${discount_value}, finalDiscountValue: ${finalDiscountValue}`);

    if (finalDiscountValue === undefined && product_id && product_name) {
      console.log(`[POST /api/admin/slots] Auto-fetching discount for product: ${product_name} (${product_id})`);
      const apiDiscount = await fetchProductDiscount(String(product_id), String(product_name));
      if (apiDiscount && apiDiscount > 0) {
        finalDiscountValue = apiDiscount;
        console.log(`[POST /api/admin/slots] Found discount ${apiDiscount}% for ${product_name}`);
      } else {
        console.log(`[POST /api/admin/slots] No discount found for ${product_name}`);
      }
    } else {
      console.log(`[POST /api/admin/slots] Skipping auto-fetch, discount already provided or missing product info`);
    }

    // Pass product info for external API products
    const productInfo = {
      name: product_name,
      category: category,
      retail_price: retail_price ? parseFloat(retail_price) : undefined,
      image_url: image_url,
      discount_value: finalDiscountValue,
    };

    const slot = adminDb.assignProductToSlot(
      parseInt(slot_id),
      product_id ?? null,
      parseInt(quantity),
      productInfo
    );

    if (!slot) {
      return NextResponse.json(
        { success: false, message: "Slot not found" },
        { status: 404 }
      );
    }

    // Send webhook with all slot information after assignment
    const allSlots = adminDb.getAllSlots();
    const slotsArray = Object.values(allSlots).map(slot => ({
      slot_id: slot.slot_id,
      product_id: slot.product_id,
      product_name: slot.product_name,
      category: slot.category,
      retail_price: slot.retail_price,
      discount_value: slot.discount_value,
      image_url: slot.image_url,
      quantity: slot.quantity,
      last_updated: slot.last_updated,
    }));
    sendSlotUpdateWebhook(slotsArray, parseInt(slot_id));

    return NextResponse.json({
      success: true,
      message: `Slot ${slot_id} updated successfully`,
      slot,
    });
  } catch (error) {
    console.error("Error assigning product to slot:", error);
    return NextResponse.json(
      { success: false, message: "Failed to assign product" },
      { status: 500 }
    );
  }
}

// Sync all slots to webhook (for first-time deployment or manual sync)
export async function PATCH(request: NextRequest) {
  try {
    if (IS_VERCEL) {
      return NextResponse.json(
        { success: false, message: "Database not available in this environment" },
        { status: 503 }
      );
    }

    const { adminDb } = await import("@/lib/admin-db");
    const body = await request.json();
    const { action } = body;

    if (action === "sync_webhook") {
      // Get all slots and send to webhook
      const allSlots = adminDb.getAllSlots();
      const slotsArray = Object.values(allSlots).map(slot => ({
        slot_id: slot.slot_id,
        product_id: slot.product_id,
        product_name: slot.product_name,
        category: slot.category,
        retail_price: slot.retail_price,
        discount_value: slot.discount_value,
        image_url: slot.image_url,
        quantity: slot.quantity,
        last_updated: slot.last_updated,
      }));

      await sendSlotUpdateWebhook(slotsArray, undefined);

      return NextResponse.json({
        success: true,
        message: "All slots synced to webhook",
        count: slotsArray.length,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error syncing slots to webhook:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sync slots" },
      { status: 500 }
    );
  }
}
