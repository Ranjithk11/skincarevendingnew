"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import {
  isKioskIdlePaused,
  subscribeKioskIdlePause,
} from "@/utils/kioskIdleGate";
import { REPORT_GREEN, REPORT_MUTED, SMALL_SIZE } from "./constants";

type Props = {
  /** Match DefaultLayout IdleRedirect default (2 min). */
  idleMs?: number;
};

/**
 * Visible countdown for kiosk idle logout — same timeout window as IdleRedirect.
 */
export default function IdleCountdownBadge({ idleMs = 120_000 }: Props) {
  const [remainingSec, setRemainingSec] = useState(() =>
    Math.ceil(idleMs / 1000)
  );
  const [paused, setPaused] = useState(false);
  const [deadline, setDeadline] = useState(() => Date.now() + idleMs);

  const reset = useCallback(() => {
    if (isKioskIdlePaused()) return;
    setDeadline(Date.now() + idleMs);
  }, [idleMs]);

  useEffect(() => {
    return subscribeKioskIdlePause((isPaused) => {
      setPaused(isPaused);
      if (!isPaused) setDeadline(Date.now() + idleMs);
    });
  }, [idleMs]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "touchmove",
      "click",
    ];
    events.forEach((event) => {
      window.addEventListener(event, reset, { passive: true });
    });
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, reset);
      });
    };
  }, [reset]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (paused || isKioskIdlePaused()) {
        setRemainingSec(Math.ceil(idleMs / 1000));
        return;
      }
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSec(left);
    }, 250);
    return () => window.clearInterval(id);
  }, [deadline, idleMs, paused]);

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");
  const urgent = !paused && remainingSec <= 30;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        px: "10px",
        py: "5px",
        borderRadius: "999px",
        bgcolor: urgent ? "rgba(204, 51, 63, 0.12)" : "rgba(47, 93, 70, 0.08)",
        border: `1px solid ${urgent ? "rgba(204, 51, 63, 0.35)" : "rgba(47, 93, 70, 0.2)"}`,
        flexShrink: 0,
      }}
      aria-label={paused ? "Idle timer paused during payment" : `Idle timeout in ${mm}:${ss}`}
    >
      <Icon
        icon={paused ? "mdi:pause-circle-outline" : "mdi:timer-outline"}
        width={16}
        color={urgent ? "#cc333f" : REPORT_GREEN}
      />
      <Typography
        sx={{
          fontSize: SMALL_SIZE - 2,
          fontWeight: 700,
          color: urgent ? "#cc333f" : REPORT_MUTED,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {paused ? "Paused" : `${mm}:${ss}`}
      </Typography>
    </Box>
  );
}
