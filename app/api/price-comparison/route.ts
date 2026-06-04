import { NextResponse } from "next/server";
import {
  fetchSheetPriceData,
  findSheetPriceByProductId,
} from "@/lib/price-comparison-sheet";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "";

    const data = await fetchSheetPriceData();

    if (!productId) {
      return NextResponse.json({ success: true, data });
    }

    const match = findSheetPriceByProductId(productId, data);
    return NextResponse.json({ success: true, match });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[price-comparison] Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
