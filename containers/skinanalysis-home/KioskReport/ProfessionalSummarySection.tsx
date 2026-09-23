"use client";

import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import {
  BODY_SIZE,
  HEADING_SIZE,
  HEADING_WEIGHT,
  PAGE_PADDING_X,
  RADIUS_LG,
  REPORT_BORDER,
  REPORT_GREEN,
  SECTION_GAP,
  SUMMARY_MIN_HEIGHT,
} from "./constants";
import { fadeUp, PREMIUM_EASE } from "./animations";

type Props = {
  summary: string;
};

export default function ProfessionalSummarySection({ summary }: Props) {
  return (
    <Box
      sx={{
        px: `${PAGE_PADDING_X}px`,
        py: `${SECTION_GAP / 2}px`,
        flexShrink: 0,
        animation: `${fadeUp} 0.5s ${PREMIUM_EASE} 0.18s both`,
      }}
    >
      <Box
        sx={{
          width: "100%",
          minHeight: SUMMARY_MIN_HEIGHT,
          border: `1px solid ${REPORT_BORDER}`,
          borderRadius: RADIUS_LG,
          px: "14px",
          py: "8px",
          boxSizing: "border-box",
          transition: `box-shadow 0.3s ${PREMIUM_EASE}, border-color 0.3s ${PREMIUM_EASE}`,
          "&:hover": {
            borderColor: `${REPORT_GREEN}55`,
            boxShadow: "0 4px 14px rgba(47, 93, 70, 0.08)",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            mb: "4px",
            animation: `${fadeUp} 0.4s ${PREMIUM_EASE} 0.22s both`,
          }}
        >
          <Icon icon="mdi:clipboard-text-outline" width={18} color={REPORT_GREEN} />
          <Typography
            sx={{
              fontSize: HEADING_SIZE,
              fontWeight: HEADING_WEIGHT,
              color: "#111",
              lineHeight: 1.2,
              textTransform: "uppercase",
            }}
          >
            Professional Summary
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: BODY_SIZE - 2,
            lineHeight: 1.4,
            fontWeight: 400,
            color: "#374151",
            animation: `${fadeUp} 0.45s ${PREMIUM_EASE} 0.3s both`,
          }}
        >
          {summary}
        </Typography>
      </Box>
    </Box>
  );
}
