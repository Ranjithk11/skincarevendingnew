import { getCatalogProductImageUrl } from "@/lib/catalog-products";
import {
  buildSlotsMap,
  getSlotDiscountMap,
  getSlotInfoForProduct,
  getSlotRetailPriceForProduct,
  mergeCatalogWithSlotProducts,
  normalizeProductDiscount,
  normalizeProductId,
} from "@/lib/product-slot-utils";
import type { ReportProduct } from "@/containers/skinanalysis-home/KioskReport/types";

export const EVERGRIT_WIPES_DELAY_MS = 15_000;
export const EVERGRIT_WIPES_POPUP_TIMEOUT_MS = 30_000;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isEvergritResetWipe(product: any): boolean {
  const brand = normalizeText(
    product?.brand?.name ||
      product?.productBrand?.name ||
      product?.brand?.label ||
      product?.brand ||
      ""
  );
  const name = normalizeText(product?.name);
  const extra = normalizeText(
    [product?.category, product?.productCategory?.title, product?.description].join(" ")
  );
  const haystack = `${brand} ${name} ${extra}`;
  const isBrand = /ever\s*grit/.test(haystack);
  const isWipe = /\bwipes?\b/.test(haystack);
  const isReset = /\breset\b/.test(haystack);
  return isBrand && isWipe && (isReset || isBrand);
}

function payablePrice(retailPrice: number, discountValue: number): number {
  if (!discountValue || discountValue <= 0) return Math.round(retailPrice);
  return Math.round(retailPrice - retailPrice * (discountValue / 100));
}

export function mapEvergritWipeProduct(
  product: any,
  slotsData: unknown
): ReportProduct | null {
  const id = normalizeProductId(product?._id || product?.id || product?._key);
  if (!id) return null;

  const slotsMap = buildSlotsMap(slotsData);
  const slotInfo = getSlotInfoForProduct(product, slotsMap);
  const slotPrice = getSlotRetailPriceForProduct(product?._id || product?.id, slotsData);
  const retailPrice = Number(
    slotPrice ?? product?.retailPrice ?? product?.retail_price ?? 0
  );
  const discount = normalizeProductDiscount(product, getSlotDiscountMap(slotsData));
  const discountValue = Number(discount?.value ?? 0);

  return {
    id,
    name: product?.name || "EVERGRIT Reset Wipes",
    imageUrl: getCatalogProductImageUrl(product),
    retailPrice,
    payablePrice: payablePrice(retailPrice, discountValue),
    discountValue,
    slotId: slotInfo?.slotNumbers?.[0],
    slotNumbers: slotInfo?.slotNumbers || [],
    volumeLabel: "",
    category: product?.productCategory?.title || product?.category || "Wipes",
  };
}

export function mergeSelectedIdsWithWipes(
  pickedIds: string[],
  previousIds: string[],
  wipes: ReportProduct[]
): string[] {
  const wipeIds = new Set(
    wipes.filter(isWipeVendableOnMachine).map((product) => product.id)
  );
  const extras = previousIds.filter(
    (id) => wipeIds.has(id) && !pickedIds.includes(id)
  );
  return [...pickedIds, ...extras];
}

export function isWipeVendableOnMachine(product: Pick<ReportProduct, "slotId" | "slotNumbers">): boolean {
  const slots = Array.isArray(product.slotNumbers) ? product.slotNumbers : [];
  return slots.some((slot) => Number.isFinite(slot)) || Number.isFinite(Number(product.slotId));
}

export function mapEvergritResetWipes(
  catalogProducts: any[],
  slotsData: unknown
): ReportProduct[] {
  const machineProducts = mergeCatalogWithSlotProducts(catalogProducts, slotsData);
  const seen = new Set<string>();
  const mapped: ReportProduct[] = [];

  const consider = (product: any) => {
    if (!isEvergritResetWipe(product)) return;
    const next = mapEvergritWipeProduct(product, slotsData);
    if (!next || seen.has(next.id)) return;
    seen.add(next.id);
    mapped.push(next);
  };

  machineProducts.forEach(consider);
  (Array.isArray(catalogProducts) ? catalogProducts : []).forEach(consider);

  return mapped;
}
