"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";

type IdleVideoOverlayProps = {
  idleMs?: number;
  src?: string;
};

export default function IdleVideoOverlay({
  idleMs = 120_000,
  src = "/videos/leafwater2.mp4",
}: IdleVideoOverlayProps) {
  const [open, setOpen] = useState(false);
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
      } catch {
      }
    }
  }, []);

  const arm = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, idleMs);
  }, [clearTimer, idleMs]);

  const onActivity = useCallback(() => {
    if (open) hide();
    arm();
  }, [arm, hide, open]);

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

    for (const e of events) window.addEventListener(e, onActivity, opts);

    return () => {
      clearTimer();
      for (const e of events) window.removeEventListener(e, onActivity);
    };
  }, [arm, clearTimer, onActivity]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (open) {
      try {
        const p = v.play();
        if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
      } catch {
      }
    }
  }, [open]);

  if (!open) return null;

  return (
    <Box
      onClick={hide}
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

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            bgcolor: "rgba(0,0,0,0.55)",
            px: 4,
            py: 3,
            borderRadius: 3,
            textAlign: "center",
            color: "white",
          }}
        >
          <Typography sx={{ fontSize: 32, fontWeight: 700, mb: 1.5 }}>
            Touch Screen to Begin
          </Typography>
          <Typography sx={{ fontSize: 20 }}>
            Experience the Leafwater difference
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
