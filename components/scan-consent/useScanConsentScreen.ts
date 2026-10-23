"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVoiceMessages } from "@/contexts/VoiceContext";
import { restoreBrowseIfScanAbandoned } from "@/lib/kiosk-journey";
import {
  persistScanConsent,
  saveScanConsent,
  selfiePathFromConsentSearch,
  skipScanBrowsePath,
} from "@/lib/scan-consent";

export function useScanConsentScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { speakMessage } = useVoiceMessages();
  const [scanAgreed, setScanAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    speakMessage("scanConsentIntro");
  }, [speakMessage]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSkip = useCallback(() => {
    restoreBrowseIfScanAbandoned();
    router.push(skipScanBrowsePath());
  }, [router]);

  const persistAndGoToScan = useCallback(
    async (marketingConsent: boolean) => {
      if (busy) return;
      setBusy(true);
      let machineName = "";
      try {
        const res = await fetch("/api/admin/machine-name", { cache: "no-store" });
        const json = await res.json();
        if (json?.success && json.machineName) machineName = String(json.machineName);
      } catch {
        /* optional */
      }
      const record = saveScanConsent({
        marketingConsent,
        machineName,
      });
      await persistScanConsent(record);
      router.push(selfiePathFromConsentSearch(new URLSearchParams(searchParams.toString())));
    },
    [busy, router, searchParams]
  );

  const handleStart = useCallback(async () => {
    if (!scanAgreed) return;
    await persistAndGoToScan(marketingAgreed);
  }, [marketingAgreed, persistAndGoToScan, scanAgreed]);

  const handleAcceptCookies = useCallback(async () => {
    setScanAgreed(true);
    setMarketingAgreed(true);
    await persistAndGoToScan(true);
  }, [persistAndGoToScan]);

  return {
    scanAgreed,
    marketingAgreed,
    busy,
    canStart: scanAgreed,
    toggleScan: () => setScanAgreed((value) => !value),
    toggleMarketing: () => setMarketingAgreed((value) => !value),
    handleBack,
    handleSkip,
    handleStart,
    handleAcceptCookies,
  };
}
