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
  /** Whether the reporter should be active (i.e. payment was successful). */
  active: boolean;
  user?: PaymentUserInfo;
  products?: PaymentProductInfo[];
  transaction?: PaymentTransactionInfo;
  /** Selected slot IDs for the purchased products */
  selectedSlots?: (string | number)[];
  /** Machine location where payment occurred */
  machineLocation?: string;
  /** Machine name where payment occurred */
  machineName?: string;
}

/**
 * Side-effect-only React component that fires the `payment_success` webhook
 * exactly once per `orderId` per browser session whenever `active` becomes `true`.
 */
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
