import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

// GET all products
export async function GET() {
  try {
    const products = adminDb.getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
