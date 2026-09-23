"use client";

import { Box, Dialog, IconButton, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { capitalizeWords } from "@/utils/func";
import {
  RADIUS_MD,
  REPORT_BORDER,
  REPORT_GREEN,
  REPORT_LIGHT_GREEN,
  REPORT_MUTED,
} from "./constants";
import {
  dialogRise,
  fadeUp,
  imageReveal,
  PREMIUM_EASE,
  scaleIn,
  shimmerSweep,
  successFlash,
  staggerDelay,
} from "./animations";
import type { ReportProduct, SkinRoutine } from "./types";
import { formatSlotBadge } from "./utils";

type Props = {
  open: boolean;
  routine: SkinRoutine | null;
  selectedIds: string[];
  onClose: () => void;
  onBuyRoutine: (routine: SkinRoutine) => void;
  onOpenProduct: (product: ReportProduct) => void;
};

/**
 * Compact dual-product routine info for the 720×1280 kiosk report.
 */
export default function RoutineInfoDialog({
  open,
  routine,
  selectedIds,
  onClose,
  onBuyRoutine,
  onOpenProduct,
}: Props) {
  if (!routine) return null;

  const bothSelected = routine.products.every((p) => selectedIds.includes(p.id));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disablePortal
      sx={{
        position: "absolute",
        "& .MuiBackdrop-root": { position: "absolute" },
      }}
      PaperProps={{
        sx: {
          width: 640,
          maxWidth: "calc(100% - 40px)",
          maxHeight: "calc(100% - 40px)",
          borderRadius: "14px",
          overflow: "hidden",
          m: 0,
          animation: `${dialogRise} 0.4s ${PREMIUM_EASE} both`,
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          bgcolor: "#fff",
          p: 2,
          maxHeight: "100%",
          overflowY: "auto",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            bgcolor: "#f3f4f6",
            transition: `transform 0.15s ${PREMIUM_EASE}, background-color 0.15s ease`,
            "&:hover": { bgcolor: "#e5e7eb" },
            "&:active": { transform: "scale(0.92)" },
          }}
        >
          <Icon icon="mdi:close" width={20} />
        </IconButton>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            pr: 5,
            mb: 0.5,
            animation: `${fadeUp} 0.4s ${PREMIUM_EASE} both`,
          }}
        >
          <Icon icon={routine.icon} width={22} color={REPORT_GREEN} />
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#111", lineHeight: 1.2 }}>
            {routine.title}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: 13,
            color: REPORT_MUTED,
            mb: 0.5,
            pl: "30px",
            animation: `${fadeUp} 0.4s ${PREMIUM_EASE} 0.05s both`,
          }}
        >
          {routine.subtitle}
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            color: REPORT_MUTED,
            mb: 2,
            pl: "30px",
            animation: `${fadeUp} 0.4s ${PREMIUM_EASE} 0.1s both`,
          }}
        >
          {routine.tagline}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "stretch", gap: 1, mb: 2 }}>
          {routine.products.map((product, idx) => {
            const badge = formatSlotBadge(product.slotNumbers);
            return (
              <Box key={product.id} sx={{ display: "contents" }}>
                {idx === 1 ? (
                  <Box
                    sx={{
                      alignSelf: "center",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: REPORT_LIGHT_GREEN,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon icon="mdi:plus" width={16} color={REPORT_GREEN} />
                  </Box>
                ) : null}
                <Box
                  component="button"
                  type="button"
                  onClick={() => onOpenProduct(product)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    m: 0,
                    p: 0,
                    border: `1.5px solid ${REPORT_BORDER}`,
                    borderRadius: RADIUS_MD,
                    bgcolor: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    animation: `${scaleIn} 0.4s ${PREMIUM_EASE} both`,
                    animationDelay: staggerDelay(idx, 80, 120),
                    transition: `transform 0.18s ${PREMIUM_EASE}, box-shadow 0.18s ${PREMIUM_EASE}`,
                    "&:active": { transform: "scale(0.98)" },
                    "&:hover": { boxShadow: "0 4px 14px rgba(47, 93, 70, 0.12)" },
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      height: 120,
                      bgcolor: "#F7FAF8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: `1px solid ${REPORT_BORDER}`,
                    }}
                  >
                    {badge ? (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          px: "6px",
                          height: 22,
                          borderRadius: "6px",
                          bgcolor: REPORT_GREEN,
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {badge}
                      </Box>
                    ) : null}
                    {product.imageUrl ? (
                      <Box
                        component="img"
                        src={product.imageUrl}
                        alt={product.name}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          p: 1,
                          animation: `${imageReveal} 0.5s ${PREMIUM_EASE} both`,
                          animationDelay: staggerDelay(idx, 80, 180),
                        }}
                      />
                    ) : (
                      <Icon icon="mdi:bottle-tonic-outline" width={40} color="#9CA3AF" />
                    )}
                  </Box>
                  <Box sx={{ p: 1.25 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111",
                        lineHeight: 1.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minHeight: 32,
                      }}
                    >
                      {capitalizeWords(product.name)}
                    </Typography>
                    <Box sx={{ mt: 0.75, display: "flex", alignItems: "baseline", gap: 0.75 }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: REPORT_GREEN }}>
                        ₹{product.payablePrice}
                      </Typography>
                      {product.retailPrice > product.payablePrice ? (
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: REPORT_MUTED,
                            textDecoration: "line-through",
                          }}
                        >
                          ₹{product.retailPrice}
                        </Typography>
                      ) : null}
                    </Box>
                    <Typography
                      sx={{
                        mt: 0.75,
                        fontSize: 11,
                        fontWeight: 700,
                        color: REPORT_GREEN,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      View details
                      <Icon icon="mdi:arrow-right" width={12} color={REPORT_GREEN} />
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1.5,
            px: 0.5,
          }}
        >
          <Box
            sx={{
              px: "8px",
              py: "3px",
              borderRadius: "999px",
              color: "#cc333f",
              fontSize: 12,
              fontWeight: 800,
              backgroundImage:
                "linear-gradient(110deg, rgba(204,51,63,0.1) 35%, rgba(255,255,255,0.55) 50%, rgba(204,51,63,0.1) 65%)",
              backgroundSize: "220% 100%",
              animation: `${shimmerSweep} 3.2s ease-in-out 0.4s infinite`,
            }}
          >
            Save {routine.savePercent}%
          </Box>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: REPORT_GREEN }}>
              ₹{routine.payableTotal}
            </Typography>
            {routine.retailTotal > routine.payableTotal ? (
              <Typography
                sx={{
                  fontSize: 14,
                  color: REPORT_MUTED,
                  textDecoration: "line-through",
                }}
              >
                ₹{routine.retailTotal}
              </Typography>
            ) : null}
          </Box>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={() => onBuyRoutine(routine)}
          sx={{
            width: "100%",
            height: 48,
            m: 0,
            border: 0,
            borderRadius: "12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            bgcolor: bothSelected ? "#E8F5E9" : REPORT_GREEN,
            color: bothSelected ? REPORT_GREEN : "#fff",
            fontSize: 16,
            fontWeight: 800,
            fontFamily: "inherit",
            transition: `background-color 0.25s ${PREMIUM_EASE}, transform 0.15s ${PREMIUM_EASE}`,
            animation: bothSelected
              ? `${successFlash} 0.7s ${PREMIUM_EASE}`
              : `${fadeUp} 0.4s ${PREMIUM_EASE} 0.2s both`,
            "&:active": { transform: "scale(0.98)" },
          }}
        >
          <Icon
            icon={bothSelected ? "mdi:check" : "mdi:cart-outline"}
            width={20}
            color={bothSelected ? REPORT_GREEN : "#fff"}
          />
          {bothSelected ? "ADDED TO TOTAL" : `Buy Routine – ₹${routine.payableTotal}`}
        </Box>
      </Box>
    </Dialog>
  );
}
