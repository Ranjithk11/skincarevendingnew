"use client";

import { Box, Checkbox, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import {
  CARD_GAP,
  HEADING_SIZE,
  HEADING_WEIGHT,
  PAGE_PADDING_X,
  PRODUCT_CARD_HEIGHT,
  PRODUCT_CHECKBOX_SIZE,
  RADIUS_LG,
  RADIUS_MD,
  RADIUS_SM,
  REPORT_BORDER,
  REPORT_GREEN,
  REPORT_MUTED,
  SECTION_GAP,
  SMALL_SIZE,
} from "./constants";
import { formatSlotBadge } from "./utils";
import type { ReportProduct } from "./types";
import { capitalizeWords } from "@/utils/func";
import { fadeUp, scaleIn, staggerDelay } from "./animations";

type Props = {
  products: ReportProduct[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export default function RecommendedProductsSection({
  products,
  selectedIds,
  onToggle,
}: Props) {
  return (
    <Box
      sx={{
        px: `${PAGE_PADDING_X}px`,
        py: `${SECTION_GAP / 2}px`,
        flexShrink: 0,
        animation: `${fadeUp} 0.5s ease-out 0.24s both`,
      }}
    >
      <Box
        sx={{
          width: "100%",
          border: `1px solid ${REPORT_BORDER}`,
          borderRadius: RADIUS_LG,
          p: "14px",
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon icon="mdi:shopping-outline" width={18} color={REPORT_GREEN} />
          <Typography
            sx={{
              fontSize: HEADING_SIZE,
              fontWeight: HEADING_WEIGHT,
              color: "#111",
              lineHeight: 1.2,
              textTransform: "uppercase",
            }}
          >
            Recommended Products
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: SMALL_SIZE,
            color: REPORT_MUTED,
            fontWeight: 400,
            mt: "4px",
            mb: "10px",
            lineHeight: 1.2,
          }}
        >
          Tick the products you want to purchase
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(Math.max(products.length, 1), 3)}, 1fr)`,
            gap: `${CARD_GAP}px`,
          }}
        >
          {products.length === 0 ? (
            <Typography
              sx={{
                fontSize: SMALL_SIZE,
                color: REPORT_MUTED,
                py: 1,
                textAlign: "center",
                gridColumn: "1 / -1",
              }}
            >
              No in-stock products found for this routine.
            </Typography>
          ) : (
            products.map((product, index) => {
              const checked = selectedIds.includes(product.id);
              const badge = formatSlotBadge(product.slotNumbers);
              const volume = product.volumeLabel || "";
              const hasImage = Boolean(product.imageUrl);

              return (
                <Box
                  key={product.id}
                  onClick={() => onToggle(product.id)}
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: PRODUCT_CARD_HEIGHT,
                    border: `1.5px solid ${checked ? REPORT_GREEN : REPORT_BORDER}`,
                    borderRadius: RADIUS_MD,
                    overflow: "hidden",
                    cursor: "pointer",
                    boxSizing: "border-box",
                    bgcolor: "#F3F6F4",
                    backgroundImage: hasImage ? `url(${product.imageUrl})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    animation: `${scaleIn} 0.4s ease-out both`,
                    animationDelay: staggerDelay(index, 80, 320),
                    transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: checked
                      ? "0 6px 16px rgba(47, 93, 70, 0.16)"
                      : "0 1px 4px rgba(0,0,0,0.05)",
                    "&:active": { transform: "scale(0.97)" },
                  }}
                >
                  {/* Soft overlays so title/price stay readable on the photo */}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background: hasImage
                        ? "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.12) 42%, rgba(255,255,255,0.88) 100%)"
                        : "transparent",
                      pointerEvents: "none",
                    }}
                  />

                  {!hasImage ? (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <Icon icon="mdi:bottle-tonic-outline" width={48} color="#9CA3AF" />
                    </Box>
                  ) : null}

                  <Checkbox
                    checked={checked}
                    onChange={() => onToggle(product.id)}
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
                      "& .MuiSvgIcon-root": { fontSize: PRODUCT_CHECKBOX_SIZE },
                      "&.Mui-checked": { color: REPORT_GREEN },
                    }}
                  />

                  {badge ? (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        zIndex: 2,
                        minWidth: 28,
                        height: 24,
                        px: "6px",
                        borderRadius: RADIUS_SM,
                        bgcolor: REPORT_GREEN,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {badge}
                    </Box>
                  ) : null}

                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 1,
                      px: "8px",
                      pb: "8px",
                      pt: "4px",
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#1F3D30",
                        lineHeight: 1.15,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textShadow: "0 1px 0 rgba(255,255,255,0.9)",
                      }}
                    >
                      {capitalizeWords(product.name || "")}
                    </Typography>
                    <Typography
                      sx={{
                        mt: "3px",
                        fontSize: 18,
                        fontWeight: 900,
                        color: "#FF0000",
                        lineHeight: 1.1,
                        textShadow: "0 1px 0 rgba(255,255,255,0.9)",
                      }}
                    >
                      ₹{product.payablePrice}
                      {volume ? (
                        <Box component="span" sx={{ color: REPORT_MUTED, fontWeight: 900, fontSize: 14 }}>
                          {` · ${volume}`}
                        </Box>
                      ) : null}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
}
