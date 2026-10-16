"use client";

import { IconButton } from "@mui/material";

type Props = {
  onBack: () => void;
};

export default function ScanConsentBackButton({ onBack }: Props) {
  return (
    <IconButton
      onClick={onBack}
      aria-label="Go back"
      sx={{ color: "#1a1a1a", width: 64, height: 64 }}
    >
      <img src="/images/back.svg" alt="" />
    </IconButton>
  );
}
