import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;

// Apply product overrides and calculate quantity from slots
function applyOverrides(products: any[]) {
  const overrides = adminDb.getAllProductOverrides();
  return products.map((product) => {
    const productId = product.id?.toString() || "";
    // Try both with and without 'products/' prefix
    const cleanId = productId.replace(/^products\//, '');
    const override = overrides[productId] || overrides[cleanId];
    
    // Calculate quantity from slots (sum of all slot quantities for this product)
    const slots = adminDb.getSlotsForProduct(productId, product.name);
    const totalQuantity = slots.reduce((sum, slot) => sum + slot.quantity, 0);
    
    if (override) {
      // Use override quantity if explicitly set, otherwise use slot calculation
      const quantity = override.quantity !== undefined ? override.quantity : (totalQuantity > 0 ? totalQuantity : product.quantity);
      return {
        ...product,
        name: override.name ?? product.name,
        category: override.category ?? product.category,
        retail_price: override.retail_price ?? product.retail_price,
        quantity: quantity,
        discount: (override as any).discount ?? product.discount,
      };
    }
    return {
      ...product,
      quantity: totalQuantity > 0 ? totalQuantity : product.quantity,
    };
  });
}

// Fallback - return empty array when API is unavailable
// Products should always come from external API
function getLocalProducts() {
  console.warn('[Admin Products API] External API unavailable, returning empty products list');
  return [];
}

// GET all products from main backend API
export async function GET(request: Request) {
  try {
    // If API_BASE is not configured, use local products
    if (!API_BASE) {
      console.log("API_BASE not configured, using local products");
      return NextResponse.json(getLocalProducts());
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const catId = searchParams.get("catId") || "";
    const brandId = searchParams.get("brandId") || "";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "1000";
    const hasBrand = searchParams.get("hasBrand") || "false";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (DB_TOKEN) {
      headers["x-db-token"] = DB_TOKEN;
    }

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (page) params.append("page", page);
    if (limit) params.append("limit", limit);
    if (catId && catId !== "all") params.append("catId", catId);
    if (brandId && brandId !== "all") params.append("brandId", brandId);
    // Match Browse Products page parameters to show same products
    params.append("hasBrand", "true");
    params.append("isShopifyAvailable", "true");

    const response = await fetch(
      `${API_BASE}/product/fetch-by-filter?${params.toString()}`,
      {
        cache: "no-store",
        headers,
      }
    );

    if (response.ok) {
      const result = await response.json();
      // Extract products array from response and transform to expected format
      const rawProducts = result?.data?.[0]?.products || result?.data || [];
      const products = rawProducts.map((p: any) => ({
        id: p._id || p.id,
        name: p.name,
        description: p.productBenefits || p.description || "",
        retail_price: p.retailPrice || p.retail_price || 0,
        category: p.productCategory?.title || p.category || "",
        image_url: p.images?.[0]?.url || p.image_url || "",
        quantity: p.quantity || 0,
        in_stock: p.inStock ?? p.in_stock ?? true,
        shopify_url: p.shopifyUrl || p.shopify_url || "",
        discount: p.discount || null,
      }));
      // Apply local overrides to external products (like Flask's SQLite storage)
      const productsWithOverrides = applyOverrides(products);
      return NextResponse.json(productsWithOverrides);
    }

    // If backend fails, fallback to local products
    console.error("Backend error, falling back to local products");
    return NextResponse.json(getLocalProducts());
  } catch (error: any) {
    console.error("Error fetching products:", error.message, "- using local fallback");
    // Fallback to local products on any error
    return NextResponse.json(getLocalProducts());
  }
}
