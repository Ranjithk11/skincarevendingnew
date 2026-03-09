import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;

// Check if we're running on Vercel (serverless) or locally
const IS_VERCEL = process.env.VERCEL === "1";

// Apply product overrides and calculate quantity from slots
async function applyOverrides(products: any[]) {
  // Skip overrides on Vercel since SQLite isn't available
  if (IS_VERCEL) {
    return products;
  }
  
  try {
    // Dynamic import to avoid build-time errors on Vercel
    const { adminDb } = await import("@/lib/admin-db");
    
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
  } catch (e) {
    console.warn("[Admin Products API] Error applying overrides:", e);
    return products;
  }
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
    const isShopifyAvailable = searchParams.get("isShopifyAvailable") || "";

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
    if (hasBrand) params.append("hasBrand", hasBrand);
    if (isShopifyAvailable) params.append("isShopifyAvailable", isShopifyAvailable);

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
      const productsWithOverrides = await applyOverrides(products);
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
