"use client";

import { Box, Button, Typography } from "@mui/material";
import { useScanConsentScreen } from "./useScanConsentScreen";

export default function ScanConsentCookiePopup() {
  const { busy, handleAcceptCookies } = useScanConsentScreen();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        bgcolor: "rgba(0, 0, 0, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          width: 360,
          bgcolor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          p: 2.5,
        }}
      >
        <Typography sx={{ fontSize: 18, color: "#111", lineHeight: 1.4, mb: 2 }}>
          Please accept cookies and proceed
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => void handleAcceptCookies()}
            sx={{
              textTransform: "none",
              minWidth: 88,
              bgcolor: "#2F5D46",
              "&:hover": { bgcolor: "#244A38" },
            }}
          >
            {busy ? "…" : "Accept"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
