import type { SkinAnalysisResult, SkinConcernScore } from "@/components/skin-analysis/types";

export const MEDIAPIPE_SCAN_SESSION_KEY = "leafwater_mediapipe_scan";
export const MEDIAPIPE_SCAN_PREVIEW_KEY = "leafwater_mediapipe_scan_preview";

export type StoredMediapipeScan = {
  concerns: Array<{ code: string; name: string; value: number }>;
  analyzedAt: string;
};

/** Persist detected MediaPipe concerns for the kiosk report page. */
export function saveMediapipeScanResult(result: SkinAnalysisResult) {
  if (typeof window === "undefined") return;
  const detected = result.scores
    .filter((s) => s.value >= 3)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((s) => ({ code: s.code, name: s.name, value: s.value }));

  const payload: StoredMediapipeScan = {
    concerns: detected.length
      ? detected
      : result.topConcerns.slice(0, 5).map((s) => ({
          code: s.code,
          name: s.name,
          value: s.value,
        })),
    analyzedAt: result.analyzedAt,
  };

  try {
    sessionStorage.setItem(MEDIAPIPE_SCAN_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function loadMediapipeScanResult(): StoredMediapipeScan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MEDIAPIPE_SCAN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMediapipeScan;
    if (!parsed?.concerns?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadMediapipePreview(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(MEDIAPIPE_SCAN_PREVIEW_KEY);
  } catch {
    return null;
  }
}

export function saveMediapipePreview(base64: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MEDIAPIPE_SCAN_PREVIEW_KEY, base64);
  } catch {
    /* ignore */
  }
}

export function clearMediapipeScanResult() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(MEDIAPIPE_SCAN_SESSION_KEY);
    sessionStorage.removeItem(MEDIAPIPE_SCAN_PREVIEW_KEY);
  } catch {
    /* ignore */
  }
}

export function scoresToStored(scores: SkinConcernScore[]) {
  return scores.map((s) => ({ code: s.code, name: s.name, value: s.value }));
}
