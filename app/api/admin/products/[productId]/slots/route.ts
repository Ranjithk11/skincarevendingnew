import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId;
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get("name") || undefined;
    
    const product = adminDb.getProduct(parseInt(productId));
    const slots = adminDb.getSlotsForProduct(productId, productName || product?.name);

    console.log("[Slots API] productId:", productId, "productName:", productName, "slots found:", slots);

    return NextResponse.json({
      product_name: product?.name || productName || "Unknown Product",
      product_id: productId,
      slots: slots,
    });
  } catch (error) {
    console.error("Error fetching slots for product:", error);
    return NextResponse.json(
      { error: "Internal server error", slots: [] },
      { status: 500 }
    );
  }
}
