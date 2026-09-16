import { Suspense } from "react";
import TakeSelfie from "@/containers/skinanalysis-home/TakeSelfie";
import FaceScanSelfie from "@/containers/skinanalysis-home/FaceScanSelfie";
import { USE_MEDIAPIPE_FACE_SCAN } from "@/lib/face-scan-mode";

/**
 * Questionnaire → /skinanalysis/selfie
 *
 * Default (USE_MEDIAPIPE_FACE_SCAN=false): legacy TakeSelfie + ARCamera + cloud analysis.
 * MediaPipe FaceScanSelfie stays available when the flag is flipped to true.
 */
export default function SelfiePage() {
  if (USE_MEDIAPIPE_FACE_SCAN) {
    return (
      <Suspense fallback={null}>
        <FaceScanSelfie />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <TakeSelfie />
    </Suspense>
  );
}
