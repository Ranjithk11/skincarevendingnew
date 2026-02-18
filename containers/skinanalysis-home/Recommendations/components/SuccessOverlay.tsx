"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";

interface SuccessOverlayProps {
  show: boolean;
  title?: string;
  subtitle?: string;
}

const SuccessOverlay: React.FC<SuccessOverlayProps> = ({
  show,
  title = "Added to Cart!",
  subtitle,
}) => {
  if (!show) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "rgba(255, 255, 255, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
        animation: "fadeIn 0.3s ease-in-out",
        "@keyframes fadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          bgcolor: "#22c55e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "scaleIn 0.4s ease-out",
          "@keyframes scaleIn": {
            "0%": { transform: "scale(0)" },
            "50%": { transform: "scale(1.2)" },
            "100%": { transform: "scale(1)" },
          },
        }}
      >
        <Icon icon="mdi:check" style={{ fontSize: 60, color: "#fff" }} />
      </Box>
      <Typography
        sx={{
          mt: 3,
          fontSize: "28px",
          fontWeight: 600,
          color: "#22c55e",
          animation: "slideUp 0.4s ease-out 0.2s both",
          "@keyframes slideUp": {
            "0%": { opacity: 0, transform: "translateY(20px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          sx={{
            mt: 1,
            fontSize: "18px",
            color: "#6b7280",
            animation: "slideUp 0.4s ease-out 0.3s both",
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default SuccessOverlay;
