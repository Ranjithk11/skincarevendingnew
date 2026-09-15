import { Suspense } from "react";
import FaceScanSelfie from "@/containers/skinanalysis-home/FaceScanSelfie";

/**
 * Questionnaire → /skinanalysis/selfie
 * Now mounts MediaPipe AI Face Scan (newyolo), not the old face-api TakeSelfie.
 */
export default function SelfiePage() {
  return (
    <Suspense fallback={null}>
      <FaceScanSelfie />
    </Suspense>
  );
}
