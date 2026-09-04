"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { KIOSK_HEIGHT, KIOSK_WIDTH } from "./constants";

export default function KioskFrame({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const fit = () => {
      const next = Math.min(window.innerWidth / KIOSK_WIDTH, window.innerHeight / KIOSK_HEIGHT);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: KIOSK_WIDTH * scale,
          height: KIOSK_HEIGHT * scale,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: KIOSK_WIDTH,
            height: KIOSK_HEIGHT,
            bgcolor: "#fff",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
