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
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

interface DispenseIssueModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DispenseIssueModal({
  open,
  onClose,
}: DispenseIssueModalProps) {
  const [issueEnabled, setIssueEnabled] = useState(false);
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
    fetch("/api/admin/dispense-issue", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const next = Boolean(data.issueEnabled);
          setIssueEnabled(next);
          setOriginal(next);
        } else {
          setError(data.error || "Failed to load dispense issue setting");
        }
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load dispense issue setting");
      })
      .finally(() => setIsLoading(false));
  }, [open]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const response = await fetch("/api/admin/dispense-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueEnabled }),
      });
      const data = await response.json();
      if (data.success) {
        setOriginal(issueEnabled);
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

  const hasChanges = issueEnabled !== original;

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
          border: `3px solid ${issueEnabled ? "#b45309" : "#2F5D46"}`,
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
            <ReportProblemOutlinedIcon
              sx={{ fontSize: 28, color: issueEnabled ? "#b45309" : "#2F5D46" }}
            />
            <Typography sx={{ fontSize: 28, fontWeight: 600, color: "#333" }}>
              Dispense Issue
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
                Turn this on when the dispenser has a problem. Customers who tap
                Add to cart will see a message to buy at the Gate 11 machine or
                leafwater.in. Payments stay off until you turn this off.
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={issueEnabled}
                    onChange={(_, checked) => setIssueEnabled(checked)}
                    color="warning"
                  />
                }
                label={
                  <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#111" }}>
                    {issueEnabled
                      ? "Issue ON — buying blocked"
                      : "Issue OFF — buying works"}
                  </Typography>
                }
                sx={{ mb: 2, ml: 0 }}
              />

              {error ? (
                <Typography sx={{ color: "#c62828", fontSize: 14, mb: 2 }}>{error}</Typography>
              ) : null}
              {saveSuccess ? (
                <Typography sx={{ color: "#2e7d32", fontSize: 14, mb: 2 }}>
                  Saved. Kiosk buy buttons will update within a few seconds.
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
                  bgcolor: issueEnabled ? "#b45309" : "#2F5D46",
                  "&:hover": { bgcolor: issueEnabled ? "#92400e" : "#244A38" },
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
