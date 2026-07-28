"use client";

import { Box, Typography, Divider } from "@mui/material";
import { capitalizeWords } from "@/utils/func";
import { ProductPrice } from "../components";
import type { CartItem } from "../CartContext";

type CheckoutOrderReviewProps = {
  items: CartItem[];
  total: number;
};

export default function CheckoutOrderReview({ items, total }: CheckoutOrderReviewProps) {
  return (
    <Box sx={{ bgcolor: "#fff", borderRadius: 2, p: 2, border: "1px solid #e5e7eb" }}>
      <Typography sx={{ fontWeight: 700, fontSize: 28, mb: 2 }}>Review your order</Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {items.map((it, idx) => (
          <Box
            key={`${it.id || it.name}-${idx}-checkout`}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 1,
                bgcolor: "#f3f4f6",
                overflow: "hidden",
                position: "relative",
                flex: "0 0 auto",
              }}
            >
              {it.imageUrl ? (
                <Box
                  component="img"
                  src={it.imageUrl}
                  alt={it.name}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : null}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 500,
                  fontSize: 24,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {capitalizeWords(it.name)} &nbsp; x{it.quantity || 1}
              </Typography>
            </Box>

            <ProductPrice
              retailPrice={it.originalPrice}
              discountValue={it.discountValue}
              priceText={it.priceText || ""}
              productId={it.id}
              productName={it.name}
            />
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ fontWeight: 700, fontSize: 24 }}>Total</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 24 }}>Rs.{Math.round(total)}/-</Typography>
      </Box>
    </Box>
  );
}
