"use client";

import { Box, Typography, keyframes } from "@mui/material";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { APP_ROUTES } from "@/utils/routes";
import { clearVisitorSession } from "@/utils/clearVisitorSession";
import {
  BODY_SIZE,
  HEADER_HEIGHT,
  LOGO_HEIGHT,
  LOGO_WIDTH,
  PAGE_PADDING_X,
  REPORT_GREEN,
  REPORT_LIGHT_GREEN,
  TITLE_SIZE,
} from "./constants";

const fadeSlideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const logoPop = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  70% {
    opacity: 1;
    transform: scale(1.03);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

const softShimmer = keyframes`
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
`;

const GOLD = "#C4A574";

export default function ReportHeader() {
  const router = useRouter();

  const handleLogoClick = async () => {
    clearVisitorSession();
    try {
      await signOut({ redirect: false });
    } catch {
      // keep navigating home even if sign-out fails
    }
    router.push(APP_ROUTES.HOME);
  };

  return (
    <Box
      sx={{
        flexShrink: 0,
        minHeight: HEADER_HEIGHT,
        px: `${PAGE_PADDING_X}px`,
        pt: "12px",
        pb: "10px",
        boxSizing: "border-box",
        overflow: "visible",
        animation: `${fadeSlideIn} 0.55s ease-out both`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          width: "100%",
          px: "12px",
          py: "10px",
          borderRadius: "16px",
          bgcolor: REPORT_LIGHT_GREEN,
          border: "1px solid rgba(47, 93, 70, 0.12)",
          boxShadow: "0 6px 18px rgba(47, 93, 70, 0.06)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 48%, transparent 66%)",
            backgroundSize: "200% 100%",
            animation: `${softShimmer} 3.2s ease-in-out infinite`,
            pointerEvents: "none",
          },
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={handleLogoClick}
          aria-label="Go to home"
          sx={{
            border: 0,
            p: 0,
            m: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            display: "block",
            lineHeight: 0,
            flexShrink: 0,
            zIndex: 1,
            animation: `${logoPop} 0.65s cubic-bezier(0.22, 1, 0.36, 1) both`,
            transition: "transform 0.2s ease",
            "&:active": { transform: "scale(0.97)" },
          }}
        >
          <Box
            component="img"
            src="/wending/goldlog.svg"
            alt="Leaf Water"
            sx={{
              width: LOGO_WIDTH,
              height: LOGO_HEIGHT,
              objectFit: "contain",
              objectPosition: "left center",
              display: "block",
              filter: "drop-shadow(0 2px 4px rgba(196, 165, 116, 0.35))",
            }}
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            zIndex: 1,
            animation: `${fadeSlideIn} 0.6s ease-out 0.12s both`,
          }}
        >
          <Typography
            sx={{
              fontSize: TITLE_SIZE,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "0.4px",
              color: REPORT_GREEN,
              textTransform: "uppercase",
              background: `linear-gradient(90deg, ${REPORT_GREEN} 0%, #3d7a5a 45%, ${GOLD} 100%)`,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: `${softShimmer} 4s linear infinite`,
            }}
          >
            My Skincare Report
          </Typography>

          <Typography
            sx={{
              mt: "6px",
              fontSize: BODY_SIZE - 2,
              fontWeight: 500,
              lineHeight: 1.25,
              color: "#6B7280",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            Understand your skin at a glance
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
