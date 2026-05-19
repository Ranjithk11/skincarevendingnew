"use client";

import React, { RefObject } from "react";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";

interface FeedbackRatingProps {
  rating: number;
  displayRating: number;
  notes: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  isKeyboardOpen: boolean;
  textFieldRef: RefObject<HTMLDivElement>;
  onStarClick: (star: number) => void;
  onStarHover: (star: number) => void;
  onStarLeave: () => void;
  onNotesChange: (value: string) => void;
  onNotesFocus: () => void;
  onNotesClick: () => void;
  onSubmit: () => void;
}

export default function FeedbackRating({
  rating,
  displayRating,
  notes,
  isSubmitting,
  canSubmit,
  isKeyboardOpen,
  textFieldRef,
  onStarClick,
  onStarHover,
  onStarLeave,
  onNotesChange,
  onNotesFocus,
  onNotesClick,
  onSubmit,
}: FeedbackRatingProps) {
  return (
    <Box
      sx={{
        width: "min(860px, 100%)",
        mt: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontSize: 24, fontWeight: 700, pb: 0.5 }}>Quick Favour?</Typography>
      <Typography sx={{ fontSize: 24, color: "#374151" }}>
        Kindly rate your experience with us so far.
      </Typography>

      <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconButton
            key={star}
            onClick={() => onStarClick(star)}
            onMouseEnter={() => onStarHover(star)}
            onMouseLeave={onStarLeave}
            sx={{ p: 0.25, bgcolor: "transparent" }}
          >
            <Box
              component="span"
              sx={{
                fontSize: 40,
                lineHeight: 1,
                color: star <= displayRating ? "#f59e0b" : "#cfcfcf",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {star <= displayRating ? "\u2605" : "\u2606"}
            </Box>
          </IconButton>
        ))}
      </Box>

      <Box sx={{ width: "min(520px, 100%)", mt: 1, pb: isKeyboardOpen ? "320px" : 0 }} ref={textFieldRef}>
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Tell us more (optional)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onFocus={onNotesFocus}
          onClick={onNotesClick}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              bgcolor: "#ffffff",
              fontSize: 24,
              "& textarea": { fontSize: 24 },
              "& textarea::placeholder": { fontSize: 24, opacity: 0.8 },
              "& fieldset": { borderColor: "#d1d5db" },
              "&:hover fieldset": { borderColor: "#9ca3af" },
              "&.Mui-focused fieldset": { borderColor: "#9ca3af" },
            },
          }}
        />
        <Button
          fullWidth
          variant="contained"
          onClick={onSubmit}
          disabled={!canSubmit}
          sx={{
            mt: 1.5,
            bgcolor: "#1a3c34",
            color: "#fff",
            py: 1,
            borderRadius: "12px",
            fontSize: 24,
            fontWeight: 700,
            textTransform: "none",
            "&:hover": { bgcolor: "#16362c" },
            "&:disabled": { bgcolor: "#d1d5db", color: "#ffffff" },
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </Box>
    </Box>
  );
}
