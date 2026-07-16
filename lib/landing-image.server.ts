import {
  DEFAULT_LANDING_IMAGE_API_URL,
  extractLandingImageUrl,
  getDefaultLandingImage,
  isRemoteImageAccessible,
  normalizeLocationCode,
} from "@/lib/landing-image.shared";
async function fetchLandingImageFromBackend(
  location: string
): Promise<string> {
  const webhookUrl = (
    process.env.LANDING_IMAGE_API_URL || DEFAULT_LANDING_IMAGE_API_URL
  ).trim();

  if (!webhookUrl) return "";

  const normalizedLocation = normalizeLocationCode(location);
  if (!normalizedLocation) return "";

  const params = new URLSearchParams();
  params.set("location", normalizedLocation);

  const separator = webhookUrl.includes("?") ? "&" : "?";
  const requestUrl = `${webhookUrl}${separator}${params.toString()}`;

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) return "";

    const json = await response.json();
    return extractLandingImageUrl(json);
  } catch {
    return "";
  }
}

export async function resolveLandingImageUrl(
  preferredLocation?: string
): Promise<{ imageUrl: string; location: string; source: "api" | "fallback" }> {
  let machineLocation = normalizeLocationCode(String(preferredLocation ?? ""));

  if (!machineLocation) {
    try {
      const { sqliteDb } = await import("@/lib/sqlite-db");
      machineLocation = normalizeLocationCode(
        sqliteDb.getMachineLocation() ||
          process.env.LW_MACHINE_LOCATION ||
          process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
          ""
      );
    } catch {
      machineLocation = normalizeLocationCode(
        process.env.LW_MACHINE_LOCATION ||
          process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
          ""
      );
    }
  }

  // Try machine location first, then "COMMON" shared promo if configured in Make datastore.
  const locationsToTry = Array.from(
    new Set([machineLocation, "COMMON"].filter(Boolean))
  );

  for (const location of locationsToTry) {
    const imageUrl = await fetchLandingImageFromBackend(location);
    if (imageUrl && (await isRemoteImageAccessible(imageUrl))) {
      return { imageUrl, location, source: "api" };
    }
  }
  return {
    imageUrl: getDefaultLandingImage(),
    location: machineLocation || "COMMON",
    source: "fallback",
  };
}

export { getDefaultLandingImage };
