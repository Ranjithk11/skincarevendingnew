"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, IconButton, Modal, Fade } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import {
  sendConsultationWebhook,
  type ConsultationUserInfo,
} from "@/utils/webhook";

interface ConsultationPopUpProps {
  /** User info captured during the session. */
  user?: ConsultationUserInfo;
  /** Detected skin attribute codes / labels from the AI analysis. */
  detectedAttributes?: unknown;
  /** Prioritised key concerns from the report. */
  keyConcerns?: unknown;
  /** Per-metric skin scores. */
  skinMetrics?: unknown;
  /** Resolved skin type (e.g. OILY_SKIN). */
  skinType?: string | null;
  /** Overall skin health score / rating shown to the user. */
  overallScore?: number | string | null;
  overallRating?: string | null;
  /** Clickable public report URL. */
  resultUrl?: string;
  /** Delay in milliseconds before the popup appears. Defaults to 20000ms. */
  delayMs?: number;
}

// Design tokens (from approved 2026 mockup)
const COLORS = {
  primary: "#006c49",
  primaryContainer: "#10b981",
  onPrimaryContainer: "#00422b",
  onPrimaryFixedVariant: "#005236",
  mintMist: "#ECFDF5",
  onSurface: "#121c2a",
  onSurfaceVariant: "#3c4a42",
  surfaceContainerLow: "#eff3ff",
  outlineVariant: "#bbcabf",
};

const TRUST_BADGES = [
  { icon: PaymentsRoundedIcon, label: "No cost" },
  { icon: VerifiedUserRoundedIcon, label: "No obligation" },
  { icon: WorkspacePremiumRoundedIcon, label: "Expert advice" },
];

