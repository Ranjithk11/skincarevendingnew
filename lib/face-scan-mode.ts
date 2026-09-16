/**
 * Feature flag: MediaPipe (newyolo) face scan vs legacy TakeSelfie (face-api + cloud analysis).
 *
 * Set to `true` later to re-enable MediaPipe without deleting any of that code.
 * All MediaPipe components under `components/skin-analysis/` and `FaceScanSelfie.tsx` stay in the repo.
 */
export const USE_MEDIAPIPE_FACE_SCAN = false;
