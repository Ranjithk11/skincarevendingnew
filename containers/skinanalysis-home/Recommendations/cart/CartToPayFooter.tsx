"use client";

import { Box, Collapse, Typography } from "@mui/material";
import { capitalizeWords } from "@/utils/func";
import type { CartItem } from "../CartContext";
import { parsePrice } from "./parsePrice";

type CartToPayFooterProps = {
  items: CartItem[];
  total: number;
  payableTotal: number;
  discount: number;
  showPriceDetails: boolean;
  onToggleDetails: () => void;
};

export default function CartToPayFooter({
  items,
  total,
  payableTotal,
  discount,
  showPriceDetails,
  onToggleDetails,
}: CartToPayFooterProps) {
  return (
    <Box sx={{ px: 2, py: 1.5, bgcolor: "#fff" }}>
      <Typography sx={{ fontSize: 24, color: "text.secondary" }}>TO PAY</Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          mt: 0.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              mt: 2,
              mb: 0.75,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              fontWeight: 510,
              fontSize: "24px",
              lineHeight: "100%",
              letterSpacing: "0%",
            }}
          >
            Your Cart total
          </Typography>
          <Typography
            role="button"
            tabIndex={0}
            onClick={onToggleDetails}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onToggleDetails();
            }}
            sx={{
              fontSize: 24,
              color: "text.secondary",
              textDecoration: "underline",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Tap to view details
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          {discount > 0 ? (
            <Typography
              sx={{ fontSize: 12, color: "text.secondary", textDecoration: "line-through" }}
            >
              Rs.{Math.round(total)}/-
            </Typography>
          ) : null}
          <Typography sx={{ fontWeight: 900, fontSize: 24 }}>
            Rs. {Math.round(discount > 0 ? payableTotal : Number.isFinite(total) ? total : 0)}
            /-
          </Typography>
        </Box>
      </Box>

      <Collapse in={showPriceDetails} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #e5e7eb" }}>
          {items.map((it, idx) => {
            const lineTotal = parsePrice(it.priceText) * (it.quantity || 0);
            return (
              <Box
                key={`${it.id || it.name}-${idx}-line`}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  py: 1,
                }}
              >
                <Box sx={{ minWidth: 0, pr: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: 24,
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {capitalizeWords(it.name)}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 24, whiteSpace: "nowrap" }}>
                  Rs. {Math.round(Number.isFinite(lineTotal) ? lineTotal : 0)}/-
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}
