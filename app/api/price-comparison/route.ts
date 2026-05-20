import { NextResponse } from "next/server";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/17fXVFiywu4XM8_aR9Fpz0L_csq1S9ZSivUx8cY_hPmw/gviz/tq?tqx=out:csv&gid=2129493116";

interface PriceRow {
  brand: string;
  productName: string;
  leafwaterPrice: number | null;
  amazonPrice: number | null;
  nykaaPrice: number | null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumber(val: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

// Cache: store parsed data for 5 minutes to avoid hammering Google Sheets
let cachedData: PriceRow[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchSheetData(): Promise<PriceRow[]> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status}`);
  }

  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  // Skip header row (first line)
  const rows: PriceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    // Columns: 0=Brand, 1=Product Name, 6=Leafwater Price, 7=Amazon Price, 9=Nykaa Price
    const brand = cols[0] || "";
    const productName = cols[1] || "";
    if (!brand || !productName) continue;

    const leafwaterPrice = parseNumber(cols[6] || "");
    const amazonPrice = parseNumber(cols[7] || "");
    const nykaaPrice = parseNumber(cols[9] || "");

    rows.push({ brand, productName, leafwaterPrice, amazonPrice, nykaaPrice });
  }

  cachedData = rows;
  cacheTimestamp = now;
  return rows;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get("product") || "";

    const data = await fetchSheetData();

    // If a product name is provided, find the best match
    if (productName) {
      const match = findBestMatch(productName, data);
      return NextResponse.json({ success: true, match });
    }

    // Return all data
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[price-comparison] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function findBestMatch(
  input: string,
  data: PriceRow[]
): PriceRow | null {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const n = normalize(input);

  // 1. Exact match
  const exact = data.find(
    (e) =>
      normalize(e.productName) === n ||
      normalize(`${e.brand} ${e.productName}`) === n
  );
  if (exact) return exact;

  // 2. Includes match
  const includes = data.find((e) => {
    const name = normalize(e.productName);
    const fullName = normalize(`${e.brand} ${e.productName}`);
    return (
      n.includes(name) ||
      name.includes(n) ||
      n.includes(fullName) ||
      fullName.includes(n)
    );
  });
  if (includes) return includes;

  // 3. Word overlap scoring
  const inputWords = n.split(" ").filter((w) => w.length > 2);
  let bestMatch: PriceRow | null = null;
  let bestScore = 0;

  for (const entry of data) {
    const entryName = normalize(`${entry.brand} ${entry.productName}`);
    const entryWords = entryName.split(" ").filter((w) => w.length > 2);
    const overlap = inputWords.filter((w) => entryWords.includes(w)).length;
    const score = overlap / Math.max(inputWords.length, entryWords.length);
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}
