export type SlotInventoryEntry = {
  slotNumbers: number[];
  quantity: number;
};

export type SlotsMap = Record<string, SlotInventoryEntry>;

export function normalizeProductId(id: unknown): string {
  const raw = String(id ?? "").trim();
  if (!raw) return "";
  const numericMatch = raw.match(/(\d{5,})\/?$/);
  if (numericMatch?.[1]) return numericMatch[1];
  return raw.replace(/^products\//, "");
}

export function productIdKeys(id: unknown): string[] {
  const rawId = String(id ?? "").trim();
  const cleanId = normalizeProductId(id);
  return Array.from(
    new Set([rawId, cleanId, cleanId ? `products/${cleanId}` : ""].filter(Boolean))
  );
}

/** True when two product ids refer to the same catalog product. */
export function productIdsMatch(a: unknown, b: unknown): boolean {
  const aKeys = new Set(productIdKeys(a));
  return productIdKeys(b).some((key) => aKeys.has(key));
}

/** Build a lookup map keyed by every id variant (raw, normalized, products/ prefix). */
export function indexProductsById(products: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  products.forEach((product) => {
    const rawId = product?.id ?? product?._id;
    if (rawId == null) return;
    productIdKeys(rawId).forEach((key) => {
      map[key] = product;
    });
  });
  return map;
}

/** Resolve a catalog product strictly by product id — never by name. */
export function findProductInMap(
  productsMap: Record<string, any>,
  productId: unknown
): any | undefined {
  for (const key of productIdKeys(productId)) {
    if (productsMap[key]) return productsMap[key];
  }
  return undefined;
}

export function mergeProductsIntoMap(
  map: Record<string, any>,
  products: any[]
): Record<string, any> {
  const next = { ...map };
  Object.entries(indexProductsById(products)).forEach(([key, product]) => {
    next[key] = product;
  });
  return next;
}

export function mergeSlotEntry(
  map: SlotsMap,
  key: string,
  slotId: number,
  quantity: number
): void {
  if (!key || !Number.isFinite(slotId)) return;
  const existing = map[key];
  if (!existing) {
    map[key] = { slotNumbers: [slotId], quantity };
    return;
  }
  if (!existing.slotNumbers.includes(slotId)) {
    existing.slotNumbers = [...existing.slotNumbers, slotId].sort((a, b) => a - b);
  }
  existing.quantity = Number(existing.quantity || 0) + quantity;
}

export function buildSlotsMap(slotsData: unknown): SlotsMap {
  const map: SlotsMap = {};
  const slotsArray = Array.isArray(slotsData)
    ? slotsData
    : Object.values((slotsData as Record<string, unknown>) || {});

  slotsArray.forEach((slot: any) => {
    if (!slot?.product_id) return;
    const rawId = String(slot.product_id);
    const cleanId = normalizeProductId(rawId);
    const quantity = Number(slot.quantity || 0);
    const slotId = Number(slot.slot_id);
    if (!Number.isFinite(slotId) || quantity <= 0) return;

    mergeSlotEntry(map, rawId, slotId, quantity);
    if (cleanId && cleanId !== rawId) mergeSlotEntry(map, cleanId, slotId, quantity);
    if (cleanId) mergeSlotEntry(map, `products/${cleanId}`, slotId, quantity);
  });

  return map;
}

/** Slots map is the source of truth for machine inventory. */
export function getSlotInfoForProduct(
  product: any,
  slotsMap: SlotsMap
): SlotInventoryEntry | undefined {
  for (const key of productIdKeys(product?.id ?? product?._id)) {
    const entry = slotsMap[key];
    if (entry && entry.quantity > 0) {
      return entry;
    }
  }

  const apiSlotIds = (Array.isArray(product?.slot_ids) ? product.slot_ids : [])
    .map((id: unknown) => Number(id))
    .filter((id: number) => Number.isFinite(id))
    .sort((a: number, b: number) => a - b);

  const apiQuantity = Number(product?.quantity ?? 0);
  if (apiSlotIds.length > 0 && apiQuantity > 0) {
    return { slotNumbers: apiSlotIds, quantity: apiQuantity };
  }

  return undefined;
}

export function isProductInMachine(product: any, slotsMap: SlotsMap): boolean {
  return (getSlotInfoForProduct(product, slotsMap)?.quantity ?? 0) > 0;
}

/** Machine slot price (includes override enrichment from slots GET). */
export function getSlotRetailPriceForProduct(
  productId: unknown,
  slotsData: unknown
): number | undefined {
  const cleanId = normalizeProductId(productId);
  if (!cleanId) return undefined;

  const slotsArray = Array.isArray(slotsData)
    ? slotsData
    : Object.values((slotsData as Record<string, unknown>) || {});

  for (const slot of slotsArray as any[]) {
    if (!slot?.product_id) continue;
    if (normalizeProductId(slot.product_id) !== cleanId) continue;
    const price = Number(slot.retail_price);
    if (Number.isFinite(price)) return price;
  }

  return undefined;
}

export function getSlotDiscountMap(slotsData: unknown): Record<string, number> {
  const map: Record<string, number> = {};
  const slotsArray = Array.isArray(slotsData)
    ? slotsData
    : Object.values((slotsData as Record<string, unknown>) || {});

  slotsArray.forEach((slot: any) => {
    if (!slot?.product_id) return;
    const key = normalizeProductId(slot.product_id);
    const discountValue = Number(slot.discount_value);
    if (key && Number.isFinite(discountValue) && discountValue > 0) {
      map[key] = discountValue;
    }
  });

  return map;
}

export function normalizeProductDiscount(
  product: any,
  slotDiscountMap?: Record<string, number>
): { value: number } | null {
  const raw = product?.discount;
  if (raw?.value && Number(raw.value) > 0) return { value: Number(raw.value) };
  if (typeof raw === "number" && raw > 0) return { value: raw };
  if (typeof raw === "string") {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) return { value: parsed };
  }

  const key = normalizeProductId(product?.id ?? product?._id);
  const slotDiscount = key ? slotDiscountMap?.[key] : undefined;
  if (slotDiscount && slotDiscount > 0) return { value: slotDiscount };

  const slotFieldDiscount = Number(product?.discount_value);
  if (Number.isFinite(slotFieldDiscount) && slotFieldDiscount > 0) {
    return { value: slotFieldDiscount };
  }

  return null;
}

