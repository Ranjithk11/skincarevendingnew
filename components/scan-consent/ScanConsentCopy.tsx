"use client";

import { Box, Typography } from "@mui/material";
import { SCAN_CONSENT_FOREST, SCAN_CONSENT_GOLD, SCAN_CONSENT_MUTED } from "./scanConsentTheme";

export default function ScanConsentCopy() {
  return (
    <Box sx={{ px: 1, textAlign: "center" }}>
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: SCAN_CONSENT_GOLD,
          mb: 1,
        }}
      >
        Skin scan consent
      </Typography>
      <Typography
        sx={{
          fontSize: 30,
          fontWeight: 800,
          color: SCAN_CONSENT_FOREST,
          lineHeight: 1.2,
          mb: 1.5,
        }}
      >
        Before we scan your skin
      </Typography>
      <Typography sx={{ fontSize: 18, color: SCAN_CONSENT_MUTED, lineHeight: 1.45 }}>
        We use the camera only to analyse your skin and suggest products for this
        visit. The camera will not open until you agree to the scan.
      </Typography>
    </Box>
  );
}
