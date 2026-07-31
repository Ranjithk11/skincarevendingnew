"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  dispenseErrorWebhookDedupeKeys,
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
  /** Machine name where the error occurred */
  machineName?: string;
}

/**
 * Fires `dispense_error` once per order/payment + message.
 * Uses stable payment identity deps so pickup timers / re-renders don't cancel it.
 */
export default function DispenseErrorReporter({
  active,
  errorMessage,
  user,
  products,
  payment,
  raw,
  machineLocation,
  machineName,
}: DispenseErrorReporterProps) {
  const lastFiredKeyRef = useRef<string | null>(null);
  const payloadRef = useRef({
    user,
    products,
    raw,
    machineLocation,
    machineName,
  });
  payloadRef.current = {
    user,
    products,
    raw,
    machineLocation,
    machineName,
  };

  const paymentIdentity = useMemo(
    () =>
      [
        payment?.orderId || "",
        payment?.paymentId || "",
        payment?.qrCodeId || "",
        errorMessage || "",
      ].join("|"),
    [payment?.orderId, payment?.paymentId, payment?.qrCodeId, errorMessage]
  );

  useEffect(() => {
    if (!active) return;
    if (!errorMessage) return;

    const keys = dispenseErrorWebhookDedupeKeys(payment, errorMessage);
    const key = keys[0] || "";
    if (!key) return;
    if (lastFiredKeyRef.current === key) return;
    lastFiredKeyRef.current = key;

    const latest = payloadRef.current;
    void sendDispenseErrorWebhook({
      errorMessage,
      user: latest.user,
      products: latest.products,
      payment,
      raw: latest.raw,
      machineLocation: latest.machineLocation,
      machineName: latest.machineName,
      dedupeKey: key,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paymentIdentity]);

  return null;
}
