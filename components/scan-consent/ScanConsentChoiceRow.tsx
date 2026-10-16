"use client";

import { Box, Typography } from "@mui/material";
import {
  SCAN_CONSENT_FOREST,
  SCAN_CONSENT_GOLD,
  SCAN_CONSENT_INK,
} from "./scanConsentTheme";

type Props = {
  checked: boolean;
  onToggle: () => void;
  title: string;
  description: string;
  required?: boolean;
};

export default function ScanConsentChoiceRow({
  checked,
  onToggle,
  title,
  description,
  required = false,
}: Props) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.75,
        width: "100%",
        textAlign: "left",
        px: 2,
        py: 2,
        minHeight: 88,
        borderRadius: "18px",
        border: checked
          ? `1.5px solid ${SCAN_CONSENT_FOREST}`
          : "1.5px solid rgba(47, 93, 70, 0.18)",
        bgcolor: checked ? "rgba(47, 93, 70, 0.06)" : "#fff",
        cursor: "pointer",
        boxShadow: checked ? "0 8px 20px rgba(47, 93, 70, 0.08)" : "none",
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          mt: 0.25,
          flexShrink: 0,
          borderRadius: "8px",
          border: checked
            ? `2px solid ${SCAN_CONSENT_FOREST}`
            : "2px solid #c7c2b6",
          bgcolor: checked ? SCAN_CONSENT_FOREST : "#fff",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        {checked ? "✓" : ""}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: SCAN_CONSENT_INK, lineHeight: 1.3 }}>
          {title}
          {required ? (
            <Box component="span" sx={{ color: SCAN_CONSENT_GOLD, ml: 0.75, fontSize: 14 }}>
              {" "}Required
            </Box>
          ) : (
            <Box component="span" sx={{ color: "#8a8174", ml: 0.75, fontSize: 14 }}>
              {" "}Optional
            </Box>
          )}
        </Typography>
        <Typography sx={{ fontSize: 16, color: "#5c5346", mt: 0.6, lineHeight: 1.4 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
