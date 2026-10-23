"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ensureScanConsentForProceed,
  selfiePathFromConsentSearch,
} from "@/lib/scan-consent";
import ScanConsentRedirecting from "./ScanConsentRedirecting";

export default function ScanConsentBypass() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    ensureScanConsentForProceed();
    router.replace(
      selfiePathFromConsentSearch(new URLSearchParams(searchParams.toString()))
    );
  }, [router, searchParams]);

  return <ScanConsentRedirecting />;
}
