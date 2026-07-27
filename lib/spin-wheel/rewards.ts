export type SpinRewardType =
  | "PERCENT_EXTRA_5"
  | "FREE_CONSULTATION"
  | "PERCENT_BIRTHDAY_15"
  | "FLAT_100"
  | "FLAT_200_MIN_2999"
  | "NO_PRIZE";

export type SpinWheelIconKey =
  | "percent_tag"
  | "headset"
  | "gift"
  | "shopping_bag"
  | "cart"
  | "sad_face";

export type SpinWheelSegment = {
  id: string;
  code: string;
  type: SpinRewardType;
  title: string;
  titleLines: string[];
  description: string;
  fill: string;
  /** Canvas / UI icon key for this segment. */
  icon: SpinWheelIconKey;
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
    icon: "percent_tag",
    appliesToCart: true,
  },
  {
    id: "free_consultation",
    code: "SPIN-CONSULT",
    type: "FREE_CONSULTATION",
    title: "FREE CONSULTATION",
    titleLines: ["FREE CONSULTATION"],
    description: "Get a free consultation with our experienced doctors.",
    fill: "#E8F5E9",
    icon: "headset",
    appliesToCart: false,
  },
  {
    id: "birthday_15",
    code: "SPIN-BDAY15",
    type: "PERCENT_BIRTHDAY_15",
    title: "IT'S YOUR BIRTHDAY? EXTRA 15% OFF!",
    titleLines: ["IT'S YOUR BIRTHDAY?", "EXTRA 15% OFF!"],
    description:
      "Extra 15% OFF on your birthday (orders above ₹1,000). Share your details — this offer is for your birthday only and is not applied to the current purchase.",
    fill: "#F9C6D1",
    icon: "gift",
    appliesToCart: false,
  },
  {
    id: "flat_100",
    code: "SPIN-OFF100",
    type: "FLAT_100",
    title: "₹100 OFF ON NEXT PURCHASE",
    titleLines: ["₹100 OFF", "ON NEXT PURCHASE"],
    description:
      "Get ₹100 off on your next purchase above ₹1,000. Share your details — this offer is for your next visit only and is not applied to the current purchase.",
    fill: "#F1E4CE",
    icon: "shopping_bag",
    appliesToCart: false,
  },
  {
    id: "flat_200_min",
    code: "SPIN-OFF200",
    type: "FLAT_200_MIN_2999",
    title: "FLAT ₹200 OFF ABOVE ₹2,999",
    titleLines: ["FLAT ₹200 OFF", "ABOVE ₹2,999"],
    description: "Enjoy flat ₹200 off on orders above ₹2,999.",
    fill: "#D6EAF8",
    icon: "cart",
    appliesToCart: true,
  },
  {
    id: "no_prize",
    code: "SPIN-NOWIN",
    type: "NO_PRIZE",
    title: "BETTER LUCK NEXT TIME!",
    titleLines: ["BETTER LUCK", "NEXT TIME!"],
    description: "Thank you for participating! Try again.",
    fill: "#E8D5F0",
    icon: "sad_face",
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

/** True for rewards that must never reduce the current cart total. */
export function isDeferredSpinReward(
  reward: SpinWheelReward | null | undefined
): boolean {
  if (!reward) return false;
  const code = String(reward.code || "")
    .toUpperCase()
    .replace(/\s+/g, "");
  const type = String(reward.type || "").toUpperCase();
  const segmentId = String(reward.segmentId || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  const title = String(reward.title || "").toUpperCase();

  return (
    type === "FLAT_100" ||
    type === "PERCENT_BIRTHDAY_15" ||
    code === "SPIN-OFF100" ||
    code === "SPIN-BDAY15" ||
    code.includes("OFF100") ||
    segmentId === "flat_100" ||
    segmentId === "birthday_15" ||
    title.includes("NEXT PURCHASE") ||
    title.includes("BIRTHDAY")
  );
}

/** ₹100 next-visit offer (lead capture only — never cart discount). */
export function isNextPurchaseSpinReward(
  reward: SpinWheelReward | null | undefined
): boolean {
  if (!reward) return false;
  const code = String(reward.code || "")
    .toUpperCase()
    .replace(/\s+/g, "");
  const type = String(reward.type || "").toUpperCase();
  const segmentId = String(reward.segmentId || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  const title = String(reward.title || "").toUpperCase();

  return (
    type === "FLAT_100" ||
    code === "SPIN-OFF100" ||
    code.includes("OFF100") ||
    segmentId === "flat_100" ||
    title.includes("NEXT PURCHASE")
  );
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

  // Hard stop first — never let next-purchase / birthday reduce cart.
  if (isNextPurchaseSpinReward(reward)) {
    return {
      discount: 0,
      canApply: false,
      message:
        "₹100 OFF is for your next purchase only. Share your details on the spin wheel — it will not be applied to this purchase.",
      reason: "next_purchase_only",
    };
  }

  if (isDeferredSpinReward(reward)) {
    return {
      discount: 0,
      canApply: false,
      message:
        "Birthday 15% OFF is for your birthday only. Your details were saved — it will not be applied to this purchase.",
      reason: "birthday_only",
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
    case "FLAT_100":
      // Safety net — must never reach cart math.
      return {
        discount: 0,
        canApply: false,
        message:
          "₹100 OFF is for your next purchase only. It will not be applied to this purchase.",
        reason: "next_purchase_only",
      };
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
