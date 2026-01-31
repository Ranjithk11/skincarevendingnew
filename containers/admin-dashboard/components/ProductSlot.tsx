"use client";

import { Box, Typography } from "@mui/material";

interface ProductSlotProps {
  slotNumber: number;
  productName?: string;
  quantity?: number;
  onClick?: () => void;
  isSelected?: boolean;
  size?: number;
}

export default function ProductSlot({
  slotNumber,
  productName = "",
  quantity,
  onClick,
  isSelected = false,
  size = 100,
}: ProductSlotProps) {
  const hasProduct = productName && productName.length > 0;
  
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        border: isSelected 
          ? "2px solid #356A5A" 
          : hasProduct 
            ? "2px solid #22c55e"
            : "1px solid rgba(0,0,0,0.5)",
        borderRadius: "6px",
        backgroundColor: isSelected 
          ? "#f0f7f5" 
          : hasProduct 
            ? "#f0fdf4"
            : "#fff",
        cursor: "pointer",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: hasProduct ? "#16a34a" : "#356A5A",
          backgroundColor: isSelected ? "#e5f2ef" : hasProduct ? "#dcfce7" : "#f5f5f5",
        },
      }}
    >
      {/* Slot Number - centered */}
      <Typography
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "Roboto, sans-serif",
          color: "#000",
          lineHeight: "normal",
          letterSpacing: "-1.2px",
        }}
      >
        {slotNumber}
      </Typography>
      
      {/* Product Name - bottom, truncated */}
      <Typography
        sx={{
          position: "absolute",
          bottom: 4,
          left: 4,
          right: 4,
          fontSize: 10,
          fontWeight: 400,
          fontFamily: "Roboto, sans-serif",
          color: hasProduct ? "#16a34a" : "rgba(0,0,0,0.4)",
          lineHeight: 1.2,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        {hasProduct ? productName : "None"}
      </Typography>
    </Box>
  );
}
