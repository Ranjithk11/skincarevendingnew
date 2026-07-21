export type SpinRewardType =
  | "PERCENT_EXTRA_5"
  | "FREE_CONSULTATION"
  | "PERCENT_BIRTHDAY_15"
  | "FLAT_100"
  | "FLAT_200_MIN_2999"
  | "NO_PRIZE";

export type SpinWheelSegment = {
  id: string;
  code: string;
  type: SpinRewardType;
  title: string;
  titleLines: string[];
  description: string;
  fill: string;
  /** Whether this reward can reduce the cart total at checkout. */
  appliesToCart: boolean;
};

export const SPIN_WHEEL_SEGMENTS: SpinWheelSegment[] = [
  {
    id: "extra_5",
    code: "SPIN-EXTRA5",
    type: "PERCENT_EXTRA_5",
    title: "5% EXTRA OFF",
    titleLines: ["5% EXTRA OFF"],
    description: "Get an additional 5% discount on orders above ₹500.",
    fill: "#F7C9D3",
    appliesToCart: true,
  },
  {
    id: "free_consultation",
    code: "SPIN-CONSULT",
    type: "FREE_CONSULTATION",
    title: "FREE CONSULTATION",
    titleLines: ["FREE CONSULTATION"],
    description: "Get a free consultation with our experienced doctors.",
    fill: "#F5EADA",
    appliesToCart: false,
  },
  {
    id: "birthday_15",
    code: "SPIN-BDAY15",
    type: "PERCENT_BIRTHDAY_15",
    title: "IT'S YOUR BIRTHDAY? EXTRA 15% OFF!",
    titleLines: ["IT'S YOUR BIRTHDAY?", "EXTRA 15% OFF!"],
    description: "Celebrate with an extra 15% OFF on orders above ₹1,000.",
    fill: "#F9C6D1",
    appliesToCart: true,
  },
  {
    id: "flat_100",
    code: "SPIN-OFF100",
    type: "FLAT_100",
    title: "₹100 OFF ON NEXT PURCHASE",
    titleLines: ["₹100 OFF", "ON NEXT PURCHASE"],
    description: "Get ₹100 off on your next purchase above ₹1,000.",
    fill: "#F1E4CE",
    appliesToCart: true,
  },
  {
    id: "flat_200_min",
    code: "SPIN-OFF200",
    type: "FLAT_200_MIN_2999",
    title: "FLAT ₹200 OFF ABOVE ₹2,999",
    titleLines: ["FLAT ₹200 OFF", "ABOVE ₹2,999"],
    description: "Enjoy flat ₹200 off on orders above ₹2,999.",
    fill: "#E7D2E4",
    appliesToCart: true,
  },
  {
    id: "no_prize",
    code: "SPIN-NOWIN",
    type: "NO_PRIZE",
    title: "BETTER LUCK NEXT TIME!",
    titleLines: ["BETTER LUCK", "NEXT TIME!"],
    description: "Thank you for participating! Try again.",
    fill: "#C7A6BE",
    appliesToCart: false,
  },
];

export type SpinWheelReward = {
  segmentId: string;
  code: string;
  type: SpinRewardType;
  title: string;
  description: string;
  wonAt: number;
  redeemed?: boolean;
};

export type SpinWheelDiscountResult = {
  discount: number;
  canApply: boolean;
  message: string;
  reason?: string;
};

const EXTRA_5_MIN_ORDER = 500;
const BIRTHDAY_15_MIN_ORDER = 1000;
const FLAT_100_MIN_ORDER = 1000;
const FLAT_200_MIN_ORDER = 2999;

function minOrderNotMet(minOrder: number): SpinWheelDiscountResult {
  return {
    discount: 0,
    canApply: false,
    message: `Add items worth ₹${minOrder.toLocaleString("en-IN")} or more to use this reward.`,
    reason: "min_order_not_met",
  };
}

