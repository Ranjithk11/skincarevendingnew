"use client";

import { Box } from "@mui/material";
import { Icon } from "@iconify/react";
import { EVERGRIT_FOREST } from "./evergritWipesTheme";

type Props = {
  imageUrl?: string;
  name: string;
};

export default function EvergritWipesHeroImage({ imageUrl, name }: Props) {
  return (
    <Box
      sx={{
        width: "100%",
        height: 260,
        borderRadius: "20px",
        bgcolor: "#F4F7F5",
        border: `1px solid rgba(196, 163, 90, 0.35)`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.7)",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        position: "relative",
        backgroundImage: `linear-gradient(180deg, rgba(196,163,90,0.08) 0%, transparent 42%)`,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          bgcolor: "rgba(196, 163, 90, 0.12)",
          filter: "blur(2px)",
        }}
      />
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt={name}
          sx={{
            position: "relative",
            width: "88%",
            height: "88%",
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <Icon icon="mdi:tissue" width={72} color={EVERGRIT_FOREST} />
      )}
    </Box>
  );
}
