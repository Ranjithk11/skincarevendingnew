"use client";

import { useEffect, useRef } from "react";
import {
  sendPaymentWebhook,
  type PaymentPayload,
  type PaymentUserInfo,
  type PaymentProductInfo,
  type PaymentTransactionInfo,
} from "@/utils/webhook";

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
}

/**
 * Side-effect-only React component that fires the `payment_success` webhook
 * exactly once per `orderId` per browser session whenever `active` becomes `true`.
 *
 * It renders nothing — it lives purely to encapsulate the side effect so the
 * parent component doesn't get cluttered with webhook plumbing.
 */
export default function PaymentReporter({
  active,
  user,
  products,
  transaction,
  selectedSlots,
  machineLocation,
}: PaymentReporterProps) {
  const lastFiredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!transaction?.orderId) return;

    const key = `payment::${transaction.orderId}`;
    if (lastFiredKeyRef.current === key) return;
    lastFiredKeyRef.current = key;

    void sendPaymentWebhook({
      user,
      products,
      transaction,
      selectedSlots,
      machineLocation,
      dedupeKey: key,
    });
  }, [active, user, products, transaction, selectedSlots, machineLocation]);

  return null;
}
