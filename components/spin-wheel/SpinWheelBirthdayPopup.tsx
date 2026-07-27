"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Modal,
  Fade,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { MuiTelInput } from "mui-tel-input";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import {
  sendBirthdayOfferWebhook,
  type BirthdayOfferUserInfo,
} from "@/utils/webhook";
import {
  extractNationalDigits,
  shouldAcceptPhoneValue,
  validatePhone,
  wouldNationalDigitsBeTooLong,
} from "@/utils/phoneValidation";
import type { SpinWheelReward } from "@/lib/spin-wheel/rewards";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";

type ActiveField = "name" | "phone" | "dob";

interface SpinWheelBirthdayPopupProps {
  open: boolean;
  onClose: () => void;
  /** Called after the user successfully claims the offer. */
  onClaimed?: () => void;
  user?: BirthdayOfferUserInfo;
  reward?: SpinWheelReward | null;
}

const COLORS = {
  primary: "#9E1B3D",
  primaryContainer: "#F9C6D1",
  onPrimaryContainer: "#7C2340",
  onPrimaryFixedVariant: "#9E1B3D",
  softBg: "#FFF5F7",
  onSurface: "#121c2a",
  onSurfaceVariant: "#3c4a42",
  surfaceContainerLow: "#fdf2f8",
  outlineVariant: "#e8b4c4",
};

