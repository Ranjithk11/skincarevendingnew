"use client";

import { useEffect, useRef } from "react";
import {
  sendDispenseSuccessWebhook,
  type DispenseSuccessPayload,
  type DispenseSuccessUserInfo,
  type DispenseSuccessProductInfo,
  type DispenseSuccessTransactionInfo,
  type DispenseSuccessCommandInfo,
} from "@/utils/webhook";
import { resolvePaymentForWebhook } from "@/lib/resolveWebhookPayment";

interface DispenseReporterProps {
  /** Whether the reporter should be active (i.e. dispense was successful). */
  active: boolean;
  user?: DispenseSuccessUserInfo;
  products?: DispenseSuccessProductInfo[];
  transaction?: DispenseSuccessTransactionInfo;
  /** Command info - which product was dispensed and from which slot */
  command?: DispenseSuccessCommandInfo;
  /** Machine location where dispense occurred */
  machineLocation?: string;
  /** Machine name where dispense occurred */
  machineName?: string;
}

/**
 * Side-effect-only React component that fires the `dispense_success` webhook
 * exactly once per `(orderId + slot)` per browser session whenever `active`
 * becomes `true`.
 */
export default function DispenseReporter({
  active,
  user,
  products,
  transaction,
  command,
  machineLocation,
  machineName,
}: DispenseReporterProps) {
  const lastFiredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!transaction?.orderId && !transaction?.paymentId && !transaction?.qrCodeId) return;

    let cancelled = false;

    void (async () => {
      const resolvedTx = (await resolvePaymentForWebhook(transaction)) || transaction;
      if (cancelled) return;

      if (!resolvedTx.orderId && !resolvedTx.paymentId) return;

      const slotKey = command?.slotId ?? command?.productId ?? "";
      const key = `dispense_success::${resolvedTx.orderId || resolvedTx.paymentId || ""}::${slotKey}`;
      if (lastFiredKeyRef.current === key) return;
      lastFiredKeyRef.current = key;

      void sendDispenseSuccessWebhook({
        user,
        products,
        transaction: resolvedTx,
        command,
        machineLocation,
        machineName,
        dedupeKey: key,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [active, user, products, transaction, command, machineLocation, machineName]);

  return null;
}
