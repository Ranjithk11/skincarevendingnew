"use client";

import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { MIN_FONT, REPORT_GREEN_DARK } from "./constants";

export default function ReportFooter() {
  return (
    <Box
      sx={{
        mt: "auto",
        bgcolor: REPORT_GREEN_DARK,
        minHeight: 48,
        py: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      <Icon icon="mdi:leaf" width={22} color="#fff" />
      <Typography sx={{ color: "#fff", fontSize: MIN_FONT, fontWeight: 600, letterSpacing: 0.3, lineHeight: 1.2 }}>
        Healthy Skin, Confident You!
      </Typography>
      <Icon icon="mdi:leaf" width={22} color="#fff" />
    </Box>
  );
}
