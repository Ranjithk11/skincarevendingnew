"use client";

import { createPortal } from "react-dom";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CookiesTermsPopup({ open, onClose }: Props) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <Box
      onClick={onClose}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        bgcolor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
      }}
    >
      <Box
        onClick={(event) => event.stopPropagation()}
        sx={{
          width: "min(560px, 100%)",
          maxHeight: "70vh",
          overflow: "auto",
          bgcolor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
          position: "relative",
          p: 3,
          pt: 5,
        }}
      >
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            p: 0.5,
            color: "#1a1a1a",
          }}
        >
          <CloseIcon sx={{ fontSize: 28 }} />
        </IconButton>
        <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a", mb: 1.5, pr: 4 }}>
          Terms &amp; Cookies
        </Typography>
        <Typography sx={{ fontSize: 18, color: "#374151", lineHeight: 1.45, mb: 1.5 }}>
          Leaf Water uses cookies and similar storage on this kiosk to keep your
          visit working, remember your choices, and continue to skin analysis
          after you sign up.
        </Typography>
        <Typography sx={{ fontSize: 18, color: "#374151", lineHeight: 1.45, mb: 1.5 }}>
          If you continue, we may use your name, phone, and a face photo only to
          analyse your skin and suggest products for this visit. We do not sell
          your personal data.
        </Typography>
        <Typography sx={{ fontSize: 18, color: "#374151", lineHeight: 1.45 }}>
          You can skip the scan later and still shop. For questions, contact
          Leaf Water support.
        </Typography>
      </Box>
    </Box>,
    document.body
  );
}
