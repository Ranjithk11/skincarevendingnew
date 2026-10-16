import { Suspense } from "react";
import { ScanConsentScreen } from "@/components/scan-consent";
import ScanConsentRedirecting from "@/components/scan-consent/ScanConsentRedirecting";

export default function ScanConsentPage() {
  return (
    <Suspense fallback={<ScanConsentRedirecting />}>
      <ScanConsentScreen />
    </Suspense>
  );
}
