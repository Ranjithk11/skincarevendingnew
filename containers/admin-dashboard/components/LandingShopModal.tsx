"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Modal,
  IconButton,
  Button,
  CircularProgress,
  Switch,
  FormControlLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

interface LandingShopModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LandingShopModal({
  open,
  onClose,
}: LandingShopModalProps) {
  const [shopEnabled, setShopEnabled] = useState(false);
  const [original, setOriginal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setError(null);
    setSaveSuccess(false);
    fetch("/api/admin/landing-shop", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const next = Boolean(data.shopEnabled);
          setShopEnabled(next);
          setOriginal(next);
        } else {
          setError(data.error || "Failed to load landing shop setting");
        }
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load landing shop setting");
      })
      .finally(() => setIsLoading(false));
  }, [open]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const response = await fetch("/api/admin/landing-shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopEnabled }),
      });
      const data = await response.json();
      if (data.success) {
        setOriginal(shopEnabled);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        setError(data.error || "Failed to save");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = shopEnabled !== original;

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: 500,
          bgcolor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          outline: "none",
          border: `3px solid ${shopEnabled ? "#2F5D46" : "#9ca3af"}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            py: 2,
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <StorefrontOutlinedIcon sx={{ fontSize: 28, color: "#2F5D46" }} />
            <Typography sx={{ fontSize: 28, fontWeight: 600, color: "#333" }}>
              Landing Shop
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Box sx={{ p: 3 }}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography sx={{ fontSize: 16, color: "#6B7280", mb: 2, lineHeight: 1.45 }}>
                Turn this on to show deals, products, and bundles on the home
                screen. Turn it off to keep the current landing with only the
                three buttons.
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={shopEnabled}
                    onChange={(_, checked) => setShopEnabled(checked)}
                    color="success"
                  />
                }
                label={
                  <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#111" }}>
                    {shopEnabled
                      ? "Shop ON - deals overlay visible"
                      : "Shop OFF - current landing only"}
                  </Typography>
                }
                sx={{ mb: 2, ml: 0 }}
              />

              {error ? (
                <Typography sx={{ color: "#c62828", fontSize: 14, mb: 2 }}>{error}</Typography>
              ) : null}
              {saveSuccess ? (
                <Typography sx={{ color: "#2e7d32", fontSize: 14, mb: 2 }}>
                  Saved. Home screen will update within a few seconds.
                </Typography>
              ) : null}

              <Button
                fullWidth
                variant="contained"
                disabled={!hasChanges || isSaving}
                onClick={handleSave}
                sx={{
                  py: 1.5,
                  fontSize: 18,
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: "#2F5D46",
                  "&:hover": { bgcolor: "#244A38" },
                }}
              >
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
