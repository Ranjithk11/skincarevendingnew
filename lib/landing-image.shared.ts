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
  return extractLandingImageMeta(payload).imageUrl;
}

export function extractLandingImageMeta(payload: unknown): {
  imageUrl: string;
  updatedAt: string;
  filename: string;
} {
  const empty = { imageUrl: "", updatedAt: "", filename: "" };
  if (!payload || typeof payload !== "object") return empty;

  const root = payload as Record<string, unknown>;
  if (root.success === false) return empty;

  const pick = (obj: Record<string, unknown>) => {
    const imageUrl = String(
      obj.imageUrl ?? obj.image_url ?? obj.url ?? obj.image ?? ""
    ).trim();
    const updatedAt = String(obj.updatedAt ?? obj.updated_at ?? "").trim();
    const filename = String(obj.filename ?? obj.fileName ?? "").trim();
    return { imageUrl, updatedAt, filename };
  };

  const fromRoot = pick(root);
  if (fromRoot.imageUrl) return fromRoot;

  const data = root.data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (nested.success === false) return empty;
    const fromNested = pick(nested);
    if (fromNested.imageUrl) return fromNested;
  }

  return empty;
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
