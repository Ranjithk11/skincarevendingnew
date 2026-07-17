import { APP_ROUTES } from "@/utils/routes";

/** Only allow same-origin app paths as post-spin return targets. */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const decoded = decodeURIComponent(value).trim();
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function buildSpinWheelHref(returnTo?: string | null): string {
  const safe = sanitizeReturnTo(returnTo ?? null);
  if (!safe) return APP_ROUTES.SPIN_WHEEL;
  return `${APP_ROUTES.SPIN_WHEEL}?returnTo=${encodeURIComponent(safe)}`;
}

export function resolveSpinWheelContinuePath(returnTo: string | null): string {
  return returnTo ?? APP_ROUTES.SLOTS;
}
