"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { APP_ROUTES } from "@/utils/routes";
import { clearVisitorSession } from "@/utils/clearVisitorSession";
import {
  isKioskIdlePaused,
  subscribeKioskIdlePause,
} from "@/utils/kioskIdleGate";

interface IdleRedirectProps {
  /** Default idle timeout for most pages (ms). */
  defaultIdleMs?: number;
  /** Idle timeout for the feedback page (ms). */
  feedbackIdleMs?: number;
  /** Paths completely excluded from idle redirect (exact for "/", startsWith for others). */
  excludePaths?: string[];
}

export default function IdleRedirect({
  defaultIdleMs = 120_000,   // 2 minutes for most pages (including home)
  feedbackIdleMs = 180_000,  // 3 minutes for feedback page
  excludePaths = [],
}: IdleRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<number | null>(null);
  const pausedRef = useRef(isKioskIdlePaused());

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
    // Never arm idle logout while card OTP / UPI QR payment is in progress.
    if (pausedRef.current || isKioskIdlePaused()) {
      pausedRef.current = true;
      return;
    }
    const ms = getIdleMs();
    timerRef.current = window.setTimeout(async () => {
      if (pausedRef.current || isKioskIdlePaused()) return;

      clearVisitorSession();
      try {
        await signOut({ redirect: false });
      } catch {}

      if (pathname.startsWith("/admin")) {
        try {
          localStorage.removeItem("admin_logged_in");
          localStorage.removeItem("admin_name");
        } catch {}
      }

      router.push(APP_ROUTES.HOME);
    }, ms);
  }, [clearTimer, getIdleMs, router, pathname]);

  const handleActivity = useCallback(() => {
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    return subscribeKioskIdlePause((paused) => {
      pausedRef.current = paused;
      if (paused) {
        clearTimer();
        return;
      }
      startTimer();
    });
  }, [clearTimer, startTimer]);

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
