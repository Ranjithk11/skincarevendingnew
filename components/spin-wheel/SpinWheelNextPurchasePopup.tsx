"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
} from "@mui/material";
import { MuiTelInput } from "mui-tel-input";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
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

type ActiveField = "name" | "phone";

interface SpinWheelNextPurchasePopupProps {
  open: boolean;
  onClose: () => void;
  onClaimed?: () => void;
  user?: BirthdayOfferUserInfo;
  reward?: SpinWheelReward | null;
}

/** Same design tokens / layout as consultationPopUp.tsx */
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
  { icon: SavingsRoundedIcon, label: "₹100 OFF" },
  { icon: EventAvailableRoundedIcon, label: "Next visit only" },
  { icon: ShoppingBagRoundedIcon, label: "Above ₹1,000" },
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

/**
 * ₹100 next-purchase claim popup — portal overlay (not MUI Modal) so it always
 * paints above checkout / spin-wheel UI. Collects name + phone and posts webhook.
 */
export default function SpinWheelNextPurchasePopup({
  open,
  onClose,
  onClaimed,
  user,
  reward,
}: SpinWheelNextPurchasePopupProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("IN");
  const [callingCode, setCallingCode] = useState("91");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>("name");
  const machineRef = useRef<{ machineName?: string; machineLocation?: string }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

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
    setActiveField("name");
  }, [open, user?.name, user?.phone]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === "shift" || key === "123" || key === "ABC") return;
      if (key === "return") {
        if (activeField === "name") setActiveField("phone");
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
    },
    [activeField, callingCode, country, nameError, phone, phoneError]
  );

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

    await sendBirthdayOfferWebhook({
      event: "next_purchase_offer_lead",
      user: {
        userId: user?.userId,
        name: trimmedName,
        phone: trimmedPhone,
        email: user?.email,
      },
      spinWheel: reward
        ? {
            couponCode: reward.code,
            rewardType: reward.type,
            title: reward.title,
            description: reward.description,
            segmentId: reward.segmentId,
            appliesToCart: false,
            wonAt: reward.wonAt,
          }
        : {
            couponCode: "SPIN-OFF100",
            rewardType: "FLAT_100",
            title: "₹100 OFF ON NEXT PURCHASE",
            description:
              "Get ₹100 off on your next purchase above ₹1,000. Share your details — this offer is for your next visit only and is not applied to the current purchase.",
            segmentId: "flat_100",
            appliesToCart: false,
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
    onClaimed?.();
    setTimeout(() => onClose(), 3500);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <Box
      role="dialog"
      aria-modal="true"
      aria-label="Claim ₹100 next purchase offer"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 1.5, sm: 2 },
        pb: { xs: submitted ? 2 : "300px", md: submitted ? 2 : "340px" },
        bgcolor: "rgba(18, 28, 42, 0.55)",
        backdropFilter: "blur(20px)",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "min(960px, 95vw)",
          maxHeight: {
            xs: submitted ? "88dvh" : "calc(100dvh - 300px)",
            md: submitted ? "90dvh" : "calc(100dvh - 360px)",
          },
          display: "flex",
          flexDirection: "row",
          borderRadius: "32px",
          overflow: "auto",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)",
          border: "0.5px solid rgba(255,255,255,0.4)",
          boxShadow: "0 20px 50px -10px rgba(0,108,73,0.28)",
          outline: "none",
        }}
      >
        <IconButton
          onClick={handleClose}
          disabled={submitting}
          aria-label="Close"
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 30,
            width: 48,
            height: 48,
            color: COLORS.onSurface,
            bgcolor: "rgba(255,255,255,0.92)",
            border: `1px solid ${COLORS.outlineVariant}`,
            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            "&:hover": { bgcolor: "#fff" },
          }}
        >
          <CloseIcon sx={{ fontSize: 24 }} />
        </IconButton>

        <Box
          sx={{
            position: "relative",
            width: "45%",
            minHeight: "auto",
            bgcolor: COLORS.surfaceContainerLow,
            overflow: "hidden",
            display: { xs: "none", md: "block" },
          }}
        >
          <Box
            component="img"
            src="/popupModel/screen.png"
            alt="₹100 next purchase offer"
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
              NEXT PURCHASE REWARD
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            position: "relative",
            width: { xs: "100%", md: "55%" },
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
                  bgcolor: COLORS.mintMist,
                  border: "1px solid rgba(0,108,73,0.2)",
                }}
              >
                <LocalOfferRoundedIcon sx={{ fontSize: 18, color: COLORS.primary }} />
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: COLORS.onPrimaryFixedVariant,
                  }}
                >
                  SPIN WHEEL REWARD
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
                Claim your <span style={{ color: COLORS.primary }}>₹100 OFF</span>
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: 20, sm: 22 },
                  color: COLORS.onSurfaceVariant,
                  lineHeight: 1.55,
                  maxWidth: 460,
                  mb: { xs: 3, md: 4 },
                }}
              >
                Enter your name and phone number to save this offer for your{" "}
                <Box component="span" sx={{ fontWeight: 600, color: COLORS.primary }}>
                  next purchase
                </Box>{" "}
                above ₹1,000 — not this cart.
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
                    !shouldAcceptPhoneValue(nationalNumber, nextCountry, countryCode)
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
                  "&:hover": {
                    filter: "brightness(1.1)",
                    bgcolor: COLORS.primaryContainer,
                  },
                  "&:active": { transform: "scale(0.98)" },
                  "&.Mui-disabled": { color: "rgba(0,66,43,0.6)" },
                }}
              >
                {submitting ? "Submitting..." : "Claim ₹100 Next Visit Offer"}
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
                      sx={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.04em" }}
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
                Offer claimed!
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
                Your ₹100 OFF is saved for your next purchase above ₹1,000 — not
                applied to this cart.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {!submitted ? (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100000,
          }}
        >
          <VirtualKeyboard
            onKeyPress={handleKeyPress}
            layout={activeField === "phone" ? "numeric" : "default"}
            visible
            skipApplyToActiveElement
          />
        </Box>
      ) : null}
    </Box>,
    document.body
  );
}
