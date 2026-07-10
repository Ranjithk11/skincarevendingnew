"use client";

import { useEffect, useRef } from "react";
import {
  sendDispenseSuccessWebhook,
  type DispenseSuccessUserInfo,
  type DispenseSuccessProductInfo,
  type DispenseSuccessTransactionInfo,
  type DispenseSuccessCommandInfo,
} from "@/utils/webhook";
import { resolvePaymentForWebhook } from "@/lib/resolveWebhookPayment";

interface DispenseReporterProps {
  active: boolean;
  user?: DispenseSuccessUserInfo;
  products?: DispenseSuccessProductInfo[];
  transaction?: DispenseSuccessTransactionInfo;
  command?: DispenseSuccessCommandInfo;
  agentName?: string;
  machineLocation?: string;
  machineName?: string;
}

export default function DispenseReporter({
  active,
  user,
  products,
  transaction,
  command,
  agentName,
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
        agentName,
        machineLocation,
        machineName,
        dedupeKey: key,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [active, user, products, transaction, command, agentName, machineLocation, machineName]);

  return null;
}
