"use client";

import { Button } from "@mui/material";
import { SCAN_CONSENT_FOREST } from "./scanConsentTheme";

type Props = {
  disabled?: boolean;
  onSkip: () => void;
};

export default function ScanConsentSkipButton({ disabled, onSkip }: Props) {
  return (
    <Button
      fullWidth
      variant="outlined"
      disabled={disabled}
      onClick={onSkip}
      sx={{
        textTransform: "none",
        fontSize: 20,
        fontWeight: 700,
        minHeight: 64,
        borderRadius: "16px",
        borderColor: SCAN_CONSENT_FOREST,
        color: SCAN_CONSENT_FOREST,
        "&:hover": {
          borderColor: SCAN_CONSENT_FOREST,
          bgcolor: "rgba(47, 93, 70, 0.06)",
        },
      }}
    >
      Skip scan and shop
    </Button>
  );
}
