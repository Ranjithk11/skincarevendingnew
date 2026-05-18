"use client";

import { Box, Typography, TextField } from "@mui/material";
import { MuiTelInput } from "mui-tel-input";
import PageBackground from "@/components/ui/PageBackground";
import { VirtualKeyboard } from "@/components/ui";

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
                setCursorPosition(null); // Set cursor to end when clicking
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
            <MuiTelInput
              key={country}
              value={phone}
              onChange={(value, info) => {
                // Use country-specific validation
                // Different countries have different phone number lengths
                // India: 10 digits, US: 10 digits, UK: 10-11 digits, etc.
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

                // If the user just switched countries and hasn't entered a national number yet,
                // force the value to the selected calling code to avoid showing the previous country flag/calling code.
                if (didCountryChange) {
                  if (!nationalNumber) {
                    setPhone(countryCode ? `+${countryCode}` : value);
                    return;
                  }

                  // Country changed with existing digits; always accept the new formatted value.
                  setPhone(value);
                  return;
                }
                
                // Define max lengths per country code
                const maxLengthByCountry: { [key: string]: number } = {
                  '91': 10,  // India
                  '1': 10,   // US/Canada
                  '44': 11,  // UK
                  '61': 9,   // Australia
                  '86': 11,  // China
                };
                
                const maxLength = maxLengthByCountry[countryCode] || 15; // Default to 15 for unknown countries
                
                if (nationalNumber.length <= maxLength) {
                  setPhone(value);
                }
              }}
              defaultCountry={country as any}
              focusOnSelectCountry
              forceCallingCode
              onFocus={() => {
                setActiveField("phone");
                setIsNumeric(true);
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
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

            {/* Email Field */}
            <Typography sx={{ color: "#000", fontSize: "36px", mb: 0 }}>Email (Optional) </Typography>
            <Box
              onClick={() => {
                setActiveField("email");
                setIsNumeric(false);
                setCursorPosition(null); // Set cursor to end when clicking
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
        {validationError && (
          <Box sx={{ px: 3, py: 1, bgcolor: "#fee2e2" }}>
            <Typography sx={{ color: "#dc2626", fontSize: "20px", textAlign: "center" }}>
              {validationError}
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
          onClick={handleNext}
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
