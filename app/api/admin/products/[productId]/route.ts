import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

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
