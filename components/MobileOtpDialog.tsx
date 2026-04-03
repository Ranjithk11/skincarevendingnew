"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Typography, Dialog, IconButton, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { VirtualKeyboard } from "@/components/ui";
import { useSendOtpMutation, useVerifyOtpMutation } from "@/redux/api/authApi";

interface MobileOtpDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: (phoneNumber: string) => void;
  userId?: string;
}

type Step = "phone" | "otp";

const MobileOtpDialog: React.FC<MobileOtpDialogProps> = ({
  open,
  onClose,
  onVerified,
  userId,
}) => {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [activeField, setActiveField] = useState<"phone" | "otp">("phone");
  const [updating, setUpdating] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  const [sendOtp, { isLoading: isSendingOtp }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("phone");
      setPhone("");
      setOtp("");
      setError("");
      setActiveField("phone");
    }
  }, [open]);

  // Focus the right input when step changes
  useEffect(() => {
    if (step === "phone") {
      setTimeout(() => phoneRef.current?.focus(), 100);
    } else {
      setTimeout(() => otpRef.current?.focus(), 100);
    }
  }, [step, open]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === "shift" || key === "123" || key === "ABC") return;

      const currentField = activeField;
      const setter = currentField === "phone" ? setPhone : setOtp;
      const maxLen = currentField === "phone" ? 10 : 6;

      setter((prev) => {
        if (key === "backspace") return prev.slice(0, -1);
        if (key === "return" || key === "space") return prev;
        if (key === "arrowleft" || key === "arrowright") return prev;
        // Only digits
        if (!/^\d$/.test(key)) return prev;
        if (prev.length >= maxLen) return prev;
        return prev + key;
      });
    },
    [activeField]
  );

  const handleSendOtp = async () => {
    setError("");
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      const phoneWithCode = `+91${phone}`;
      const result: any = await sendOtp({
        input: phoneWithCode,
        inputType: "phoneNumber",
        action: "otpVerifyLogin",
      });

      if (result?.error) {
        setError(result?.error?.data?.message || "Failed to send OTP. Please try again.");
        return;
      }

      setStep("otp");
      setActiveField("otp");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (otp.length < 4) {
      setError("Please enter the OTP");
      return;
    }

    try {
      const phoneWithCode = `+91${phone}`;
      const result: any = await verifyOtp({
        input: phoneWithCode,
        action: "otpVerifyLogin",
        otp: Number(otp),
      });

      if (result?.error?.data?.status === "failure" || result?.error) {
        setError(result?.error?.data?.message || "Invalid OTP. Please try again.");
        return;
      }

      // OTP verified - now update mobile number on user profile
      if (userId) {
        setUpdating(true);
        try {
          await fetch("/api/user/update-mobile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              phoneNumber: phone,
              countryCode: "91",
            }),
          });
        } catch (e) {
          console.warn("[MobileOtpDialog] Failed to update mobile on backend:", e);
        }
        setUpdating(false);
      }

      onVerified(phone);
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtp("");
    try {
      const phoneWithCode = `+91${phone}`;
      const result: any = await sendOtp({
        input: phoneWithCode,
        inputType: "phoneNumber",
        action: "otpVerifyLogin",
      });
      if (result?.error) {
        setError("Failed to resend OTP");
      } else {
        setError("OTP resent successfully!");
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      setError("Failed to resend OTP");
    }
  };

  const isLoading = isSendingOtp || isVerifyingOtp || updating;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          overflow: "hidden",
          maxWidth: 500,
          mx: "auto",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
          bgcolor: "#2d5a3d",
        }}
      >
        <Typography sx={{ fontSize: "26px", fontWeight: 600, color: "#fff" }}>
          {step === "phone" ? "Enter Mobile Number" : "Verify OTP"}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 3, bgcolor: "#fff" }}>
        {step === "phone" ? (
          <>
            <Typography sx={{ fontSize: "22px", color: "#6b7280", mb: 2 }}>
              Enter your mobile number to view the report QR code
            </Typography>

            {/* Phone Input */}
            <Box
              onClick={() => {
                setActiveField("phone");
                phoneRef.current?.focus();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                border: "3px solid #2d5a3d",
                borderRadius: "12px",
                px: 2,
                py: 1.5,
                bgcolor: "#f9fafb",
                gap: 1,
              }}
            >
              <Typography sx={{ fontSize: "24px", color: "#374151", fontWeight: 500 }}>
                +91
              </Typography>
              <Box sx={{ width: "2px", height: 32, bgcolor: "#d1d5db" }} />
              <input
                ref={phoneRef}
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(val);
                }}
                onFocus={() => setActiveField("phone")}
                placeholder="Enter 10-digit number"
                type="tel"
                maxLength={10}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "26px",
                  fontFamily: "Roboto, sans-serif",
                  backgroundColor: "transparent",
                  letterSpacing: "2px",
                }}
              />
            </Box>
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: "22px", color: "#6b7280", mb: 1 }}>
              We sent a verification code to
            </Typography>
            <Typography sx={{ fontSize: "24px", fontWeight: 600, color: "#111827", mb: 2 }}>
              +91 {phone}
            </Typography>

            {/* OTP Input */}
            <Box
              onClick={() => {
                setActiveField("otp");
                otpRef.current?.focus();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                border: "3px solid #2d5a3d",
                borderRadius: "12px",
                px: 2,
                py: 1.5,
                bgcolor: "#f9fafb",
              }}
            >
              <input
                ref={otpRef}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(val);
                }}
                onFocus={() => setActiveField("otp")}
                placeholder="Enter OTP"
                type="tel"
                maxLength={6}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "32px",
                  fontFamily: "Roboto, sans-serif",
                  backgroundColor: "transparent",
                  letterSpacing: "12px",
                  textAlign: "center",
                }}
              />
            </Box>

            {/* Resend */}
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography
                onClick={!isSendingOtp ? handleResendOtp : undefined}
                sx={{
                  fontSize: "20px",
                  color: isSendingOtp ? "#9ca3af" : "#2d5a3d",
                  cursor: isSendingOtp ? "default" : "pointer",
                  fontWeight: 500,
                  textDecoration: "underline",
                  display: "inline",
                }}
              >
                Resend OTP
              </Typography>
            </Box>

            {/* Back button */}
            <Box sx={{ mt: 1, textAlign: "center" }}>
              <Typography
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                  setActiveField("phone");
                }}
                sx={{
                  fontSize: "18px",
                  color: "#6b7280",
                  cursor: "pointer",
                  display: "inline",
                }}
              >
                Change number
              </Typography>
            </Box>
          </>
        )}

        {/* Error */}
        {error && (
          <Typography
            sx={{
              mt: 2,
              fontSize: "20px",
              color: error.includes("resent") ? "#16a34a" : "#dc2626",
              textAlign: "center",
            }}
          >
            {error}
          </Typography>
        )}

        {/* Action Button */}
        <Box
          onClick={!isLoading ? (step === "phone" ? handleSendOtp : handleVerifyOtp) : undefined}
          sx={{
            mt: 3,
            py: 2,
            bgcolor: isLoading ? "#9ca3af" : "#2d5a3d",
            borderRadius: "12px",
            textAlign: "center",
            cursor: isLoading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          {isLoading && <CircularProgress size={22} sx={{ color: "#fff" }} />}
          <Typography sx={{ fontSize: "24px", fontWeight: 600, color: "#fff" }}>
            {step === "phone"
              ? isSendingOtp
                ? "Sending..."
                : "Send OTP"
              : isVerifyingOtp || updating
              ? "Verifying..."
              : "Verify & View Report"}
          </Typography>
        </Box>
      </Box>

      {/* Virtual Keyboard */}
      <VirtualKeyboard onKeyPress={handleKeyPress} layout="numeric" />
    </Dialog>
  );
};

export default MobileOtpDialog;
