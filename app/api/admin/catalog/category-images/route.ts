import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;
const IS_VERCEL = process.env.VERCEL === "1";

function productImage(product: any): string | undefined {
  return (
    product?.images?.[0]?.url ||
    product?.image_url ||
    (typeof product?.images?.[0] === "string" ? product.images[0] : undefined)
  );
}

function productCategoryId(product: any): string {
  return String(product?.productCategory?._id ?? product?.categoryId ?? "").trim();
}

function productCategoryTitle(product: any): string {
  return String(
    product?.productCategory?.title ?? product?.category ?? ""
  ).trim();
}

function productBrandId(product: any): string {
  const brand = product?.brand || product?.productBrand;
  return String(
    product?.brandId ??
      product?.brand_id ??
      (typeof brand === "object" ? brand?._id : brand) ??
      ""
  ).trim();
}

function normalizeBrandToken(value: string): string {
  let token = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  token = token.replace(/([a-z])\1+$/g, "$1");
  return token;
}

function productMatchesBrandName(product: any, brandName: string): boolean {
  const brandToken = normalizeBrandToken(brandName);
  const firstWord = normalizeBrandToken(
    String(product?.name ?? "").split(/\s+/)[0] ?? ""
  );
  if (!brandToken || !firstWord) return false;
  if (firstWord === brandToken) return true;
  if (firstWord.length >= 4 && brandToken.length >= 4) {
    return firstWord.startsWith(brandToken) || brandToken.startsWith(firstWord);
  }
  return false;
}

async function fetchFromApi(path: string) {
  if (!API_BASE) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DB_TOKEN) headers["x-db-token"] = DB_TOKEN;
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store", headers });
  if (!res.ok) return null;
  return res.json();
}

async function fetchAllCatalogProducts(): Promise<any[]> {
  const result = await fetchFromApi(
    "/product/fetch-by-filter?limit=1000&page=1&hasBrand=true&isShopifyAvailable=true"
  );
  const products = result?.data?.[0]?.products || result?.data || [];
  return Array.isArray(products) ? products : [];
}

async function productsFromSlots(): Promise<any[]> {
  if (IS_VERCEL) return [];
  try {
    const { adminDb } = await import("@/lib/admin-db");
    const slots = adminDb.getAllSlots();
    return Object.values(slots)
      .filter((slot: any) => Number(slot?.quantity || 0) > 0 && slot?.product_id)
      .map((slot: any) => ({
        _id: slot.product_id,
        id: slot.product_id,
        name: slot.product_name,
        category: slot.category || "",
        image_url: slot.image_url || "",
        images: slot.image_url ? [{ url: slot.image_url }] : [],
      }));
  } catch {
    return [];
  }
}

/** GET /api/admin/catalog/category-images — first product image per category. */
export async function GET() {
  try {
    const [catalogProducts, slotProducts] = await Promise.all([
      fetchAllCatalogProducts(),
      productsFromSlots(),
    ]);
    const products = [...catalogProducts, ...slotProducts];

    const categoriesResult = await fetchFromApi("/product/get-product-categories");
    const categories: any[] = Array.isArray(categoriesResult?.data)
      ? categoriesResult.data
      : [];

    const images: Record<string, string> = {};

    const firstAny = products.find((p) => productImage(p));
    if (firstAny) images.all = productImage(firstAny)!;

    for (const cat of categories) {
      const id = String(cat?._id ?? "").trim();
      const title = String(cat?.title ?? cat?.name ?? "").trim();
      if (!id) continue;

      const match = products.find((p) => {
        const img = productImage(p);
        if (!img) return false;
        if (productCategoryId(p) === id) return true;
        if (title && productCategoryTitle(p).toLowerCase() === title.toLowerCase()) {
          return true;
        }
        return false;
      });

      if (match) {
        images[id] = productImage(match)!;
        continue;
      }

      // Original behaviour: first product image for this category from catalog API.
      const catResult = await fetchFromApi(
        `/product/fetch-by-filter?catId=${encodeURIComponent(id)}&limit=1&page=1&hasBrand=true&isShopifyAvailable=true`
      );
      const catProducts = catResult?.data?.[0]?.products || catResult?.data || [];
      const first = Array.isArray(catProducts) ? catProducts[0] : null;
      const img = first ? productImage(first) : undefined;
      if (img) images[id] = img;
    }

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error("[catalog/category-images] Error:", error);
    return NextResponse.json({ success: true, data: {} });
  }
}
