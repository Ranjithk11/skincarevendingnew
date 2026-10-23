"use client";

import { Box, Typography } from "@mui/material";
import { EVERGRIT_GOLD, EVERGRIT_MUTED } from "./evergritWipesTheme";

type Props = {
  title: string;
  body: string;
};

export default function EvergritWipesInfoBlock({ title, body }: Props) {
  return (
    <Box
      sx={{
        textAlign: "left",
        px: 1.25,
        py: 1.1,
        borderRadius: "14px",
        bgcolor: "#F8F6F0",
        border: "1px solid rgba(196, 163, 90, 0.28)",
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: EVERGRIT_GOLD,
          mb: 0.6,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: 15, color: EVERGRIT_MUTED, lineHeight: 1.45 }}>
        {body}
      </Typography>
    </Box>
  );
}
