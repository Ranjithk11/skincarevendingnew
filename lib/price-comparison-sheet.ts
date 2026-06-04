import { normalizeProductId } from "@/utils/normalizeProductId";

export const PRICE_COMPARISON_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/17fXVFiywu4XM8_aR9Fpz0L_csq1S9ZSivUx8cY_hPmw/gviz/tq?tqx=out:csv&gid=148173948";

export interface PriceRow {
  brand: string;
  productId: string;
  productName: string;
  leafwaterPrice: number | null;
  amazonPrice: number | null;
  nykaaPrice: number | null;
}

function parseNumber(val: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/** Parse full CSV text (handles quoted fields with commas/newlines). */
function parseCSVRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

let cachedData: PriceRow[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchSheetPriceData(): Promise<PriceRow[]> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  const res = await fetch(PRICE_COMPARISON_SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status}`);
  }

  const text = await res.text();
  const records = parseCSVRecords(text);

  // 0=Brand, 1=Product Id's, 2=Product Name, 3=Leafwater, 4=Amazon, 5=Link, 6=Nykaa
  const rows: PriceRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const cols = records[i];
    const productName = cols[2] || "";
    if (!productName) continue;

    rows.push({
      brand: cols[0] || "",
      productId: (cols[1] || "").trim(),
      productName,
      leafwaterPrice: parseNumber(cols[3] || ""),
      amazonPrice: parseNumber(cols[4] || ""),
      nykaaPrice: parseNumber(cols[6] || ""),
    });
  }

  cachedData = rows;
  cacheTimestamp = now;
  return rows;
}

/** Match sheet row by Product Id column only (exact, after normalizeProductId). */
export function findSheetPriceByProductId(
  productId: string,
  data: PriceRow[]
): PriceRow | null {
  const normalizedId = normalizeProductId(productId);
  if (!normalizedId) return null;

  return (
    data.find((e) => e.productId.trim() === normalizedId) || null
  );
}
