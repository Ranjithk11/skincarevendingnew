"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  paymentWebhookDedupeKeys,
  sendPaymentWebhook,
  type PaymentUserInfo,
  type PaymentProductInfo,
  type PaymentTransactionInfo,
} from "@/utils/webhook";
import { resolvePaymentForWebhook } from "@/lib/resolveWebhookPayment";
import type { SpinWheelWebhookPayload } from "@/lib/spin-wheel/webhook";

interface PaymentReporterProps {
  active: boolean;
  user?: PaymentUserInfo;
  products?: PaymentProductInfo[];
  transaction?: PaymentTransactionInfo;
  selectedSlots?: (string | number)[];
  machineLocation?: string;
  machineName?: string;
  spinWheel?: SpinWheelWebhookPayload | null;
}

export default function PaymentReporter({
  active,
  user,
  products,
  transaction,
  selectedSlots,
  machineLocation,
  machineName,
  spinWheel,
}: PaymentReporterProps) {
  const lastFiredKeyRef = useRef<string | null>(null);

  // Stabilize identity so parent re-renders (new products[] each time) don't re-trigger.
  const txIdentity = useMemo(
    () =>
      [
        transaction?.orderId || "",
        transaction?.paymentId || "",
        transaction?.qrCodeId || "",
        transaction?.amount ?? "",
        transaction?.method || "",
      ].join("|"),
    [
      transaction?.orderId,
      transaction?.paymentId,
      transaction?.qrCodeId,
      transaction?.amount,
      transaction?.method,
    ]
  );

  useEffect(() => {
    if (!active) return;
    if (!transaction?.orderId && !transaction?.paymentId && !transaction?.qrCodeId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const resolvedTx =
        (await resolvePaymentForWebhook(transaction)) || transaction;
      if (cancelled) return;
      if (!resolvedTx.orderId && !resolvedTx.paymentId) return;

      const keys = paymentWebhookDedupeKeys(resolvedTx);
      const key = keys[0] || "";
      if (!key) return;
      if (lastFiredKeyRef.current === key) return;
      // Also skip if we already fired under a sibling id (order vs payment).
      if (
        lastFiredKeyRef.current &&
        keys.some((k) => k === lastFiredKeyRef.current)
      ) {
        return;
      }
      lastFiredKeyRef.current = key;

      void sendPaymentWebhook({
        user,
        products,
        transaction: resolvedTx,
        selectedSlots,
        machineLocation,
        machineName,
        spinWheel,
        dedupeKey: key,
      });
    })();

    return () => {
      cancelled = true;
    };
    // intentionally keyed on txIdentity — not products/user object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, txIdentity, machineLocation, machineName]);

  return null;
}
