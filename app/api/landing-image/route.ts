import { NextRequest, NextResponse } from "next/server";
import { getDefaultLandingImage } from "@/lib/landing-image.shared";

export const dynamic = "force-dynamic";

const IS_VERCEL = process.env.VERCEL === "1";

function fallbackPayload() {
  return {
    success: true,
    imageUrl: getDefaultLandingImage(),
    location: "COMMON",
    source: "fallback",
    forced: false,
    cached: false,
    updatedAt: "",
    primaryLocation: "COMMON",
    usedFallback: false,
    makeCallsToday: 0,
    makeCallsRemaining: 0,
  };
}

export async function GET(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json(fallbackPayload(), {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  try {
    const force =
      request.nextUrl.searchParams.get("force") === "1" ||
      request.nextUrl.searchParams.get("force") === "true" ||
      request.nextUrl.searchParams.get("refresh") === "1";

    const { resolveLandingImageUrl } = await import("@/lib/landing-image.server");
    const result = await resolveLandingImageUrl({ force });

    return NextResponse.json(
      {
        success: true,
        imageUrl: result.imageUrl,
        location: result.location,
        source: result.source,
        forced: result.forced,
        cached: result.source === "cache",
        updatedAt: result.updatedAt || "",
        primaryLocation: result.primaryLocation,
        usedFallback: result.usedFallback,
        makeCallsToday: result.makeCallsToday,
        makeCallsRemaining: result.makeCallsRemaining,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("[landing-image] Failed to resolve landing image:", error);

    return NextResponse.json({
      success: false,
      imageUrl: getDefaultLandingImage(),
      location: "COMMON",
      source: "fallback",
      forced: false,
      cached: false,
      updatedAt: "",
      primaryLocation: "COMMON",
      usedFallback: false,
      makeCallsToday: 0,
      makeCallsRemaining: 0,
    });
  }
}
