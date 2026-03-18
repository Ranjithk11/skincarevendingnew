"use client";

import { useEffect, useState, useRef } from "react";
import { Box, IconButton, Typography, TextField } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PageBackground } from "@/components/ui";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";
import { useAdminLoginMutation } from "@/redux/api/adminApi";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeField, setActiveField] = useState<"username" | "password">("username");
  const [error, setError] = useState("");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const [adminLogin, { isLoading }] = useAdminLoginMutation();

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // Removed the global 'keydown' useEffect. 
  // Native inputs handle physical keyboards automatically now.

  const handleKeyboardKeyPress = (key: string) => {
    const setValue = activeField === "username" ? setUsername : setPassword;
    const currentValue = activeField === "username" ? username : password;

    if (key === "backspace") {
      setValue(currentValue.slice(0, -1));
      return;
    }
    if (key === "space") {
      setValue(currentValue + " ");
      return;
    }
    if (key === "return") {
      if (activeField === "username") {
        setActiveField("password");
        passwordRef.current?.focus();
        return;
      }
      setIsKeyboardOpen(false);
      return;
    }
    if (key === "shift" || key === "123" || key === "ABC" || key === "arrowleft" || key === "arrowright") {
      return;
    }

    setValue(currentValue + key);
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
              width: 240,
              height: 240,
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
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setActiveField("password");
                  passwordRef.current?.focus();
                }
              }}
              onClick={() => {
                setActiveField("username");
                setIsKeyboardOpen(true);
              }}
              onFocus={() => {
                setActiveField("username");
                setIsKeyboardOpen(true);
              }}
              inputProps={{ inputMode: "none" }} // <-- Replaced readOnly with inputMode="none"
              sx={{
                mb: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "white",
                  minHeight: "56px",
                  "& fieldset": { borderColor: activeField === "username" ? "#2d5a3d" : "#6e6f70ff" },
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
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setIsKeyboardOpen(false);
                  handleNext();
                }
              }}
              onClick={() => {
                setActiveField("password");
                setIsKeyboardOpen(true);
              }}
              onFocus={() => {
                setActiveField("password");
                setIsKeyboardOpen(true);
              }}
              inputProps={{ inputMode: "none" }} // <-- Replaced readOnly with inputMode="none"
              sx={{
                mb: 0,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "white",
                  minHeight: "56px",
                  "& fieldset": { borderColor: activeField === "password" ? "#2d5a3d" : "#6e6f70ff" },
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
        {!isKeyboardOpen && (
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
        )}

        {isKeyboardOpen ? (
          <Box
            sx={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1400,
            }}
          >
            {/* Next Button above keyboard */}
            <Box
              sx={{
                bgcolor: "#2d5a3d",
                py: 2.5,
                width: "100%",
                textAlign: "center",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
              onClick={!isLoading ? handleNext : undefined}
            >
              <Typography sx={{ color: "white", fontWeight: 600, fontSize: "24px" }}>
                {isLoading ? "Loading..." : "Next"}
              </Typography>
            </Box>
            <VirtualKeyboard
              onKeyPress={handleKeyboardKeyPress}
              layout="default"
              visible={isKeyboardOpen}
            />
          </Box>
        ) : null}
      </PageBackground>
    </Box>
  );
}