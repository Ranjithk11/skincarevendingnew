import { NextRequest, NextResponse } from "next/server";
import {
  getDefaultLandingImage,
  resolveLandingImageUrl,
} from "@/lib/landing-image.server";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const location = request.nextUrl.searchParams.get("location")?.trim() || "";
    const result = await resolveLandingImageUrl(location || undefined);

    return NextResponse.json(
      {
        success: true,
        imageUrl: result.imageUrl,
        location: result.location,
        source: result.source,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("[landing-image] Failed to resolve landing image:", error);

    return NextResponse.json({      success: false,
      imageUrl: getDefaultLandingImage(),
      location: "common",
      source: "fallback",
    });
  }
}
