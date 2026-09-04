"use client";

import { Box, Checkbox, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { HEADING_WEIGHT, MIN_FONT, REPORT_BORDER, REPORT_GREEN, REPORT_MUTED, TITLE_FONT } from "./constants";
import { formatSlotBadge } from "./utils";
import type { ReportProduct } from "./types";
import { capitalizeWords } from "@/utils/func";

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
    <Box sx={{ px: 1.5, py: 0.3, flexShrink: 0 }}>
      <Box
        sx={{
          border: `1px solid ${REPORT_BORDER}`,
          borderRadius: 1.5,
          px: 1.25,
          py: 0.65,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Icon icon="mdi:shopping-outline" width={22} color={REPORT_GREEN} />
          <Typography sx={{ fontSize: TITLE_FONT, fontWeight: HEADING_WEIGHT, color: "#111", lineHeight: 1.2 }}>
            Recommended products
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: MIN_FONT,
            color: REPORT_MUTED,
            fontWeight: 400,
            mt: 0.15,
            mb: 1,
            lineHeight: 1.2,
          }}
        >
          Tick the products you want to purchase
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(Math.max(products.length, 1), 3)}, 1fr)`,
            gap: 0.8,
          }}
        >
          {products.length === 0 ? (
            <Typography
              sx={{
                fontSize: MIN_FONT,
                color: REPORT_MUTED,
                py: 1,
                textAlign: "center",
                gridColumn: "1 / -1",
              }}
            >
              No in-stock products found for this routine.
            </Typography>
          ) : (
            products.map((product) => {
              const checked = selectedIds.includes(product.id);
              const badge = formatSlotBadge(product.slotNumbers);
              const volume = product.volumeLabel || "";

              return (
                <Box
                  key={product.id}
                  onClick={() => onToggle(product.id)}
                  sx={{
                    position: "relative",
                    border: `1px solid ${checked ? REPORT_GREEN : REPORT_BORDER}`,
                    borderRadius: 1.25,
                    p: 0.5,
                    pt: 0.55,
                    bgcolor: "#fff",
                    cursor: "pointer",
                    height: 200,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Checkbox
                    checked={checked}
                    onChange={() => onToggle(product.id)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      p: 0.15,
                      color: REPORT_GREEN,
                      "& .MuiSvgIcon-root": { fontSize: 22 },
                      "&.Mui-checked": { color: REPORT_GREEN },
                    }}
                  />
                  {badge ? (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        bgcolor: REPORT_GREEN,
                        color: "#fff",
                        px: 0.6,
                        py: 0.1,
                        borderRadius: 0.6,
                        fontSize: MIN_FONT,
                        fontWeight: 700,
                        lineHeight: 1.1,
                      }}
                    >
                      {badge}
                    </Box>
                  ) : null}

                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      mt: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {product.imageUrl ? (
                      <Box
                        component="img"
                        src={product.imageUrl}
                        alt={product.name}
                        sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <Icon icon="mdi:bottle-tonic-outline" width={32} color="#9CA3AF" />
                    )}
                  </Box>

                  <Typography
                    sx={{
                      mt: 0.25,
                      fontSize: MIN_FONT,
                      fontWeight: 600,
                      textAlign: "center",
                      lineHeight: 1.15,
                      color: "#111",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {capitalizeWords(product.name || "")}
                  </Typography>
                  <Typography
                    sx={{
                      mt: "auto",
                      fontSize: MIN_FONT,
                      color: REPORT_GREEN,
                      fontWeight: 900,
                      lineHeight: 1.15,
                    }}
                  >
                    ₹{product.payablePrice}
                    {volume ? (
                      <Box component="span" sx={{ color: REPORT_MUTED, fontWeight: 500 }}>
                        {` · ${volume}`}
                      </Box>
                    ) : null}
                  </Typography>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
}
