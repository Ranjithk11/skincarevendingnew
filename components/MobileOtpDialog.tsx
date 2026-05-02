"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Typography, Dialog, IconButton, CircularProgress, Select, MenuItem } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { VirtualKeyboard } from "@/components/ui";
import { useSendOtpMutation, useVerifyOtpMutation } from "@/redux/api/authApi";
import * as countryTelephoneData from 'country-telephone-data'; 

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
  
  // Default to India
  const [selectedCountry, setSelectedCountry] = useState(
    (countryTelephoneData as any).allCountries?.find((c: any) => c.iso2 === 'in') || (countryTelephoneData as any).allCountries?.[0]
  );

  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  const [sendOtp, { isLoading: isSendingOtp }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();

  useEffect(() => {
    if (open) {
      setStep("phone");
      setPhone("");
      setOtp("");
      setError("");
      setActiveField("phone");
    }
  }, [open]);

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
      
      // Dynamic max length based on country data or default to 15 (international max)
      const maxLen = currentField === "phone" ? 15 : 6;

      setter((prev) => {
        if (key === "backspace") return prev.slice(0, -1);
        if (key === "return" || key === "space") return prev;
        if (key === "arrowleft" || key === "arrowright") return prev;
        if (!/^\d$/.test(key)) return prev;
        if (prev.length >= maxLen) return prev;
        return prev + key;
      });
    },
    [activeField]
  );

  const handleSendOtp = async () => {
    setError("");
    if (phone.length < 7) {
      setError("Please enter a valid phone number");
      return;
    }

    try {
      const phoneWithCode = `+${selectedCountry.dialCode}${phone}`;
      const result: any = await sendOtp({
        input: phoneWithCode,
        inputType: "phoneNumber",
        action: "otpVerifyLogin",
      });

      if (result?.error) {
        setError(result?.error?.data?.message || "Failed to send OTP.");
        return;
      }
      setStep("otp");
      setActiveField("otp");
    } catch (err: any) {
      setError("Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (otp.length < 4) {
      setError("Please enter the OTP");
      return;
    }

    try {
      const phoneWithCode = `+${selectedCountry.dialCode}${phone}`;
      const result: any = await verifyOtp({
        input: phoneWithCode,
        action: "otpVerifyLogin",
        otp: Number(otp),
      });

      if (result?.error?.data?.status === "failure" || result?.error) {
        setError(result?.error?.data?.message || "Invalid OTP. Please try again.");
        return;
      }

      if (userId) {
        setUpdating(true);
        try {
          await fetch("/api/user/update-mobile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              phoneNumber: phone,
              countryCode: selectedCountry.dialCode,
            }),
          });
        } catch (e) {
          console.warn("[MobileOtpDialog] Failed to update mobile on backend:", e);
        }
        setUpdating(false);
      }

      onVerified(phone);
    } catch (err: any) {
      setError("Verification failed");
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtp("");
    try {
      const phoneWithCode = `+${selectedCountry.dialCode}${phone}`;
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "24px", maxWidth: 500 } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2, bgcolor: "#2d5a3d" }}>
        <Typography sx={{ fontSize: "22px", fontWeight: 600, color: "#fff" }}>
          {step === "phone" ? "Enter Mobile Number" : "Verify OTP"}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ px: 3, py: 3, bgcolor: "#fff" }}>
        {step === "phone" ? (
          <>
            <Typography sx={{ fontSize: "18px", color: "#6b7280", mb: 2 }}>
              Select your country and enter mobile number
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", border: "2px solid #2d5a3d", borderRadius: "12px", px: 1, py: 1, bgcolor: "#f9fafb", gap: 1 }}>
              <Select
                value={selectedCountry.iso2}
                onChange={(e) => {
                  const country = (countryTelephoneData as any).allCountries?.find((c: any) => c.iso2 === e.target.value);
                  if (country) setSelectedCountry(country);
                }}
                variant="standard"
                disableUnderline
                sx={{ width: '100px', fontSize: "18px", ml: 1 }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
              >
                {(countryTelephoneData as any).allCountries?.map((c: any) => (
                  <MenuItem key={c.iso2} value={c.iso2}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <span>{c.format ? c.iso2.toUpperCase() : "🏳️"}</span> 
                      <span>+{c.dialCode}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>

              <Box sx={{ width: "1px", height: 30, bgcolor: "#ccc" }} />

              <input
                ref={phoneRef}
                value={phone}
                readOnly
                placeholder="Phone Number"
                style={{ flex: 1, border: "none", outline: "none", fontSize: "22px", backgroundColor: "transparent" }}
              />
            </Box>
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: "22px", color: "#6b7280", mb: 1 }}>
              We sent a verification code to
            </Typography>
            <Typography sx={{ fontSize: "24px", fontWeight: 600, color: "#111827", mb: 2 }}>
              +{selectedCountry.dialCode} {phone}
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
        {error && <Typography sx={{ color: "red", mt: 1, textAlign: 'center' }}>{error}</Typography>}

        {/* Action Button */}
        <Box
          onClick={!isSendingOtp ? (step === "phone" ? handleSendOtp : handleVerifyOtp) : undefined}
          sx={{ mt: 3, py: 2, bgcolor: "#2d5a3d", borderRadius: "12px", textAlign: "center", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
        >
          {isSendingOtp ? "Processing..." : step === "phone" ? "Send OTP" : "Verify"}
        </Box>
      </Box>

      {/* Virtual Keyboard is always visible at the bottom of dialog */}
      <Box sx={{ bgcolor: "#f3f4f6", p: 1 }}>
        <VirtualKeyboard onKeyPress={handleKeyPress} layout="numeric" />
      </Box>
    </Dialog>
  );
};

export default MobileOtpDialog;