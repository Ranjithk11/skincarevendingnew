import { sqliteDb } from "@/lib/sqlite-db";
import {
  DEFAULT_LANDING_IMAGE_API_URL,
  extractLandingImageMeta,
  getDefaultLandingImage,
  isRemoteImageAccessible,
  makeLocationCandidates,
  normalizeLocationCode,
} from "@/lib/landing-image.shared";

/** Max Make.com landing-image fetches per calendar day (per machine DB). */
const DAILY_MAKE_LIMIT = 50;
/** Re-check Make for a newer image even when today's cache exists. */
const CACHE_REVALIDATE_MS = 10 * 60 * 1000;

function todayKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cacheSettingKey(location: string): string {
  return `landing_image_cache_${normalizeLocationCode(location)}`;
}

function makeCountKey(): string {
  return `landing_image_make_count_${todayKey()}`;
}

function getMakeCallCount(): number {
  const n = parseInt(sqliteDb.getSetting(makeCountKey()) || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function incrementMakeCallCount(): number {
  const next = getMakeCallCount() + 1;
  sqliteDb.setSetting(
    makeCountKey(),
    String(next),
    "Landing image Make.com calls for today"
  );
  return next;
}

function canCallMake(): boolean {
  return getMakeCallCount() < DAILY_MAKE_LIMIT;
}

/** Admin dashboard machine name → Make location code (any non-empty name). */
function getAdminMachineLocationCode(): string {
  try {
    const rawName = sqliteDb.getMachineName() || "";
    if (!rawName || rawName === "LeafWater_Default") return "";
    return normalizeLocationCode(rawName);
  } catch {
    return normalizeLocationCode(process.env.LW_MACHINE_NAME || "");
  }
}

type LandingImageCache = {
  date: string;
  imageUrl: string;
  location: string;
  updatedAt?: string;
  filename?: string;
  fetchedAt?: string;
};

function isCacheStale(cached: LandingImageCache | null): boolean {
  if (!cached?.fetchedAt) return true;
  const fetchedAt = Date.parse(cached.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return true;
  return Date.now() - fetchedAt > CACHE_REVALIDATE_MS;
}

function readCache(location: string): LandingImageCache | null {
  try {
    const raw = sqliteDb.getSetting(cacheSettingKey(location));
    if (!raw || !String(raw).trim()) return null;
    const parsed = JSON.parse(raw) as LandingImageCache;
    if (!parsed?.date || !parsed?.imageUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(
  location: string,
  imageUrl: string,
  meta?: { updatedAt?: string; filename?: string }
): void {
  const payload: LandingImageCache = {
    date: todayKey(),
    imageUrl,
    location: normalizeLocationCode(location),
    updatedAt: meta?.updatedAt || new Date().toISOString(),
    filename: meta?.filename || "",
    fetchedAt: new Date().toISOString(),
  };
  sqliteDb.setSetting(
    cacheSettingKey(location),
    JSON.stringify(payload),
    `Cached landing image for ${payload.location}`
  );
}

/** Clear cache for admin machine name, Make aliases, and COMMON. */
export function clearLandingImageCaches(): void {
  const adminName = getAdminMachineLocationCode();
  const keys = makeLocationCandidates(adminName || "COMMON");
  for (const key of keys) {
    sqliteDb.setSetting(
      cacheSettingKey(key),
      "",
      "Cleared landing image cache"
    );
  }
}

async function fetchLandingImageFromBackend(
  location: string,
  opts?: { bypassLimit?: boolean }
): Promise<{
  imageUrl: string;
  updatedAt: string;
  filename: string;
}> {
  const empty = { imageUrl: "", updatedAt: "", filename: "" };
  const webhookUrl = (
    process.env.LANDING_IMAGE_API_URL || DEFAULT_LANDING_IMAGE_API_URL
  ).trim();

  if (!webhookUrl) return empty;

  const normalizedLocation = normalizeLocationCode(location);
  if (!normalizedLocation) return empty;

  const bypassLimit = Boolean(opts?.bypassLimit);
  if (!bypassLimit && !canCallMake()) {
    console.warn(
      "[landing-image] Daily Make limit reached (",
      DAILY_MAKE_LIMIT,
      ") — skipping Make for",
      normalizedLocation
    );
    return empty;
  }

  const params = new URLSearchParams();
  params.set("location", normalizedLocation);

  const separator = webhookUrl.includes("?") ? "&" : "?";
  const requestUrl = `${webhookUrl}${separator}${params.toString()}`;

  try {
    incrementMakeCallCount();
    const response = await fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        "[landing-image] Make HTTP",
        response.status,
        "for",
        normalizedLocation
      );
      return empty;
    }

    const raw = await response.text();
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      console.warn(
        "[landing-image] Make returned no JSON for",
        normalizedLocation,
        trimmed.slice(0, 80)
      );
      return empty;
    }

    let json: unknown;
    try {
      json = JSON.parse(trimmed);
    } catch {
      console.warn(
        "[landing-image] Make JSON parse failed for",
        normalizedLocation
      );
      return empty;
    }

    const meta = extractLandingImageMeta(json);
    if (!meta.imageUrl) {
      console.warn(
        "[landing-image] Make returned no imageUrl for",
        normalizedLocation,
        json
      );
    }
    return meta;
  } catch (err) {
    console.warn("[landing-image] Make fetch failed for", normalizedLocation, err);
    return empty;
  }
}

function withCacheBust(imageUrl: string, version: string): string {
  if (!imageUrl.startsWith("http")) return imageUrl;
  const v = version || todayKey();
  const join = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${join}v=${encodeURIComponent(v)}`;
}

type ResolveResult = {
  imageUrl: string;
  location: string;
  source: "api" | "cache" | "fallback";
  forced: boolean;
  updatedAt: string;
  primaryLocation: string;
  usedFallback: boolean;
  makeCallsToday: number;
  makeCallsRemaining: number;
};

let inFlight: Promise<ResolveResult> | null = null;
let inFlightKey = "";

async function resolveLandingImageUrlInner(opts?: {
  force?: boolean;
  bypassLimit?: boolean;
}): Promise<ResolveResult> {
  const force = Boolean(opts?.force);
  const bypassLimit = Boolean(opts?.bypassLimit);
  const today = todayKey();
  const makeCallsToday = () => getMakeCallCount();
  const remaining = () => Math.max(0, DAILY_MAKE_LIMIT - getMakeCallCount());

  // Location = admin dashboard machine name, plus Make aliases (GMR-HYD-LW-M4 → GMR-AIRPORT-M4).
  const primaryLocation = getAdminMachineLocationCode() || "COMMON";
  const locationsToTry = makeLocationCandidates(primaryLocation);

  for (const location of locationsToTry) {
    const cached = readCache(location);
    const cacheFresh = Boolean(
      cached && cached.date === today && cached.imageUrl
    );
    const cacheStale = isCacheStale(cached);

    // Serve cache unless force, miss, or Make may have a newer imageUrl.
    if (!force && cacheFresh && cached && !cacheStale) {
      const version = cached.updatedAt || cached.date;
      return {
        imageUrl: withCacheBust(cached.imageUrl, version),
        location,
        source: "cache",
        forced: false,
        updatedAt: cached.updatedAt || "",
        primaryLocation,
        usedFallback: location === "COMMON" && primaryLocation !== "COMMON",
        makeCallsToday: makeCallsToday(),
        makeCallsRemaining: remaining(),
      };
    }

    // Force, stale, or miss: call Make (admin machine-name save bypasses the daily cap).
    if (bypassLimit || canCallMake()) {
      const meta = await fetchLandingImageFromBackend(location, { bypassLimit });
      if (meta.imageUrl) {
        const ok = await isRemoteImageAccessible(meta.imageUrl);
        if (ok) {
          writeCache(location, meta.imageUrl, meta);
          if (location !== primaryLocation && primaryLocation !== "COMMON") {
            writeCache(primaryLocation, meta.imageUrl, meta);
          }
          const version = meta.updatedAt || new Date().toISOString();
          return {
            imageUrl: withCacheBust(meta.imageUrl, version),
            location,
            source: "api",
            forced: force,
            updatedAt: meta.updatedAt || "",
            primaryLocation,
            usedFallback: location === "COMMON" && primaryLocation !== "COMMON",
            makeCallsToday: makeCallsToday(),
            makeCallsRemaining: remaining(),
          };
        }
      }
    }

    // Make skipped/failed — use today's cache if we have it.
    if (cacheFresh && cached) {
      const version = cached.updatedAt || cached.date;
      return {
        imageUrl: withCacheBust(cached.imageUrl, version),
        location,
        source: "cache",
        forced: force,
        updatedAt: cached.updatedAt || "",
        primaryLocation,
        usedFallback: location === "COMMON" && primaryLocation !== "COMMON",
        makeCallsToday: makeCallsToday(),
        makeCallsRemaining: remaining(),
      };
    }
  }

  return {
    imageUrl: getDefaultLandingImage(),
    location: primaryLocation,
    source: "fallback",
    forced: force,
    updatedAt: "",
    primaryLocation,
    usedFallback: false,
    makeCallsToday: makeCallsToday(),
    makeCallsRemaining: remaining(),
  };
}

/**
 * Resolve landing image using admin machine name.
 * Make.com is called at most 50 times per day (force refresh uses that budget).
 * Admin machine-name save passes bypassLimit so a location change always fetches.
 */
export async function resolveLandingImageUrl(opts?: {
  force?: boolean;
  bypassLimit?: boolean;
}): Promise<ResolveResult> {
  const force = Boolean(opts?.force);
  const bypassLimit = Boolean(opts?.bypassLimit);
  const key = `${force ? "force" : "normal"}:${bypassLimit ? "bypass" : "cap"}:${todayKey()}:${getAdminMachineLocationCode()}`;

  if (inFlight && inFlightKey === key) {
    return inFlight;
  }

  inFlightKey = key;
  inFlight = resolveLandingImageUrlInner(opts).finally(() => {
    if (inFlightKey === key) {
      inFlight = null;
      inFlightKey = "";
    }
  });

  return inFlight;
}

export { getDefaultLandingImage, DAILY_MAKE_LIMIT };
