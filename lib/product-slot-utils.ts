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

export function getProductBrandId(product: unknown): string {
  const p = product as Record<string, unknown>;
  const brand = p?.brand as Record<string, unknown> | undefined;
  const productBrand = p?.productBrand as Record<string, unknown> | string | undefined;
  return String(
    p?.brandId ??
      p?.brand_id ??
      brand?._id ??
      (typeof productBrand === "object" ? productBrand?._id : productBrand) ??
      ""
  ).trim();
}

export function productMatchesBrandFilter(
  product: unknown,
  selectedBrandId: string,
  selectedBrandName?: string
): boolean {
  if (!selectedBrandId || selectedBrandId === "all") return true;

  const productBrandId = getProductBrandId(product);
  if (productBrandId && productBrandId === String(selectedBrandId)) return true;

  if (selectedBrandName) {
    const normalizedBrand = selectedBrandName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedName = String((product as any)?.name ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (normalizedBrand && normalizedName.includes(normalizedBrand)) return true;
  }

  return false;
}

export type MergeCatalogOptions = {
  /** When false, only enrich catalog rows — do not inject slot-only products (keeps brand/category filters). */
  includeUnlistedSlotProducts?: boolean;
};

/** Include catalog products plus slot-assigned products missing from the API response. */
export function mergeCatalogWithSlotProducts(
  catalogProducts: any[],
  slotsData: unknown,
  options: MergeCatalogOptions = {}
): any[] {
  const { includeUnlistedSlotProducts = true } = options;
  const slotDiscountMap = getSlotDiscountMap(slotsData);
  const byId = new Map<string, any>();
  catalogProducts.forEach((product) => {
    const key = normalizeProductId(product?.id ?? product?._id);
    if (!key) return;
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

    if (!includeUnlistedSlotProducts) return;

    byId.set(key, {
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
    });
  });

  return Array.from(byId.values());
}
