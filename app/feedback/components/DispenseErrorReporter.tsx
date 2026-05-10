"use client";

import { useEffect, useRef } from "react";
import {
  sendDispenseErrorWebhook,
  type DispenseErrorPaymentInfo,
  type DispenseErrorProductInfo,
  type DispenseErrorUserInfo,
} from "@/utils/webhook";

interface DispenseErrorReporterProps {
  /** Whether the reporter should be active (i.e. dispense state is in error). */
  active: boolean;
  errorMessage: string;
  user?: DispenseErrorUserInfo;
  products?: DispenseErrorProductInfo[];
  payment?: DispenseErrorPaymentInfo;
  /** Any extra raw debug info (e.g., STM32 response) */
  raw?: unknown;
  /** Machine location where the error occurred */
  machineLocation?: string;
}

/**
 * Side-effect-only React component that fires the `dispense_error` webhook
 * exactly once per `(errorMessage + orderId)` per browser session whenever
 * `active` becomes `true`.
 *
 * It renders nothing — it lives purely to encapsulate the side effect so the
 * parent component (e.g., `app/feedback/page.tsx`) doesn't get cluttered with
 * webhook plumbing.
 */
export default function DispenseErrorReporter({
  active,
  errorMessage,
  user,
  products,
  payment,
  raw,
  machineLocation,
}: DispenseErrorReporterProps) {
  const lastFiredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!errorMessage) return;

    const key = `${errorMessage}::${payment?.orderId || ""}`;
    if (lastFiredKeyRef.current === key) return;
    lastFiredKeyRef.current = key;

    void sendDispenseErrorWebhook({
      errorMessage,
      user,
      products,
      payment,
      raw,
      machineLocation,
      dedupeKey: key,
    });
  }, [active, errorMessage, user, products, payment, raw, machineLocation]);

  return null;
}
