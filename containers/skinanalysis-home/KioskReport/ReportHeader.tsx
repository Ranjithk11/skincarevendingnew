"use client";

import { Box, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { APP_ROUTES } from "@/utils/routes";
import { clearVisitorSession } from "@/utils/clearVisitorSession";
import { LOGO_HEIGHT, LOGO_WIDTH, MIN_FONT, REPORT_GREEN } from "./constants";

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
        px: 1.5,
        pt: 1,
        pb: 0.5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
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
            display: "block",
           }}
        />
      </Box>
      <Box
        sx={{
         
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          sx={{
            fontSize: MIN_FONT,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#C4A574",
            lineHeight: 1,
          }}
        >
          Skin analysis
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 0.4 }}>
          <Box sx={{ width: 40, height: 1.5, bgcolor: "#C4A574", borderRadius: 99 }} />
          <Typography
            sx={{
              fontSize: 32,
              fontWeight: 600,
              color: REPORT_GREEN,
              letterSpacing: 0.6,
              lineHeight: 1.15,
              textAlign: "center",
              fontFamily: `Georgia, "Times New Roman", serif`,
            }}
          >
            Generated Report
          </Typography>
          <Box sx={{ width: 40, height: 1.5, bgcolor: "#C4A574", borderRadius: 99 }} />
        </Box>
      </Box>
    </Box>
  );
}
