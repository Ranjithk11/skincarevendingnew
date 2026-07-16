export const DEFAULT_LANDING_IMAGE = "/logo/newLanding.png";

/** Make.com Image Retrieval API default webhook (override via LANDING_IMAGE_API_URL). */
export const DEFAULT_LANDING_IMAGE_API_URL =
  "https://hook.eu1.make.com/ovrqvu3wcqb6qoi5znlx7dy8q2wm628g";

export function getDefaultLandingImage(): string {
  return DEFAULT_LANDING_IMAGE;
}

/** Normalize machine location to API location codes (e.g. t_hub -> T-HUB). */
export function normalizeLocationCode(location: string): string {
  return String(location ?? "")
    .trim()
    .toUpperCase()
    .replace(/_/g, "-");
}

export function extractLandingImageUrl(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const root = payload as Record<string, unknown>;

  if (root.success === false) return "";

  const direct =
    root.imageUrl ??
    root.image_url ??
    root.url ??
    root.image;

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const data = root.data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (nested.success === false) return "";

    const nestedUrl =
      nested.imageUrl ??
      nested.image_url ??
      nested.url ??
      nested.image;
    if (typeof nestedUrl === "string" && nestedUrl.trim()) {
      return nestedUrl.trim();
    }
  }

  return "";
}

/** Returns true only when the remote image responds with HTTP 200 and is not an XML error body. */
export async function isRemoteImageAccessible(url: string): Promise<boolean> {
  if (!url.startsWith("http")) return true;

  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    if (!response.ok) return false;

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("xml") || contentType.includes("text/html")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
