import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LANDING_IMAGE_API_URL,
  extractLandingImageMeta,
  getDefaultLandingImage,
  isRemoteImageAccessible,
  makeLocationCandidates,
  normalizeLocationCode,
} from "@/lib/landing-image.shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_REVALIDATE_MS = 10 * 60 * 1000;
const MAKE_TIMEOUT_MS = 8000;

type MemoryCache = {
  primaryLocation: string;
  location: string;
  imageUrl: string;
  updatedAt: string;
  fetchedAt: number;
};

const memoryCache = new Map<string, MemoryCache>();

function jsonOk(body: Record<string, unknown>) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

function fallbackPayload(location = "COMMON") {
  return {
    success: true,
    imageUrl: getDefaultLandingImage(),
    location,
    source: "fallback",
    forced: false,
    cached: false,
    updatedAt: "",
    primaryLocation: location,
    usedFallback: false,
    makeCallsToday: 0,
    makeCallsRemaining: 0,
  };
}

function withCacheBust(imageUrl: string, version: string): string {
  if (!imageUrl.startsWith("http")) return imageUrl;
  const join = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${join}v=${encodeURIComponent(version)}`;
}

function todayKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchLandingImageFromMake(location: string): Promise<{
  imageUrl: string;
  updatedAt: string;
  filename: string;
}> {
  const empty = { imageUrl: "", updatedAt: "", filename: "" };
  const webhookUrl = (
    process.env.LANDING_IMAGE_API_URL || DEFAULT_LANDING_IMAGE_API_URL
  ).trim();
  const normalizedLocation = normalizeLocationCode(location);
  if (!webhookUrl || !normalizedLocation) return empty;

  const params = new URLSearchParams();
  params.set("location", normalizedLocation);
  const separator = webhookUrl.includes("?") ? "&" : "?";
  const requestUrl = `${webhookUrl}${separator}${params.toString()}`;

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(MAKE_TIMEOUT_MS),
    });
    if (!response.ok) return empty;

    const raw = await response.text();
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return empty;

    return extractLandingImageMeta(JSON.parse(trimmed));
  } catch (err) {
    console.warn("[landing-image] Make fetch failed for", normalizedLocation, err);
    return empty;
  }
}

export async function GET(request: NextRequest) {
  try {
    const force =
      request.nextUrl.searchParams.get("force") === "1" ||
      request.nextUrl.searchParams.get("force") === "true" ||
      request.nextUrl.searchParams.get("refresh") === "1";

    const requested =
      request.nextUrl.searchParams.get("location") ||
      process.env.LW_MACHINE_NAME ||
      "COMMON";
    const primaryLocation = normalizeLocationCode(requested) || "COMMON";
    const cacheKey = primaryLocation;

    if (!force) {
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < CACHE_REVALIDATE_MS) {
        const version = cached.updatedAt || todayKey();
        return jsonOk({
          success: true,
          imageUrl: withCacheBust(cached.imageUrl, version),
          location: cached.location,
          source: "cache",
          forced: false,
          cached: true,
          updatedAt: cached.updatedAt,
          primaryLocation: cached.primaryLocation,
          usedFallback:
            cached.location === "COMMON" && cached.primaryLocation !== "COMMON",
          makeCallsToday: 0,
          makeCallsRemaining: 0,
        });
      }
    }

    for (const location of makeLocationCandidates(primaryLocation)) {
      const meta = await fetchLandingImageFromMake(location);
      if (!meta.imageUrl) continue;
      const ok = await isRemoteImageAccessible(meta.imageUrl);
      if (!ok) continue;

      const updatedAt = meta.updatedAt || new Date().toISOString();
      memoryCache.set(cacheKey, {
        primaryLocation,
        location,
        imageUrl: meta.imageUrl,
        updatedAt,
        fetchedAt: Date.now(),
      });

      return jsonOk({
        success: true,
        imageUrl: withCacheBust(meta.imageUrl, updatedAt),
        location,
        source: "api",
        forced: force,
        cached: false,
        updatedAt,
        primaryLocation,
        usedFallback: location === "COMMON" && primaryLocation !== "COMMON",
        makeCallsToday: 0,
        makeCallsRemaining: 0,
      });
    }

    return jsonOk(fallbackPayload(primaryLocation));
  } catch (error) {
    console.error("[landing-image] Failed to resolve landing image:", error);
    return jsonOk({ ...fallbackPayload(), success: false });
  }
}
