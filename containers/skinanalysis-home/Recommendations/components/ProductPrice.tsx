"use client";

import React from "react";
import { Box, Typography } from "@mui/material";

interface ProductPriceProps {
  retailPrice?: number;
  discountValue?: number;
  priceText?: string;
}

const calculateDiscount = (originalPrice?: number, discountAmount?: number) => {
  if (!Number.isFinite(originalPrice as number)) return undefined;
  if (!Number.isFinite(discountAmount as number)) return originalPrice;
  const discountedPrice =
    (originalPrice as number) - (originalPrice as number) * ((discountAmount as number) / 100);
  return Number(discountedPrice.toFixed(0));
};

const ProductPrice: React.FC<ProductPriceProps> = ({
  retailPrice,
  discountValue,
  priceText,
}) => {
  const hasDiscount =
    Number.isFinite(retailPrice as number) &&
    Number.isFinite(discountValue as number) &&
    calculateDiscount(retailPrice, discountValue) !== retailPrice;

  return (
    <Box sx={{ textAlign: "left" }}>
      {hasDiscount ? (
        <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 1.5, alignItems: "baseline" }}>
          <Typography sx={{ textDecoration: "line-through" }} variant="subtitle2">
            INR.{retailPrice}/-
          </Typography>
          <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800 }}>
            INR.{calculateDiscount(retailPrice, discountValue)}/-
          </Typography>
        </Box>
      ) : (
        <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, textAlign: "left" }}>
          {priceText || `INR.${retailPrice}/-`}
        </Typography>
      )}

      {discountValue ? (
        <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary", textAlign: "left", fontSize: 24 }}>
          Discount: Flat {discountValue}%
        </Typography>
      ) : null}
    </Box>
  );
};

export default ProductPrice;
