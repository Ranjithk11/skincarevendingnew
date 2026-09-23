"use client";

import { useState } from "react";
import { Box, Checkbox, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import {
  CARD_GAP,
  HEADING_SIZE,
  HEADING_WEIGHT,
  PAGE_PADDING_X,
  PRODUCT_CARD_HEIGHT,
  PRODUCT_CHECKBOX_SIZE,
  PRODUCT_IMAGE_HEIGHT,
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
import { fadeUp, scaleIn, infoGlow, imageReveal, shimmerSweep, PREMIUM_EASE, staggerDelay } from "./animations";
import { APP_ROUTES } from "@/utils/routes";
import { useSession } from "next-auth/react";
import { setBrowseReturnToReport } from "@/lib/kiosk-browse-return";
import NewProductCard from "@/containers/skinanalysis-home/Recommendations/NewProductCard";

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
  const router = useRouter();
  const { data: session } = useSession();
  const [infoProduct, setInfoProduct] = useState<ReportProduct | null>(null);

  const handleBrowse = () => {
    const userId = (session?.user?.id as string) || null;
    setBrowseReturnToReport(userId);
    router.push(`${APP_ROUTES.PRODUCTS}?from=report`);
  };

  return (
    <>
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
          p: "8px",
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ width: "100%", mb: "6px" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: 0,
                flex: "1 1 auto",
              }}
            >
              <Icon icon="mdi:shopping-outline" width={18} color={REPORT_GREEN} />
              <Typography
                sx={{
                  fontSize: HEADING_SIZE,
                  fontWeight: HEADING_WEIGHT,
                  color: "#111",
                  lineHeight: 1.2,
                  textTransform: "uppercase",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Recommended Products
              </Typography>
            </Box>

            <Box
              component="button"
              type="button"
              onClick={handleBrowse}
              sx={{
                flex: "0 0 auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                height: 30,
                px: "11px",
                m: 0,
                border: 0,
                borderRadius: "999px",
                cursor: "pointer",
                bgcolor: REPORT_GREEN,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                width: "auto",
                maxWidth: "fit-content",
                boxShadow: "0 2px 8px rgba(47, 93, 70, 0.2)",
                transition: "transform 0.15s ease, background-color 0.15s ease",
                "&:hover": { bgcolor: "#244A38" },
                "&:active": { transform: "scale(0.96)" },
              }}
            >
              Browse
              <Icon icon="mdi:arrow-right" width={14} color="#fff" />
            </Box>
          </Box>

          <Typography
            sx={{
              fontSize: SMALL_SIZE,
              color: REPORT_MUTED,
              fontWeight: 400,
              lineHeight: 1.2,
              mt: "4px",
            }}
          >
            Tick the products you want to purchase
          </Typography>
        </Box>

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
              const discountPct = Math.round(Number(product.discountValue) || 0);
              const showRibbon = discountPct > 0;

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
                    bgcolor: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    animation: `${scaleIn} 0.45s ${PREMIUM_EASE} both`,
                    animationDelay: staggerDelay(index, 80, 320),
                    transition: `transform 0.2s ${PREMIUM_EASE}, border-color 0.25s ${PREMIUM_EASE}, box-shadow 0.25s ${PREMIUM_EASE}`,
                    boxShadow: checked
                      ? "0 8px 20px rgba(47, 93, 70, 0.18)"
                      : "0 1px 4px rgba(0,0,0,0.05)",
                    transform: checked ? "translateY(-2px)" : "none",
                    "&:active": { transform: "scale(0.97)" },
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      height: PRODUCT_IMAGE_HEIGHT,
                      flexShrink: 0,
                      bgcolor: "#F7FAF8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: `1px solid ${REPORT_BORDER}`,
                      overflow: "hidden",
                    }}
                  >
                    {showRibbon ? (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 14,
                          left: -6,
                          zIndex: 3,
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#fff",
                          lineHeight: 1.9,
                          width: 118,
                          pl: "10px",
                          pr: "8px",
                          bgcolor: "#cc333f",
                          boxSizing: "border-box",
                          "--f": "0.45em",
                          "--r": "0.7em",
                          borderBottom: "var(--f) solid #0005",
                          borderRight: "var(--r) solid #0000",
                          clipPath:
                            "polygon(0 0, 0 calc(100% - var(--f)), var(--f) 100%, var(--f) calc(100% - var(--f)), 100% calc(100% - var(--f)), calc(100% - var(--r)) calc(50% - var(--f) / 2), 100% 0)",
                          letterSpacing: "0.2px",
                          pointerEvents: "none",
                          backgroundImage:
                            "linear-gradient(110deg, #cc333f 40%, #ff7a82 50%, #cc333f 60%)",
                          backgroundSize: "220% 100%",
                          animation: `${shimmerSweep} 3.5s ease-in-out ${0.5 + index * 0.12}s infinite`,
                        }}
                      >
                        {discountPct}% OFF
                      </Box>
                    ) : null}

                    <Checkbox
                      checked={checked}
                      onChange={() => onToggle(product.id)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        position: "absolute",
                        top: showRibbon ? 42 : 4,
                        left: 4,
                        zIndex: 2,
                        p: 0,
                        color: REPORT_GREEN,
                        bgcolor: "rgba(255,255,255,0.92)",
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
                      component="button"
                      type="button"
                      aria-label={`Product info for ${product.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoProduct(product);
                      }}
                      sx={{
                        position: "absolute",
                        bottom: 6,
                        right: 6,
                        zIndex: 2,
                        width: 26,
                        height: 26,
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
                      <Icon icon="mdi:information-outline" width={16} color={REPORT_GREEN} />
                    </Box>

                    {hasImage ? (
                      <Box
                        component="img"
                        src={product.imageUrl}
                        alt={product.name}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          objectPosition: "center",
                          display: "block",
                          p: "8px",
                          boxSizing: "border-box",
                          animation: `${imageReveal} 0.55s ${PREMIUM_EASE} both`,
                          animationDelay: staggerDelay(index, 80, 360),
                        }}
                      />
                    ) : (
                      <Icon icon="mdi:bottle-tonic-outline" width={48} color="#9CA3AF" />
                    )}
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      px: "8px",
                      py: "8px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      bgcolor: "#fff",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111",
                        lineHeight: 1.2,
                        textAlign: "center",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {capitalizeWords(product.name || "")}
                    </Typography>
                    <Box
                      sx={{
                        mt: "6px",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "center",
                        gap: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: REPORT_GREEN,
                          lineHeight: 1.1,
                        }}
                      >
                        ₹{product.payablePrice}
                      </Typography>
                      {showRibbon && product.retailPrice > product.payablePrice ? (
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: REPORT_MUTED,
                            lineHeight: 1.1,
                            textDecoration: "line-through",
                          }}
                        >
                          ₹{product.retailPrice}
                        </Typography>
                      ) : null}
                      {volume ? (
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: REPORT_MUTED,
                            lineHeight: 1.1,
                          }}
                        >
                          {volume}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>

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
        if (!selectedIds.includes(infoProduct.id)) {
          onToggle(infoProduct.id);
        }
      }}
      fitKiosk
    />
    </>
  );
}
