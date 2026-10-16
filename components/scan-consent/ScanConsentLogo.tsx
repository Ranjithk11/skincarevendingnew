"use client";

import { Box } from "@mui/material";
import Image from "next/image";

export default function ScanConsentLogo() {
  return (
    <Box
      sx={{
        position: "relative",
        width: 250,
        height: 88,
        flexShrink: 0,
        mx: "auto",
      }}
    >
      <Image
        src="/wending/goldlog.svg"
        alt="Leaf Water"
        fill
        priority
        sizes="250px"
        style={{ objectFit: "contain" }}
      />
    </Box>
  );
}
