"use client";

import { IconButton } from "@mui/material";
import { Icon } from "@iconify/react";
import { EVERGRIT_FOREST } from "./evergritWipesTheme";

type Props = {
  onClose: () => void;
};

export default function EvergritWipesCloseButton({ onClose }: Props) {
  return (
    <IconButton
      aria-label="Close recommendation"
      onClick={onClose}
      sx={{
        position: "absolute",
        top: 10,
        right: 10,
        width: 44,
        height: 44,
        color: EVERGRIT_FOREST,
        bgcolor: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(47, 93, 70, 0.16)",
        zIndex: 2,
      }}
    >
      <Icon icon="mdi:close" width={22} />
    </IconButton>
  );
}
