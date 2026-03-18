"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { Close, Phone, Home } from "@mui/icons-material";
import Image from "next/image";
import PageBackground from "./PageBackground";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpDialog({ open, onClose }: HelpDialogProps) {
  const [isHoming, setIsHoming] = useState(false);
  const [homeStatus, setHomeStatus] = useState<"idle" | "success" | "error">("idle");
  const [isReopening, setIsReopening] = useState(false);
  const [reopenStatus, setReopenStatus] = useState<"idle" | "success" | "error">("idle");
  const [pickupTimer, setPickupTimer] = useState<number>(0);

  useEffect(() => {
    if (open) return;
    setIsHoming(false);
    setHomeStatus("idle");
    setIsReopening(false);
    setReopenStatus("idle");
    setPickupTimer(0);
  }, [open]);

  const handleHomeTray = async () => {
    setIsHoming(true);
    setHomeStatus("idle");

    try {
      const response = await fetch("/api/admin/motor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "HOME" }),
      });

      const result = await response.json();
      if (result.success) {
        setHomeStatus("success");
        setTimeout(() => {
          setHomeStatus("idle");
        }, 3000);
      } else {
        setHomeStatus("error");
        setTimeout(() => {
          setHomeStatus("idle");
        }, 3000);
      }
    } catch (error) {
      console.error("Home tray error:", error);
      setHomeStatus("error");
      setTimeout(() => {
        setHomeStatus("idle");
      }, 3000);
    } finally {
      setIsHoming(false);
    }
  };

  const handleReopenTray = async () => {
    setIsReopening(true);
    setReopenStatus("idle");
    setPickupTimer(10);

    try {
      const response = await fetch("/api/admin/motor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "REOPEN" }),
      });

      const result = await response.json();
      if (result.success) {
        setReopenStatus("success");
      } else {
        setReopenStatus("error");
        setPickupTimer(0);
        setTimeout(() => {
          setReopenStatus("idle");
        }, 3000);
      }
    } catch (error) {
      console.error("Reopen tray error:", error);
      setReopenStatus("error");
      setPickupTimer(0);
      setTimeout(() => {
        setReopenStatus("idle");
      }, 3000);
    } finally {
      setIsReopening(false);
    }
  };

  // Pickup timer countdown after reopen succeeds
  useEffect(() => {
    if (pickupTimer <= 0) return;
    
    const interval = setInterval(() => {
      setPickupTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setReopenStatus("idle");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pickupTimer]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: { bgcolor: "transparent" },
      }}
    >
      <PageBackground>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            p: 4,
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 40,
              right: 20,
              bgcolor: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              "&:hover": { bgcolor: "#f5f5f5" },
            }}
          >
            <Close sx={{ fontSize: 32 }} />
          </IconButton>

          {/* Logo */}
          <Box
            sx={{
              position: "relative",
              width: 300,
              height: 80,
              mb: 4,
            }}
          >
            <Image
              src="/wending/goldlog.svg"
              alt="Leaf Water"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </Box>

          {/* Help Content Container */}
          <Box
            sx={{
              bgcolor: "#fff",
              borderRadius: 4,
              p: 5,
              width: "min(700px, 90%)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
            }}
          >
            {/* Section 1: Contact Support */}
            <Box sx={{ mb: 5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Phone sx={{ fontSize: 36, color: "#2d5a3d" }} />
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a" }}>
                  Need Assistance?
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 24, color: "#4b5563", lineHeight: 1.6 }}>
                We aim to respond within 10 minutes during working hours.              </Typography>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "#f0fdf4",
                  borderRadius: 2,
                  border: "1px solid #bbf7d0",
                }}
              >
                <Typography sx={{ fontSize: 26, textAlign: "center", fontWeight: 600, color: "#166534", pb: 2 }}>
                  Support Hours:
                </Typography>
                <Typography sx={{ fontSize: 26, textAlign: "center", fontWeight: 600, color: "#d6300aff", pb: 2 }}>
                  9:00 AM – 6:00 PM
                </Typography>
                <Typography sx={{ fontSize: 26, textAlign: "center", fontWeight: 600, color: "#166534", pb: 2 }}>
                  📞 +91 8008675263
                </Typography>
              </Box>
            </Box>

            {/* Divider */}
            {/* <Box sx={{ height: 1, bgcolor: "#e5e7eb", my: 4 }} /> */}

            {/* Section 2: Tray Stuck */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Home sx={{ fontSize: 36, color: "#2d5a3d" }} />
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a" }}>
                  Tray Not Responding?
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 24, color: "#4b5563", lineHeight: 1.6, mb: 3 }}>
                If the tray has stopped or is not returning automatically, press the button below to reset it to the home position.
              </Typography>

              <Button
                variant="contained"
                onClick={handleHomeTray}
                disabled={isHoming}
                sx={{
                  width: "100%",
                  py: 2,
                  fontSize: 24,
                  fontWeight: 600,
                  bgcolor: "#2d5a3d",
                  borderRadius: 2,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#1e3d2a" },
                  "&:disabled": { bgcolor: "#9ca3af" },
                }}
              >
                {isHoming ? (
                  <CircularProgress size={28} sx={{ color: "#fff" }} />
                ) : homeStatus === "success" ? (
                  "✓ Tray Homed Successfully"
                ) : homeStatus === "error" ? (
                  "✗ Failed - Try Again"
                ) : (
                  "Click to Home Tray"
                )}
              </Button>

              {homeStatus === "success" && (
                <Typography sx={{ mt: 2, fontSize: 18, color: "#16a34a", textAlign: "center" }}>
                  The tray has been returned to home position.
                </Typography>
              )}
              {homeStatus === "error" && (
                <Typography sx={{ mt: 2, fontSize: 18, color: "#dc2626", textAlign: "center" }}>
                  Failed to home tray. Please contact support.
                </Typography>
              )}

              {/* Reopen Tray Button */}
              <Button
                variant="outlined"
                onClick={handleReopenTray}
                disabled={isReopening}
                sx={{
                  width: "100%",
                  py: 2,
                  mt: 2,
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#2d5a3d",
                  borderColor: "#2d5a3d",
                  borderWidth: 2,
                  borderRadius: 2,
                  textTransform: "none",
                  "&:hover": { 
                    bgcolor: "#f0fdf4",
                    borderColor: "#1e3d2a",
                    borderWidth: 2,
                  },
                  "&:disabled": { 
                    color: "#9ca3af",
                    borderColor: "#9ca3af",
                  },
                }}
              >
                {isReopening ? (
                  <CircularProgress size={28} sx={{ color: "#2d5a3d" }} />
                ) : reopenStatus === "success" ? (
                  "✓ Tray Opened"
                ) : reopenStatus === "error" ? (
                  "✗ Failed - Try Again"
                ) : (
                  "Reopen Tray Door"
                )}
              </Button>

              {reopenStatus === "success" && (
                <Typography sx={{ mt: 2, fontSize: 18, color: "#16a34a", textAlign: "center" }}>
                  The tray door has been reopened.
                </Typography>
              )}

              {pickupTimer > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: "#fef3c7",
                    borderRadius: 2,
                    border: "2px solid #f59e0b",
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#92400e" }}>
                    ⏱️ Pickup your product
                  </Typography>
                  <Typography sx={{ fontSize: 36, fontWeight: 800, color: "#d97706", mt: 1 }}>
                    {pickupTimer}s
                  </Typography>
                  <Typography sx={{ fontSize: 16, color: "#92400e", mt: 0.5 }}>
                    Tray door will close soon
                  </Typography>
                </Box>
              )}
              {reopenStatus === "error" && (
                <Typography sx={{ mt: 2, fontSize: 18, color: "#dc2626", textAlign: "center" }}>
                  Failed to reopen tray. Please contact support.
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
      </PageBackground>
    </Dialog>
  );
}
