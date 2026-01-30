"use client";

import { Box, Typography } from "@mui/material";

interface ProductSlotProps {
  slotNumber: number;
  productName?: string;
  quantity?: number;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function ProductSlot({
  slotNumber,
  productName = "",
  quantity,
  onClick,
  isSelected = false,
}: ProductSlotProps) {
  const hasProduct = productName && productName.length > 0;
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        border: isSelected ? "2px solid #356A5A" : "1px solid rgba(0,0,0,0.5)",
        borderRadius: "6px",
        backgroundColor: isSelected ? "#f0f7f5" : "#fff",
        cursor: "pointer",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "#356A5A",
          backgroundColor: "#f5f5f5",
        },
      }}
    >
      <Typography
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 20,
          fontWeight: 500,
          fontFamily: "Roboto, sans-serif",
          color: "#000",
          lineHeight: "normal",
        }}
      >
        {slotNumber}
      </Typography>
      {hasProduct && (
        <Typography
          sx={{
            position: "absolute",
            bottom: 2,
            left: 0,
            right: 0,
            fontSize: 8,
            fontWeight: 400,
            fontFamily: "Roboto, sans-serif",
            color: "#666",
            lineHeight: 1.2,
            textTransform: "uppercase",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            px: 0.5,
          }}
        >
          {productName}
        </Typography>
      )}
      {quantity !== undefined && quantity > 0 && (
        <Typography
          sx={{
            position: "absolute",
            top: 2,
            right: 4,
            fontSize: 9,
            fontWeight: 600,
            fontFamily: "Roboto, sans-serif",
            color: "#fff",
            lineHeight: 1,
            backgroundColor: "#356A5A",
            px: 0.5,
            py: 0.25,
            borderRadius: "3px",
            minWidth: "16px",
            textAlign: "center",
          }}
        >
          {quantity}
        </Typography>
      )}
    </Box>
  );
}
