"use client";

import React from "react";
import { Box, IconButton } from "@mui/material";
import { Icon } from "@iconify/react";

interface QuantitySelectorProps {
  quantity: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onChange,
  min = 1,
  max = 99,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 1,
      }}
    >
      <IconButton
        size="small"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        sx={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 1,
        }}
      >
        <Icon icon="mdi:minus" />
      </IconButton>

      <Box
        component="input"
        value={quantity}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next) && next >= min && next <= max) {
            onChange(next);
          }
        }}
        inputMode="numeric"
        style={{
          width: 60,
          height: 32,
          textAlign: "center",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 6,
          outline: "none",
          fontSize: 14,
        }}
      />

      <IconButton
        size="small"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        sx={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 1,
        }}
      >
        <Icon icon="mdi:plus" />
      </IconButton>
    </Box>
  );
};

export default QuantitySelector;
