"use client";

import { Button } from "@mui/material";
import { SCAN_CONSENT_FOREST, SCAN_CONSENT_FOREST_DARK } from "./scanConsentTheme";

type Props = {
  disabled: boolean;
  busy: boolean;
  onStart: () => void;
};

export default function ScanConsentStartButton({ disabled, busy, onStart }: Props) {
  return (
    <Button
      fullWidth
      variant="contained"
      disabled={disabled || busy}
      onClick={onStart}
      sx={{
        textTransform: "none",
        fontSize: 22,
        fontWeight: 700,
        minHeight: 72,
        borderRadius: "16px",
        bgcolor: SCAN_CONSENT_FOREST,
        boxShadow: "0 8px 18px rgba(47, 93, 70, 0.28)",
        "&:hover": { bgcolor: SCAN_CONSENT_FOREST_DARK },
        "&.Mui-disabled": {
          bgcolor: "#d7d2c8",
          color: "#8a8174",
        },
      }}
    >
      {busy ? "Saving your choice…" : "Start the scan"}
    </Button>
  );
}
