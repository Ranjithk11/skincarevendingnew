"use client";

import { Box, Checkbox, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { HEADING_WEIGHT, MIN_FONT, REPORT_BORDER, REPORT_GREEN, REPORT_MUTED, TITLE_FONT, TRAVEL_KITS } from "./constants";

type Props = {
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export default function TravelKitsSection({ selectedIds, onToggle }: Props) {
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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 0.35,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Icon icon="mdi:bag-suitcase-outline" width={20} color={REPORT_GREEN} />
            <Typography sx={{ fontSize: TITLE_FONT, fontWeight: HEADING_WEIGHT, color: "#111", lineHeight: 1.2 }}>
              Travel kits
            </Typography>
          </Box>
          <Typography sx={{ fontSize: MIN_FONT, color: REPORT_GREEN, fontWeight: 500, lineHeight: 1.2 }}>
            Available 7 am to 7 pm
          </Typography>
        </Box>
        {/* <Typography sx={{ fontSize: MIN_FONT, color: REPORT_MUTED, mb: 0.6, lineHeight: 1.2 }}>
          Tick a kit to add it to your bill
        </Typography> */}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.8 }}>
          {TRAVEL_KITS.map((kit) => {
            const checked = selectedIds.includes(kit.id);
            return (
              <Box
                key={kit.id}
                onClick={() => onToggle(kit.id)}
                sx={{
                  position: "relative",
                  border: `2px solid ${checked ? REPORT_GREEN : REPORT_BORDER}`,
                  borderRadius: 1.25,
                  overflow: "hidden",
                  height: 128,
                  cursor: "pointer",
                  backgroundImage: `url(${kit.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {/* Soft overlays so title/price stay readable on the photo */}
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
                    top: 0,
                    left: 0,
                    p: 0.1,
                    zIndex: 2,
                    color: REPORT_GREEN,
                    bgcolor: "rgba(255,255,255,0.75)",
                    borderRadius: 0.5,
                    "& .MuiSvgIcon-root": { fontSize: 22 },
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
                    px: 0.5,
                    pb: 0.55,
                    pt: 0.35,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: MIN_FONT,
                      fontWeight: 800,
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
                      fontSize: MIN_FONT,
                      fontWeight: 800,
                      color: REPORT_GREEN,
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
