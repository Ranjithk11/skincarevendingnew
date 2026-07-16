"use client";

import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useVoiceMessages } from "@/contexts/VoiceContext";

const FALLBACK_LANDING_IMAGE = "/logo/newLanding.png";
const MACHINE_LOCATION_KEY = "kiosk_machine_location";
const neonButtonSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center", // Changed to center since the button is now narrower
  gap: { xs: 1.5, sm: 2 },
  width: "100%",
  minHeight: { xs: 56, sm: 64 }, // Slightly reduced height to match the narrower width proportionally
  px: { xs: 2, sm: 3 },
  py: { xs: 1, sm: 1.25 },
  borderRadius: "50px",
  textTransform: "none" as const,
  color: "#fff",
  bgcolor: "rgba(10, 34, 64, 0.45)",
  border: "2px solid #00E5FF",
  boxShadow: `
    0 0 15px rgba(0, 229, 255, 0.6),
    inset 0 0 12px rgba(0, 229, 255, 0.2)
  `,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    bgcolor: "rgba(10, 45, 85, 0.6)",
    border: "2px solid #33F0FF",
    boxShadow: `
      0 0 22px rgba(0, 229, 255, 0.85),
      inset 0 0 16px rgba(0, 229, 255, 0.3)
    `,
  },
  "&:active": {
    transform: "scale(0.98)",
  },
};

export default function NewPromoLanding() {
  const router = useRouter();
  const { speakMessage, speakSequence } = useVoiceMessages();
  const [landingImageUrl, setLandingImageUrl] = useState(FALLBACK_LANDING_IMAGE);

  useEffect(() => {
    let cancelled = false;

    const resolveLocation = async (): Promise<string> => {
      const storedLocation =
        typeof window !== "undefined"
          ? localStorage.getItem(MACHINE_LOCATION_KEY)?.trim()
          : "";
      if (storedLocation) return storedLocation;

      try {
        const res = await fetch("/api/admin/machine-name", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const machineLocation = String(json?.machineLocation ?? "").trim();
          if (machineLocation) return machineLocation;
        }
      } catch {
        // Fall back to common image below.
      }

      return "common";
    };

    const loadLandingImage = async () => {
      try {
        const location = await resolveLocation();
        const params = new URLSearchParams();
        if (location) params.set("location", location);

        const res = await fetch(`/api/landing-image?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;

        const json = await res.json();
        const imageUrl = String(json?.imageUrl ?? "").trim();
        if (!cancelled && imageUrl) {
          setLandingImageUrl(imageUrl);
        }
      } catch {
        if (!cancelled) {
          setLandingImageUrl(FALLBACK_LANDING_IMAGE);
        }
      }
    };

    loadLandingImage();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {    const t = window.setTimeout(() => {
      speakSequence(["welcome", "homeStartScan"]);
    }, 500);

    return () => window.clearTimeout(t);
  }, [speakSequence]);

  const handleStartScan = () => {
    speakMessage("questionnaireIntro");
    router.push("/questionnaire");
  };

  const handleBuyProducts = () => {
    router.push("/slots");
  };

  const handleAdminDashboard = () => {
    router.push("/admin/login");
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 5,
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      {landingImageUrl.startsWith("http") ? (
        <Box
          component="img"
          src={landingImageUrl}
          alt="Scan Discover Glow — AI skincare landing"
          onError={() => setLandingImageUrl(FALLBACK_LANDING_IMAGE)}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />
      ) : (
        <Image
          src={landingImageUrl || FALLBACK_LANDING_IMAGE}
          alt="Scan Discover Glow — AI skincare landing"
          fill
          priority
          sizes="100vw"
          onError={() => setLandingImageUrl(FALLBACK_LANDING_IMAGE)}
          style={{ objectFit: "cover", objectPosition: "center top" }}
        />
      )}
      {/* 
        Positioning adjusted to be narrower, higher up, and further to the right.
      */}
      <Box
        sx={{
          position: "absolute",
          top: { xs: "30%", sm: "30%", md: "30%", lg: "24%" }, // Moved higher up
          right: { xs: "4%", sm: "3%", md: "5%", lg: "6%" },   // Moved further to the right
          width: { xs: "75%", sm: "320px", md: "340px" },      // Reduced width
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.5, sm: 2 },
          pointerEvents: "auto",
          zIndex: 10,
        }}
      >
        <Button onClick={handleStartScan} sx={neonButtonSx}>
          <Box
            component="img"
            src="/wending/scanlogo.svg"
            alt=""
            sx={{ width: { xs: 26, sm: 30 }, height: { xs: 26, sm: 30 }, flexShrink: 0 }}
          />
          <Box sx={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: "0.03em",
                lineHeight: 1.2,
                color: "#fff",
              }}
            >
              CLICK HERE
            </Typography>
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: 20,
                letterSpacing: "0.02em",
                lineHeight: 1.2,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              FOR FREE SKIN SCAN
            </Typography>
          </Box>
        </Button>

        <Button onClick={handleBuyProducts} sx={neonButtonSx}>
          <Box
            component="img"
            src="/wending/productlog.svg"
            alt=""
            sx={{ width: { xs: 26, sm: 30 }, height: { xs: 26, sm: 30 }, flexShrink: 0, color: "#fff", objectFit: "contain" }}
          />
          <Box sx={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: "0.03em",
                lineHeight: 1.2,
                color: "#fff",
              }}
            >
              BUY PRODUCTS
            </Typography>
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: 20,
                letterSpacing: "0.02em",
                lineHeight: 1.2,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              DIRECTLY
            </Typography>
          </Box>
        </Button>
      </Box>
      <Typography
        onClick={handleAdminDashboard}
        sx={{
          position: "absolute",
          right: { xs: 16, sm: 24, md: 32 },
          bottom: { xs: 16, sm: 24, md: 32 },
          zIndex: 10,
          color: "rgba(219, 18, 18, 0.82)",
          fontSize: 24,
          fontWeight: 400,
          textDecoration: "underline",
          cursor: "pointer",
          textAlign: "right",
          pointerEvents: "auto",
          textShadow: "0 1px 4px rgba(52, 219, 30, 0.45)",
          "&:hover": {
            color: "#00E5FF",
          },
        }}
      >
        Stock Hub
      </Typography>
    </Box>
  );
}