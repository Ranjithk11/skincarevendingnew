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
  const [machineId, setMachineId] = useState("");
  const [machineName, setMachineName] = useState("");
  const [machineLocation, setMachineLocation] = useState("");
  const [originalValues, setOriginalValues] = useState({ id: "", name: "", location: "" });
  const [source, setSource] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current machine settings when modal opens
  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/machine-name");
      const data = await response.json();
      if (data.success) {
        setMachineId(data.machineId || "");
        setMachineName(data.machineName || "");
        setMachineLocation(data.machineLocation || "");
        setOriginalValues({
          id: data.machineId || "",
          name: data.machineName || "",
          location: data.machineLocation || "",
        });
        setSource(data.source);
      } else {
        setError(data.error || "Failed to fetch machine settings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch machine settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!machineId.trim()) {
      setError("Machine ID is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/admin/machine-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: machineId.trim(),
          machineName: machineName.trim(),
          machineLocation: machineLocation.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setOriginalValues({
          id: machineId.trim(),
          name: machineName.trim(),
          location: machineLocation.trim(),
        });
        setSource("database");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to save machine settings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save machine settings");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    machineId.trim() !== originalValues.id ||
    machineName.trim() !== originalValues.name ||
    machineLocation.trim() !== originalValues.location;

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
          <Typography sx={{ fontSize: 32, fontWeight: 600, color: "#333" }}>
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
              {/* <TextField
                fullWidth
                label="Machine ID"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                placeholder="e.g., LW-VM-TestingDB"
                sx={{ mb: 2 }}
                helperText="Unique identifier sent to the analytics backend"
                size="medium"
                InputLabelProps={{ sx: { fontSize: 24, fontWeight: 700 } }}
                InputProps={{ sx: { fontSize: 24, fontWeight: 600 } }}
              /> */}

              <TextField
                fullWidth
                label="Machine Name"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="e.g., LW VM Floor 1"
                sx={{ mb: 2 }}
                helperText="Display name for this machine"
                size="medium"
                InputLabelProps={{ sx: { fontSize: 24, fontWeight: 700 } }}
                InputProps={{ sx: { fontSize: 24, fontWeight: 600 } }}
              />

              <TextField
                fullWidth
                label="Location"
                value={machineLocation}
                onChange={(e) => setMachineLocation(e.target.value)}
                placeholder="e.g., Floor 1"
                sx={{ mb: 2 }}
                helperText="Physical location of this machine"
                size="medium"
                InputLabelProps={{ sx: { fontSize: 24, fontWeight: 700 } }}
                InputProps={{ sx: { fontSize: 24, fontWeight: 600 } }}
              />

              {source === "env" && (
                <Box
                  sx={{
                    bgcolor: "#fff3e0",
                    border: "1px solid #ffb74d",
                    borderRadius: 1,
                    p: 1.5,
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontSize: 14, color: "#e65100" }}>
                    Currently using .env defaults. Saving here will override them.
                  </Typography>
                </Box>
              )}

              {error && (
                <Box
                  sx={{
                    bgcolor: "#ffebee",
                    border: "1px solid #ef5350",
                    borderRadius: 1,
                    p: 1.5,
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontSize: 14, color: "#c62828" }}>
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
                    p: 1.5,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 24 }} />
                  <Typography sx={{ fontSize: 12, color: "#2e7d32" }}>
                    Machine settings saved! Next sale will use these values.
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
