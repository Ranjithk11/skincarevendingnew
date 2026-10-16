"use client";

import { Box } from "@mui/material";
import ScanConsentBackButton from "./ScanConsentBackButton";
import ScanConsentLogo from "./ScanConsentLogo";

type Props = {
  onBack: () => void;
};

export default function ScanConsentHeader({ onBack }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 2,
        pt: 1,
      }}
    >
      <ScanConsentBackButton onBack={onBack} />
      <ScanConsentLogo />
      <Box sx={{ width: 64, height: 64 }} />
    </Box>
  );
}
