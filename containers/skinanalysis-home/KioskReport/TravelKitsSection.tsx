"use client";

import { Box, Checkbox, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import {
  HEADING_SIZE,
  HEADING_WEIGHT,
  PAGE_PADDING_X,
  RADIUS_LG,
  RADIUS_MD,
  REPORT_BORDER,
  REPORT_GREEN,
  SECTION_GAP,
  SMALL_SIZE,
  TRAVEL_CARD_HEIGHT,
  TRAVEL_GRID_GAP,
  TRAVEL_KITS,
} from "./constants";
import { fadeUp, scaleIn, staggerDelay } from "./animations";

type Props = {
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export default function TravelKitsSection({ selectedIds, onToggle }: Props) {
  return (
    <Box
      sx={{
        px: `${PAGE_PADDING_X}px`,
        py: `${SECTION_GAP / 2}px`,
        flexShrink: 0,
        animation: `${fadeUp} 0.5s ease-out 0.3s both`,
      }}
    >
      <Box
        sx={{
          border: `1px solid ${REPORT_BORDER}`,
          borderRadius: RADIUS_LG,
          px: "14px",
          py: "10px",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: "8px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon icon="mdi:bag-suitcase-outline" width={18} color={REPORT_GREEN} />
            <Typography
              sx={{
                fontSize: HEADING_SIZE,
                fontWeight: HEADING_WEIGHT,
                color: "#111",
                lineHeight: 1.2,
                textTransform: "uppercase",
              }}
            >
              Travel Kits
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: 14,
              color: REPORT_GREEN,
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            Morning 7:00 AM → Evening 6:00 PM
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: `${TRAVEL_GRID_GAP}px`,
          }}
        >
          {TRAVEL_KITS.map((kit, index) => {
            const checked = selectedIds.includes(kit.id);
            return (
              <Box
                key={kit.id}
                onClick={() => onToggle(kit.id)}
                sx={{
                  position: "relative",
                  border: `1.5px solid ${checked ? REPORT_GREEN : REPORT_BORDER}`,
                  borderRadius: RADIUS_MD,
                  overflow: "hidden",
                  height: TRAVEL_CARD_HEIGHT,
                  width: "100%",
                  cursor: "pointer",
                  backgroundImage: `url(${kit.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  boxSizing: "border-box",
                  animation: `${scaleIn} 0.4s ease-out both`,
                  animationDelay: staggerDelay(index, 70, 360),
                  transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: checked
                    ? "0 6px 16px rgba(47, 93, 70, 0.16)"
                    : "0 1px 4px rgba(0,0,0,0.05)",
                  "&:active": { transform: "scale(0.97)" },
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.12) 42%, rgba(255,255,255,0.82) 100%)",
                    pointerEvents: "none",
                  }}
                />

                <Checkbox
                  checked={checked}
                  onChange={() => onToggle(kit.id)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    p: 0,
                    zIndex: 2,
                    color: REPORT_GREEN,
                    bgcolor: "rgba(255,255,255,0.75)",
                    borderRadius: 0.5,
                    "& .MuiSvgIcon-root": { fontSize: 20 },
                    "&.Mui-checked": { color: REPORT_GREEN },
                  }}
                />

                <Box
                  sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1,
                    px: "6px",
                    pb: "8px",
                    pt: "4px",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: SMALL_SIZE,
                      fontWeight: 700,
                      color: kit.accent,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      textShadow: "0 1px 0 rgba(255,255,255,0.9)",
                    }}
                  >
                    {kit.title}
                  </Typography>
                  <Typography
                    sx={{
                      mt: "2px",
                      fontSize: 18,
                      fontWeight: 900,
                      color: "#FF0000",
                      lineHeight: 1.1,
                      textShadow: "0 1px 0 rgba(255,255,255,0.9)",
                    }}
                  >
                    ₹{kit.price}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
