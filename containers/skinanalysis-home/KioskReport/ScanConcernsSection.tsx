"use client";

import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import type { ConcernItem, HealthRating, SkinTypeId } from "./types";
import {
  ANALYSIS_SECTION_HEIGHT,
  BODY_SIZE,
  CONCERN_ICON_SIZE,
  CONCERN_LABEL_FONT,
  HEADING_SIZE,
  HEADING_WEIGHT,
  HEALTH_BADGE_HEIGHT,
  HEALTH_STATUS_FONT,
  PAGE_PADDING_X,
  REPORT_BORDER,
  REPORT_GREEN,
  SCAN_PHOTO_HEIGHT,
  SCAN_PHOTO_WIDTH,
  SECTION_GAP,
} from "./constants";
import { cornerPulse, fadeUp, scaleIn, softPulse, staggerDelay } from "./animations";
import { getConcernChipTone } from "./utils";

type Props = {
  imageUrl?: string;
  health: HealthRating;
  concerns: ConcernItem[];
  skinType: SkinTypeId;
};

function ScanCorners() {
  const arm = {
    position: "absolute" as const,
    width: 14,
    height: 14,
    borderColor: REPORT_GREEN,
    borderStyle: "solid",
    animation: `${cornerPulse} 2.2s ease-in-out infinite`,
  };
  return (
    <>
      <Box sx={{ ...arm, top: 5, left: 5, borderWidth: "2px 0 0 2px" }} />
      <Box sx={{ ...arm, top: 5, right: 5, borderWidth: "2px 2px 0 0", animationDelay: "0.15s" }} />
      <Box sx={{ ...arm, bottom: 5, left: 5, borderWidth: "0 0 2px 2px", animationDelay: "0.3s" }} />
      <Box sx={{ ...arm, bottom: 5, right: 5, borderWidth: "0 2px 2px 0", animationDelay: "0.45s" }} />
    </>
  );
}

export default function ScanConcernsSection({ imageUrl, health, concerns, skinType }: Props) {
  const shown = concerns.slice(0, 6);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `${SCAN_PHOTO_WIDTH}px 1fr`,
        gap: "18px",
        px: `${PAGE_PADDING_X}px`,
        py: `${SECTION_GAP / 2}px`,
        flexShrink: 0,
        height: ANALYSIS_SECTION_HEIGHT,
        boxSizing: "border-box",
        alignItems: "stretch",
        overflow: "hidden",
        animation: `${fadeUp} 0.5s ease-out 0.08s both`,
      }}
    >
      <Box
        sx={{
          width: SCAN_PHOTO_WIDTH,
          height: SCAN_PHOTO_HEIGHT,
          flexShrink: 0,
          borderRadius: "18px",
          overflow: "hidden",
          bgcolor: "#e5e7eb",
          position: "relative",
          border: `1px solid ${REPORT_BORDER}`,
          alignSelf: "center",
          animation: `${scaleIn} 0.55s cubic-bezier(0.22, 1, 0.36, 1) both`,
        }}
      >
        {imageUrl ? (
          <Box
            component="img"
            src={imageUrl}
            alt="Scan"
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
        <ScanCorners />
      </Box>

      <Box
        sx={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <Typography
          sx={{
            fontSize: HEADING_SIZE,
            fontWeight: HEADING_WEIGHT,
            color: "#111",
            lineHeight: 1.2,
            textTransform: "uppercase",
            animation: `${fadeUp} 0.45s ease-out 0.12s both`,
          }}
        >
          Overall Skincare Health
        </Typography>

        <Box
          sx={{
            alignSelf: "flex-start",
            maxWidth: "100%",
            minHeight: HEALTH_BADGE_HEIGHT,
            px: "18px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            borderRadius: "30px",
            bgcolor: health.pillBg,
            border: `1px solid ${health.color}33`,
            boxSizing: "border-box",
            animation: `${softPulse} 1.8s ease-in-out 0.35s 2`,
          }}
        >
          <Icon icon="mdi:heart-plus" width={20} color={health.color} />
          <Typography
            sx={{
              fontSize: HEALTH_STATUS_FONT,
              fontWeight: 700,
              color: health.color,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            {health.rating}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: HEADING_SIZE,
            fontWeight: HEADING_WEIGHT,
            color: "#111",
            lineHeight: 1.2,
            textTransform: "uppercase",
            animation: `${fadeUp} 0.45s ease-out 0.2s both`,
          }}
        >
          Key Concerns
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "8px",
            width: "100%",
          }}
        >
          {shown.map((concern, index) => {
            const tone = getConcernChipTone(concern.label, skinType);
            return (
              <Box
                key={concern.key}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  minWidth: 0,
                  animation: `${scaleIn} 0.4s ease-out both`,
                  animationDelay: staggerDelay(index, 60, 280),
                }}
              >
                <Box
                  sx={{
                    width: CONCERN_ICON_SIZE,
                    height: CONCERN_ICON_SIZE,
                    borderRadius: "50%",
                    bgcolor: tone.bg,
                    border: `1px solid ${tone.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "transform 0.2s ease",
                    "&:active": { transform: "scale(0.92)" },
                  }}
                >
                  <Icon icon={concern.icon} width={22} color={tone.dot || REPORT_GREEN} />
                </Box>
                <Typography
                  sx={{
                    fontSize: CONCERN_LABEL_FONT,
                    lineHeight: 1.1,
                    textAlign: "center",
                    fontWeight: 600,
                    color: "#1F3D30",
                    width: "100%",
                  }}
                >
                  {concern.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {shown.length === 0 ? (
          <Typography sx={{ fontSize: BODY_SIZE, color: "#6B7280" }}>
            No key concerns highlighted.
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
