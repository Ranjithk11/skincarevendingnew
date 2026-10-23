import { Suspense } from "react";
import ScanConsentRedirecting from "@/components/scan-consent/ScanConsentRedirecting";
import ScanConsentBypass from "@/components/scan-consent/ScanConsentBypass";

export default function ScanConsentPage() {
  return (
    <Suspense fallback={<ScanConsentRedirecting />}>
      <ScanConsentBypass />
    </Suspense>
  );
}