export default function ConsultationPopUp({
  user,
  detectedAttributes,
  keyConcerns,
  skinMetrics,
  skinType,
  overallScore,
  overallRating,
  resultUrl,
  delayMs = 20000,
}: ConsultationPopUpProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const machineRef = useRef<{ machineName?: string; machineLocation?: string }>({});

  // Fetch machine settings once so the lead carries the correct location.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/machine-name")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        machineRef.current = {
          machineName: data.machineName,
          machineLocation: data.machineLocation,
        };
      })
      .catch(() => {
        // ignore — fallbacks handled in webhook
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Show after the configured delay (once per mount).
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
  };

  const handleRequest = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);

    await sendConsultationWebhook({
      user,
      detectedAttributes,
      keyConcerns,
      skinMetrics,
      skinType,
      overallScore,
      overallRating,
      resultUrl,
      machineName:
        machineRef.current.machineName ||
        process.env.NEXT_PUBLIC_MACHINE_NAME ||
        "Vending Machine",
      machineLocation:
        machineRef.current.machineLocation ||
        process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
        "LeafWater Vending Machine",
    });

    setSubmitting(false);
    setSubmitted(true);

    // Auto-dismiss shortly after the confirmation.
    setTimeout(() => setOpen(false), 4500);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        backdropFilter: "blur(20px)",
        backgroundColor: "rgba(18, 28, 42, 0.30)",
      }}
    >
      <Fade in={open} timeout={450}>
        <Box
          sx={{
            position: "relative",
            width: "min(960px, 95vw)",
            minHeight: 540,
            display: "flex",
            flexDirection: "row",
            borderRadius: "32px",
            overflow: "hidden",
            backdropFilter: "blur(24px)",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)",
            border: "0.5px solid rgba(255,255,255,0.4)",
            boxShadow: "0 20px 50px -10px rgba(0,108,73,0.18)",
            outline: "none",
          }}
        >
          {/* Close button */}
          <IconButton
            onClick={handleClose}
            disabled={submitting}
            aria-label="Close"
            sx={{
              position: "absolute",
              top: 24,
              right: 24,
              zIndex: 20,
              width: 40,
              height: 40,
              color: COLORS.onSurface,
              bgcolor: "rgba(255,255,255,0.4)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.85)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Left column: image */}
          <Box
            sx={{
              position: "relative",
              width: "45%",
              minHeight: "auto",
              bgcolor: COLORS.surfaceContainerLow,
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src="/popupModel/screen.png"
              alt="Skincare Consultant"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {/* Subtle overlay gradient */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,108,73,0.20), transparent)",
              }}
            />
            {/* Certified badge */}
            <Box
              sx={{
                position: "absolute",
                bottom: 32,
                left: 32,
                right: 32,
                px: 2.5,
                py: 1.5,
                borderRadius: "9999px",
                textAlign: "center",
                backdropFilter: "blur(24px)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)",
                border: "0.5px solid rgba(255,255,255,0.4)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  color: COLORS.onSurface,
                  fontWeight: 600,
                  fontSize: { xs: 12, sm: 13 },
                  letterSpacing: "0.08em",
                }}
              >
                <VerifiedRoundedIcon sx={{ fontSize: 18, color: COLORS.primary }} />
                CERTIFIED CLINICAL EXPERT
              </Box>
            </Box>
          </Box>

          {/* Right column: content */}
          <Box
            sx={{
              position: "relative",
              width: "55%",
              p: { xs: 3, sm: 5, md: 7 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.2)",
            }}
          >
            {/* Atmospheric glow */}
            <Box
              sx={{
                position: "absolute",
                top: -96,
                right: -96,
                width: 288,
                height: 288,
                borderRadius: "50%",
                background: "rgba(0,108,73,0.05)",
                filter: "blur(100px)",
                pointerEvents: "none",
              }}
            />

            {!submitted ? (
              <>
                {/* Limited-time pill */}
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    alignSelf: "flex-start",
                    px: 2,
                    py: 1,
                    mb: { xs: 3, md: 4 },
                    borderRadius: "9999px",
                    bgcolor: COLORS.mintMist,
                    border: "1px solid rgba(0,108,73,0.2)",
                  }}
                >
                  <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: COLORS.primary }} />
                  <Typography
                    sx={{
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: COLORS.onPrimaryFixedVariant,
                    }}
                  >
                    LIMITED-TIME OFFER
                  </Typography>
                </Box>

                {/* Headline */}
                <Typography
                  sx={{
                    fontSize: { xs: 32, sm: 40, md: 46 },
                    fontWeight: 800,
                    color: COLORS.onSurface,
                    lineHeight: 1.1,
                    letterSpacing: "-0.01em",
                    mb: 3,
                  }}
                >
                  Get a <span style={{ color: COLORS.primary }}>FREE</span> skin consultation
                </Typography>

                {/* Description */}
                <Typography
                  sx={{
                    fontSize: { xs: 24, sm: 24 },
                    color: COLORS.onSurfaceVariant,
                    lineHeight: 1.6,
                    maxWidth: 460,
                    mb: { xs: 4, md: 5 },
                  }}
                >
                  Your personalised analysis is complete. Speak with our experts{" "}
                  <Box component="span" sx={{ fontWeight: 600, color: COLORS.primary }}>
                    one-on-one
                  </Box>{" "}
                  to build a routine that actually works for your skin type.
                </Typography>

                {/* CTA */}
                <Button
                  onClick={handleRequest}
                  disabled={submitting}
                  sx={{
                    width: "100%",
                    py: 4,
                    px: 5,
                    mb: { xs: 4, md: 5 },
                    textTransform: "none",
                    fontSize: { xs: 18, sm: 20 },
                    fontWeight: 600,
                    color: COLORS.onPrimaryContainer,
                    bgcolor: COLORS.primaryContainer,
                    borderRadius: "9999px",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 20px -5px rgba(16,185,129,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.5,
                    "&:hover": { filter: "brightness(1.1)", bgcolor: COLORS.primaryContainer },
                    "&:active": { transform: "scale(0.98)" },
                    "&.Mui-disabled": { color: "rgba(0,66,43,0.6)" },
                  }}
                >
                  {submitting ? "Requesting..." : "Claim Free Consultation"}
                  <ArrowForwardRoundedIcon />
                </Button>

                {/* Trust badges */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: { xs: 3, sm: 4 },
                    pt: { xs: 3, md: 4 },
                    borderTop: `1px solid ${COLORS.outlineVariant}55`,
                    color: COLORS.onSurfaceVariant,
                  }}
                >
                  {TRUST_BADGES.map(({ icon: Icon, label }) => (
                    <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Icon sx={{ fontSize: 20, color: `${COLORS.primary}b3` }} />
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <CheckCircleRoundedIcon
                  sx={{ fontSize: 84, color: COLORS.primary, mb: 2.5 }}
                />
                <Typography
                  sx={{
                    fontSize: { xs: 28, sm: 36 },
                    fontWeight: 800,
                    color: COLORS.onSurface,
                    mb: 2,
                  }}
                >
                  Thank you!
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: 24, sm: 24 },
                    color: COLORS.onSurfaceVariant,
                    lineHeight: 1.6,
                    maxWidth: 420,
                    mx: "auto",
                  }}
                >
                  Our team will get back to you shortly to schedule your free
                  consultation.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
}
