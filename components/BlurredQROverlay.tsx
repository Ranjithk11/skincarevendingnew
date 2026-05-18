"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import TouchAppIcon from "@mui/icons-material/TouchApp";

interface BlurredQROverlayProps {
  qrUrl: string;
  isRevealed: boolean;
  onTapToView: () => void;
  size?: number;
}

const BlurredQROverlay: React.FC<BlurredQROverlayProps> = ({
  qrUrl,
  isRevealed,
  onTapToView,
  size = 140,
}) => {
  return (
    <Box
      onClick={!isRevealed ? onTapToView : undefined}
      sx={{
        position: "relative",
        cursor: !isRevealed ? "pointer" : "default",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* QR Code - blurred when not revealed */}
      <Box
        sx={{
          bgcolor: "#ffffff",
          p: 1,
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          mb: 1.5,
          filter: isRevealed ? "none" : "blur(10px)",
          transition: "filter 0.5s ease",
          pointerEvents: isRevealed ? "auto" : "none",
          userSelect: isRevealed ? "auto" : "none",
        }}
      >
        <QRCodeSVG
          value={qrUrl}
          size={size}
          level="M"
          includeMargin={true}
          bgColor="#ffffff"
          fgColor="#1f2937"
        />
      </Box>

      {/* Overlay: "Tap to View" */}
      {!isRevealed && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.3)",
            backdropFilter: "blur(2px)",
            zIndex: 2,
          }}
        >
          <TouchAppIcon sx={{ fontSize: 44, color: "#2d5a3d", mb: 0.5 }} />
          <Typography
            sx={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#2d5a3d",
              textAlign: "center",
              lineHeight: 1.2,
              textShadow: "0 1px 4px rgba(255,255,255,0.8)",
            }}
          >
            Tap to View
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BlurredQROverlay;
