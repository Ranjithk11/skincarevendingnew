"use client";

import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import ActionButton from "./ActionButton";
import Logo from "./Logo";
import FeatureCard from "./FeatureCard";
import { useVoiceMessages } from "@/contexts/VoiceContext";

interface LandingTopSectionProps {
  onStartScan: () => void;
  onBrowseProducts?: () => void;
  onSlots?: () => void;
  onAdminDashboard?: () => void;
}

export default function LandingTopSection({
  onStartScan,
  onBrowseProducts,
  onSlots,
  onAdminDashboard,
}: LandingTopSectionProps) {
  const { speakMessage, speakSequence } = useVoiceMessages();

  useEffect(() => {
    const t = window.setTimeout(() => {
      speakSequence(["welcome", "homeStartScan"]);
    }, 500);

    return () => window.clearTimeout(t);
  }, [speakSequence]);

  const handleStartScanWithVoice = () => {
    speakMessage("questionnaireIntro");
    onStartScan();
  };
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        px: { xs: 3, sm: 3, md: 4 },
        pt: { xs: 5, sm: 2.5, md: 3 },
        pb: 0,
        maxWidth: { xs: "100%", sm: "768px", md: "800px" },
        mx: "auto",
        width: "100%",
        maxHeight: "100vh",
        overflowY: "auto",
      }}
    >
      <Logo
        header
        onBrowseProducts={onBrowseProducts}
        onSlots={onSlots}
      />

      <Box sx={{ mb: { xs: 2, sm: 3, md: 3.5 }, mt: 5 }}>
        <Typography
          component="h1"
          sx={{
            fontWeight: 510,
            color: "#000000",
            lineHeight: "100%",
            mb: { xs: 1, sm: 1.5, md: 2 },
            fontSize: "64px",
            fontStyle: "normal",
            letterSpacing: 0,
            borderRadius: 1,
          }}
        >
          Ready to transform your skin with AI? Scan Now.
        </Typography>
        <Typography
          sx={{
            fontWeight: 400,
            color: "#4a4a4a",
            lineHeight: "100%",
            fontSize: "32px",
            fontStyle: "normal",
            letterSpacing: 0,
            mt: 2,
          }}
        >
          Discover personalized skincare recommendations powered by AI technology
        </Typography>
      </Box>

      <ActionButton
        variant="primary"
        fullWidth
        icon={
          <Box
            component="img"
            src="/wending/scanlogo.svg"
            alt="Scan"
            sx={{
              width: 40,
              height: 40,
              display: "block",
              // Primary/dark CTA — keep the white scan glyph.
              filter: "none",
            }}
          />
        }
        sx={{
          mb: { xs: 2, sm: 3, md: 3 },
          mt: 2,
          height: "100px",
          py: "47px",
          px: "180px",
          borderRadius: "20px",
          gap: "20px",
        }}
        onClick={handleStartScanWithVoice}
      >
        <Typography
          sx={{
            fontWeight: 510,
            fontStyle: "normal",
            fontSize: "30px",
            lineHeight: "100%",
            letterSpacing: 0,
            textAlign: "center",
            width: "100%",
          }}
        >
          Start AI Skin Scan
        </Typography>
      </ActionButton>
      <Box
        sx={{
          position: "relative",
          width: "674px",
          maxWidth: "100%",
          mx: "auto",
          height: "600px",
          opacity: 1,
        }}
      >
        <Image
          src="/wending/img.svg"
          alt="Woman applying skincare"
          fill
          style={{ objectFit: "contain", objectPosition: "bottom center" }}
          priority
          sizes="(max-width: 800px) 100vw, 674px"
        />
      </Box>
      <Box>
        <FeatureCard
          label="LEARN MORE"
          title="AI Powered Analysis"
          description="Deep insights into your skin, powered by intelligent diagnostics."
        />
      </Box>

      {onAdminDashboard && (
        <Typography
          onClick={onAdminDashboard}
          sx={{
            color: "#2d5a3d",
            fontSize: 20,
            fontWeight: 400,
            textDecoration: "underline",
            cursor: "pointer",
            textAlign: "right",
            mt: 2,
            "&:hover": {
              color: "#1a3d28",
            },
          }}
        >
          Admin Dashboard
        </Typography>
      )}
    </Box>
  );
}
