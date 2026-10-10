"use client";

import { useEffect } from "react";

const MAX_PER_MINUTE = 20;
let sentThisMinute = 0;
let minuteStarted = 0;

function report(payload: { message: string; stack?: string; source: string; url?: string }) {
  const now = Date.now();
  if (now - minuteStarted > 60_000) {
    minuteStarted = now;
    sentThisMinute = 0;
  }
  if (sentThisMinute >= MAX_PER_MINUTE) return;
  sentThisMinute += 1;

  void fetch("/api/logs/error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      url: payload.url || (typeof window !== "undefined" ? window.location.href : ""),
    }),
  }).catch(() => {});
}

/** Sends browser crashes / unhandled promise errors to logs/error-YYYY-MM-DD.log */
export default function ClientErrorLogger() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "IMG" || tag === "VIDEO" || tag === "SOURCE") return;

      report({
        message: event.message || "window error",
        stack: event.error?.stack,
        source: "window.onerror",
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "unhandledrejection";
      const stack = reason instanceof Error ? reason.stack : undefined;
      report({ message, stack, source: "unhandledrejection" });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
