"use client";

import { Box, Typography, TextField } from "@mui/material";
import { Backspace } from "@mui/icons-material";
import { RefObject } from "react";
import PageBackground from "@/components/ui/PageBackground";

interface Slide1Props {
  name: string;
  phone: string;
  email: string;
  activeField: "name" | "phone" | "email";
  isShift: boolean;
  isNumeric: boolean;
  nameRef: RefObject<HTMLInputElement | null>;
  phoneRef: RefObject<HTMLInputElement | null>;
  emailRef: RefObject<HTMLInputElement | null>;
  setActiveField: (field: "name" | "phone" | "email") => void;
  setIsNumeric: (value: boolean) => void;
  handleKeyPress: (key: string) => void;
  handleNext: () => void;
  currentSlide: number;
}

const letterKeys = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const numericKeys = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "/", ":", ";", "(", ")", "$", "&", "@", '"'],
  [".", ",", "?", "!", "'"],
];

export default function Slide1({
  name,
  phone,
  email,
  activeField,
  isShift,
  isNumeric,
  nameRef,
  phoneRef,
  emailRef,
  setActiveField,
  setIsNumeric,
  handleKeyPress,
  handleNext,
  currentSlide,
}: Slide1Props) {
  const keys = isNumeric ? numericKeys : letterKeys;

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
        <Box sx={{ px: 3, pt: 3, pb: 2, flex: 1, overflow: "auto" }}>
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
                fontFamily: "SF Pro",
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
                fontFamily: "SF Pro",
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
            <TextField
              inputRef={nameRef}
              fullWidth
              value={name}
              onFocus={() => {
                setActiveField("name");
                setIsNumeric(false);
              }}
              InputProps={{ readOnly: true }}
              sx={{
                mb: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "white",
                  minHeight: "72px",
                  "& fieldset": { borderColor: activeField === "name" ? "#2d5a3d" : "#e5e7eb" },
                },
                "& .MuiOutlinedInput-input": {
                  py: "18px",
                  fontSize: "28px",
                },
              }}
            />

            {/* Phone Number Field */}
            <Typography sx={{ color: "#000", fontSize: "36px", mb: 0 }}>Phone Number</Typography>
            <TextField
              inputRef={phoneRef}
              fullWidth
              value={phone}
              onFocus={() => {
                setActiveField("phone");
                setIsNumeric(true);
              }}
              InputProps={{ readOnly: true }}
              sx={{
                mb: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "white",
                  minHeight: "72px",
                  "& fieldset": { borderColor: activeField === "phone" ? "#2d5a3d" : "#e5e7eb" },
                },
                "& .MuiOutlinedInput-input": {
                  py: "18px",
                  fontSize: "28px",
                },
              }}
            />

            {/* Email Field */}
            <Typography sx={{ color: "#000", fontSize: "36px", mb: 0 }}>Email </Typography>
            <TextField
              inputRef={emailRef}
              fullWidth
              value={email}
              onFocus={() => {
                setActiveField("email");
                setIsNumeric(false);
              }}
              InputProps={{ readOnly: true }}
              sx={{
                mb: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "white",
                  minHeight: "72px",
                  "& fieldset": { borderColor: activeField === "email" ? "#2d5a3d" : "#e5e7eb" },
                },
                "& .MuiOutlinedInput-input": {
                  py: "18px",
                  fontSize: "28px",
                },
              }}
            />
          </Box>
        </Box>

        {/* Next Button */}
        <Box
          sx={{
            bgcolor: "#2d5a3d",
            py: 3,
            width: "100%",
            textAlign: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
          onClick={handleNext}
        >
          <Typography sx={{ color: "white", fontWeight: 600, fontSize: "30px" }}>Next</Typography>
        </Box>

        {/* Custom Keyboard */}
        <Box
          sx={{
            bgcolor: "#d1d5db",
            px: 2,
            py: 2,
            pb: 2,
            flexShrink: 0,
          }}
        >
          {keys.map((row, rowIndex) => (
            <Box key={rowIndex} sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 1 }}>
              {rowIndex === 2 && !isNumeric && (
                <Box
                  onClick={() => handleKeyPress("shift")}
                  sx={{
                    width: 100,
                    height: 80,
                    bgcolor: isShift ? "#9ca3af" : "#f3f4f6",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography sx={{ fontSize: "1.2rem" }}>⇧</Typography>
                </Box>
              )}
              {row.map((key) => (
                <Box
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  sx={{
                    width: 60,
                    height: 80,
                    bgcolor: "#f3f4f6",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography sx={{ fontSize: "1.2rem", fontWeight: 500 }}>
                    {isShift && !isNumeric ? key : key.toLowerCase()}
                  </Typography>
                </Box>
              ))}
              {rowIndex === 2 && (
                <Box
                  onClick={() => handleKeyPress("backspace")}
                  sx={{
                    width: 60,
                    height: 80,
                    bgcolor: "#f3f4f6",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <Backspace sx={{ fontSize: "1.1rem", color: "#374151" }} />
                </Box>
              )}
            </Box>
          ))}

          {/* Bottom Row */}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mt: 1 }}>
            <Box
              onClick={() => handleKeyPress(isNumeric ? "ABC" : "123")}
              sx={{
                width: 100,
                height: 80,
                bgcolor: "#9ca3af",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>{isNumeric ? "ABC" : "123"}</Typography>
            </Box>
            <Box
              onClick={() => handleKeyPress("space")}
              sx={{
                flex: 1,
                maxWidth: 200,
                height: 80,
                bgcolor: "#f3f4f6",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Typography sx={{ fontSize: "0.85rem", color: "#6b7280" }}>space</Typography>
            </Box>
            <Box
              onClick={() => handleKeyPress("return")}
              sx={{
                width: 100,
                height: 80,
                bgcolor: "#9ca3af",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>return</Typography>
            </Box>
          </Box>
        </Box>
      </PageBackground>
    </Box>
  ); 
}
