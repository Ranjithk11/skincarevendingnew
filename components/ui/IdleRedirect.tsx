"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";

interface IdleRedirectProps {
  idleMs?: number;
  excludePaths?: string[];
}

export default function IdleRedirect({
  idleMs = 60_000,
  excludePaths = ["/", "/admin", "/feedback"],
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

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      router.push(APP_ROUTES.HOME);
    }, idleMs);
  }, [clearTimer, idleMs, router]);

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
