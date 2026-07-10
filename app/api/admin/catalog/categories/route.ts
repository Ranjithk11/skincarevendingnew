import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;

async function fetchFromApi(path: string) {
  if (!API_BASE) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DB_TOKEN) headers["x-db-token"] = DB_TOKEN;

  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) return null;
  return res.json();
}

/** Derive categories from a product list when the categories API is down. */
function categoriesFromProducts(products: any[]) {
  const seen = new Map<string, { _id: string; title: string }>();
  products.forEach((p) => {
    const cat = p?.productCategory;
    const id = String(cat?._id ?? "").trim();
    const title = String(cat?.title ?? p?.category ?? "").trim();
    if (!id || !title || seen.has(id)) return;
    seen.set(id, { _id: id, title });
  });
  return Array.from(seen.values()).sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );
}

export async function GET() {
  try {
    const result = await fetchFromApi("/product/get-product-categories");
    let categories: any[] = [];

    if (Array.isArray(result?.data)) {
      categories = result.data;
    }

    if (categories.length === 0) {
      const productsResult = await fetchFromApi(
        "/product/fetch-by-filter?limit=1000&page=1&hasBrand=true&isShopifyAvailable=true"
      );
      const products =
        productsResult?.data?.[0]?.products || productsResult?.data || [];
      categories = categoriesFromProducts(Array.isArray(products) ? products : []);
    }

    return NextResponse.json({
      success: true,
      data: [{ _id: "all", title: "All" }, ...categories],
    });
  } catch (error) {
    console.error("[catalog/categories] Error:", error);
    return NextResponse.json({
      success: true,
      data: [{ _id: "all", title: "All" }],
    });
  }
}
