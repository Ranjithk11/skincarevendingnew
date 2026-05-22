import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST - Sync all slot discounts from external product API
export async function POST() {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL;
    const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;

    if (!API_BASE) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_API_URL not configured" },
        { status: 500 }
      );
    }

    // Fetch all products from external API (paginated)
    const productMap = new Map<string, any>();
    let page = 1;
    const limit = 50;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (DB_TOKEN) headers["x-db-token"] = DB_TOKEN;

    while (true) {
      const url = `${API_BASE}/product/fetch-by-filter?page=${page}&limit=${limit}`;
      const response = await fetch(url, { headers, cache: "no-store" });

      if (!response.ok) break;

      const result = await response.json();
      const products = result?.data?.[0]?.products || result?.data || [];

      if (products.length === 0) break;

      for (const p of products) {
        const id = String(p._id || p.id);
        productMap.set(id, p);
        productMap.set("products/" + id, p);
        if (p.name) productMap.set(p.name.toUpperCase().trim(), p);
      }

      if (products.length < limit) break;
      page++;
    }

    if (productMap.size === 0) {
      return NextResponse.json(
        { success: false, error: "Could not fetch products from API" },
        { status: 502 }
      );
    }

    // Get all slots
    const { sqliteDb } = await import("@/lib/sqlite-db");
    const slotsRecord = sqliteDb.getAllSlots();
    const slots = Object.values(slotsRecord);
    let updated = 0;
    let noDiscount = 0;

    for (const slot of slots) {
      if (!slot.product_id || !slot.product_name) continue;

      const cleanId = String(slot.product_id).replace(/^products\//, "");
      let product = productMap.get(String(slot.product_id)) || productMap.get(cleanId) || productMap.get("products/" + cleanId);

      if (!product && slot.product_name) {
        product = productMap.get(slot.product_name.toUpperCase().trim());
      }

      if (!product) {
        noDiscount++;
        continue;
      }

      const discount = product?.discount;
      const discountValue = discount?.value || discount?.percentage || discount;

      if (discountValue && Number(discountValue) > 0) {
        // Update just the discount_value for this slot
        sqliteDb.assignProductToSlot(
          slot.slot_id,
          slot.product_id,
          slot.quantity || 0,
          {
            name: slot.product_name,
            category: slot.category,
            retail_price: slot.retail_price,
            image_url: slot.image_url,
            discount_value: Number(discountValue),
          }
        );
        updated++;
      } else {
        noDiscount++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      noDiscount,
      totalSlots: slots.length,
    });
  } catch (error: any) {
    console.error("[sync-discounts] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync discounts" },
      { status: 500 }
    );
  }
}

// GET - Also allow triggering via GET for easy startup/cron calls
export async function GET() {
  return POST();
}
