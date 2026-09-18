"use client";

import { Box, Button, Typography, keyframes } from "@mui/material";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Icon } from "@iconify/react";
import { APP_ROUTES } from "@/utils/routes";
import { clearVisitorSession } from "@/utils/clearVisitorSession";
import {
  HEADER_HEIGHT,
  PAGE_PADDING_X,
  REPORT_GREEN,
  REPORT_GREEN_DARK,
  REPORT_LIGHT_GREEN,
} from "./constants";

const fadeSlideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
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

  const goHome = async () => {
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
        minHeight: HEADER_HEIGHT - 8,
        px: `${PAGE_PADDING_X}px`,
        pt: "10px",
        pb: "8px",
        boxSizing: "border-box",
        animation: `${fadeSlideIn} 0.45s ease-out both`,
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          columnGap: "12px",
          width: "100%",
          px: "14px",
          py: "10px",
          borderRadius: "14px",
          bgcolor: REPORT_LIGHT_GREEN,
          border: "1px solid rgba(47, 93, 70, 0.14)",
          boxShadow: "0 4px 14px rgba(47, 93, 70, 0.06)",
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
            zIndex: 0,
          },
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={goHome}
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
            transition: "transform 0.15s ease",
            "&:active": { transform: "scale(0.97)" },
          }}
        >
          <Box
            component="img"
            src="/wending/goldlog.svg"
            alt="Leaf Water"
            sx={{
              width: 150,
              height: 40,
              objectFit: "contain",
              objectPosition: "left center",
              display: "block",
              filter: "drop-shadow(0 2px 4px rgba(196, 165, 116, 0.35))",
            }}
          />
        </Box>

        <Box
          sx={{
            minWidth: 0,
            zIndex: 1,
            animation: `${fadeSlideIn} 0.55s ease-out 0.1s both`,
          }}
        >
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "0.3px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
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
              mt: "3px",
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.2,
              color: "#6B7280",
              letterSpacing: "0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Understand your skin at a glance
          </Typography>
        </Box>

        <Button
          type="button"
          onClick={goHome}
          startIcon={<Icon icon="mdi:home-outline" width={16} />}
          sx={{
            flexShrink: 0,
            zIndex: 1,
            textTransform: "none",
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1,
            height: 36,
            px: "14px",
            minWidth: 0,
            borderRadius: "10px",
            color: "#fff",
            bgcolor: REPORT_GREEN,
            boxShadow: "0 2px 8px rgba(47, 93, 70, 0.22)",
            whiteSpace: "nowrap",
            animation: `${logoPop} 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both`,
            "& .MuiButton-startIcon": { mr: "6px" },
            "&:hover": { bgcolor: REPORT_GREEN_DARK },
            "&:active": { transform: "scale(0.97)" },
          }}
        >
          Done
        </Button>
      </Box>
    </Box>
  );
}
