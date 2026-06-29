"use client";

import { useEffect, useRef } from "react";
import {
  sendPaymentWebhook,
  type PaymentUserInfo,
  type PaymentProductInfo,
  type PaymentTransactionInfo,
} from "@/utils/webhook";
import { resolvePaymentForWebhook } from "@/lib/resolveWebhookPayment";

interface PaymentReporterProps {
  active: boolean;
  user?: PaymentUserInfo;
  products?: PaymentProductInfo[];
  transaction?: PaymentTransactionInfo;
  selectedSlots?: (string | number)[];
  machineLocation?: string;
  machineName?: string;
}

export default function PaymentReporter({
  active,
  user,
  products,
  transaction,
  selectedSlots,
  machineLocation,
  machineName,
}: PaymentReporterProps) {
  const lastFiredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!transaction?.orderId && !transaction?.paymentId && !transaction?.qrCodeId) return;

    let cancelled = false;

    void (async () => {
      const resolvedTx = (await resolvePaymentForWebhook(transaction)) || transaction;
      if (cancelled) return;
      if (!resolvedTx.orderId && !resolvedTx.paymentId) return;

      const key = `payment_success::${resolvedTx.orderId || resolvedTx.paymentId || ""}`;
      if (lastFiredKeyRef.current === key) return;
      lastFiredKeyRef.current = key;

      void sendPaymentWebhook({
        user,
        products,
        transaction: resolvedTx,
        selectedSlots,
        machineLocation,
        machineName,
        dedupeKey: key,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [active, user, products, transaction, selectedSlots, machineLocation, machineName]);

  return null;
}
