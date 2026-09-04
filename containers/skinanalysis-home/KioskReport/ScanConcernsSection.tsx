"use client";

import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import type { ConcernItem, HealthRating, SkinTypeId } from "./types";
import { HEADING_WEIGHT, MIN_FONT, REPORT_BORDER, REPORT_GREEN, TITLE_FONT } from "./constants";
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
    width: 16,
    height: 16,
    gap:1.5,
    lineHeight: 1.1,
    borderColor: REPORT_GREEN,
    borderStyle: "solid",
  };
  return (
    <>
      <Box sx={{ ...arm, top: 5, left: 5, borderWidth: "2px 0 0 2px" }} />
      <Box sx={{ ...arm, top: 5, right: 5, borderWidth: "2px 2px 0 0" }} />
      <Box sx={{ ...arm, bottom: 5, left: 5, borderWidth: "0 0 2px 2px" }} />
      <Box sx={{ ...arm, bottom: 5, right: 5, borderWidth: "0 2px 2px 0" }} />
    </>
  );
}

export default function ScanConcernsSection({ imageUrl, health, concerns, skinType }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.25,
        px: 1.5,
        py: 0.5,
        flexShrink: 0,
        alignItems: "stretch",
      }}
    >
      <Box
        sx={{
          width: 200,
          height: 200,
          flexShrink: 0,
          borderRadius: 1.5,
          overflow: "hidden",
          bgcolor: "#e5e7eb",
          position: "relative",
          border: `1px solid ${REPORT_BORDER}`,
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

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Typography sx={{ fontSize: TITLE_FONT, fontWeight: HEADING_WEIGHT, color: "#111", lineHeight: 1.2 }}>
          Overall Skincare Health
        </Typography>
        <Box
          sx={{
            mt: 0.4,
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.6,
            px: 1.25,
            py: 0.35,
            borderRadius: 999,
            bgcolor: health.pillBg,
            border: `1px solid ${health.color}33`,
          }}
        >
          <Icon icon="mdi:heart-plus" width={18} color={health.color} />
          <Typography sx={{ fontSize: MIN_FONT, fontWeight: 700, color: health.color, lineHeight: 1.1 }}>
            {health.rating}
          </Typography>
        </Box>

        <Typography sx={{ mt: 0.8, fontSize: TITLE_FONT, fontWeight: HEADING_WEIGHT, color: "#111", lineHeight: 1.2 }}>
          Key concerns
        </Typography>
        {/* <Typography sx={{ fontSize: MIN_FONT, color: REPORT_MUTED, mb: 0.55, lineHeight: 1.15, fontWeight: 400 }}>
          What the scan picked up
        </Typography> */}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.65 }}>
          {concerns.map((concern) => {
            const tone = getConcernChipTone(concern.label, skinType);
            return (
              <Box
                key={concern.key}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1.25,
                  lineHeight: 1.5,
                  px: 1.1,
                  py: 0.35,
                  borderRadius: 999,
                  bgcolor: tone.bg,
                  border: `1px solid ${tone.border}`,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: tone.dot,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: MIN_FONT,
                    lineHeight: 1.15,
                    fontWeight: 600,
                    gap: 1.5,
                    color: "#1F3D30",
                    whiteSpace: "nowrap",
                  }}
                >
                  {concern.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
