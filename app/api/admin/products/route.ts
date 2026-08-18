import { NextResponse } from "next/server";
import { fetchLeafwater } from "@/lib/leafwater-fetch";

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
    const allSlots = adminDb.getAllSlots();

    const getSlotDiscountForProduct = (productId: string, productName?: string) => {
      const cleanId = productId.replace(/^products\//, "");
      let maxDiscount = 0;
      Object.values(allSlots).forEach((slot: any) => {
        if (!slot?.product_id) return;
        const slotCleanId = String(slot.product_id).replace(/^products\//, "");
        const idMatch =
          slotCleanId === cleanId ||
          String(slot.product_id) === productId;
        const nameMatch =
          productName &&
          slot.product_name &&
          String(slot.product_name).toUpperCase().trim() ===
            String(productName).toUpperCase().trim();
        if (!idMatch && !nameMatch) return;
        const dv = Number(slot.discount_value);
        if (Number.isFinite(dv) && dv > maxDiscount) maxDiscount = dv;
      });
      return maxDiscount;
    };

    const getSlotRetailPriceForProduct = (productId: string, productName?: string) => {
      const cleanId = productId.replace(/^products\//, "");
      for (const slot of Object.values(allSlots) as any[]) {
        if (!slot?.product_id) continue;
        const slotCleanId = String(slot.product_id).replace(/^products\//, "");
        const idMatch =
          slotCleanId === cleanId || String(slot.product_id) === productId;
        const nameMatch =
          productName &&
          slot.product_name &&
          String(slot.product_name).toUpperCase().trim() ===
            String(productName).toUpperCase().trim();
        if (!idMatch && !nameMatch) continue;
        const price = Number(slot.retail_price);
        if (Number.isFinite(price)) return price;
      }
      return undefined;
    };

    return products.map((product) => {
      const productId = product.id?.toString() || "";
      // Try both with and without 'products/' prefix
      const cleanId = productId.replace(/^products\//, '');
      const override = overrides[productId] || overrides[cleanId];
      
      // Calculate quantity from slots (sum of all slot quantities for this product)
      const slots = adminDb.getSlotsForProduct(productId, product.name);
      const totalQuantity = slots.reduce((sum, slot) => sum + slot.quantity, 0);
      const slotIds = slots.map((slot) => slot.slot_id).sort((a, b) => a - b);
      const slotDiscount = getSlotDiscountForProduct(productId, product.name);
      const slotRetailPrice = getSlotRetailPriceForProduct(productId, product.name);
      const resolvedDiscount =
        (override as any)?.discount ??
        product.discount ??
        (slotDiscount > 0 ? { value: slotDiscount } : null);
      const resolvedRetailPrice =
        override?.retail_price !== undefined && override?.retail_price !== null
          ? override.retail_price
          : slotRetailPrice ?? product.retail_price;
      
      if (override) {
        const quantity = totalQuantity;
        return {
          ...product,
          name: override.name ?? product.name,
          category: override.category ?? product.category,
          retail_price: resolvedRetailPrice,
          quantity,
          in_stock: quantity > 0,
          slot_ids: slotIds,
          discount: resolvedDiscount,
        };
      }
      return {
        ...product,
        retail_price: resolvedRetailPrice,
        quantity: totalQuantity,
        in_stock: totalQuantity > 0,
        slot_ids: slotIds,
        discount: resolvedDiscount,
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
    // Only forward these when the client explicitly sets them (admin catalog uses neither).
    const hasBrand = searchParams.get("hasBrand");
    const isShopifyAvailable = searchParams.get("isShopifyAvailable");
    // Backend caps page size (~100). fetchAll=1 pages through totalCounts.
    const fetchAll = searchParams.get("fetchAll") === "1" || searchParams.get("fetchAll") === "true";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (DB_TOKEN) {
      headers["x-db-token"] = DB_TOKEN;
    }

    const mapRawProduct = (p: any) => {
      const brandObj = p.brand || p.productBrand || null;
      const brandId =
        p.brandId ||
        p.brand_id ||
        (typeof brandObj === "object" && brandObj ? brandObj._id : "") ||
        (typeof brandObj === "string" ? brandObj : "") ||
        "";
      return {
        id: p._id || p.id,
        _id: p._id || p.id,
        name: p.name,
        description: p.productBenefits || p.description || "",
        productUse: p.productUse || "",
        productBenefits: p.productBenefits || p.description || "",
        retail_price: p.retailPrice || p.retail_price || 0,
        retailPrice: p.retailPrice || p.retail_price || 0,
        category: p.productCategory?.title || p.category || "",
        productCategory: p.productCategory || null,
        image_url: p.images?.[0]?.url || p.image_url || "",
        images: p.images || [],
        quantity: p.quantity || 0,
        in_stock: p.inStock ?? p.in_stock ?? true,
        shopify_url: p.shopifyUrl || p.shopify_url || "",
        shopifyUrl: p.shopifyUrl || p.shopify_url || "",
        brandId,
        brand_id: brandId,
        brand: brandObj,
        productBrand: brandObj,
        discount: p.discount || null,
        skinTypes: p.skinTypes || [],
        matches: p.matches || [],
      };
    };

    const buildFilterParams = (pageNum: string, pageLimit: string) => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("page", pageNum);
      params.append("limit", pageLimit);
      if (catId && catId !== "all") params.append("catId", catId);
      if (brandId && brandId !== "all") params.append("brandId", brandId);
      if (hasBrand != null && hasBrand !== "") params.append("hasBrand", hasBrand);
      if (isShopifyAvailable != null && isShopifyAvailable !== "") {
        params.append("isShopifyAvailable", isShopifyAvailable);
      }
      return params;
    };

    const fetchPage = async (pageNum: number, pageLimit: number) => {
      const response = await fetchLeafwater(
        `${API_BASE}/product/fetch-by-filter?${buildFilterParams(String(pageNum), String(pageLimit)).toString()}`,
        {
          cache: "no-store",
          headers,
        }
      );
      if (!response.ok) {
        throw new Error(`Backend products page ${pageNum} failed: ${response.status}`);
      }
      const result = await response.json();
      const rawProducts = result?.data?.[0]?.products || result?.data || [];
      const totalCounts = Number(result?.totalCounts ?? result?.data?.[0]?.totalCounts ?? 0);
      return { rawProducts: Array.isArray(rawProducts) ? rawProducts : [], totalCounts };
    };

    if (fetchAll && !search) {
      const PAGE_SIZE = 100;
      const allRaw: any[] = [];
      const seenIds = new Set<string>();
      const addAll = (list: any[]) => {
        list.forEach((p: any) => {
          const id = String(p._id || p.id || "");
          if (!id || seenIds.has(id)) return;
          seenIds.add(id);
          allRaw.push(p);
        });
      };

      const first = await fetchPage(1, PAGE_SIZE);
      addAll(first.rawProducts);
      const total = first.totalCounts || first.rawProducts.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2, PAGE_SIZE))
        );
        rest.forEach((pageResult) => addAll(pageResult.rawProducts));
      }

      console.log(
        `[Admin Products API] fetchAll: ${allRaw.length} of ${total} products (${totalPages} pages)`
      );

      const products = allRaw.map(mapRawProduct);
      const productsWithOverrides = await applyOverrides(products);
      return NextResponse.json(productsWithOverrides);
    }

    const response = await fetchLeafwater(
      `${API_BASE}/product/fetch-by-filter?${buildFilterParams(page, limit).toString()}`,
      {
        cache: "no-store",
        headers,
      }
    );

    if (response.ok) {
      const result = await response.json();
      // Extract products array from response and transform to expected format
      const rawProducts = result?.data?.[0]?.products || result?.data || [];
      const products = (Array.isArray(rawProducts) ? rawProducts : []).map(mapRawProduct);
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
