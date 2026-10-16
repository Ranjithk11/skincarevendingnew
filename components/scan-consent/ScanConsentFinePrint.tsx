"use client";

import { Typography } from "@mui/material";
import Link from "next/link";
import { SCAN_CONSENT_FOREST, SCAN_CONSENT_MUTED } from "./scanConsentTheme";

export default function ScanConsentFinePrint() {
  return (
    <Typography sx={{ fontSize: 14, color: SCAN_CONSENT_MUTED, textAlign: "center", lineHeight: 1.5 }}>
      You can skip the scan and still shop. We do not process a photo unless a
      face is clearly visible and you have agreed. Read our{" "}
      <Link href="/privacyPolicy" style={{ color: SCAN_CONSENT_FOREST, fontWeight: 700 }}>
        Privacy Policy
      </Link>
      .
    </Typography>
  );
}
