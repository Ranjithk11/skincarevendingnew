"use client";

import { Box, Typography } from "@mui/material";
import type { ReportProduct } from "@/containers/skinanalysis-home/KioskReport/types";
import EvergritWipesHeroImage from "./EvergritWipesHeroImage";
import EvergritWipesSlotInfo from "./EvergritWipesSlotInfo";
import { EVERGRIT_FOREST, EVERGRIT_MUTED } from "./evergritWipesTheme";

type Props = {
  product: ReportProduct;
};

export default function EvergritWipesProductTile({ product }: Props) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <EvergritWipesHeroImage imageUrl={product.imageUrl} name={product.name} />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25 }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, color: EVERGRIT_FOREST, lineHeight: 1 }}>
          ₹{product.payablePrice}
        </Typography>
        {product.retailPrice > product.payablePrice ? (
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
              color: EVERGRIT_MUTED,
              textDecoration: "line-through",
            }}
          >
            ₹{product.retailPrice}
          </Typography>
        ) : null}
        <EvergritWipesSlotInfo product={product} />
      </Box>
    </Box>
  );
}
