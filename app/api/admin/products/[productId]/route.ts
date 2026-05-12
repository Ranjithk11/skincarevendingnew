import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

// Send webhook for product modifications
async function sendProductUpdateWebhook(productId: string, updatedProduct: any) {
  try {
    const { sendSlotUpdateWebhook } = await import("@/utils/webhook");

    // Get all slots
    const allSlots = adminDb.getAllSlots();

    // Find slots that have this product
    const affectedSlotIds: number[] = [];
    Object.values(allSlots).forEach((slot: any) => {
      if (slot.product_id === productId || slot.product_id === `products/${productId}`) {
        affectedSlotIds.push(slot.slot_id);
      }
    });

    // Convert slots to array format
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

    await sendSlotUpdateWebhook({
      slots: slotsArray,
      product: {
        id: productId,
        name: updatedProduct.name,
        category: updatedProduct.category,
        retail_price: updatedProduct.retail_price,
        discount_value: updatedProduct.discount_value,
        image_url: updatedProduct.image_url,
        quantity: updatedProduct.quantity,
      },
      updateType: 'product_modification',
      affectedSlotIds: affectedSlotIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[sendProductUpdateWebhook] Error:", error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId;
    const body = await request.json();

    // Try to update in local DB first (for local products with numeric IDs)
    const numericId = parseInt(productId);
    if (!isNaN(numericId)) {
      const updatedProduct = adminDb.updateProduct(numericId, {
        name: body.name,
        category: body.category,
        retail_price: body.retail_price,
        quantity: body.quantity,
      });

      if (updatedProduct) {
        // Send webhook for product modification
        sendProductUpdateWebhook(productId, updatedProduct);

        return NextResponse.json({
          success: true,
          product: updatedProduct,
        });
      }
    }

    // For external products, save override to local storage (like Flask's SQLite)
    const override = adminDb.setProductOverride(productId, {
      name: body.name,
      category: body.category,
      retail_price: body.retail_price,
      quantity: body.quantity,
    });

    // Send webhook for product modification
    sendProductUpdateWebhook(productId, override);

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      product: override,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId;
    const numericId = parseInt(productId);
    
    if (!isNaN(numericId)) {
      const product = adminDb.getProduct(numericId);
      if (product) {
        return NextResponse.json(product);
      }
    }

    // For external products, return not found (they should be fetched from external API)
    return NextResponse.json(
      { error: "Product not found in local database" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
