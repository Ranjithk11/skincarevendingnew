"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Typography } from "@mui/material";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { APP_ROUTES } from "@/utils/routes";
import { clearVisitorSession } from "@/utils/clearVisitorSession";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

type IdleVideoOverlayProps = {
  /** How long (ms) after user dismisses video before it re-appears on the home page. */
  reIdleMs?: number;
  /** Single video src (used when `sources` is not provided). */
  src?: string;
  /** Videos played one after another in a loop while idle. */
  sources?: string[];
  /** Play video audio (kiosk / user-gesture may be required by the browser). */
  withAudio?: boolean;
};

const DEFAULT_IDLE_VIDEOS = [
  "/videos/drreddy2.mp4",
  "/videos/newdrreddy.mp4",
];

function encodeVideoPath(path: string): string {
  if (!path.startsWith("/")) return encodeURI(path);
  return path
    .split("/")
    .map((part, i) => (i === 0 || !part ? part : encodeURIComponent(part)))
    .join("/");
}

/** Zoom past encoded letterbox bars so the picture fills a 9:16 kiosk. */
function detectLetterboxScale(video: HTMLVideoElement): number {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (w < 16 || h < 16) return 1;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 1;

  try {
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const rowIsBlack = (y: number) => {
      const step = Math.max(1, Math.floor(w / 32));
      let black = 0;
      let n = 0;
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        n += 1;
        if (data[i] < 16 && data[i + 1] < 16 && data[i + 2] < 16) black += 1;
      }
      return black / n >= 0.88;
    };

    const max = Math.floor(h * 0.4);
    let top = 0;
    let bot = 0;
    while (top < max && rowIsBlack(top)) top += 1;
    while (bot < max && rowIsBlack(h - 1 - bot)) bot += 1;

    const content = h - top - bot;
    if (content < h * 0.45) return 1;
    return Math.min(1.55, (h / content) * 1.02);
  } catch {
    return 1;
  }
}

export default function IdleVideoOverlay({
  reIdleMs = 120_000,
  src = "/videos/drreddy2.mp4",
  sources,
  withAudio = true,
}: IdleVideoOverlayProps) {
  const playlist = React.useMemo(() => {
    const raw =
      sources?.length ? sources : src ? [src] : DEFAULT_IDLE_VIDEOS;
    return raw.map(encodeVideoPath);
  }, [sources, src]);
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  // On the home page, show video immediately on load/refresh.
  const [open, setOpen] = useState(isHome);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentIndexRef = useRef(0);
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;
  const dismissedRef = useRef(false);
  // Track whether this is the initial page load (true) vs client-side navigation (false)
  const initialLoadRef = useRef(true);
  const [mounted, setMounted] = useState(false);
  const [videoScale, setVideoScale] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const playVideoAtIndex = useCallback(async (index: number) => {
    const list = playlistRef.current;
    const v = videoRef.current;
    if (!v || !list.length) return;

    const safeIndex = ((index % list.length) + list.length) % list.length;
    currentIndexRef.current = safeIndex;
    setCurrentIndex(safeIndex);

    try {
      v.pause();
      v.playsInline = true;
      v.setAttribute("playsinline", "true");
      v.setAttribute("webkit-playsinline", "true");
      v.src = list[safeIndex];
      // Browsers (and Vercel Chrome) block autoplay with sound. Start muted
      // so the clip actually plays, then try to unmute on kiosk.
      v.muted = true;
      v.defaultMuted = true;
      v.volume = withAudio ? 1 : 0;
      v.load();
      await v.play();

      const applyScale = () => {
        if (videoRef.current !== v) return;
        setVideoScale(detectLetterboxScale(v));
      };
      if (v.currentTime >= 0.35 && v.readyState >= 2) {
        applyScale();
      } else {
        const onTimeUpdate = () => {
          if (v.currentTime < 0.35) return;
          v.removeEventListener("timeupdate", onTimeUpdate);
          applyScale();
        };
        v.addEventListener("timeupdate", onTimeUpdate);
      }

      if (!withAudio) return;

      v.muted = false;
      try {
        await v.play();
      } catch {
        v.muted = true;
      }
    } catch {}
  }, [withAudio]);

  const hide = useCallback(() => {
    dismissedRef.current = true;
    setOpen(false);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {}
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    const list = playlistRef.current;
    if (!list.length) return;
    const nextIndex = (currentIndexRef.current + 1) % list.length;
    playVideoAtIndex(nextIndex);
  }, [playVideoAtIndex]);

  const handleVideoError = useCallback(() => {
    handleVideoEnded();
  }, [handleVideoEnded]);

  // Re-arm: after user dismisses the video on home page,
  // show it again after reIdleMs of inactivity.
  const arm = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(async () => {
      // Clear any stale session before showing idle screen
      clearVisitorSession();
      try {
        await signOut({ redirect: false });
      } catch {}
      setOpen(true);
    }, reIdleMs);
  }, [clearTimer, reIdleMs]);

  const onGlobalActivity = useCallback(() => {
    // Only reset idle timer when overlay is hidden
    if (!open && isHome) {
      arm();
    }
  }, [arm, open, isHome]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only active on home page
    if (!isHome) {
      clearTimer();
      setOpen(false);
      dismissedRef.current = false; // reset when leaving home
      return;
    }

    // Show video immediately ONLY on fresh page load/refresh (initialLoadRef is true).
    // On client-side navigation (e.g. logo click), just arm the idle timer.
    if (initialLoadRef.current && !dismissedRef.current) {
      setOpen(true);
    } else {
      // Client-side nav or user dismissed — arm idle timer so video comes back after reIdleMs
      arm();
    }
    initialLoadRef.current = false;

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
  }, [isHome, arm, clearTimer, onGlobalActivity, pathname]);

  useEffect(() => {
    if (!open || !withAudio) return;

    const unlockAudio = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = false;
      v.volume = 1;
      void v.play().catch(() => {});
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, [open, withAudio]);

  useEffect(() => {
    if (!open || !mounted) return;
    currentIndexRef.current = 0;
    playVideoAtIndex(0);
  }, [open, mounted, playVideoAtIndex]);

  // --- Interaction Handlers ---
  const handleBackgroundClick = () => {
    hide();
    arm();
  };

  const handleScanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    hide();
    clearTimer();
    router.push(APP_ROUTES.HOME);
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    hide();
    clearTimer();
    router.push("/slots");
  };

  if (!open || !mounted) return null;

  const overlay = (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        maxWidth: "100vw",
        maxHeight: "100dvh",
        zIndex: 9999,
        bgcolor: "black",
        overflow: "hidden",
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        muted
        loop={false}
        playsInline
        preload="auto"
        controls={false}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100%",
          height: "100%",
          minWidth: "100%",
          minHeight: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          display: "block",
          transform: `translate(-50%, -50%) scale(${videoScale})`,
        }}
      />

      {/* Overlay: title at top, action boxes pinned to bottom */}
      <Box
        onClick={handleBackgroundClick}
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          px: 3,
          pt: { xs: 5, md: 7 },
          pb: { xs: 4, md: 5 },
        }}
      >
        <Box sx={{ textAlign: "center" }}>
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
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}
          >
            Your personalized skincare journey starts here
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 24 }} />

        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 3,
            width: "100%",
            maxWidth: 900,
            mx: "auto",
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

  return createPortal(overlay, document.body);
}