"use client";

import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import type { SkinConcernScore } from "./types";
import { SKIN_SCAN_BORDER, SKIN_SCAN_GREEN, SKIN_SCAN_GREEN_LIGHT } from "./constants";

type Props = {
  scores: SkinConcernScore[];
  topOnly?: boolean;
  compact?: boolean;
};

export default function SkinScanReportPanel({
  scores,
  topOnly = false,
  compact = false,
}: Props) {
  const list = topOnly ? scores.slice(0, 5) : scores;

  return (
    <Box
      sx={{
        border: `1px solid ${SKIN_SCAN_BORDER}`,
        borderRadius: "12px",
        bgcolor: "#fff",
        px: compact ? 1.25 : 1.75,
        py: compact ? 1 : 1.25,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: compact ? 13 : 15,
            fontWeight: 700,
            color: "#111",
            textTransform: "uppercase",
          }}
        >
          {topOnly ? "Top Visual Signals" : "Skin Scan Report"}
        </Typography>
        <Typography sx={{ fontSize: 11, color: "#7890a8" }}>
          {scores.length} concerns
        </Typography>
      </Box>

      {list.map((item) => (
        <Box
          key={item.code}
          sx={{
            display: "grid",
            gridTemplateColumns: "32px 1fr 36px",
            gap: 1,
            alignItems: "center",
            py: compact ? 0.5 : 0.75,
            borderBottom: `1px solid ${SKIN_SCAN_GREEN_LIGHT}`,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 24,
              borderRadius: "8px",
              bgcolor: SKIN_SCAN_GREEN_LIGHT,
              display: "grid",
              placeItems: "center",
              fontSize: 10,
              fontWeight: 800,
              color: SKIN_SCAN_GREEN,
            }}
          >
            {item.code}
          </Box>
          <Box>
            <Typography sx={{ fontSize: compact ? 11 : 12, fontWeight: 600, color: "#24364b" }}>
              {item.name}
            </Typography>
            <Box
              sx={{
                mt: 0.5,
                height: 5,
                bgcolor: "#e8edf2",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${item.value * 10}%`,
                  height: "100%",
                  bgcolor: item.color,
                  borderRadius: 999,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 9, color: "#8292a5", mt: 0.25 }}>
              {item.level}
            </Typography>
          </Box>
          <Typography
            sx={{
              textAlign: "right",
              fontSize: compact ? 12 : 13,
              fontWeight: 800,
              color: item.color,
            }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}

      {!compact ? (
        <Box
          sx={{
            mt: 1.25,
            display: "flex",
            gap: 0.75,
            alignItems: "flex-start",
            px: 0.5,
          }}
        >
          <Icon icon="mdi:information-outline" width={14} color={SKIN_SCAN_GREEN} />
          <Typography sx={{ fontSize: 10, color: "#788ba0", lineHeight: 1.45 }}>
            Visual screening only — not a medical diagnosis. Scores show relative visual
            signals for kiosk demo and report preview.
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
