import Razorpay from "razorpay";

export type RazorpayMode = "test" | "live";

export function createRazorpayClient(mode: RazorpayMode = "test"): Razorpay | null {
  const keyId =
    mode === "live"
      ? process.env.RAZORPAY_LIVE_KEY_ID || ""
      : process.env.RAZORPAY_TEST_KEY_ID || "";
  const keySecret =
    mode === "live"
      ? process.env.RAZORPAY_LIVE_KEY_SECRET || ""
      : process.env.RAZORPAY_TEST_KEY_SECRET || "";

  if (!keyId || !keySecret) return null;

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickPaymentId(payment: Record<string, unknown> | null | undefined): string {
  if (!payment) return "";
  const id = payment.id ?? payment.payment_id;
  return typeof id === "string" ? id : "";
}

/**
 * Resolve Razorpay payment id for UPI QR flows.
 * QR payments are NOT linked to the pre-created order — always prefer qrCodeId.
 */
export async function resolveRazorpayPaymentId(
  razorpay: Razorpay,
  opts: { qrCodeId?: string; orderId?: string },
  maxAttempts = 5
): Promise<{ paymentId: string; orderId: string }> {
  let paymentId = "";
  let orderId = opts.orderId || "";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (opts.qrCodeId) {
      try {
        const payments = await (razorpay as any).qrCode.fetchAllPayments(
          opts.qrCodeId,
          { count: 20 }
        );
        for (const payment of payments?.items || []) {
          const id = pickPaymentId(payment);
          if (id) {
            paymentId = id;
            orderId = (payment as { order_id?: string })?.order_id || orderId;
            break;
          }
        }
      } catch (err) {
        console.warn("[resolveRazorpayPaymentId] QR fetchAllPayments failed:", err);
      }
    }

    if (!paymentId && orderId) {
      try {
        const orderPayments = await razorpay.orders.fetchPayments(orderId);
        for (const payment of (orderPayments as { items?: unknown[] })?.items || []) {
          const id = pickPaymentId(payment as Record<string, unknown>);
          if (id) {
            paymentId = id;
            break;
          }
        }
      } catch (err) {
        console.warn("[resolveRazorpayPaymentId] orders.fetchPayments failed:", err);
      }
    }

    if (paymentId) break;
    if (attempt < maxAttempts - 1) {
      await sleep(800 * (attempt + 1));
    }
  }

  return { paymentId, orderId };
}

export async function checkQrPaymentStatus(
  razorpay: Razorpay,
  qrCodeId: string,
  orderId?: string
) {
  const qrCode = await (razorpay as any).qrCode.fetch(qrCodeId);
  const paymentsReceived = Number(qrCode?.payments_count_received || 0);
  const paid = paymentsReceived > 0;

  if (!paid) {
    return {
      paid: false as const,
      status: qrCode?.status as string | undefined,
      paymentId: "",
      orderId: orderId || "",
      amount: qrCode?.payment_amount as number | undefined,
    };
  }

  const resolved = await resolveRazorpayPaymentId(
    razorpay,
    { qrCodeId, orderId },
    5
  );

  return {
    paid: true as const,
    status: qrCode?.status as string | undefined,
    paymentId: resolved.paymentId,
    orderId: resolved.orderId || orderId || "",
    amount: qrCode?.payment_amount as number | undefined,
  };
}
