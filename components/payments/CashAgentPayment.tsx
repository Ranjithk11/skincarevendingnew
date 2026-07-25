"use client";

import { useCallback } from "react";
import type { CashAuthResult } from "@/lib/staff-qr";
import { CashStaffAuthFlow } from "@/components/payments/staff-qr";

interface CashAgentPaymentProps {
  amount: number;
  onBack: () => void;
  /**
   * Called after successful staff auth.
   * Accepts legacy string (agent name) or structured CashAuthResult.
   */
  onConfirmed: (result: CashAuthResult | string) => void;
}

/**
 * Cash payment staff gate.
 * Default path: QR scan → verify → confirm.
 * Fallback: agent name + password.
 */
export default function CashAgentPayment({
  amount,
  onBack,
  onConfirmed,
}: CashAgentPaymentProps) {
  const handleConfirmed = useCallback(
    (result: CashAuthResult) => {
      onConfirmed(result);
    },
    [onConfirmed]
  );

  return (
    <CashStaffAuthFlow
      amount={amount}
      onBack={onBack}
      onConfirmed={handleConfirmed}
      preferQr
    />
  );
}
