"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Modal,
  IconButton,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface MachineSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function MachineSettingsModal({
  open,
  onClose,
}: MachineSettingsModalProps) {
  const [machineName, setMachineName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [source, setSource] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current machine name when modal opens
  useEffect(() => {
    if (open) {
      fetchMachineName();
    }
  }, [open]);

  const fetchMachineName = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/machine-name");
      const data = await response.json();
      if (data.success) {
        setMachineName(data.machineName);
        setOriginalName(data.machineName);
        setSource(data.source);
      } else {
        setError(data.error || "Failed to fetch machine name");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch machine name");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!machineName.trim()) {
      setError("Machine name cannot be empty");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/admin/machine-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineName: machineName.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setOriginalName(machineName.trim());
        setSource("database");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to save machine name");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save machine name");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = machineName.trim() !== originalName;

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
          border: "3px solid #1976d2",
        }}
      >
        {/* Header */}
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
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#333" }}>
            Machine Settings
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography sx={{ fontSize: 14, color: "#666", mb: 1 }}>
                Machine Name / Location
              </Typography>
              <TextField
                fullWidth
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="e.g., LeafWater_Jubilee_Hills"
                sx={{ mb: 2 }}
                helperText={
                  source === "env"
                    ? "Currently set via environment variable (NEXT_PUBLIC_MACHINE_NAME)"
                    : "This name will be sent with customer scans to identify this machine"
                }
              />

              {source === "env" && (
                <Box
                  sx={{
                    bgcolor: "#fff3e0",
                    border: "1px solid #ffb74d",
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontSize: 13, color: "#e65100" }}>
                    Note: Machine name is currently set via environment variable.
                    Changes saved here will only take effect if the environment
                    variable is removed.
                  </Typography>
                </Box>
              )}

              {error && (
                <Box
                  sx={{
                    bgcolor: "#ffebee",
                    border: "1px solid #ef5350",
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontSize: 13, color: "#c62828" }}>
                    {error}
                  </Typography>
                </Box>
              )}

              {saveSuccess && (
                <Box
                  sx={{
                    bgcolor: "#e8f5e9",
                    border: "1px solid #66bb6a",
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 20 }} />
                  <Typography sx={{ fontSize: 13, color: "#2e7d32" }}>
                    Machine name saved successfully!
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  startIcon={
                    isSaving ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
