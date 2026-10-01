"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import {
  arrowNudge,
  fadeUp,
  PREMIUM_EASE,
  shimmerSweep,
} from "@/containers/skinanalysis-home/KioskReport/animations";
import {
  beginScanFromDirect,
  restoreBrowseIfScanAbandoned,
  SCAN_OFFER_PERCENT,
  shouldShowDirectToScanBridge,
} from "@/lib/kiosk-journey";

type Props = {
  compact?: boolean;
  hidden?: boolean;
};

const GOLD = "#D4AF67";
const GOLD_SOFT = "rgba(212, 175, 103, 0.22)";
const FOREST_DEEP = "#16352B";
const FOREST = "#2F5D46";
const HEADER_CLEARANCE = 86;

export default function DirectToScanBridge({ compact = false, hidden = false }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = useState(compact ? 196 : 248);

  useLayoutEffect(() => {
    restoreBrowseIfScanAbandoned();
    const sync = () => setVisible(shouldShowDirectToScanBridge());
    sync();
    window.addEventListener("pageshow", sync);
    window.addEventListener("popstate", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("popstate", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const sync = () => setBannerHeight(el.getBoundingClientRect().height);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact, visible]);

  const goScan = useCallback(() => {
    beginScanFromDirect();
    router.push("/questionnaire");
  }, [router]);

  if (hidden || !visible) return null;

  return (
    <>
      <Box
        aria-hidden
        sx={{
          height: bannerHeight,
          mb: compact ? 2.25 : 3,
          flexShrink: 0,
        }}
      />
      <Box
        ref={bannerRef}
        sx={{
          position: "fixed",
          top: HEADER_CLEARANCE,
          left: 0,
          right: 0,
          zIndex: 9,
          pt: 1.5,
          pb: 1.75,
          px: compact ? { xs: 2, sm: 3, md: 4 } : { xs: 2, md: 4 },
          bgcolor: "#F9F9F9",
          animation: `${fadeUp} 0.55s ${PREMIUM_EASE} both`,
        }}
      >
        <Box sx={{ maxWidth: compact ? 920 : "none", mx: "auto" }}>
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              borderRadius: compact ? "18px" : "22px",
              border: `1px solid ${GOLD_SOFT}`,
              background: `linear-gradient(125deg, ${FOREST_DEEP} 0%, ${FOREST} 52%, #3E7058 100%)`,
              boxShadow: "0 14px 36px rgba(22, 53, 43, 0.22)",
              px: compact ? 2 : 2.5,
              py: compact ? 1.6 : 2.25,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 48%, transparent 66%)",
                backgroundSize: "220% 100%",
                animation: `${shimmerSweep} 5.5s ease-in-out 0.6s infinite`,
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                width: 180,
                height: 180,
                right: -50,
                top: -70,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(212,175,103,0.22) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.1 }}>
                <Box
                  sx={{
                    width: compact ? 40 : 46,
                    height: compact ? 40 : 46,
                    borderRadius: "14px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(255,255,255,0.1)",
                    border: `1px solid ${GOLD_SOFT}`,
                    color: GOLD,
                  }}
                >
                  <Icon icon="mdi:face-recognition" width={compact ? 22 : 26} />
                </Box>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: 1.15,
                    py: 0.4,
                    borderRadius: "999px",
                    bgcolor: GOLD,
                    color: FOREST_DEEP,
                    fontSize: compact ? 11 : 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {SCAN_OFFER_PERCENT}% off today
                </Box>
              </Box>

              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: compact ? 20 : 24,
                  lineHeight: 1.22,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                }}
              >
                {compact ? "Unsure which product is right?" : "Let your skin choose — and save 10%"}
              </Typography>
              <Typography
                sx={{
                  mt: 0.6,
                  fontSize: compact ? 14.5 : 16,
                  lineHeight: 1.4,
                  color: "rgba(255,255,255,0.84)",
                  fontWeight: 500,
                }}
              >
                {compact
                  ? "A 30-second face scan matches what suits you, then takes 10% off this visit."
                  : "Skip the guesswork. We scan your face, recommend what actually suits you, and take 10% off this visit."}
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: compact ? 0.7 : 0.85, mt: compact ? 1.15 : 1.5 }}>
                {["Personalized match", "10% off this visit", "Report on your phone"].map((label) => (
                  <Box
                    key={label}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: compact ? 1 : 1.15,
                      py: compact ? 0.32 : 0.4,
                      borderRadius: "999px",
                      bgcolor: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.92)",
                      fontSize: compact ? 12 : 13,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon icon="mdi:check-circle-outline" width={compact ? 14 : 15} color={GOLD} />
                    {label}
                  </Box>
                ))}
              </Box>

              <Button
                onClick={goScan}
                disableElevation
                fullWidth
                sx={{
                  mt: compact ? 1.5 : 1.85,
                  textTransform: "none",
                  fontWeight: 800,
                  fontSize: compact ? 16 : 17,
                  minHeight: compact ? 46 : 52,
                  borderRadius: "999px",
                  bgcolor: GOLD,
                  color: FOREST_DEEP,
                  boxShadow: "0 8px 18px rgba(212, 175, 103, 0.28)",
                  "&:hover": { bgcolor: "#E2C37A" },
                  "&:active": { transform: "scale(0.985)" },
                }}
              >
                Scan my skin
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    ml: 0.75,
                    animation: `${arrowNudge} 1.6s ease-in-out infinite`,
                  }}
                >
                  <Icon icon="mdi:arrow-right" width={18} />
                </Box>
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}
