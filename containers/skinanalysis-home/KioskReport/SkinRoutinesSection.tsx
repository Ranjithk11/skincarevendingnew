"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import NewProductCard from "@/containers/skinanalysis-home/Recommendations/NewProductCard";
import {
  HEADING_WEIGHT,
  PAGE_PADDING_X,
  RADIUS_LG,
  RADIUS_MD,
  REPORT_BORDER,
  REPORT_GREEN,
  REPORT_LIGHT_GREEN,
  REPORT_MUTED,
  ROUTINE_CARD_HEIGHT,
  ROUTINE_PRODUCT_IMG,
  SECTION_GAP,
} from "./constants";
import { fadeUp, scaleIn, infoGlow, imageReveal, shimmerSweep, successFlash, PREMIUM_EASE, staggerDelay } from "./animations";
import RoutineInfoDialog from "./RoutineInfoDialog";
import type { ReportProduct, SkinRoutine } from "./types";

type Props = {
  routines: SkinRoutine[];
  selectedIds: string[];
  onAddRoutine: (routine: SkinRoutine) => void;
  onToggleProduct?: (productId: string) => void;
};

export default function SkinRoutinesSection({
  routines,
  selectedIds,
  onAddRoutine,
  onToggleProduct,
}: Props) {
  const [infoRoutine, setInfoRoutine] = useState<SkinRoutine | null>(null);
  const [infoProduct, setInfoProduct] = useState<ReportProduct | null>(null);

  if (!routines.length) return null;

  return (
    <>
      <Box
        sx={{
          px: `${PAGE_PADDING_X}px`,
          py: `${SECTION_GAP / 2}px`,
          flexShrink: 0,
          animation: `${fadeUp} 0.5s ease-out 0.28s both`,
        }}
      >
        <Box
          sx={{
            width: "100%",
            border: `1px solid ${REPORT_BORDER}`,
            borderRadius: RADIUS_LG,
            bgcolor: REPORT_LIGHT_GREEN,
            px: "10px",
            py: "8px",
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              mb: "1px",
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Icon icon="mdi:leaf" width={16} color={REPORT_GREEN} />
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: HEADING_WEIGHT,
                    color: REPORT_GREEN,
                    lineHeight: 1.15,
                    textTransform: "uppercase",
                    letterSpacing: "0.2px",
                  }}
                >
                  Build Your Skin Routine
                </Typography>
              </Box>
              <Typography
                sx={{
                  mt: "2px",
                  fontSize: 11,
                  color: REPORT_MUTED,
                  lineHeight: 1.2,
                  pl: "22px",
                }}
              >
                Complete care for healthier, brighter skin
              </Typography>
            </Box>

            <Box
              sx={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                px: "8px",
                py: "4px",
                borderRadius: "999px",
                bgcolor: "#fff",
                border: `1px solid ${REPORT_BORDER}`,
                fontSize: 10,
                fontWeight: 700,
                color: REPORT_GREEN,
                whiteSpace: "nowrap",
              }}
            >
              <Icon icon="mdi:gift-outline" width={12} color={REPORT_GREEN} />
              Save more together
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            {routines.map((routine, index) => {
              const bothSelected = routine.products.every((p) =>
                selectedIds.includes(p.id)
              );
              const [p1, p2] = routine.products;

              return (
                <Box
                  key={routine.id}
                  sx={{
                    position: "relative",
                    height: ROUTINE_CARD_HEIGHT,
                    bgcolor: "#fff",
                    border: `1.5px solid ${bothSelected ? REPORT_GREEN : REPORT_BORDER}`,
                    borderRadius: RADIUS_MD,
                    px: "7px",
                    py: "6px",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    animation: `${scaleIn} 0.45s ${PREMIUM_EASE} both`,
                    animationDelay: staggerDelay(index, 70, 300),
                    transition: `border-color 0.25s ${PREMIUM_EASE}, box-shadow 0.25s ${PREMIUM_EASE}, transform 0.2s ${PREMIUM_EASE}`,
                    boxShadow: bothSelected
                      ? "0 6px 16px rgba(47, 93, 70, 0.18)"
                      : "0 1px 3px rgba(0,0,0,0.04)",
                    transform: bothSelected ? "translateY(-1px)" : "none",
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    aria-label={`Routine info for ${routine.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoRoutine(routine);
                    }}
                    sx={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      zIndex: 2,
                      width: 22,
                      height: 22,
                      m: 0,
                      p: 0,
                      border: `1px solid ${REPORT_BORDER}`,
                      borderRadius: "50%",
                      bgcolor: "rgba(255,255,255,0.95)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: `${infoGlow} 3.6s ease-in-out infinite`,
                      transition: `transform 0.15s ${PREMIUM_EASE}`,
                      "&:active": { transform: "scale(0.9)" },
                    }}
                  >
                    <Icon icon="mdi:information-outline" width={14} color={REPORT_GREEN} />
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: "4px", flexShrink: 0, pr: "22px" }}>
                    <Icon icon={routine.icon} width={14} color={REPORT_GREEN} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#111",
                          lineHeight: 1.15,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {routine.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 9,
                          color: REPORT_MUTED,
                          lineHeight: 1.15,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {routine.subtitle}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      position: "relative",
                      my: "2px",
                    }}
                  >
                    <Box
                      sx={{
                        width: ROUTINE_PRODUCT_IMG,
                        height: ROUTINE_PRODUCT_IMG,
                        maxWidth: "42%",
                        maxHeight: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: "8px",
                        bgcolor: "#F7FAF8",
                        border: `1px solid ${REPORT_BORDER}`,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 1,
                        animation: `${imageReveal} 0.55s ${PREMIUM_EASE} both`,
                        animationDelay: staggerDelay(index, 70, 380),
                      }}
                    >
                      {p1.imageUrl ? (
                        <Box
                          component="img"
                          src={p1.imageUrl}
                          alt={p1.name}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            p: "3px",
                          }}
                        />
                      ) : (
                        <Icon icon="mdi:bottle-tonic-outline" width={22} color="#9CA3AF" />
                      )}
                    </Box>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        bgcolor: REPORT_LIGHT_GREEN,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        zIndex: 1,
                        animation: `${scaleIn} 0.4s ${PREMIUM_EASE} both`,
                        animationDelay: staggerDelay(index, 70, 420),
                      }}
                    >
                      <Icon icon="mdi:plus" width={12} color={REPORT_GREEN} />
                    </Box>
                    <Box
                      sx={{
                        width: ROUTINE_PRODUCT_IMG,
                        height: ROUTINE_PRODUCT_IMG,
                        maxWidth: "42%",
                        maxHeight: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: "8px",
                        bgcolor: "#F7FAF8",
                        border: `1px solid ${REPORT_BORDER}`,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 1,
                        animation: `${imageReveal} 0.55s ${PREMIUM_EASE} both`,
                        animationDelay: staggerDelay(index, 70, 440),
                      }}
                    >
                      {p2.imageUrl ? (
                        <Box
                          component="img"
                          src={p2.imageUrl}
                          alt={p2.name}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            p: "3px",
                          }}
                        />
                      ) : (
                        <Icon icon="mdi:bottle-tonic-outline" width={22} color="#9CA3AF" />
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "4px",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        px: "5px",
                        py: "1px",
                        borderRadius: "999px",
                        color: "#cc333f",
                        fontSize: 9,
                        fontWeight: 800,
                        lineHeight: 1.4,
                        whiteSpace: "nowrap",
                        backgroundImage:
                          "linear-gradient(110deg, rgba(204,51,63,0.1) 35%, rgba(255,255,255,0.55) 50%, rgba(204,51,63,0.1) 65%)",
                        backgroundSize: "220% 100%",
                        animation: `${shimmerSweep} 3.5s ease-in-out ${0.6 + index * 0.15}s infinite`,
                      }}
                    >
                      Save {routine.savePercent}%
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: REPORT_GREEN,
                          lineHeight: 1,
                        }}
                      >
                        ₹{routine.payableTotal}
                      </Typography>
                      {routine.retailTotal > routine.payableTotal ? (
                        <Typography
                          sx={{
                            fontSize: 9,
                            color: REPORT_MUTED,
                            textDecoration: "line-through",
                            lineHeight: 1,
                          }}
                        >
                          ₹{routine.retailTotal}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 9,
                      color: REPORT_MUTED,
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flexShrink: 0,
                    }}
                  >
                    {routine.tagline}
                  </Typography>

                  <Box
                    component="button"
                    type="button"
                    onClick={() => onAddRoutine(routine)}
                    sx={{
                      width: "100%",
                      height: 28,
                      m: 0,
                      border: 0,
                      borderRadius: "7px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      flexShrink: 0,
                      bgcolor: bothSelected ? "#E8F5E9" : REPORT_GREEN,
                      color: bothSelected ? REPORT_GREEN : "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "inherit",
                      lineHeight: 1,
                      transition: `background-color 0.25s ${PREMIUM_EASE}, color 0.25s ${PREMIUM_EASE}, transform 0.15s ${PREMIUM_EASE}`,
                      animation: bothSelected ? `${successFlash} 0.7s ${PREMIUM_EASE}` : "none",
                      "&:active": { transform: "scale(0.96)" },
                    }}
                  >
                    <Icon
                      icon={bothSelected ? "mdi:check" : "mdi:cart-outline"}
                      width={12}
                      color={bothSelected ? REPORT_GREEN : "#fff"}
                    />
                    {bothSelected ? "ADDED" : "Buy Routine"}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <RoutineInfoDialog
        open={Boolean(infoRoutine)}
        routine={infoRoutine}
        selectedIds={selectedIds}
        onClose={() => setInfoRoutine(null)}
        onBuyRoutine={(routine) => {
          onAddRoutine(routine);
          setInfoRoutine(null);
        }}
        onOpenProduct={(product) => {
          setInfoProduct(product);
        }}
      />

      <NewProductCard
        open={Boolean(infoProduct)}
        onClose={() => setInfoProduct(null)}
        id={infoProduct?.id}
        name={infoProduct?.name || ""}
        imageUrl={infoProduct?.imageUrl}
        retailPrice={infoProduct?.retailPrice || 0}
        discountValue={infoProduct?.discountValue}
        slotId={infoProduct?.slotId || infoProduct?.slotNumbers?.[0]}
        isAiRecommended
        primaryActionLabel={
          infoProduct && selectedIds.includes(infoProduct.id)
            ? "SELECTED"
            : "SELECT FOR PURCHASE"
        }
        onPrimaryAction={() => {
          if (!infoProduct) return;
          if (onToggleProduct && !selectedIds.includes(infoProduct.id)) {
            onToggleProduct(infoProduct.id);
          }
        }}
        fitKiosk
      />
    </>
  );
}
