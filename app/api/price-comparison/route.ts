import { NextResponse } from "next/server";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/17fXVFiywu4XM8_aR9Fpz0L_csq1S9ZSivUx8cY_hPmw/gviz/tq?tqx=out:csv&gid=148173948";

interface PriceRow {
  brand: string;
  productId: string;
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
  // Columns: 0=Brand, 1=Product Id's, 2=Product Name, 3=Leafwater Price, 4=Amazon price, 5=Amazon Link, 6=Nykaa price
  const rows: PriceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const brand = cols[0] || "";
    const productId = (cols[1] || "").trim();
    const productName = cols[2] || "";
    if (!productName) continue;

    const leafwaterPrice = parseNumber(cols[3] || "");
    const amazonPrice = parseNumber(cols[4] || "");
    const nykaaPrice = parseNumber(cols[6] || "");

    rows.push({ brand, productId, productName, leafwaterPrice, amazonPrice, nykaaPrice });
  }

  cachedData = rows;
  cacheTimestamp = now;
  return rows;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get("product") || "";
    const productId = searchParams.get("productId") || "";

    const data = await fetchSheetData();

    // Only match by exact product ID
    if (productId) {
      const match = findByProductId(productId, data);
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

function findByProductId(
  productId: string,
  data: PriceRow[]
): PriceRow | null {
  if (!productId) return null;
  const normalizedId = productId.replace(/^products\//, "").trim();
  if (!normalizedId) return null;

  return data.find((e) => {
    const sheetId = e.productId.trim();
    if (!sheetId) return false;
    return sheetId === normalizedId;
  }) || null;
}
