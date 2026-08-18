import { NextResponse } from "next/server";
import { fetchLeafwater } from "@/lib/leafwater-fetch";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const DB_TOKEN = process.env.NEXT_PUBLIC_DB_TOKEN;
const IS_VERCEL = process.env.VERCEL === "1";

async function fetchFromApi(path: string) {
  if (!API_BASE) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DB_TOKEN) headers["x-db-token"] = DB_TOKEN;

  try {
    const res = await fetchLeafwater(`${API_BASE}${path}`, {
      cache: "no-store",
      headers,
    });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn("[catalog/brands] Upstream fetch failed:", err);
    return null;
  }
}

/** Derive brands from a product list when the brands API is down. */
function brandsFromProducts(products: any[]) {
  const seen = new Map<string, { _id: string; name: string }>();
  products.forEach((p) => {
    const brand = p?.brand || p?.productBrand;
    const id = String(
      p?.brandId ?? p?.brand_id ?? brand?._id ?? (typeof brand === "string" ? brand : "") ?? ""
    ).trim();
    const name = String(
      (typeof brand === "object" ? brand?.name : brand) ?? ""
    ).trim();
    if (!id || !name || seen.has(id)) return;
    seen.set(id, { _id: id, name });
  });
  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

/** Last-resort: infer brand labels from machine slot product names. */
async function brandsFromSlots() {
  if (IS_VERCEL) return [];
  try {
    const { adminDb } = await import("@/lib/admin-db");
    const slots = adminDb.getAllSlots();
    const seen = new Map<string, { _id: string; name: string }>();
    Object.values(slots).forEach((slot: any) => {
      if (Number(slot?.quantity || 0) <= 0) return;
      const productName = String(slot?.product_name || "").trim();
      if (!productName) return;
      const firstWord = productName.split(/\s+/)[0]?.trim();
      if (!firstWord || firstWord.length < 3) return;
      const key = firstWord.toLowerCase();
      if (seen.has(key)) return;
      seen.set(key, { _id: `slot-brand-${key}`, name: firstWord });
    });
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const result = await fetchFromApi("/brand/fetch?page=1&limit=100");
    let brands: any[] = [];

    if (Array.isArray(result?.data)) {
      brands = result.data;
    }

    if (brands.length === 0) {
      const productsResult = await fetchFromApi(
        "/product/fetch-by-filter?limit=1000&page=1&hasBrand=true&isShopifyAvailable=true"
      );
      const products =
        productsResult?.data?.[0]?.products || productsResult?.data || [];
      brands = brandsFromProducts(Array.isArray(products) ? products : []);
    }

    if (brands.length === 0) {
      brands = await brandsFromSlots();
    }

    return NextResponse.json({
      success: true,
      data: brands.map((b: any) => ({
        _id: String(b?._id ?? b?.id ?? "").trim(),
        name: String(b?.name ?? "").trim(),
      })).filter((b) => b._id && b.name),
    });
  } catch (error) {
    console.error("[catalog/brands] Error:", error);
    return NextResponse.json({ success: true, data: [] });
  }
}
