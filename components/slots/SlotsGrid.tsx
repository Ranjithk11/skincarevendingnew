"use client";

import React from "react";
import { Box, Typography } from "@mui/material";

export type SlotsGridSlot = {
  slotId: number;
  isAvailable: boolean;
  isSelected: boolean;
  quantity?: number;
};

interface SlotsGridProps {
  slots: SlotsGridSlot[];
  columns?: number;
  onSelect: (slotId: number) => void;
}

export default function SlotsGrid({ slots, columns = 10, onSelect }: SlotsGridProps) {
  return (
    <Box sx={{ width: "100%" }}>
      {/* <Typography
        sx={{
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: "#111827",
          letterSpacing: "0.5px",
          mb: 2,
        }}
      >
        SELECT PRODUCT SLOT
      </Typography> */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 5,
          justifyItems: "center",
          alignItems: "center",
          width: "100%",

        }}
      >
        {slots.map((slot) => {
          const baseBg = slot.isAvailable ? "#6b8f5c" : "#cbd5cb";
          const bg = slot.isSelected ? "#ef4444" : baseBg;
          const color = "#111827";

          return (
            <Box
              key={slot.slotId}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!slot.isAvailable) return;
                onSelect(slot.slotId);
              }}
              onKeyDown={(e) => {
                if (!slot.isAvailable) return;
                if (e.key === "Enter" || e.key === " ") onSelect(slot.slotId);
              }}
              sx={{
                width: 60,
                height: 60,
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: bg,
                cursor: slot.isAvailable ? "pointer" : "not-allowed",
                opacity: slot.isAvailable ? 1 : 0.55,
                userSelect: "none",
                border: slot.isSelected ? "2px solid #991b1b" : "2px solid transparent",
                transition: "transform 120ms ease, background-color 120ms ease",
                "&:active": slot.isAvailable ? { transform: "scale(0.98)" } : undefined,
              }}
            >
              <Typography sx={{ fontSize: 24, fontWeight: 700, color }}>{slot.slotId}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
