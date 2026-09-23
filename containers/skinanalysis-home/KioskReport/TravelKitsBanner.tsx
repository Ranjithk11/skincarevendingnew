"use client";

import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import {
  PAGE_PADDING_X,
  RADIUS_MD,
  SECTION_GAP,
} from "./constants";
import { arrowNudge, fadeUp, gentleFloat, PREMIUM_EASE, shimmerSweep } from "./animations";

type Props = {
  onView: () => void;
};

/**
 * Compact travel-kit teaser (mockup banner). Full kit grid opens via onView.
 */
export default function TravelKitsBanner({ onView }: Props) {
  return (
    <Box
      sx={{
        px: `${PAGE_PADDING_X}px`,
        py: `${SECTION_GAP * 0.5}px`,
        flexShrink: 0,
        animation: `${fadeUp} 0.5s ${PREMIUM_EASE} 0.32s both`,
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onView}
        sx={{
          width: "100%",
          m: 0,
          p: 0,
          border: "1px solid #C7D2FE",
          borderRadius: RADIUS_MD,
          background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          px: "12px",
          py: "10px",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          transition: `transform 0.18s ${PREMIUM_EASE}, box-shadow 0.18s ${PREMIUM_EASE}`,
          boxShadow: "0 2px 8px rgba(99, 102, 241, 0.08)",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)",
            backgroundSize: "220% 100%",
            animation: `${shimmerSweep} 4.5s ease-in-out 1s infinite`,
            pointerEvents: "none",
          },
          "&:active": { transform: "scale(0.985)" },
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid #C7D2FE",
            animation: `${gentleFloat} 2.8s ease-in-out infinite`,
            zIndex: 1,
          }}
        >
          <Icon icon="mdi:bag-suitcase-outline" width={20} color="#6366F1" />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, zIndex: 1 }}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              color: "#3730A3",
              lineHeight: 1.25,
            }}
          >
            Need a travel kit?
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 500,
              color: "#5B6B8A",
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Compact skincare kits for your next journey
          </Typography>
        </Box>

        <Typography
          sx={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 800,
            color: "#4F46E5",
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            whiteSpace: "nowrap",
            zIndex: 1,
          }}
        >
          View Travel Kits
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              animation: `${arrowNudge} 1.6s ease-in-out infinite`,
            }}
          >
            <Icon icon="mdi:arrow-right" width={14} color="#4F46E5" />
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
