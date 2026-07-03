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

/** Include catalog products plus slot-assigned products missing from the API response. */
export function mergeCatalogWithSlotProducts(
  catalogProducts: any[],
  slotsData: unknown
): any[] {
  const byId = new Map<string, any>();
  catalogProducts.forEach((product) => {
    const key = normalizeProductId(product?.id ?? product?._id);
    if (key) byId.set(key, product);
  });

  const slotsArray = Array.isArray(slotsData)
    ? slotsData
    : Object.values((slotsData as Record<string, unknown>) || {});

  slotsArray.forEach((slot: any) => {
    if (!slot?.product_id || Number(slot.quantity || 0) <= 0) return;
    const key = normalizeProductId(slot.product_id);
    if (!key || byId.has(key)) return;

    byId.set(key, {
      id: slot.product_id,
      name: slot.product_name || "Product",
      retail_price: slot.retail_price ?? 0,
      category: slot.category || "",
      image_url: slot.image_url || "",
      quantity: Number(slot.quantity || 0),
      in_stock: true,
    });
  });

  return Array.from(byId.values());
}
