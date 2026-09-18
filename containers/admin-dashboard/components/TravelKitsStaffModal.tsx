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
import LuggageOutlinedIcon from "@mui/icons-material/LuggageOutlined";

interface TravelKitsStaffModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TravelKitsStaffModal({
  open,
  onClose,
}: TravelKitsStaffModalProps) {
  const [staffAvailable, setStaffAvailable] = useState(true);
  const [original, setOriginal] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setError(null);
    setSaveSuccess(false);
    fetch("/api/admin/travel-kits")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const next = data.staffAvailable !== false;
          setStaffAvailable(next);
          setOriginal(next);
        } else {
          setError(data.error || "Failed to load travel kits setting");
        }
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load travel kits setting");
      })
      .finally(() => setIsLoading(false));
  }, [open]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const response = await fetch("/api/admin/travel-kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffAvailable }),
      });
      const data = await response.json();
      if (data.success) {
        setOriginal(staffAvailable);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        setError(data.error || "Failed to save");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = staffAvailable !== original;

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
          width: 460,
          bgcolor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          outline: "none",
          border: "3px solid #2F5D46",
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
            <LuggageOutlinedIcon sx={{ fontSize: 28, color: "#2F5D46" }} />
            <Typography sx={{ fontSize: 28, fontWeight: 600, color: "#333" }}>
              Travel Kits
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
                When staff is not available for handoff, turn this off to hide
                travel kits on the kiosk report (24 hours).
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={staffAvailable}
                    onChange={(_, checked) => setStaffAvailable(checked)}
                    color="success"
                  />
                }
                label={
                  <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#111" }}>
                    {staffAvailable ? "Staff available — kits visible" : "Staff away — kits hidden"}
                  </Typography>
                }
                sx={{ mb: 2, ml: 0 }}
              />

              {error ? (
                <Typography sx={{ color: "#c62828", fontSize: 14, mb: 2 }}>{error}</Typography>
              ) : null}
              {saveSuccess ? (
                <Typography sx={{ color: "#2e7d32", fontSize: 14, mb: 2 }}>
                  Saved. Kiosk report will pick this up within about a minute.
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
