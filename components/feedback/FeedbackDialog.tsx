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
      // Call the feedback API
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || localStorage.getItem("leafwater_userId") || "",
          rating,
          notes,
        }),
      });

      const result = await response.json();
      
      if (result.success || result.status === "success") {
        setSubmitted(true);
        onSubmit?.(rating, notes);
        // Auto close after showing thank you
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: "90%",
          maxWidth: "500px",
          borderRadius: "24px",
          overflow: "hidden",
          bgcolor: "#fff",
        },
      }}
    >
      <Box sx={{ position: "relative", p: 3 }}>
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            bgcolor: "#f5f5f5",
            "&:hover": { bgcolor: "#e0e0e0" },
          }}
        >
          <Icon icon="mdi:close" width={24} />
        </IconButton>

        {submitted ? (
          // Thank You Screen
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "#2d5a3d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
              }}
            >
              <Icon icon="mdi:check" width={48} color="#fff" />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#2d5a3d",
                mb: 1,
                textAlign: "center",
              }}
            >
              Thank You!
            </Typography>
            <Typography
              sx={{
                color: "#666",
                textAlign: "center",
                fontSize: "16px",
              }}
            >
              Your feedback helps us improve our service.
            </Typography>
          </Box>
        ) : (
          // Feedback Form
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Logo */}
            <Box
              sx={{
                position: "relative",
                width: 100,
                height: 100,
                mb: 2,
              }}
            >
              <Image
                src="/wending/goldlog.svg"
                alt="Leaf Water Logo"
                fill
                style={{ objectFit: "contain" }}
              />
            </Box>

            {/* Title */}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#1a1a1a",
                mb: 1,
                textAlign: "center",
                fontSize: "28px",
              }}
            >
              How was your experience?
            </Typography>

            <Typography
              sx={{
                color: "#666",
                textAlign: "center",
                mb: 3,
                fontSize: "16px",
              }}
            >
              We'd love to hear your feedback
            </Typography>

            {/* Star Rating */}
            <Box
              sx={{
                display: "flex",
                gap: 1,
                mb: 3,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <IconButton
                  key={star}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={handleStarLeave}
                  sx={{
                    p: 0.5,
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "scale(1.2)",
                      bgcolor: "transparent",
                    },
                  }}
                >
                  <Icon
                    icon={star <= displayRating ? "mdi:star" : "mdi:star-outline"}
                    width={48}
                    color={star <= displayRating ? "#FFD700" : "#ccc"}
                  />
                </IconButton>
              ))}
            </Box>

            {/* Rating Label */}
            <Typography
              sx={{
                color: "#2d5a3d",
                fontWeight: 600,
                mb: 3,
                fontSize: "18px",
                minHeight: "27px",
              }}
            >
              {displayRating === 1 && "Poor"}
              {displayRating === 2 && "Fair"}
              {displayRating === 3 && "Good"}
              {displayRating === 4 && "Very Good"}
              {displayRating === 5 && "Excellent"}
            </Typography>

            {/* Notes TextField */}
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Tell us more about your experience (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "#f8f8f8",
                  "& fieldset": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover fieldset": {
                    borderColor: "#2d5a3d",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#2d5a3d",
                  },
                },
              }}
            />

            {/* Submit Button */}
            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              sx={{
                bgcolor: "#2d5a3d",
                color: "#fff",
                py: 1.5,
                borderRadius: "12px",
                fontSize: "18px",
                fontWeight: 600,
                textTransform: "none",
                mb: 2,
                "&:hover": {
                  bgcolor: "#1e3d2a",
                },
                "&:disabled": {
                  bgcolor: "#ccc",
                  color: "#fff",
                },
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>

            {/* Skip Button */}
            <Button
              fullWidth
              variant="text"
              onClick={handleSkip}
              sx={{
                color: "#666",
                fontSize: "16px",
                textTransform: "none",
                "&:hover": {
                  bgcolor: "transparent",
                  color: "#333",
                },
              }}
            >
              Skip for now
            </Button>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default FeedbackDialog;
