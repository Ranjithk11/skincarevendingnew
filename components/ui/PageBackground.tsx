"use client";

import { Box } from "@mui/material";
import Image from "next/image";
import { ReactNode } from "react";

interface PageBackgroundProps {
  children: ReactNode;
  showGreenCurve?: boolean;
  fitParent?: boolean;
}

export default function PageBackground({
  children,
  showGreenCurve = false,
  fitParent = false,
}: PageBackgroundProps) {
  return (
    <Box
      sx={{
        minHeight: fitParent ? "100%" : "100dvh",
        height: fitParent ? "100%" : undefined,
        bgcolor: "#F9F9F9",
        position: "relative",
        overflow: "visible",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Wave pattern background image - top left area */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          width: "100vw",
          height: { xs: "45%", sm: "50%", md: "100%" },
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <Box sx={{ display: { xs: "block", md: "none" }, position: "absolute", inset: 0 }}>
          <Image
            src="/wending/linesbg.svg"
            alt=""
            fill
            style={{
              objectFit: "cover",
              objectPosition: "top left",
            }}
            priority
          />
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" }, position: "absolute", inset: 0 }}>
          <Image
            src="/wending/linesbg.png"
            alt=""
            fill
            style={{
              objectFit: "cover",
              objectPosition: "top left",
            }}
            priority
          />
        </Box>
      </Box>

      {showGreenCurve ? (
        <Box
          component="svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            height: "50%",
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <path
            d="M100,100 L100,0 Q70,20 40,50 Q15,75 0,100 L0,100 Z"
            fill="#9FF99F6B"
          />
        </Box>
      ) : null}


      {/* Content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
