import { NextRequest, NextResponse } from "next/server";

// Check if we're running on Vercel (serverless) or locally
const IS_VERCEL = process.env.VERCEL === "1";

// GET all vending slots
export async function GET() {
  try {
    if (IS_VERCEL) {
      // Return empty slots object when on Vercel (SQLite not available)
      return NextResponse.json({});
    }
    
    const { adminDb } = await import("@/lib/admin-db");
    const slots = adminDb.getAllSlots();
    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json({});
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
    const { slot_id, product_id, quantity = 0, product_name, category, retail_price, image_url } = body;

    if (!slot_id) {
      return NextResponse.json(
        { success: false, message: "Slot ID is required" },
        { status: 400 }
      );
    }

    // Pass product info for external API products
    const productInfo = {
      name: product_name,
      category: category,
      retail_price: retail_price ? parseFloat(retail_price) : undefined,
      image_url: image_url,
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
