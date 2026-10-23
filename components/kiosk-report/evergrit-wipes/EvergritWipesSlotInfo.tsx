"use client";

import { Box, Typography } from "@mui/material";
import { formatSlotBadge } from "@/containers/skinanalysis-home/KioskReport/utils";
import type { ReportProduct } from "@/containers/skinanalysis-home/KioskReport/types";
import { EVERGRIT_FOREST, EVERGRIT_GOLD } from "./evergritWipesTheme";

type Props = {
  product: ReportProduct;
};

export default function EvergritWipesSlotInfo({ product }: Props) {
  const badge = formatSlotBadge(product.slotNumbers);
  if (!badge) return null;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        mt: 0,
        px: 1.1,
        py: 0.4,
        borderRadius: "999px",
        bgcolor: "rgba(47, 93, 70, 0.1)",
        border: `1px solid ${EVERGRIT_GOLD}`,
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 800, color: EVERGRIT_FOREST }}>
        {badge}
        {product.slotNumbers.length > 1
          ? ` · ${product.slotNumbers.slice(1).join(", ")}`
          : ""}
      </Typography>
    </Box>
  );
}
