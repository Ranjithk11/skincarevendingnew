/** Extract sheet-style numeric product id from app ids (e.g. products/31104026). */
export function normalizeProductId(id: unknown): string {
  const raw = String(id ?? "").trim();
  if (!raw) return "";
  const numericMatch = raw.match(/(\d{5,})\/?$/);
  if (numericMatch?.[1]) return numericMatch[1];
  return raw.replace(/^products\//, "");
}
