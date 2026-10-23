"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  consentPathFromSelfieSearch,
  ensureScanConsentForProceed,
  hasValidScanConsent,
  SKIP_SCAN_CONSENT_PAGE,
} from "@/lib/scan-consent";
import ScanConsentRedirecting from "./ScanConsentRedirecting";

type Props = {
  children: React.ReactNode;
};

export default function ScanConsentGate({ children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (SKIP_SCAN_CONSENT_PAGE) {
      ensureScanConsentForProceed();
      setAllowed(true);
      return;
    }
    if (hasValidScanConsent()) {
      setAllowed(true);
      return;
    }
    const search = searchParams.toString();
    router.replace(consentPathFromSelfieSearch(search ? `?${search}` : ""));
  }, [router, searchParams]);

  if (!allowed) return <ScanConsentRedirecting />;
  return <>{children}</>;
}
