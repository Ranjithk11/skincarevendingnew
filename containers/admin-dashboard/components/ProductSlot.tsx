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
  size = 88,
}: ProductSlotProps) {
  const hasProduct = productName && productName.length > 0;
  const isEmpty = !hasProduct;
  
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        border: isSelected 
          ? "2px solid #356A5A" 
          : hasProduct 
            ? "1px solid #39cf4a"
            : "1px solid rgba(0,0,0,0.5)",
        borderRadius: "6px",
        backgroundColor: isSelected 
          ? "#f0f7f5" 
          : hasProduct 
            ? "#f0fff2"
            : "#fff",
        cursor: "pointer",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "#356A5A",
          backgroundColor: isSelected ? "#e5f2ef" : "#f5f5f5",
          transform: "scale(1.02)",
        },
      }}
    >
      {/* Slot Number */}
      <Typography
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 24,
          fontWeight: 400,
          fontFamily: "Roboto, sans-serif",
          color: "#000",
          lineHeight: "normal",
          letterSpacing: "-1.2px",
        }}
      >
        {slotNumber}
      </Typography>
      
      {/* Product Name */}
      {hasProduct && (
        <Typography
          sx={{
            position: "absolute",
            bottom: 6,
            left: 6,
            right: 6,
            fontSize: 14,
            fontWeight: 400,
            fontFamily: "Roboto, sans-serif",
            color: "rgba(0,0,0,0.5)",
            lineHeight: 1.2,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {productName}
        </Typography>
      )}
      
      {/* Empty indicator */}
      {isEmpty && (
        <Typography
          sx={{
            position: "absolute",
            bottom: 6,
            left: 6,
            right: 6,
            fontSize: 12,
            fontWeight: 400,
            fontFamily: "Roboto, sans-serif",
            color: "rgba(0,0,0,0.3)",
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          Empty
        </Typography>
      )}
      
      {/* Quantity Badge */}
      {quantity !== undefined && quantity > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            backgroundColor: "#356A5A",
            borderRadius: "4px",
            px: 0.75,
            py: 0.25,
            minWidth: 20,
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "Roboto, sans-serif",
              color: "#fff",
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            {quantity}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
