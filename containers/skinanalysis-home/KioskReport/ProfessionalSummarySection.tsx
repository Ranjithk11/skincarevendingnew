"use client";

import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { HEADING_WEIGHT, MIN_FONT, REPORT_BORDER, REPORT_GREEN, REPORT_MUTED, TITLE_FONT } from "./constants";

type Props = {
  summary: string;
};

export default function ProfessionalSummarySection({ summary }: Props) {
  return (
    <Box sx={{ px: 1.5, py: 0.35, flexShrink: 0 }}>
      <Box
        sx={{
          border: `1px solid ${REPORT_BORDER}`,
          borderRadius: 1.5,
          px: 1.25,
          py: 0.7,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.35 ,lineHeight: 1.1}}>
          <Icon icon="mdi:clipboard-text-outline" width={20} color={REPORT_GREEN} />
          <Typography sx={{ fontSize: TITLE_FONT, fontWeight: HEADING_WEIGHT, color: "#111", lineHeight: 1.2 }}>
            Professional summary
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: MIN_FONT,
            lineHeight: 1.3,
            gap: 1.5,
            display: "flex",
            flexDirection: "column",
            fontWeight: 400,
            color: "#374151",
          }}
        >
          {summary}
        </Typography>
      </Box>
    </Box>
  );
}
