import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;

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

/**
 * GET /api/admin/catalog/category-images
 * Lightweight: one product image per category (no full-catalog pagination).
 */
export async function GET() {
  try {
    const categoriesResult = await fetchFromApi("/product/get-product-categories");
    const categories: any[] = Array.isArray(categoriesResult?.data)
      ? categoriesResult.data
      : [];

    const images: Record<string, string> = {};

    await Promise.all(
      categories.map(async (cat) => {
        const id = String(cat?._id ?? cat?.id ?? "").trim();
        if (!id) return;

        const catResult = await fetchFromApi(
          `/product/fetch-by-filter?catId=${encodeURIComponent(id)}&limit=5&page=1`
        );
        const catProducts = catResult?.data?.[0]?.products || catResult?.data || [];
        const first = (Array.isArray(catProducts) ? catProducts : []).find((p: any) =>
          productImage(p)
        );
        const img = first ? productImage(first) : undefined;
        if (img) images[id] = img;
      })
    );

    // "All" icon: first available category image
    const firstCategoryImage = Object.values(images)[0];
    if (firstCategoryImage) images.all = firstCategoryImage;

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error("[catalog/category-images] Error:", error);
    return NextResponse.json({ success: true, data: {} });
  }
}
