"use client";

import { Box, CircularProgress } from "@mui/material";
import { SCAN_CONSENT_FOREST } from "./scanConsentTheme";

export default function ScanConsentRedirecting() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        bgcolor: "#f8faf9",
      }}
    >
      <CircularProgress sx={{ color: SCAN_CONSENT_FOREST }} />
    </Box>
  );
}
