"use client";

import { Typography } from "@mui/material";
import { EVERGRIT_MUTED } from "./evergritWipesTheme";

export default function EvergritWipesUnavailableNote() {
  return (
    <Typography sx={{ fontSize: 15, color: EVERGRIT_MUTED, textAlign: "center", lineHeight: 1.4 }}>
      This machine does not have Evergrit Reset Wipes in a slot right now, so it
      cannot be added to your cart.
    </Typography>
  );
}
