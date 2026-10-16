import { Suspense } from "react";
import TakeSelfie from "@/containers/skinanalysis-home/TakeSelfie";
import FaceScanSelfie from "@/containers/skinanalysis-home/FaceScanSelfie";
import { ScanConsentGate } from "@/components/scan-consent";
import { USE_MEDIAPIPE_FACE_SCAN } from "@/lib/face-scan-mode";

/**
 * Consent screen must pass before the camera mounts.
 * Default (USE_MEDIAPIPE_FACE_SCAN=false): TakeSelfie + ARCamera.
 */
export default function SelfiePage() {
  const Camera = USE_MEDIAPIPE_FACE_SCAN ? FaceScanSelfie : TakeSelfie;

  return (
    <Suspense fallback={null}>
      <ScanConsentGate>
        <Camera />
      </ScanConsentGate>
    </Suspense>
  );
}
