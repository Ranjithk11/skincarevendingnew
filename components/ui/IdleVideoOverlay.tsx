"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

type IdleVideoOverlayProps = {
  idleMs?: number;
  src?: string;
};

export default function IdleVideoOverlay({
  idleMs = 120_000, 
  src = "/videos/airport.mp4",
}: IdleVideoOverlayProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {}
    }
  }, []);

  const arm = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, idleMs);
  }, [clearTimer, idleMs]);

  // 2. Only use the global listener to reset the timer when the overlay is CLOSED.
  // When OPEN, the overlay will handle its own click events.
  const onGlobalActivity = useCallback(() => {
    if (!open) {
      arm();
    }
  }, [arm, open]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    arm();

    const opts: AddEventListenerOptions = { passive: true };
    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "touchstart",
      "mousedown",
      "mousemove",
      "keydown",
      "wheel",
    ];

    for (const e of events) window.addEventListener(e, onGlobalActivity, opts);

    return () => {
      clearTimer();
      for (const e of events) window.removeEventListener(e, onGlobalActivity);
    };
  }, [arm, clearTimer, onGlobalActivity]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (open) {
      try {
        const p = v.play();
        if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
      } catch {}
    }
  }, [open]);

  // --- Interaction Handlers ---
  const handleBackgroundClick = () => {
    hide();
    arm();
  };

  const handleScanClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 3. Prevents background click from firing
    hide();
    arm();
    router.push(APP_ROUTES.HOME);
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 3. Prevents background click from firing
    hide();
    arm();
    router.push("/products");
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        bgcolor: "black",
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* The background container now acts as the global dismiss layer */}
      <Box
        onClick={handleBackgroundClick} 
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: 48, md: 52 },
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            mb: 2,
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          Leafwater AI Beauty Pod
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: 24, md: 24 },
            color: "rgba(255,255,255,0.9)",
            textAlign: "center",
            mb: 5,
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          Your personalized skincare journey starts here
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 3,
            width: "100%",
            maxWidth: 900,
            px: 2,
          }}
        >
          <Box
            onClick={handleScanClick}
            sx={{
              flex: 1,
              bgcolor: "rgba(105, 159, 126, 0.75)",
              backdropFilter: "blur(16px)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              borderRadius: 4,
              p: 4,
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: "rgba(105, 159, 126, 0.85)",
                transform: "translateY(-4px)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 28, md: 28 },
                fontWeight: 700,
                color: "white",
                mb: 1.5,
                textTransform: "uppercase",
                letterSpacing: 1,
                lineHeight: 1.2,
              }}
            >
              Get Your Free AI Skin Analysis
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 24, md: 24 },
                color: "rgba(255,255,255,0.9)",
                mb: 2.5,
              }}
            >
              Tap to start your scan and get custom recommendations
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                color: "white",
                fontWeight: 600,
                fontSize: 24,
              }}
            >
              Start Scan <ArrowForwardIcon sx={{ fontSize: 20 }} />
            </Box>
          </Box>

          <Box
            onClick={handleBuyClick}
            sx={{
              flex: 1,
              bgcolor: "rgba(105, 159, 126, 0.75)",
              backdropFilter: "blur(16px)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              borderRadius: 4,
              p: 4,
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: "rgba(105, 159, 126, 0.85)",
                transform: "translateY(-4px)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 28, md: 28 },
                fontWeight: 700,
                color: "white",
                mb: 1.5,
                textTransform: "uppercase",
                letterSpacing: 1,
                lineHeight: 1.2,
              }}
            >
              Buy Now Without Scan
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 24, md: 24 },
                color: "rgba(255,255,255,0.9)",
                mb: 2.5,
              }}
            >
              Browse products and add to cart directly
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                color: "white",
                fontWeight: 600,
                fontSize: 24,
              }}
            >
              Shop Products <ArrowForwardIcon sx={{ fontSize: 20 }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}