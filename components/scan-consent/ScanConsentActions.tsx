"use client";

import { Stack } from "@mui/material";
import ScanConsentStartButton from "./ScanConsentStartButton";
import ScanConsentSkipButton from "./ScanConsentSkipButton";

type Props = {
  canStart: boolean;
  busy: boolean;
  onStart: () => void;
  onSkip: () => void;
};

export default function ScanConsentActions({
  canStart,
  busy,
  onStart,
  onSkip,
}: Props) {
  return (
    <Stack spacing={1.25} sx={{ width: "100%" }}>
      <ScanConsentStartButton disabled={!canStart} busy={busy} onStart={onStart} />
      <ScanConsentSkipButton disabled={busy} onSkip={onSkip} />
    </Stack>
  );
}
