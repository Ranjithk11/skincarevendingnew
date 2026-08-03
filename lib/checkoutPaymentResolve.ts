export type CheckoutPayment = {
  orderId?: string;
  paymentId?: string;
  qrCodeId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  agentName?: string;
  /** How cash staff was authenticated */
  staffAuthMethod?: "qr" | "password";
  staffHash?: string;
  staffRole?: string;
  staffBranch?: string;
  staffPhone?: string;
  machineId?: string;
  machineName?: string;
  machineLocation?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Client-side: resolve Razorpay pay_xxx for UPI QR checkout before webhooks fire. */
export async function resolveCheckoutPaymentClient(
  payment: CheckoutPayment | null | undefined,
  maxAttempts = 6
): Promise<CheckoutPayment | null | undefined> {
  if (!payment) return payment;
  if (payment.paymentId) return payment;
  if (!payment.qrCodeId && !payment.orderId) return payment;

  const mode = payment.method === "test" ? "test" : "live";
  let latest = { ...payment };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch("/api/razorpay/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: latest.orderId,
          qrCodeId: latest.qrCodeId,
          mode,
        }),
      });
      const data = await res.json();

      if (data.success && data.paymentId) {
        return {
          ...latest,
          paymentId: data.paymentId,
          orderId: data.orderId || latest.orderId,
        };
      }
    } catch (err) {
      console.warn("[resolveCheckoutPaymentClient] attempt failed:", err);
    }

    if (attempt < maxAttempts - 1) {
      await sleep(800 * (attempt + 1));
    }
  }

  return latest;
}
