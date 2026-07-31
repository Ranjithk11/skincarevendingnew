"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  dispenseSuccessWebhookDedupeKeys,
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
  const payloadRef = useRef({
    user,
    products,
    command,
    agentName,
    machineLocation,
    machineName,
  });
  payloadRef.current = {
    user,
    products,
    command,
    agentName,
    machineLocation,
    machineName,
  };

  const txIdentity = useMemo(
    () =>
      [
        transaction?.orderId || "",
        transaction?.paymentId || "",
        transaction?.qrCodeId || "",
        command?.slotId ?? "",
        command?.productId ?? "",
      ].join("|"),
    [
      transaction?.orderId,
      transaction?.paymentId,
      transaction?.qrCodeId,
      command?.slotId,
      command?.productId,
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

      const latest = payloadRef.current;
      const slotKey = String(
        latest.command?.slotId ?? latest.command?.productId ?? ""
      );
      const keys = dispenseSuccessWebhookDedupeKeys(resolvedTx, slotKey);
      const key = keys[0] || "";
      if (!key) return;
      if (lastFiredKeyRef.current === key) return;
      if (
        lastFiredKeyRef.current &&
        keys.some((k) => k === lastFiredKeyRef.current)
      ) {
        return;
      }
      lastFiredKeyRef.current = key;

      void sendDispenseSuccessWebhook({
        user: latest.user,
        products: latest.products,
        transaction: resolvedTx,
        command: latest.command,
        agentName: latest.agentName,
        machineLocation: latest.machineLocation,
        machineName: latest.machineName,
        dedupeKey: key,
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, txIdentity]);

  return null;
}
