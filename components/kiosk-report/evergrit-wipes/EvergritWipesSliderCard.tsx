"use client";

import { Box } from "@mui/material";
import { Icon } from "@iconify/react";
import type { ReportProduct } from "@/containers/skinanalysis-home/KioskReport/types";
import { EVERGRIT_FOREST, EVERGRIT_GOLD } from "./evergritWipesTheme";

type Props = {
  product: ReportProduct;
  onOpen: () => void;
};

export default function EvergritWipesSliderCard({ product, onOpen }: Props) {
  return (
    <Box
      component="button"
      type="button"
      aria-label="Open Evergrit Reset Wipes"
      onClick={onOpen}
      sx={{
        width: 58,
        height: 58,
        m: 0,
        p: 0,
        border: `2px solid ${EVERGRIT_GOLD}`,
        borderRadius: "50%",
        bgcolor: "#fff",
        cursor: "pointer",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
      }}
    >
      {product.imageUrl ? (
        <Box
          component="img"
          src={product.imageUrl}
          alt=""
          sx={{ width: "86%", height: "86%", objectFit: "contain" }}
        />
      ) : (
        <Icon icon="mdi:tissue" width={26} color={EVERGRIT_FOREST} />
      )}
    </Box>
  );
}
