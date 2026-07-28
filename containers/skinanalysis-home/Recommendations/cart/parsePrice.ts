export function parsePrice(priceText?: string): number {
  if (!priceText) return 0;
  const normalized = String(priceText).replace(/,/g, " ");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : 0;
}
