"use client";

import { Stack } from "@mui/material";
import ScanConsentRequiredChoice from "./ScanConsentRequiredChoice";
import ScanConsentMarketingChoice from "./ScanConsentMarketingChoice";

type Props = {
  scanAgreed: boolean;
  marketingAgreed: boolean;
  onToggleScan: () => void;
  onToggleMarketing: () => void;
};

export default function ScanConsentChoices({
  scanAgreed,
  marketingAgreed,
  onToggleScan,
  onToggleMarketing,
}: Props) {
  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      <ScanConsentRequiredChoice checked={scanAgreed} onToggle={onToggleScan} />
      <ScanConsentMarketingChoice
        checked={marketingAgreed}
        onToggle={onToggleMarketing}
      />
    </Stack>
  );
}
