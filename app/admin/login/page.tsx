"use client";

import { useEffect, useState, useRef } from "react";
import { Box, IconButton, Typography, TextField } from "@mui/material";
import { ArrowBack, Backspace } from "@mui/icons-material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PageBackground } from "@/components/ui";
import { useAdminLoginMutation } from "@/redux/api/adminApi";

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

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeField, setActiveField] = useState<"username" | "password">("username");
  const [isShift, setIsShift] = useState(true);
  const [isNumeric, setIsNumeric] = useState(false);
  const [error, setError] = useState("");

  const [adminLogin, { isLoading }] = useAdminLoginMutation();

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const setValue = activeField === "username" ? setUsername : setPassword;
      const currentValue = activeField === "username" ? username : password;

      if (e.key === "Backspace") {
        e.preventDefault();
        setValue(currentValue.slice(0, -1));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (activeField === "username") {
          setActiveField("password");
          setIsNumeric(false);
          passwordRef.current?.focus();
        }
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        setValue(currentValue + " ");
        return;
      }

      if (e.key.length !== 1) return;

      
      e.preventDefault();
      setValue(currentValue + e.key);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeField, username, password]);

  const handleKeyPress = (key: string) => {
    const setValue = activeField === "username" ? setUsername : setPassword;
    const currentValue = activeField === "username" ? username : password;

    if (key === "backspace") {
      setValue(currentValue.slice(0, -1));
    } else if (key === "space") {
      setValue(currentValue + " ");
    } else if (key === "shift") {
      setIsShift(!isShift);
    } else if (key === "123" || key === "ABC") {
      setIsNumeric(!isNumeric);
    } else if (key === "return") {
      if (activeField === "username") {
        setActiveField("password");
        setIsNumeric(false);
        passwordRef.current?.focus();
      }
    } else {
      const char = isShift && !isNumeric ? key.toUpperCase() : key.toLowerCase();
      setValue(currentValue + char);
      if (isShift && !isNumeric) setIsShift(false);
    }
  };

  const handleNext = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setError("");

    try {
      const result = await adminLogin({
        username: username.trim(),
        password: password.trim(),
      }).unwrap();

      if (result.success) {
        localStorage.setItem("admin_logged_in", "true");
        localStorage.setItem("admin_name", username.trim());
        router.push("/admin/dashboard");
      } else {
        setError(result.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to login. Please try again.");
    }
  };

  const handleBack = () => {
    router.back();
  };

  const keys = isNumeric ? numericKeys : letterKeys;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%" }}>
      <PageBackground showGreenCurve fitParent>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          <IconButton onClick={handleBack} sx={{ color: "#1a1a1a" }}>
            <ArrowBack />
          </IconButton>
          <Box
            sx={{
              position: "relative",
              width: 140,
              height: 140,
              flexShrink: 0,
            }}
          >
            <Image
              src="/wending/goldlog.svg"
              alt="Leaf Water Logo"
              fill
              priority
              style={{
                objectFit: "contain",
              }}
            />
          </Box>
        </Box>

        {/* Form Content */}
        <Box sx={{ px: 3, pt: 3, pb: 2, flex: 1, overflow: "auto" }}>
          <Box
            sx={{
              width: "894px",
              maxWidth: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontFamily: "Roboto",
                fontWeight: 510,
                fontStyle: "normal",
                color: "#1a1a1a",
                fontSize: "48px",
                lineHeight: "100%",
                letterSpacing: 0,
              }}
            >
              Admin Dashboard Login
            </Typography>
            <Typography
              sx={{
                fontFamily: "Roboto",
                fontWeight: 400,
                fontStyle: "normal",
                color: "#6b7280",
                fontSize: "24px",
                lineHeight: "100%",
                letterSpacing: 0,
              }}
            >
              Enter your information below
            </Typography>

            {error && (
              <Typography sx={{ color: "red", fontSize: "18px" }}>
                {error}
              </Typography>
            )}

            {/* Username Field */}
            <Typography sx={{ color: "#000", fontSize: "24px", mb: 0 }}>Username</Typography>
            <TextField
              inputRef={usernameRef}
              fullWidth
              value={username}
              onClick={() => {
                setActiveField("username");
                setIsNumeric(false);
                usernameRef.current?.focus();
              }}
              onFocus={() => {
                setActiveField("username");
                setIsNumeric(false);
              }}
              InputProps={{ readOnly: true }}
              sx={{
                mb: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "white",
                  minHeight: "56px",
                  "& fieldset": { borderColor: activeField === "username" ? "#2d5a3d" : "#e5e7eb" },
                },
                "& .MuiOutlinedInput-input": {
                  py: "14px",
                  fontSize: "20px",
                },
              }}
            />

            {/* Password Field */}
            <Typography sx={{ color: "#000", fontSize: "24px", mb: 0 }}>Password</Typography>
            <TextField
              inputRef={passwordRef}
              fullWidth
              type="password"
              value={password}
              onClick={() => {
                setActiveField("password");
                setIsNumeric(false);
                passwordRef.current?.focus();
              }}
              onFocus={() => {
                setActiveField("password");
                setIsNumeric(false);
              }}
              InputProps={{ readOnly: true }}
              sx={{
                mb: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "white",
                  minHeight: "56px",
                  "& fieldset": { borderColor: activeField === "password" ? "#2d5a3d" : "#e5e7eb" },
                },
                "& .MuiOutlinedInput-input": {
                  py: "14px",
                  fontSize: "20px",
                },
              }}
            />
          </Box>
        </Box>

        {/* Next Button */}
        <Box
          sx={{
            bgcolor: "#2d5a3d",
            py: 2.5,
            width: "100%",
            textAlign: "center",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
            flexShrink: 0,
          }}
          onClick={!isLoading ? handleNext : undefined}
        >
          <Typography sx={{ color: "white", fontWeight: 600, fontSize: "24px" }}>
            {isLoading ? "Loading..." : "Next"}
          </Typography>
        </Box>

        {/* Custom Keyboard */}
       <Box
          sx={{
            bgcolor: "#d1d5db",
            px: 2,
            py: 6,
            pb: 12,
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
                    height: 100,
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
