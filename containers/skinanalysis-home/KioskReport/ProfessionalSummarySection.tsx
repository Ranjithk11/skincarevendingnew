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
import { fadeUp } from "./animations";

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
        animation: `${fadeUp} 0.5s ease-out 0.18s both`,
      }}
    >
      <Box
        sx={{
          width: "100%",
          minHeight: SUMMARY_MIN_HEIGHT,
          border: `1px solid ${REPORT_BORDER}`,
          borderRadius: RADIUS_LG,
          px: "22px",
          py: "16px",
          boxSizing: "border-box",
          transition: "box-shadow 0.25s ease, border-color 0.25s ease",
          "&:hover": {
            borderColor: `${REPORT_GREEN}55`,
            boxShadow: "0 4px 14px rgba(47, 93, 70, 0.08)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px", mb: "6px" }}>
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
            fontSize: BODY_SIZE,
            lineHeight: 1.45,
            fontWeight: 400,
            color: "#374151",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: `calc(${BODY_SIZE}px * 1.45 * 2)`,
          }}
        >
          {summary}
        </Typography>
      </Box>
    </Box>
  );
}
