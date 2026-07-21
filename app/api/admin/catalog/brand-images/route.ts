import { NextResponse } from "next/server";
import { productMatchesBrandFilter } from "@/lib/product-slot-utils";

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

async function fetchFromApi(path: string) {
  if (!API_BASE) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DB_TOKEN) headers["x-db-token"] = DB_TOKEN;
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store", headers });
  if (!res.ok) return null;
  return res.json();
}

/** Paginate catalog so every brand can resolve an image (backend caps ~100/page). */
async function fetchAllCatalogProducts(): Promise<any[]> {
  const PAGE_SIZE = 100;
  const all: any[] = [];
  const seen = new Set<string>();

  const addAll = (list: any[]) => {
    list.forEach((p) => {
      const id = String(p?._id ?? p?.id ?? "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      all.push(p);
    });
  };

  const first = await fetchFromApi(
    `/product/fetch-by-filter?limit=${PAGE_SIZE}&page=1`
  );
  const firstProducts = first?.data?.[0]?.products || first?.data || [];
  addAll(Array.isArray(firstProducts) ? firstProducts : []);

  const total = Number(first?.totalCounts ?? first?.data?.[0]?.totalCounts ?? all.length);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetchFromApi(`/product/fetch-by-filter?limit=${PAGE_SIZE}&page=${i + 2}`)
      )
    );
    rest.forEach((result) => {
      const products = result?.data?.[0]?.products || result?.data || [];
      addAll(Array.isArray(products) ? products : []);
    });
  }

  return all;
}

async function productsFromSlots(): Promise<any[]> {
  if (IS_VERCEL) return [];
  try {
    const { adminDb } = await import("@/lib/admin-db");
    const slots = adminDb.getAllSlots();
    return Object.values(slots)
      .filter((slot: any) => slot?.product_id && (slot.image_url || Number(slot?.quantity || 0) > 0))
      .map((slot: any) => ({
        _id: slot.product_id,
        id: slot.product_id,
        name: slot.product_name,
        image_url: slot.image_url || "",
        images: slot.image_url ? [{ url: slot.image_url }] : [],
        brandId: "",
        brand: null,
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
      const id = String(brand?._id ?? brand?.id ?? "").trim();
      const name = String(brand?.name ?? "").trim();
      if (!id || !name) continue;

      const match = products.find(
        (p) => productImage(p) && productMatchesBrandFilter(p, id, name)
      );
      if (match) {
        images[id] = productImage(match)!;
        continue;
      }

      const brandResult = await fetchFromApi(
        `/product/fetch-by-filter?brandId=${encodeURIComponent(id)}&limit=10&page=1`
      );
      const brandProducts = brandResult?.data?.[0]?.products || brandResult?.data || [];
      const withImage = (Array.isArray(brandProducts) ? brandProducts : []).find(
        (p: any) => productImage(p)
      );
      if (withImage) {
        images[id] = productImage(withImage)!;
      }
    }

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error("[catalog/brand-images] Error:", error);
    return NextResponse.json({ success: true, data: {} });
  }
}
