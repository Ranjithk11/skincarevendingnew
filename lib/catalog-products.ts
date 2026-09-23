/**
 * Same catalog fetch used by /products — full Leafwater list with images.
 * `lite=1` skips per-product SQLite overrides (slots come from /api/admin/slots).
 */
export async function fetchCatalogProducts(filters?: {
  catId?: string;
  brandId?: string;
}): Promise<any[]> {
  const params = new URLSearchParams({
    fetchAll: "1",
    limit: "100",
    lite: "1",
  });
  if (filters?.catId && filters.catId !== "all") {
    params.set("catId", filters.catId);
  }
  if (filters?.brandId && filters.brandId !== "all") {
    params.set("brandId", filters.brandId);
  }

  const res = await fetch(`/api/admin/products?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: ${res.status}`);
  }

  const json = await res.json();
  const batch = Array.isArray(json) ? json : json?.data?.[0]?.products || [];
  if (!Array.isArray(batch)) return [];

  const seenIds = new Set<string>();
  const allProducts: any[] = [];
  batch.forEach((product: any) => {
    const id = String(product?.id ?? product?._id ?? "");
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    allProducts.push(product);
  });
  return allProducts;
}

/** Resolve a displayable product image URL (same fields as /products). */
export function getCatalogProductImageUrl(product: any): string {
  const raw =
    product?.images?.[0]?.url ||
    product?.image_url ||
    product?.imageUrl ||
    (typeof product?.images?.[0] === "string" ? product.images[0] : "") ||
    "";
  return String(raw || "").trim();
}
