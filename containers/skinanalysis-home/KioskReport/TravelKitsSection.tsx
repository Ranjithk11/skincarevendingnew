"use client";

import { useEffect, useState } from "react";
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
  REPORT_MUTED,
  SECTION_GAP,
  SMALL_SIZE,
  TRAVEL_CARD_HEIGHT,
  TRAVEL_GRID_GAP,
  TRAVEL_KITS,
} from "./constants";
import { fadeUp, scaleIn, staggerDelay } from "./animations";
import { isTravelKitPurchaseAvailable } from "./utils";

type Props = {
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export default function TravelKitsSection({ selectedIds, onToggle }: Props) {
  const [purchaseAvailable, setPurchaseAvailable] = useState(true);

  useEffect(() => {
    const refresh = () => setPurchaseAvailable(isTravelKitPurchaseAvailable());
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, []);

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
          opacity: purchaseAvailable ? 1 : 0.92,
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
              color: purchaseAvailable ? REPORT_GREEN : "#5B6B8A",
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {purchaseAvailable
              ? "Morning 7:00 AM → Evening 7:00 PM"
              : "Opens again at 7:00 AM"}
          </Typography>
        </Box>

        {!purchaseAvailable ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              mb: "8px",
              px: "10px",
              py: "7px",
              borderRadius: RADIUS_MD,
              bgcolor: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
              background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
              border: "1px solid #C7D2FE",
            }}
          >
            <Icon icon="mdi:moon-waning-crescent" width={16} color="#6366F1" />
            <Typography
              sx={{
                fontSize: 13,
                color: "#4338CA",
                lineHeight: 1.35,
                fontWeight: 500,
              }}
            >
              Staff handoff unavailable overnight — kits unlock at 7:00 AM.
            </Typography>
          </Box>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: `${TRAVEL_GRID_GAP}px`,
          }}
        >
          {TRAVEL_KITS.map((kit, index) => {
            const checked = purchaseAvailable && selectedIds.includes(kit.id);
            return (
              <Box
                key={kit.id}
                onClick={() => {
                  if (!purchaseAvailable) return;
                  onToggle(kit.id);
                }}
                sx={{
                  position: "relative",
                  border: `1.5px solid ${checked ? REPORT_GREEN : REPORT_BORDER}`,
                  borderRadius: RADIUS_MD,
                  overflow: "hidden",
                  height: TRAVEL_CARD_HEIGHT,
                  width: "100%",
                  cursor: purchaseAvailable ? "pointer" : "not-allowed",
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
                  filter: purchaseAvailable ? "none" : "saturate(0.75) brightness(1.02)",
                  "&:active": purchaseAvailable ? { transform: "scale(0.97)" } : undefined,
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background: purchaseAvailable
                      ? "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.12) 42%, rgba(255,255,255,0.82) 100%)"
                      : "linear-gradient(180deg, rgba(238,242,255,0.55) 0%, rgba(245,243,255,0.35) 50%, rgba(255,255,255,0.88) 100%)",
                    pointerEvents: "none",
                  }}
                />

                {purchaseAvailable ? (
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
                ) : (
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 2,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "3px",
                      px: "8px",
                      py: "6px",
                      minWidth: "72px",
                      borderRadius: "10px",
                      background: "linear-gradient(145deg, rgba(99,102,241,0.94) 0%, rgba(79,70,229,0.96) 100%)",
                      boxShadow: "0 4px 14px rgba(79,70,229,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <Icon icon="mdi:moon-waning-crescent" width={14} color="#E0E7FF" />
                    <Typography
                      sx={{
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        lineHeight: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      Closed
                    </Typography>
                    <Typography
                      sx={{
                        color: "rgba(224,231,255,0.92)",
                        fontSize: 8,
                        fontWeight: 600,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      7 PM
                    </Typography>
                  </Box>
                )}

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
                      fontWeight: 900,
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
