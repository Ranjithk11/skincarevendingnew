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

function normalizeBrandToken(value: string): string {
  let token = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  token = token.replace(/([a-z])\1+$/g, "$1");
  return token;
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

function productMatchesBrand(product: any, brandId: string, brandName: string): boolean {
  if (productBrandId(product) === brandId) {
    const brandToken = normalizeBrandToken(brandName);
    const firstWord = normalizeBrandToken(
      String(product?.name ?? "").split(/\s+/)[0] ?? ""
    );
    if (brandToken && firstWord && firstWord !== brandToken) {
      if (firstWord.length >= 4 && brandToken.length >= 4) {
        if (!firstWord.startsWith(brandToken) && !brandToken.startsWith(firstWord)) {
          return false;
        }
      } else {
        return false;
      }
    }
    return true;
  }

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
        image_url: slot.image_url || "",
        images: slot.image_url ? [{ url: slot.image_url }] : [],
      }));
  } catch {
    return [];
  }
}

/** GET /api/admin/catalog/brand-images — first matching product image per brand. */
export async function GET() {
  try {
    const [catalogProducts, slotProducts, brandsResult] = await Promise.all([
      fetchAllCatalogProducts(),
      productsFromSlots(),
      fetchFromApi("/brand/fetch?page=1&limit=100"),
    ]);
    const products = [...catalogProducts, ...slotProducts];
    const brands: any[] = Array.isArray(brandsResult?.data) ? brandsResult.data : [];

    const images: Record<string, string> = {};

    const firstAny = products.find((p) => productImage(p));
    if (firstAny) images.all = productImage(firstAny)!;

    for (const brand of brands) {
      const id = String(brand?._id ?? "").trim();
      const name = String(brand?.name ?? "").trim();
      if (!id || !name) continue;

      const match = products.find(
        (p) => productImage(p) && productMatchesBrand(p, id, name)
      );
      if (match) {
        images[id] = productImage(match)!;
        continue;
      }

      const brandResult = await fetchFromApi(
        `/product/fetch-by-filter?brandId=${encodeURIComponent(id)}&limit=5&page=1&hasBrand=true&isShopifyAvailable=true`
      );
      const brandProducts = brandResult?.data?.[0]?.products || brandResult?.data || [];
      const brandMatch = (Array.isArray(brandProducts) ? brandProducts : []).find(
        (p: any) => productImage(p) && productMatchesBrand(p, id, name)
      );
      if (brandMatch) images[id] = productImage(brandMatch)!;
    }

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error("[catalog/brand-images] Error:", error);
    return NextResponse.json({ success: true, data: {} });
  }
}
