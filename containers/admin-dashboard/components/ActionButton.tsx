"use client";

import { Box, Button, Typography } from "@mui/material";
import { ReactNode } from "react";

interface ActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  width?: number;
}

export default function ActionButton({
  icon,
  label,
  onClick,
  active = false,
  width,
}: ActionButtonProps) {
  return (
    <Button
      variant="outlined"
      onClick={onClick}
      fullWidth={false}
      sx={{
        borderRadius: "68px",
        border: active ? "1px solid #323232" : "1px solid rgba(0,0,0,0.35)",
        backgroundColor: active ? "#f5f5f5" : "#fff",
        color: "#323232",
        minWidth: "auto",
        width: width ? `${width}px` : "auto",
        height: 72,
        textTransform: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap:1,
        "&:hover": {
          backgroundColor: "#f5f5f5",
          border: "1px solid rgba(0,0,0,0.35)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: { xs: 30, md: 30 },
          height: { xs: 30, md: 30 },
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontSize: { xs: 24, md: 24 },
          fontWeight: 400,
          fontFamily: "Roboto, sans-serif",
          color: "#323232",
        }}
      >
        {label}
      </Typography>
    </Button>
  );
}
