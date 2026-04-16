"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";

interface IdleRedirectProps {
  /** Default idle timeout for most pages (ms). */
  defaultIdleMs?: number;
  /** Idle timeout for the feedback page (ms). */
  feedbackIdleMs?: number;
  /** Paths completely excluded from idle redirect (exact for "/", startsWith for others). */
  excludePaths?: string[];
}

export default function IdleRedirect({
  defaultIdleMs = 120_000,   // 2 minutes for most pages
  feedbackIdleMs = 180_000,  // 3 minutes for feedback page
  excludePaths = ["/", "/admin"],
}: IdleRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Determine the idle timeout for the current page
  const getIdleMs = useCallback(() => {
    if (pathname === "/feedback" || pathname.startsWith("/feedback")) {
      return feedbackIdleMs;
    }
    return defaultIdleMs;
  }, [pathname, feedbackIdleMs, defaultIdleMs]);

  const startTimer = useCallback(() => {
    clearTimer();
    const ms = getIdleMs();
    timerRef.current = window.setTimeout(() => {
      router.push(APP_ROUTES.HOME);
    }, ms);
  }, [clearTimer, getIdleMs, router]);

  const handleActivity = useCallback(() => {
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    // Check if current path should be excluded
    const isExcluded = excludePaths.some((path) => {
      if (path === "/") {
        return pathname === "/";
      }
      return pathname.startsWith(path);
    });

    if (isExcluded) {
      clearTimer();
      return;
    }

    // Start timer on mount
    startTimer();

    // Activity events to reset timer
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
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimer();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [pathname, excludePaths, startTimer, clearTimer, handleActivity]);

  return null;
}
