import type { SpinWheelReward } from "./rewards";

export type SpinWheelWebhookInput = {
  reward?: SpinWheelReward | null;
  couponApplied?: boolean;
  discountAmount?: number;
  cartTotal?: number;
  payableTotal?: number;
  appliedAt?: number | string | Date | null;
};

export type SpinWheelWebhookPayload = {
  applied: boolean;
  coupon_code: string;
  segment_id: string;
  reward_type: string;
  title: string;
  description: string;
  won_at: string;
  won_at_ms: number | null;
  applied_at: string;
  redeemed: boolean;
  discount_amount: number | null;
  cart_total_before_discount: number | null;
  payable_total: number | null;
};

export function buildSpinWheelWebhookPayload(
  input: SpinWheelWebhookInput
): SpinWheelWebhookPayload | null {
  const { reward, couponApplied, discountAmount, cartTotal, payableTotal, appliedAt } =
    input;

  if (!reward) return null;

  const appliedAtDate = appliedAt ? new Date(appliedAt) : new Date();
  const wonAtDate = reward.wonAt ? new Date(reward.wonAt) : null;

  return {
    applied: Boolean(couponApplied),
    coupon_code: reward.code || "",
    segment_id: reward.segmentId || "",
    reward_type: reward.type || "",
    title: reward.title || "",
    description: reward.description || "",
    won_at: wonAtDate?.toISOString() || "",
    won_at_ms: reward.wonAt ?? null,
    applied_at: appliedAtDate.toISOString(),
    redeemed: Boolean(reward.redeemed || couponApplied),
    discount_amount: couponApplied ? (discountAmount ?? null) : null,
    cart_total_before_discount: cartTotal ?? null,
    payable_total: payableTotal ?? null,
  };
}