export function getSegmentById(segmentId: string): SpinWheelSegment | undefined {
  return SPIN_WHEEL_SEGMENTS.find((segment) => segment.id === segmentId);
}

export function getSegmentByCode(code: string): SpinWheelSegment | undefined {
  const normalized = code.trim().toUpperCase();
  return SPIN_WHEEL_SEGMENTS.find((segment) => segment.code === normalized);
}

export function createRewardFromSegment(segment: SpinWheelSegment): SpinWheelReward {
  return {
    segmentId: segment.id,
    code: segment.code,
    type: segment.type,
    title: segment.title,
    description: segment.description,
    wonAt: Date.now(),
    redeemed: false,
  };
}

export function computeSpinWheelDiscount(
  reward: SpinWheelReward | null | undefined,
  cartTotal: number
): SpinWheelDiscountResult {
  if (!reward) {
    return {
      discount: 0,
      canApply: false,
      message: "No spin wheel reward found for this session.",
      reason: "missing_reward",
    };
  }

  if (reward.redeemed) {
    return {
      discount: 0,
      canApply: false,
      message: "This spin wheel reward has already been used.",
      reason: "already_redeemed",
    };
  }

  const segment = getSegmentById(reward.segmentId);
  if (!segment) {
    return {
      discount: 0,
      canApply: false,
      message: "Invalid spin wheel reward.",
      reason: "invalid_reward",
    };
  }

  if (!segment.appliesToCart || reward.type === "NO_PRIZE") {
    return {
      discount: 0,
      canApply: false,
      message: segment.description,
      reason: "non_monetary",
    };
  }

  if (!Number.isFinite(cartTotal) || cartTotal <= 0) {
    return {
      discount: 0,
      canApply: false,
      message: "Add products to your cart before applying this reward.",
      reason: "empty_cart",
    };
  }

  switch (reward.type) {
    case "PERCENT_EXTRA_5": {
      if (cartTotal < EXTRA_5_MIN_ORDER) {
        return minOrderNotMet(EXTRA_5_MIN_ORDER);
      }
      const discount = Math.round(cartTotal * 0.05);
      return {
        discount,
        canApply: discount > 0,
        message: "Extra 5% discount applied from your spin wheel reward.",
      };
    }
    case "PERCENT_BIRTHDAY_15": {
      if (cartTotal < BIRTHDAY_15_MIN_ORDER) {
        return minOrderNotMet(BIRTHDAY_15_MIN_ORDER);
      }
      const discount = Math.round(cartTotal * 0.15);
      return {
        discount,
        canApply: discount > 0,
        message: "Birthday extra 15% discount applied from your spin wheel reward.",
      };
    }
    case "FLAT_100": {
      if (cartTotal < FLAT_100_MIN_ORDER) {
        return minOrderNotMet(FLAT_100_MIN_ORDER);
      }
      const discount = Math.min(100, Math.round(cartTotal));
      return {
        discount,
        canApply: discount > 0,
        message: "₹100 off applied from your spin wheel reward.",
      };
    }
    case "FLAT_200_MIN_2999": {
      if (cartTotal < FLAT_200_MIN_ORDER) {
        return minOrderNotMet(FLAT_200_MIN_ORDER);
      }
      const discount = Math.min(200, Math.round(cartTotal));
      return {
        discount,
        canApply: discount > 0,
        message: "Flat ₹200 off applied from your spin wheel reward.",
      };
    }
    case "FREE_CONSULTATION":
      return {
        discount: 0,
        canApply: false,
        message: "Free consultation will be arranged separately. It does not apply to cart total.",
        reason: "non_monetary",
      };
    default:
      return {
        discount: 0,
        canApply: false,
        message: "This reward cannot be applied to your cart.",
        reason: "unsupported",
      };
  }
}

export function getRewardSummary(reward: SpinWheelReward | null | undefined): string {
  if (!reward) return "";
  if (reward.redeemed) return `${reward.code} (used)`;
  return reward.code;
}
