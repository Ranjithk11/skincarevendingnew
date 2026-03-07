"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";

interface FeatureCardProps {
  label: string;
  title: string;
  description: string;
  qrCodeSrc?: string;
  activeIndex?: number;
  totalDots?: number;
  qrBoxWidth?: number;
  qrBoxHeight?: number;
  qrBoxTop?: number | string;
  qrBoxRight?: number;
  qrBoxBorderRadius?: number;
  qrBoxCenterY?: boolean;
}

export default function FeatureCard({
  label,
  title,
  description,
  qrCodeSrc = "/products/vendingQr.jpeg",
  activeIndex = 0,
  totalDots = 3,
  qrBoxWidth = 140,
  qrBoxHeight = 140,
  qrBoxTop = "50%",
  qrBoxRight = 20,
  qrBoxBorderRadius = 0,
  qrBoxCenterY = true,
}: FeatureCardProps) {
  return (
    <Box
      sx={{
        bgcolor: "#2d5a3d",
        borderRadius: { xs: 3, sm: 4 },
        p: { xs: 2, sm: 3 },
        // pr: { xs: 10, sm: 14 }, // Extra padding on right for QR code
        color: "white",
        position: "relative",
        overflow: "visible",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Typography
          sx={{
            color: "#FFFFFF",
            fontWeight: 200,
            fontStyle: "normal",
            fontSize: "20px",
            lineHeight: "100%",
            letterSpacing: 0,
            textTransform: "uppercase",
            mb: 0.5,
            display: "block",
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontWeight: 300,
            fontStyle: "normal",
            fontSize: "30px",
            lineHeight: "100%",
            letterSpacing: 0,
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            color: "#FFFFFF",
            fontWeight: 200,
            fontStyle: "normal",
            fontSize: "20px",
            lineHeight: "100%",
            letterSpacing: 0,
            maxWidth: "75%",
          }}
        >
          {description}
        </Typography>

        {/* Pagination dots */}
        <Box sx={{ display: "flex", gap: 0.75, mt: { xs: 1.5, sm: 2 } }}>
          {Array.from({ length: totalDots }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: { xs: 6, sm: 8 },
                height: { xs: 6, sm: 8 },
                borderRadius: "50%",
                bgcolor: i === activeIndex ? "white" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </Box>
      </Box>

      {/* QR Code - Positioned at right, vertically centered */}
      <Box
        sx={{
          position: "absolute",
          right: qrBoxRight,
          top: qrBoxCenterY ? "50%" : qrBoxTop,
          transform: qrBoxCenterY ? "translateY(-50%)" : undefined,
          width: qrBoxWidth,
          height: qrBoxHeight,
          bgcolor: "white",
          borderRadius: `${qrBoxBorderRadius}px`,
          p: 1,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
          <Image
            src={qrCodeSrc}
            alt="QR Code"
            fill
            style={{ objectFit: "contain" }}
          />
        </Box>
      </Box>
    </Box>
  );
}
