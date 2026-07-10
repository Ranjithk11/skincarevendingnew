export type CatalogCategory = { _id: string; title: string };
export type CatalogBrand = { _id: string; name: string };

const DEFAULT_CATEGORIES: CatalogCategory[] = [{ _id: "all", title: "All" }];

export async function fetchCatalogCategories(): Promise<CatalogCategory[]> {
  try {
    const res = await fetch("/api/admin/catalog/categories", { cache: "no-store" });
    if (!res.ok) return DEFAULT_CATEGORIES;
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.length > 0 ? list : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function fetchCatalogBrands(): Promise<CatalogBrand[]> {
  try {
    const res = await fetch("/api/admin/catalog/brands", { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function fetchCategoryImages(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/admin/catalog/category-images", { cache: "no-store" });
    if (!res.ok) return {};
    const json = await res.json();
    return json?.data && typeof json.data === "object" ? json.data : {};
  } catch {
    return {};
  }
}

export async function fetchBrandImages(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/admin/catalog/brand-images", { cache: "no-store" });
    if (!res.ok) return {};
    const json = await res.json();
    return json?.data && typeof json.data === "object" ? json.data : {};
  } catch {
    return {};
  }
}