const TRUST_BADGES = [
  { icon: LocalOfferRoundedIcon, label: "Extra 15% off" },
  { icon: CardGiftcardRoundedIcon, label: "Birthday special" },
  { icon: CelebrationRoundedIcon, label: "One-time reward" },
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

export default function SpinWheelBirthdayPopup({
  open,
  onClose,
  onClaimed,
  user,
  reward,
}: SpinWheelBirthdayPopupProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("IN");
  const [callingCode, setCallingCode] = useState("91");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [dobError, setDobError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>("name");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
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
    setDateOfBirth(user?.dateOfBirth?.trim() || "");
    setNameError("");
    setPhoneError("");
    setDobError("");
    setSubmitted(false);
    setSubmitting(false);
    setActiveField("name");
    setConfirmCloseOpen(false);
  }, [open, user?.name, user?.phone, user?.dateOfBirth]);

  const requestClose = () => {
    if (submitting) return;
    if (submitted) {
      onClose();
      return;
    }
    // Always confirm before discarding an unclaimed birthday offer.
    setConfirmCloseOpen(true);
  };

  const confirmDiscard = () => {
    setConfirmCloseOpen(false);
    onClose();
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === "shift" || key === "123" || key === "ABC") return;

      if (key === "return") {
        if (activeField === "name") setActiveField("phone");
        else if (activeField === "phone") setActiveField("dob");
        return;
      }
      if (key === "arrowleft" || key === "arrowright") return;

      if (activeField === "name") {
        if (key === "backspace") {
          setName((prev) => prev.slice(0, -1));
          return;
        }
        if (key === "space") {
          setName((prev) => `${prev} `);
          return;
        }
        if (!/^[a-zA-Z]$/.test(key)) return;
        setName((prev) => `${prev}${key}`);
        if (nameError) setNameError("");
        return;
      }

      if (activeField === "phone") {
        if (key === "backspace") {
          const code = String(callingCode || "91").replace(/\D/g, "") || "91";
          const national = extractNationalDigits(phone, code).slice(0, -1);
          setPhone(national ? `+${code} ${national}` : `+${code}`);
          return;
        }
        if (!/^[0-9]$/.test(key)) return;
        const code = String(callingCode || "91").replace(/\D/g, "") || "91";
        if (wouldNationalDigitsBeTooLong(phone, country, code, key)) return;
        const national = extractNationalDigits(phone, code);
        setPhone(`+${code} ${national}${key}`);
        if (phoneError) setPhoneError("");
        return;
      }

      if (key === "backspace") {
        setDateOfBirth((prev) => prev.slice(0, -1));
        return;
      }
      if (key === "space") return;
      if (!/^[0-9./-]$/.test(key)) return;
      setDateOfBirth((prev) => {
        if (prev.length >= 10) return prev;
        return `${prev}${key === "/" || key === "." ? "-" : key}`;
      });
      if (dobError) setDobError("");
    },
    [activeField, callingCode, country, dobError, nameError, phone, phoneError]
  );

  const handleRequest = async () => {
    if (submitting || submitted) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedDob = dateOfBirth.trim();
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

    if (!trimmedDob) {
      setDobError("Please enter your date of birth");
      valid = false;
    } else {
      const dobDate = new Date(trimmedDob);
      const today = new Date();
      if (Number.isNaN(dobDate.getTime()) || dobDate > today) {
        setDobError("Please enter a valid date of birth");
        valid = false;
      } else {
        setDobError("");
      }
    }

    if (!valid) return;

    setSubmitting(true);

    await sendBirthdayOfferWebhook({
      user: {
        userId: user?.userId,
        name: trimmedName,
        phone: trimmedPhone,
        email: user?.email,
        dateOfBirth: trimmedDob,
      },
      spinWheel: reward
        ? {
            couponCode: reward.code,
            rewardType: reward.type,
            title: reward.title,
            segmentId: reward.segmentId,
          }
        : undefined,
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
    onClaimed?.();
    setTimeout(() => onClose(), 3500);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") {
            requestClose();
          }
        }}
        closeAfterTransition
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          pb: !submitted ? "340px" : 2,
          zIndex: 1400,
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
              maxHeight: !submitted ? "calc(100dvh - 360px)" : "90dvh",
              display: "flex",
              flexDirection: "row",
              borderRadius: "32px",
              overflow: "hidden",
              backdropFilter: "blur(24px)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)",
              border: "0.5px solid rgba(255,255,255,0.4)",
              boxShadow: "0 20px 50px -10px rgba(158,27,61,0.18)",
              outline: "none",
            }}
          >
            <IconButton
              onClick={requestClose}
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
                alt="Birthday offer"
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
                  background: "linear-gradient(to top, rgba(158,27,61,0.25), transparent)",
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
                  BIRTHDAY SPECIAL REWARD
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                position: "relative",
                width: "55%",
                p: { xs: 3, sm: 5, md: 7 },
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                bgcolor: "rgba(255,255,255,0.2)",
              }}
            >
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
                      bgcolor: COLORS.softBg,
                      border: "1px solid rgba(158,27,61,0.2)",
                    }}
                  >
                    <CakeRoundedIcon sx={{ fontSize: 18, color: COLORS.primary }} />
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: COLORS.onPrimaryFixedVariant,
                      }}
                    >
                      SPIN WHEEL BIRTHDAY OFFER
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: { xs: 30, sm: 38, md: 42 },
                      fontWeight: 800,
                      color: COLORS.onSurface,
                      lineHeight: 1.1,
                      letterSpacing: "-0.01em",
                      mb: 3,
                    }}
                  >
                    Unlock your{" "}
                    <span style={{ color: COLORS.primary }}>extra 15% OFF</span>
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: { xs: 18, sm: 20 },
                      color: COLORS.onSurfaceVariant,
                      lineHeight: 1.6,
                      maxWidth: 460,
                      mb: { xs: 3, md: 4 },
                    }}
                  >
                    Share your name, phone number, and date of birth to claim your
                    birthday reward.
                  </Typography>

                  <TextField
                    fullWidth
                    label="Full name"
                    value={name}
                    onFocus={() => setActiveField("name")}
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
                    onFocus={() => setActiveField("phone")}
                    onChange={(value, info) => {
                      const nationalNumber = info.nationalNumber || "";
                      const countryCode = info.countryCallingCode || "";
                      const iso2 = (info as { countryCode?: string }).countryCode;
                      const nextCountry =
                        typeof iso2 === "string" && iso2 ? iso2 : country;

                      if (nextCountry !== country) setCountry(nextCountry);
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

                  <TextField
                    fullWidth
                    label="Date of birth"
                    type="date"
                    value={dateOfBirth}
                    onFocus={() => setActiveField("dob")}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      if (dobError) setDobError("");
                    }}
                    error={Boolean(dobError)}
                    helperText={dobError}
                    disabled={submitting}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: new Date().toISOString().slice(0, 10) }}
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
                      color: "#fff",
                      bgcolor: COLORS.primary,
                      borderRadius: "9999px",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 20px -5px rgba(158,27,61,0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      "&:hover": { filter: "brightness(1.08)", bgcolor: COLORS.primary },
                      "&:active": { transform: "scale(0.98)" },
                      "&.Mui-disabled": { color: "rgba(255,255,255,0.7)" },
                    }}
                  >
                    {submitting ? "Submitting..." : "Claim Birthday Offer"}
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
                        <Typography sx={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.04em" }}>
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
                    Birthday offer claimed!
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: 20, sm: 22 },
                      color: COLORS.onSurfaceVariant,
                      lineHeight: 1.6,
                      maxWidth: 420,
                      mx: "auto",
                    }}
                  >
                    Your extra 15% birthday discount is saved. It applies on your
                    birthday only ? not on this purchase.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>

      {open && !submitted && !confirmCloseOpen ? (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1500,
          }}
        >
          <VirtualKeyboard
            onKeyPress={handleKeyPress}
            layout={activeField === "name" ? "default" : "numeric"}
            visible
            skipApplyToActiveElement
          />
        </Box>
      ) : null}

      <Dialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        sx={{ zIndex: 1700 }}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 440 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 22, color: COLORS.onSurface }}>
          Are you sure you don&apos;t need this offer?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 17, color: COLORS.onSurfaceVariant, lineHeight: 1.5 }}>
            You haven&apos;t claimed this birthday reward yet. Close now and you may
            miss the extra 15% birthday discount.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setConfirmCloseOpen(false)}
            sx={{ textTransform: "none", fontWeight: 700, fontSize: 16, color: COLORS.primary }}
          >
            Keep offer
          </Button>
          <Button
            variant="contained"
            onClick={confirmDiscard}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 16,
              bgcolor: COLORS.primary,
              "&:hover": { bgcolor: COLORS.primary },
            }}
          >
            Yes, close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
