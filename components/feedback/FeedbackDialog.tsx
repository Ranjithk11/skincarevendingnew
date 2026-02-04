"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { Icon } from "@iconify/react";
import Image from "next/image";
import PageBackground from "@/components/ui/PageBackground";

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (rating: number, notes: string) => void;
  userId?: string;
}

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  open,
  onClose,
  onSubmit,
  userId,
}) => {
  const theme = useTheme();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStarClick = (starIndex: number) => {
    setRating(starIndex);
  };

  const handleStarHover = (starIndex: number) => {
    setHoveredRating(starIndex);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      if (userId) {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            rating,
            notes,
          }),
        });

        const result = await response.json();

        if (result.success || result.status === "success") {
          setSubmitted(true);
          onSubmit?.(rating, notes);
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      } else if (onSubmit) {
        setSubmitted(true);
        onSubmit(rating, notes);
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setNotes("");
    setSubmitted(false);
    onClose();
  };

  const handleSkip = () => {
    handleClose();
  };

  const displayRating = hoveredRating || rating;
  const canSubmit = rating > 0 && !isSubmitting && (!!userId || !!onSubmit);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen
      sx={{ zIndex: (t) => t.zIndex.modal + 50 }}
      PaperProps={{
        sx: {
          width: "100%",
          height: "100%",
          borderRadius: 0,
          overflow: "hidden",
          bgcolor: "transparent",
        },
      }}
    >
      <PageBackground fitParent>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "100%",
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            px: 3,
            pt: 3,
            pb: 4,
            boxSizing: "border-box",
          }}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 18,
              right: 18,
              width: 40,
              height: 40,
              bgcolor: "#ffffff",
              border: "1px solid #d1d5db",
              "&:hover": { bgcolor: "#ffffff" },
            }}
          >
            <Icon icon="mdi:help-circle-outline" width={22} />
          </IconButton>

          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              mt: 5,
              mb: 5,
            }}
          >
            <Box
              sx={{
                border: "2px solid #1976d2",
                bgcolor: "#ffffff",
                px: 2.5,
                py: 1,
                borderRadius: 0,
                width: "min(520px, 100%)",
                height: 80,
                position: "relative",
              }}
            >
              <Image
                src="/wending/goldlog.svg"
                alt="Leaf Water"
                fill
                sizes="520px"
                style={{ objectFit: "contain" }}
                priority
              />
            </Box>
          </Box>

          <Box sx={{ width: "min(860px, 100%)",mt:5}}>
            <Box
              sx={{
                width: "100%",
                bgcolor: "#1f4d3d",
                borderRadius: 3,
                px: 3,
                py: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              }}
            >
              <Box sx={{ color: "#ffffff", minWidth: 0 }}>
                <Typography sx={{ fontSize: 24, opacity: 0.85, letterSpacing: 0.5, pb: 2 }}>
                  LEARN MORE
                </Typography>
                <Typography sx={{ fontSize: 32, fontWeight: 700, mt: 0.5, pb: 2 }}>
                  About Leafwater
                </Typography>
                <Typography sx={{ fontSize: 24, opacity: 0.9, mt: 0.5, maxWidth: 520 }}>
                  Deep insights into your skin, powered by intelligent diagnostics,
                </Typography>
              </Box>
              <Box sx={{ bgcolor: "#ffffff", borderRadius: 2, p: 1, flexShrink: 0 }}>
                <Image src="/wending/qr.svg" alt="QR" width={74} height={74} />
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              width: "min(860px, 100%)",
              mt: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 0.5,
              mb:5
            }}
          >
            <Typography sx={{ fontWeight: 800, letterSpacing: 3, fontSize: 32,pb:2,pt:4 }}>
              THANK YOU!
            </Typography>
            <Typography sx={{ fontSize: 24, color: "#111827" }}>
              Please remember to retrieve your item!
            </Typography>
            <Typography sx={{ fontSize: 24, color: "#111827" }}>
              Have a nice day!
            </Typography>
          </Box>

          <Box
            sx={{
              width: "min(860px, 100%)",
              mt: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 700 ,pb:2}}>Quick Favour?</Typography>
            <Typography sx={{ fontSize: 24, color: "#374151", mt: 0.5 }}>
              Kindly rate your experience with us so far.
            </Typography>

            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <IconButton
                  key={star}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={handleStarLeave}
                  sx={{ p: 1, bgcolor: "transparent" }}
                >
                  <Icon
                    icon={star <= displayRating ? "mdi:star" : "mdi:star-outline"}
                    width={60}
                    color={star <= displayRating ? "#f59e0b" : "#cfcfcf"}
                  />
                </IconButton>
              ))}
            </Box>

            <Box sx={{ width: "min(520px, 100%)", mt: 2.5 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Tell us more (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    bgcolor: "#ffffff",
                    fontSize: 24,
                    "& textarea": {
                      fontSize: 24,
                    },
                    "& textarea::placeholder": {
                      fontSize: 24,
                      opacity: 0.8,
                    },
                    "& fieldset": {
                      borderColor: "#d1d5db",
                    },
                    "&:hover fieldset": {
                      borderColor: "#9ca3af",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#9ca3af",
                    },
                  },
                }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleSubmit}
                disabled={!canSubmit}
                sx={{
                  mt: 2,
                  bgcolor: "#1f4d3d",
                  color: "#fff",
                  py: 1.25,
                  borderRadius: "12px",
                  fontSize: 24,
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "#16362c",
                  },
                  "&:disabled": {
                    bgcolor: "#d1d5db",
                    color: "#ffffff",
                  },
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              width: "min(860px, 100%)",
              mt: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 800, mb: 2 }}>Need Help?</Typography>
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "1fr 1px 1fr",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: 24, color: "#374151" ,pb:2}}>WhatsApp us:</Typography>
                <Typography sx={{ fontSize: 24, color: "#111827", fontWeight: 700 }}>
                  +91 9179077990
                </Typography>
              </Box>
              <Box sx={{ height: 120, bgcolor: "#000" ,display:"flex",alignItems:"center",justifyContent:"center"}} />
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: 24, color: "#374151" }}>
                  Scan this <br /> QR Code
                </Typography>
                <Box sx={{ bgcolor: "#ffffff", borderRadius: 1, p: 0.75, flexShrink: 0 }}>
                  <Image src="/wending/qr.svg" alt="QR" width={92} height={92} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </PageBackground>
    </Dialog>
  );
};

export default FeedbackDialog;
