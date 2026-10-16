"use client";

import { Box, Typography } from "@mui/material";
import { SCAN_CONSENT_FOREST, SCAN_CONSENT_GOLD } from "./scanConsentTheme";

type Props = {
  message?: string;
};

export default function IdentifiableFaceNotice({
  message = "No identifiable face was found. The scan was not processed.",
}: Props) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: "14px",
        bgcolor: "rgba(255,255,255,0.92)",
        border: `1px solid ${SCAN_CONSENT_GOLD}`,
        color: SCAN_CONSENT_FOREST,
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
        {message}
      </Typography>
    </Box>
  );
}
