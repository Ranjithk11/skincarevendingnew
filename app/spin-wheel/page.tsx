import { Suspense } from "react";
import SpinWheel from "@/components/spin-wheel/SpinWheel";

export default function SpinWheelPage() {
  return (
    <Suspense fallback={null}>
      <SpinWheel />
    </Suspense>
  );
}
