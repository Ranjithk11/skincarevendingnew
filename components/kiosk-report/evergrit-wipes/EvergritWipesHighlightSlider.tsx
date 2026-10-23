"use client";

import { Box } from "@mui/material";
import type { ReportProduct } from "@/containers/skinanalysis-home/KioskReport/types";
import EvergritWipesSliderCard from "./EvergritWipesSliderCard";
import { wipeHighlightPulse, wipeSlideInRight } from "./evergritWipesMotion";

type Props = {
  visible: boolean;
  products: ReportProduct[];
  onOpen: () => void;
};

export default function EvergritWipesHighlightSlider({
  visible,
  products,
  onOpen,
}: Props) {
  if (!visible || products.length === 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 308,
        bottom: "auto",
        right: 8,
        zIndex: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.75,
        borderRadius: "50%",
        animation: `${wipeSlideInRight} 0.4s ease-out, ${wipeHighlightPulse} 2s ease-in-out 0.4s infinite`,
      }}
    >
      {products.map((product) => (
        <EvergritWipesSliderCard
          key={product.id}
          product={product}
          onOpen={onOpen}
        />
      ))}
    </Box>
  );
}
