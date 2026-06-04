export const MAX_CART_QUANTITY_PER_PRODUCT = 10;

export function getMaxAllowedCartQuantity(machineStock: number | null | undefined): number {
  if (machineStock == null) {
    return MAX_CART_QUANTITY_PER_PRODUCT;
  }
  if (machineStock <= 0) {
    return 0;
  }
  return Math.min(MAX_CART_QUANTITY_PER_PRODUCT, Math.floor(machineStock));
}

export function clampCartQuantity(
  requested: number,
  machineStock: number | null | undefined
): { quantity: number; wasLimited: boolean; maxAllowed: number } {
  const maxAllowed = getMaxAllowedCartQuantity(machineStock);
  const safeRequested = Math.max(0, Math.floor(Number.isFinite(requested) ? requested : 0));
  if (safeRequested <= maxAllowed) {
    return { quantity: safeRequested, wasLimited: false, maxAllowed };
  }
  return { quantity: maxAllowed, wasLimited: true, maxAllowed };
}

export function getCartQuantityLimitMessage(
  maxAllowed: number,
  machineStock: number | null | undefined
): string {
  if (maxAllowed <= 0) {
    return "This product is not available in the machine.";
  }

  const stock =
    machineStock != null && Number.isFinite(machineStock)
      ? Math.floor(machineStock)
      : null;

  if (
    stock != null &&
    stock > 0 &&
    stock < MAX_CART_QUANTITY_PER_PRODUCT &&
    maxAllowed === stock
  ) {
    return `Only ${stock} available in machine.`;
  }

  if (maxAllowed >= MAX_CART_QUANTITY_PER_PRODUCT) {
    return "Maximum quantity reached. You can add up to 10 of this product.";
  }

  return `Maximum quantity allowed is ${maxAllowed}.`;
}

export async function fetchMachineStockForProduct(
  productId: string | undefined,
  productName: string
): Promise<number> {
  const cleanProductId = String(productId || "").replace(/^products\//, "").trim();
  if (!cleanProductId) return 0;

  const encodedName = encodeURIComponent(productName);
  try {
    const res = await fetch(
      `/api/admin/products/${cleanProductId}/slots?name=${encodedName}`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const slots = Array.isArray(data?.slots) ? data.slots : [];
    return slots.reduce(
      (sum: number, slot: { quantity?: number }) =>
        sum + (Number(slot?.quantity) > 0 ? Number(slot.quantity) : 0),
      0
    );
  } catch {
    return 0;
  }
}
