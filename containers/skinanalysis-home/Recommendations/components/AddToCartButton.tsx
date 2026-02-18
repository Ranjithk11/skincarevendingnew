"use client";

import React from "react";
import { Box, Button } from "@mui/material";

interface AddToCartButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  fullWidth = false,
}) => {
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={onClick}
      size="small"
      disabled={disabled || isLoading}
      fullWidth={fullWidth}
      sx={{
        padding: "12px 12px",
        typography: "body1",
        whiteSpace: "nowrap",
        minWidth: 140,
        transition: "all 0.3s ease",
        "&:active": {
          transform: "scale(0.95)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 24 }}>
        <Box component="span">{isLoading ? "Adding..." : "Add To Cart"}</Box>
        {!isLoading && (
          <Box
            component="img"
            src="/icons/buy.svg"
            alt="Buy"
            sx={{ width: 24, height: 24, objectFit: "contain", display: "block" }}
          />
        )}
      </Box>
    </Button>
  );
};

export default AddToCartButton;
