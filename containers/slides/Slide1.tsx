"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { Box, Typography, IconButton, InputAdornment } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { MuiTelInput } from "mui-tel-input";
import PageBackground from "@/components/ui/PageBackground";
import { VirtualKeyboard } from "@/components/ui";
import {
  maskPhoneDigits,
  shouldAcceptPhoneValue,
  validatePhone,
} from "@/utils/phoneValidation";

interface Slide1Props {
  name: string;
  phone: string;
  email: string;
  country: string;
  callingCode: string;
  activeField: "name" | "phone" | "email";
  cursorPosition: number | null;
  isNumeric: boolean;
  setActiveField: (field: "name" | "phone" | "email") => void;
  setCursorPosition: (pos: number | null) => void;
  setIsNumeric: (value: boolean) => void;
  setPhone: (value: string) => void;
  setCountry: (value: string) => void;
  setCallingCode: (value: string) => void;
  handleKeyPress: (key: string) => void;
  handleNext: () => void;
  currentSlide: number;
  validationError?: string;
}

export default function Slide1({
  name,
  phone,
  email,
  country,
  callingCode,
  activeField,
  cursorPosition,
  isNumeric,
  setActiveField,
  setCursorPosition,
  setIsNumeric,
  setPhone,
  setCountry,
  setCallingCode,
  handleKeyPress,
  handleNext,
  currentSlide,
  validationError,
}: Slide1Props) {
  const [phoneError, setPhoneError] = useState<string>("");
  const [showPhone, setShowPhone] = useState(false);
  const phoneFieldRef = useRef<HTMLDivElement>(null);
  const [maskOverlay, setMaskOverlay] = useState({ left: 0, top: 0, height: 0 });
  const [maskedOverlayText, setMaskedOverlayText] = useState("");

  useLayoutEffect(() => {
    if (showPhone) return;
    const container = phoneFieldRef.current;
    const input = container?.querySelector<HTMLInputElement>(".MuiOutlinedInput-input");
    if (!container || !input) return;

    const containerRect = container.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    setMaskOverlay({
      left: inputRect.left - containerRect.left,
      top: inputRect.top - containerRect.top,
      height: inputRect.height,
    });

    // Match overlay to formatted input text (spaces included) so caret aligns
    setMaskedOverlayText(maskPhoneDigits(input.value));

    const end = input.value.length;
    try {
      input.setSelectionRange(end, end);
    } catch {
      // ignore if input not focusable
    }
  }, [showPhone, phone, country, callingCode, activeField]);

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        transform: `translateX(${currentSlide === 0 ? "0%" : "-100%"})`,
        transition: "transform 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageBackground showGreenCurve fitParent>
        {/* Form Content */}
        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          <Box
            sx={{
              width: "894px",
              maxWidth: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "35px",
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontFamily: "Roboto",
                fontWeight: 510,
                fontStyle: "normal",
                color: "#1a1a1a",
                fontSize: "64px",
                lineHeight: "100%",
                letterSpacing: 0,
              }}
            >
              Let's get started
            </Typography>
            <Typography
              sx={{
                fontFamily: "Roboto",
                fontWeight: 400,
                fontStyle: "normal",
                color: "#6b7280",
                fontSize: "32px",
                lineHeight: "100%",
                letterSpacing: 0,
              }}
            >
              Sign up using your name and phone number
            </Typography>

            {/* Name Field */}
            <Typography sx={{ color: "#000", fontSize: "36px", mb: 0.5 }}>Name</Typography>
            <Box
              onClick={() => {
                setActiveField("name");
                setIsNumeric(false);
                setCursorPosition(null);
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                borderRadius: 2,
                bgcolor: "white",
                minHeight: "72px",
                border: `5px solid ${activeField === "name" ? "#2d5a3d" : "#9ca3af"}`,
                px: 2,
                cursor: "text",
                "&:hover": {
                  borderColor: activeField === "name" ? "#2d5a3d" : "#6b7280",
                },
              }}
            >
              <Typography sx={{ fontSize: "28px", color: name ? "#1a1a1a" : "#9ca3af", display: "flex", alignItems: "center" }}>
                {activeField === "name" ? (
                  <>
                    {name.length === 0 && cursorPosition === null && (
                      <Box component="span" sx={{ color: "#9ca3af", position: "absolute" }}>Enter your name</Box>
                    )}
                    {name.slice(0, cursorPosition !== null ? cursorPosition : name.length)}
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        width: "2px",
                        height: "28px",
                        bgcolor: "#2d5a3d",
                        mx: 0.25,
                        animation: "blink 1s step-end infinite",
                        "@keyframes blink": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0 },
                        },
                      }}
                    />
                    {name.slice(cursorPosition !== null ? cursorPosition : name.length)}
                  </>
                ) : (
                  name || <Box component="span" sx={{ color: "#9ca3af" }}>Enter your name</Box>
                )}
              </Typography>
            </Box>

            {/* Phone Number Field */}
            <Typography sx={{ color: "#000", fontSize: "36px", mb: 0 }}>Phone Number</Typography>
            <Box ref={phoneFieldRef} sx={{ position: "relative", width: "100%" }}>
            <MuiTelInput
              key={country}
              fullWidth
              value={phone}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPhone ? "Hide phone number" : "Show phone number"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowPhone((prev) => !prev)}
                      edge="end"
                      sx={{ color: "#6b7280", p: 1 }}
                    >
                      {showPhone ? (
                        <VisibilityOffOutlinedIcon sx={{ fontSize: 32 }} />
                      ) : (
                        <VisibilityOutlinedIcon sx={{ fontSize: 32 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              onChange={(value, info) => {
                const nationalNumber = info.nationalNumber || '';
                const countryCode = info.countryCallingCode || '';
                const iso2 = (info as any)?.countryCode;

                const nextCountry = typeof iso2 === "string" && iso2 ? iso2 : country;
                const didCountryChange = nextCountry !== country;

                if (didCountryChange) {
                  setCountry(nextCountry);
                }

                if (countryCode && countryCode !== callingCode) {
                  setCallingCode(countryCode);
                }

                if (didCountryChange) {
                  if (!nationalNumber) {
                    setPhone(countryCode ? `+${countryCode}` : value);
                    return;
                  }
                  if (shouldAcceptPhoneValue(nationalNumber, nextCountry, countryCode)) {
                    setPhone(value);
                    setPhoneError("");
                  }
                  return;
                }

                if (!shouldAcceptPhoneValue(nationalNumber, nextCountry, countryCode)) {
                  return;
                }

                setPhone(value);
                setPhoneError("");
              }}
              defaultCountry={country as any}
              focusOnSelectCountry
              forceCallingCode
              onFocus={(e) => {
                setActiveField("phone");
                setIsNumeric(true);
                if (!showPhone) {
                  const input = e.target as HTMLInputElement;
                  const end = input.value.length;
                  requestAnimationFrame(() => {
                    try {
                      input.setSelectionRange(end, end);
                    } catch {
                      /* ignore */
                    }
                  });
                }
              }}
              sx={{
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  width: "100%",
                  borderRadius: 2,
                  bgcolor: "white",
                  minHeight: "80px",
                  "& fieldset": {
                    borderColor: activeField === "phone" ? "#2d5a3d" : "#9ca3af",
                    borderWidth: 5,
                  },
                  "&:hover fieldset": {
                    borderColor: activeField === "phone" ? "#2d5a3d" : "#6b7280",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#2d5a3d",
                    borderWidth: 5, 
                  },
                },
                "& .MuiOutlinedInput-input": {
                  py: "20px",
                  fontSize: "28px",
                  ...(!showPhone && {
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                    caretColor: "transparent",
                  }),
                },
                "& .MuiTelInput-Flag": {
                  width: "36px",
                  height: "36px",
                },
                "& .MuiTelInput-IconButton": {
                  "& svg": {
                    fontSize: "28px",
                  },
                },
                "& .MuiTelInput-Typography": {
                  fontSize: "24px",
                },
              }}
            />
            {!showPhone && maskedOverlayText && (
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  left: maskOverlay.left,
                  top: maskOverlay.top,
                  height: maskOverlay.height,
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                  zIndex: 2,
                  fontSize: "28px",
                  color: "#1a1a1a",
                  lineHeight: 1,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  maxWidth: `calc(100% - ${maskOverlay.left}px - 72px)`,
                }}
              >
                <Box component="span">{maskedOverlayText}</Box>
                {activeField === "phone" && (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "2px",
                      height: "28px",
                      bgcolor: "#2d5a3d",
                      ml: 0.25,
                      flexShrink: 0,
                      animation: "phoneMaskBlink 1s step-end infinite",
                      "@keyframes phoneMaskBlink": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0 },
                      },
                    }}
                  />
                )}
              </Box>
            )}
            </Box>

            {/* Email Field */}
            <Typography sx={{ color: "#000", fontSize: "36px", mb: 0 }}>Email (Optional) </Typography>
            <Box
              onClick={() => {
                setActiveField("email");
                setIsNumeric(false);
                setCursorPosition(null);
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                borderRadius: 2,
                bgcolor: "white",
                minHeight: "72px",
                border: `5px solid ${activeField === "email" ? "#2d5a3d" : "#9ca3af"}`,
                px: 2,
                cursor: "text",
                "&:hover": {
                  borderColor: activeField === "email" ? "#2d5a3d" : "#6b7280",
                },
              }}
            >
              <Typography sx={{ fontSize: "28px", color: email ? "#1a1a1a" : "#9ca3af", display: "flex", alignItems: "center" }}>
                {activeField === "email" ? (
                  <>
                    {email.length === 0 && cursorPosition === null && (
                      <Box component="span" sx={{ color: "#9ca3af", position: "absolute" }}>Enter your email</Box>
                    )}
                    {email.slice(0, cursorPosition !== null ? cursorPosition : email.length)}
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        width: "2px",
                        height: "28px",
                        bgcolor: "#2d5a3d",
                        mx: 0.25,
                        animation: "blink 1s step-end infinite",
                        "@keyframes blink": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0 },
                        },
                      }}
                    />
                    {email.slice(cursorPosition !== null ? cursorPosition : email.length)}
                  </>
                ) : (
                  email || <Box component="span" sx={{ color: "#9ca3af" }}>Enter your email</Box>
                )}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Validation Error Message */}
        {(validationError || phoneError) && (
          <Box sx={{ px: 3, py: 1, bgcolor: "#fee2e2" }}>
            <Typography sx={{ color: "#dc2626", fontSize: "24px", textAlign: "center" }}>
              {phoneError || validationError}
            </Typography>
          </Box>
        )}

        {/* Next Button */}
        <Box
          sx={{
            bgcolor: "#2d5a3d",
            py: 3,
            width: "100%",
            textAlign: "center",
            cursor: "pointer",
            flexShrink: 0,
            marginTop: "auto",
          }}
          onClick={() => {
            const error = validatePhone(phone, country, callingCode);
            if (error) {
              setPhoneError(error);
              return;
            }

            setPhoneError("");
            handleNext();
          }}
        >
          <Typography sx={{ color: "white", fontWeight: 600, fontSize: "30px" }}>Next</Typography>
        </Box>

        {/* Virtual Keyboard */}
        <VirtualKeyboard
          onKeyPress={handleKeyPress}
          layout={activeField === "email" ? "email" : isNumeric ? "numeric" : "default"}
        />
      </PageBackground>
    </Box>
  ); 
}