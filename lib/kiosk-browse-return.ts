import { APP_ROUTES } from "@/utils/routes";

const BROWSE_RETURN_KEY = "leafwater_kiosk_browse_return";

export type BrowseReturnState = {
  path: string;
  userId: string | null;
  at: number;
};

/** Save where Browse came from so the next visitor cannot reuse another user's return. */
export function setBrowseReturnToReport(userId?: string | null) {
  if (typeof window === "undefined") return;
  const payload: BrowseReturnState = {
    path: APP_ROUTES.KIOSK_REPORT,
    userId: userId ? String(userId) : null,
    at: Date.now(),
  };
  try {
    sessionStorage.setItem(BROWSE_RETURN_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function getBrowseReturn(currentUserId?: string | null): BrowseReturnState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BROWSE_RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowseReturnState;
    if (!parsed?.path) return null;
    // Drop stale returns from a previous visitor on the same kiosk.
    if (parsed.userId && currentUserId && String(parsed.userId) !== String(currentUserId)) {
      clearBrowseReturn();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearBrowseReturn() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(BROWSE_RETURN_KEY);
  } catch {
    /* ignore */
  }
}

export function isBrowseFromReportQuery(from: string | null | undefined): boolean {
  return from === "report" || from === "kiosk-report";
}
