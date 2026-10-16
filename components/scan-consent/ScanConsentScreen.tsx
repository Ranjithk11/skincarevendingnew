"use client";

import { Box } from "@mui/material";
import PageBackground from "@/components/ui/PageBackground";
import ScanConsentActions from "./ScanConsentActions";
import ScanConsentChoices from "./ScanConsentChoices";
import ScanConsentCopy from "./ScanConsentCopy";
import ScanConsentFinePrint from "./ScanConsentFinePrint";
import ScanConsentHeader from "./ScanConsentHeader";
import { useScanConsentScreen } from "./useScanConsentScreen";

export default function ScanConsentScreen() {
  const {
    scanAgreed,
    marketingAgreed,
    busy,
    canStart,
    toggleScan,
    toggleMarketing,
    handleBack,
    handleSkip,
    handleStart,
  } = useScanConsentScreen();

  return (
    <PageBackground>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          width: "100%",
        }}
      >
        <ScanConsentHeader onBack={handleBack} />
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            px: 3,
            pb: 3,
            pt: 1,
            maxWidth: 640,
            mx: "auto",
            width: "100%",
          }}
        >
          <ScanConsentCopy />
          <ScanConsentChoices
            scanAgreed={scanAgreed}
            marketingAgreed={marketingAgreed}
            onToggleScan={toggleScan}
            onToggleMarketing={toggleMarketing}
          />
          <ScanConsentActions
            canStart={canStart}
            busy={busy}
            onStart={handleStart}
            onSkip={handleSkip}
          />
          <ScanConsentFinePrint />
        </Box>
      </Box>
    </PageBackground>
  );
}
