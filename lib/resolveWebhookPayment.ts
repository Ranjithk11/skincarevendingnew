import {
  resolveCheckoutPaymentClient,
  type CheckoutPayment,
} from "@/lib/checkoutPaymentResolve";

/** Shared client helper for webhook reporter components. */
export async function resolvePaymentForWebhook(
  transaction: CheckoutPayment | null | undefined
): Promise<CheckoutPayment | null | undefined> {
  return resolveCheckoutPaymentClient(transaction, 8);
}
