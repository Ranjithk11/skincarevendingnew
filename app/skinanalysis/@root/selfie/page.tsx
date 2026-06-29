import { Suspense } from "react";
import TakeSelfie from "@/containers/skinanalysis-home/TakeSelfie";

export default function SelfiePage() {
  return (
    <Suspense fallback={null}>
      <TakeSelfie />
    </Suspense>
  );
}