export function normalizeBrandToken(value: string): string {
  let token = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  // Handle catalog typos like "Cetaphill" vs product "Cetaphil".
  token = token.replace(/([a-z])\1+$/g, "$1");
  return token;
}

export function getProductBrandId(product: unknown): string {
  const p = product as Record<string, unknown>;
  const brand = p?.brand as Record<string, unknown> | string | undefined;
  const productBrand = p?.productBrand as Record<string, unknown> | string | undefined;
  return String(
    p?.brandId ??
      p?.brand_id ??
      (typeof brand === "object" && brand ? brand._id : "") ??
      (typeof productBrand === "object" && productBrand ? productBrand._id : "") ??
      (typeof brand === "string" ? brand : "") ??
      (typeof productBrand === "string" ? productBrand : "") ??
      ""
  ).trim();
}

export function getProductBrandName(product: unknown): string {
  const p = product as Record<string, unknown>;
  const brand = p?.brand as Record<string, unknown> | string | undefined;
  const productBrand = p?.productBrand as Record<string, unknown> | string | undefined;
  return String(
    (typeof brand === "object" && brand ? brand.name : "") ||
      (typeof productBrand === "object" && productBrand ? productBrand.name : "") ||
      (typeof brand === "string" ? brand : "") ||
      (typeof productBrand === "string" ? productBrand : "") ||
      p?.brandName ||
      p?.brand_name ||
      ""
  ).trim();
}

export function productMatchesBrandFilter(
  product: unknown,
  selectedBrandId: string,
  selectedBrandName?: string
): boolean {
  if (!selectedBrandId || selectedBrandId === "all") return true;

  const productName = String((product as any)?.name ?? "");
  const productNameToken = normalizeBrandToken(productName);
  const firstWord = normalizeBrandToken(productName.split(/\s+/)[0] ?? "");
  const brandToken = selectedBrandName
    ? normalizeBrandToken(selectedBrandName)
    : "";
  const productBrandNameToken = normalizeBrandToken(getProductBrandName(product));

  // 1) Exact brand-id match (same source of truth as admin catalog mapping)
  const productBrandId = getProductBrandId(product);
  if (productBrandId && productBrandId === String(selectedBrandId)) {
    return true;
  }

  // 2) Product.brand.name matches selected brand label ("Bio Derma" ↔ "Bioderma")
  if (brandToken && productBrandNameToken) {
    if (
      productBrandNameToken === brandToken ||
      (brandToken.length >= 4 &&
        (productBrandNameToken.startsWith(brandToken) ||
          brandToken.startsWith(productBrandNameToken)))
    ) {
      return true;
    }
  }

  // 3) Product title matches brand — including multi-word brands like "The Face Shop"
  if (brandToken && productNameToken) {
    if (brandToken.length >= 3 && productNameToken.startsWith(brandToken)) {
      return true;
    }
    if (firstWord === brandToken) return true;

    // Build prefix from successive words: "The" + "Face" + "Shop" → thefaceshop
    const words = productName.split(/\s+/).filter(Boolean);
    let acc = "";
    for (const word of words.slice(0, 4)) {
      acc += word;
      const prefixToken = normalizeBrandToken(acc);
      if (!prefixToken) continue;
      if (prefixToken === brandToken) return true;
      if (
        brandToken.length >= 4 &&
        prefixToken.length >= 4 &&
        (prefixToken.startsWith(brandToken) || brandToken.startsWith(prefixToken))
      ) {
        // Prefer full brand match once we've accumulated enough characters
        if (prefixToken.startsWith(brandToken)) return true;
        if (brandToken.startsWith(prefixToken) && prefixToken.length >= brandToken.length - 2) {
          // keep accumulating
        }
      }
      if (prefixToken.length >= brandToken.length) break;
    }

    if (firstWord.length >= 4 && brandToken.length >= 4) {
      if (firstWord.startsWith(brandToken) || brandToken.startsWith(firstWord)) {
        return true;
      }
    }

    // Last resort for long brand tokens embedded in the title
    if (brandToken.length >= 6 && productNameToken.includes(brandToken)) {
      return true;
    }
  }

  return false;
}

