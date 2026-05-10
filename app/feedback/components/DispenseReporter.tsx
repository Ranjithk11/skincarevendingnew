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
}

/**
 * Side-effect-only React component that fires the `dispense_success` webhook
 * exactly once per `(orderId + productId)` per browser session whenever `active`
 * becomes `true`.
 *
 * It renders nothing — it lives purely to encapsulate the side effect so the
 * parent component doesn't get cluttered with webhook plumbing.
 */
export default function DispenseReporter({
  active,
  user,
  products,
  transaction,
  command,
  machineLocation,
}: DispenseReporterProps) {
  const lastFiredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!transaction?.orderId) return;

    const key = `dispense::${transaction.orderId}::${command?.productId || ""}`;
    if (lastFiredKeyRef.current === key) return;
    lastFiredKeyRef.current = key;

    void sendDispenseSuccessWebhook({
      user,
      products,
      transaction,
      command,
      machineLocation,
      dedupeKey: key,
    });
  }, [active, user, products, transaction, command, machineLocation]);

  return null;
}
