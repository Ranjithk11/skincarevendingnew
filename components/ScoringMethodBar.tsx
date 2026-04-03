"use client";

import React from "react";
import { Box, Typography } from "@mui/material";

const segments = [
  { width: "20%", range: "100 – 80%", label: "Optimal", gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "#16a34a", labelColor: "#15803d", bg: "#f0fdf4", border: "#22c55e" },
  { width: "40%", range: "79 – 40%", label: "Moderate", gradient: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", color: "#d97706", labelColor: "#b45309", bg: "#fffbeb", border: "#f59e0b" },
  { width: "40%", range: "39 – 0%", label: "Needs Care", gradient: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)", color: "#ef4444", labelColor: "#dc2626", bg: "#fef2f2", border: "#ef4444" },
];

const ScoringMethodBar: React.FC = () => {
  return (
    <Box sx={{ width: "100%", maxWidth: 720, mx: "auto" }}>
      {/* Gradient Score Bar */}
      <Box
        sx={{
          width: "100%",
          height: 36,
          borderRadius: "18px",
          overflow: "hidden",
          display: "flex",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {segments.map((seg, i) => (
          <Box
            key={seg.label}
            sx={{
              width: seg.width,
              background: seg.gradient,
              position: "relative",
              ...(i < segments.length - 1 && {
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "1px",
                  height: "100%",
                  bgcolor: "rgba(255,255,255,0.5)",
                },
              }),
            }}
          />
        ))}
      </Box>

      {/* Labels */}
      <Box sx={{ display: "flex", width: "100%", mt: 2 }}>
        {segments.map((seg) => (
          <Box key={seg.label} sx={{ width: seg.width, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Box
              sx={{
                bgcolor: seg.bg,
                border: `2px solid ${seg.border}`,
                borderRadius: "10px",
                px: 1.5,
                py: 0.8,
                textAlign: "center",
                width: "fit-content",
              }}
            >
              <Typography sx={{ fontSize: "20px", fontWeight: 700, color: seg.color, lineHeight: 1.2 }}>
                {seg.range}
              </Typography>
              <Typography sx={{ fontSize: "20px", fontWeight: 500, color: seg.labelColor, lineHeight: 1.3 }}>
                {seg.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ScoringMethodBar;
