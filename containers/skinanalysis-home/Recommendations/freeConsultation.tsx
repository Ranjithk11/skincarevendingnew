"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Modal,
  Fade,
  TextField,
} from "@mui/material";
import { MuiTelInput } from "mui-tel-input";
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
import {
  shouldAcceptPhoneValue,
  validatePhone,
} from "@/utils/phoneValidation";

interface FreeConsultationProps {
  /** Pre-filled session user info (optional). */
  user?: ConsultationUserInfo;
  open?: boolean;
  onClose?: () => void;
}

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

const fieldSx = {
  mb: 2,
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    bgcolor: "rgba(255,255,255,0.85)",
    fontSize: 18,
    "& fieldset": { borderColor: `${COLORS.outlineVariant}88` },
    "&:hover fieldset": { borderColor: COLORS.primary },
    "&.Mui-focused fieldset": { borderColor: COLORS.primary },
  },
  "& .MuiInputLabel-root": {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
  },
};

export default function FreeConsultation({
  user,
  open = false,
  onClose,
}: FreeConsultationProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("IN");
  const [callingCode, setCallingCode] = useState("91");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const machineRef = useRef<{ machineName?: string; machineLocation?: string }>({});

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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setName(user?.name?.trim() || "");
    setPhone(user?.phone?.trim() || "");
    setNameError("");
    setPhoneError("");
    setSubmitted(false);
    setSubmitting(false);
  }, [open, user?.name, user?.phone]);

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleRequest = async () => {
    if (submitting || submitted) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    let valid = true;

    if (!trimmedName) {
      setNameError("Please enter your name");
      valid = false;
    } else {
      setNameError("");
    }

    const phoneValidationError = validatePhone(trimmedPhone, country, callingCode);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      valid = false;
    } else {
      setPhoneError("");
    }

    if (!valid) return;

    setSubmitting(true);

    await sendConsultationWebhook({
      user: {
        userId: user?.userId,
        name: trimmedName,
        email: user?.email,
        phone: trimmedPhone,
      },
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
    setTimeout(() => onClose?.(), 4500);
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
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,108,73,0.20), transparent)",
              }}
            />
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
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: COLORS.onPrimaryFixedVariant,
                    }}
                  >
                    LIMITED-TIME OFFER
                  </Typography>
                </Box>

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

                <Typography
                  sx={{
                    fontSize: { xs: 24, sm: 24 },
                    color: COLORS.onSurfaceVariant,
                    lineHeight: 1.6,
                    maxWidth: 460,
                    mb: { xs: 3, md: 4 },
                  }}
                >
                  Share your details and speak with our experts{" "}
                  <Box component="span" sx={{ fontWeight: 600, color: COLORS.primary }}>
                    one-on-one
                  </Box>{" "}
                  to build a routine that works for your skin.
                </Typography>

                <TextField
                  fullWidth
                  label="Full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  error={Boolean(nameError)}
                  helperText={nameError}
                  disabled={submitting}
                  sx={fieldSx}
                />

                <MuiTelInput
                  fullWidth
                  defaultCountry="IN"
                  forceCallingCode
                  value={phone}
                  onChange={(value, info) => {
                    const nationalNumber = info.nationalNumber || "";
                    const countryCode = info.countryCallingCode || "";
                    const iso2 = (info as { countryCode?: string }).countryCode;
                    const nextCountry =
                      typeof iso2 === "string" && iso2 ? iso2 : country;

                    if (nextCountry !== country) {
                      setCountry(nextCountry);
                    }
                    if (countryCode && countryCode !== callingCode) {
                      setCallingCode(countryCode);
                    }

                    if (
                      !shouldAcceptPhoneValue(
                        nationalNumber,
                        nextCountry,
                        countryCode
                      )
                    ) {
                      return;
                    }

                    setPhone(value);
                    if (phoneError) setPhoneError("");
                  }}
                  error={Boolean(phoneError)}
                  helperText={phoneError}
                  disabled={submitting}
                  sx={fieldSx}
                />

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
                  {submitting ? "Submitting..." : "Claim Free Consultation"}
                  <ArrowForwardRoundedIcon />
                </Button>

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