export function productMatchesCategoryFilter(
  product: unknown,
  selectedCategoryId: string,
  selectedCategoryTitle?: string
): boolean {
  if (!selectedCategoryId || selectedCategoryId === "all") return true;

  const p = product as Record<string, unknown>;
  const productCategory = p?.productCategory as Record<string, unknown> | undefined;
  const categoryId = String(productCategory?._id ?? p?.categoryId ?? "").trim();
  if (categoryId && categoryId === String(selectedCategoryId)) return true;

  const categoryTitle = String(
    productCategory?.title ?? p?.category ?? ""
  ).trim();
  if (selectedCategoryTitle && categoryTitle) {
    return (
      categoryTitle.toLowerCase() === selectedCategoryTitle.toLowerCase()
    );
  }

  return false;
}

export type CatalogFilterOptions = {
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryTitle?: string;
};

function slotOnlyProductMatchesFilters(
  slotProduct: Record<string, unknown>,
  filters?: CatalogFilterOptions
): boolean {
  const hasBrand = Boolean(filters?.brandId && filters.brandId !== "all");
  const hasCategory = Boolean(filters?.categoryId && filters.categoryId !== "all");
  if (!hasBrand && !hasCategory) return true;

  if (
    hasBrand &&
    !productMatchesBrandFilter(
      slotProduct,
      filters!.brandId!,
      filters?.brandName
    )
  ) {
    return false;
  }

  if (
    hasCategory &&
    !productMatchesCategoryFilter(
      slotProduct,
      filters!.categoryId!,
      filters?.categoryTitle
    )
  ) {
    return false;
  }

  return true;
}

export type MergeCatalogOptions = {
  /** @deprecated Use catalogFilters — kept for backwards compatibility */
  includeUnlistedSlotProducts?: boolean;
  /** When set, slot-only products are included if they match these filters. */
  catalogFilters?: CatalogFilterOptions;
};

/** Include catalog products plus slot-assigned products missing from the API response. */
export function mergeCatalogWithSlotProducts(
  catalogProducts: any[],
  slotsData: unknown,
  options: MergeCatalogOptions = {}
): any[] {
  const { catalogFilters } = options;
  const slotDiscountMap = getSlotDiscountMap(slotsData);
  const byId = new Map<string, any>();
  catalogProducts.forEach((product) => {
    const key = normalizeProductId(product?.id ?? product?._id);
    if (!key) return;
    if (!slotOnlyProductMatchesFilters(product, catalogFilters)) return;
    byId.set(key, {
      ...product,
      discount: normalizeProductDiscount(product, slotDiscountMap) ?? product?.discount ?? null,
    });
  });

  const slotsArray = Array.isArray(slotsData)
    ? slotsData
    : Object.values((slotsData as Record<string, unknown>) || {});

  slotsArray.forEach((slot: any) => {
    if (!slot?.product_id || Number(slot.quantity || 0) <= 0) return;
    const key = normalizeProductId(slot.product_id);
    if (!key) return;

    if (byId.has(key)) {
      const existing = byId.get(key)!;
      if (!normalizeProductDiscount(existing, slotDiscountMap)) {
        const slotDiscount = normalizeProductDiscount(
          { discount_value: slot.discount_value },
          slotDiscountMap
        );
        if (slotDiscount) {
          byId.set(key, { ...existing, discount: slotDiscount });
        }
      }
      return;
    }

    const slotProduct = {
      id: slot.product_id,
      name: slot.product_name || "Product",
      retail_price: slot.retail_price ?? 0,
      category: slot.category || "",
      image_url: slot.image_url || "",
      quantity: Number(slot.quantity || 0),
      discount_value: slot.discount_value,
      discount: normalizeProductDiscount(
        { id: slot.product_id, discount_value: slot.discount_value },
        slotDiscountMap
      ),
      in_stock: true,
    };

    if (!slotOnlyProductMatchesFilters(slotProduct, catalogFilters)) return;

    byId.set(key, slotProduct);
  });

  return Array.from(byId.values());
}
