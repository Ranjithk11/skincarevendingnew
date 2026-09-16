/** Keep URL inline — avoid pulling skin-analysis into the questionnaire bundle. */
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/**
 * Warm the Face Landmarker .task into the browser HTTP cache.
 * Call only when navigating to selfie — not on questionnaire mount (large download).
 */
export function prefetchFaceLandmarkerModel() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __lwMpModelPrefetch?: boolean };
  if (w.__lwMpModelPrefetch) return;
  w.__lwMpModelPrefetch = true;
  void fetch(FACE_LANDMARKER_MODEL_URL, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  }).catch(() => {
    /* offline / blocked — selfie will retry */
  });
}
