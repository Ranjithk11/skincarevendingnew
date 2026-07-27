import type { SpinWheelReward } from "./rewards";

const SCOPE_KEY = "kiosk_spin_scope_id";
const REWARD_PREFIX = "spin_wheel_reward_";
const NEXT_PURCHASE_LEAD_PREFIX = "spin_wheel_next_purchase_lead_";
export const SPIN_WHEEL_CLEAR_EVENT = "spin-wheel-session-cleared";

function rewardKey(scopeId: string): string {
  return `${REWARD_PREFIX}${scopeId}`;
}

function nextPurchaseLeadKey(scopeId: string): string {
  return `${NEXT_PURCHASE_LEAD_PREFIX}${scopeId}`;
}

function createWalkInScopeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `walkin_${crypto.randomUUID()}`;
  }
  return `walkin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Each kiosk visitor gets an isolated scope:
 * - logged-in scan users: NextAuth user id
 * - walk-ins: a random id stored in sessionStorage for this browser session
 */
export function getSpinWheelScopeId(
  session: { user?: Record<string, unknown> } | null | undefined
): string {
  if (typeof window === "undefined") return "server";

  const sessionUserId = session?.user?.id;
  if (sessionUserId && String(sessionUserId).includes("/")) {
    return String(sessionUserId);
  }

  const existing = window.sessionStorage.getItem(SCOPE_KEY)?.trim();
  if (existing) return existing;

  const scopeId = createWalkInScopeId();
  window.sessionStorage.setItem(SCOPE_KEY, scopeId);
  return scopeId;
}

export function readSpinWheelReward(scopeId: string): SpinWheelReward | null {
  if (typeof window === "undefined" || !scopeId) return null;

  try {
    const raw = window.sessionStorage.getItem(rewardKey(scopeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpinWheelReward;
    if (!parsed?.segmentId || !parsed?.code) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSpinWheelReward(scopeId: string, reward: SpinWheelReward): void {
  if (typeof window === "undefined" || !scopeId) return;
  window.sessionStorage.setItem(rewardKey(scopeId), JSON.stringify(reward));
}

export function markSpinWheelRewardRedeemed(scopeId: string): SpinWheelReward | null {
  const reward = readSpinWheelReward(scopeId);
  if (!reward || reward.redeemed) return reward;

  const next = { ...reward, redeemed: true };
  writeSpinWheelReward(scopeId, next);
  return next;
}

/** Whether the ₹100 next-purchase lead was already submitted this session. */
export function isNextPurchaseLeadClaimed(scopeId: string): boolean {
  if (typeof window === "undefined" || !scopeId) return false;
  return window.sessionStorage.getItem(nextPurchaseLeadKey(scopeId)) === "1";
}

export function markNextPurchaseLeadClaimed(scopeId: string): void {
  if (typeof window === "undefined" || !scopeId) return;
  window.sessionStorage.setItem(nextPurchaseLeadKey(scopeId), "1");
}

/** Clears spin wheel state for the current browser session (call on logout / idle reset). */
export function clearSpinWheelSession(): void {
  if (typeof window === "undefined") return;

  const scopeId = window.sessionStorage.getItem(SCOPE_KEY)?.trim();
  if (scopeId) {
    window.sessionStorage.removeItem(rewardKey(scopeId));
    window.sessionStorage.removeItem(nextPurchaseLeadKey(scopeId));
  }

  window.sessionStorage.removeItem(SCOPE_KEY);

  for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = window.sessionStorage.key(i);
    if (
      key?.startsWith(REWARD_PREFIX) ||
      key?.startsWith(NEXT_PURCHASE_LEAD_PREFIX)
    ) {
      window.sessionStorage.removeItem(key);
    }
  }

  window.dispatchEvent(new Event(SPIN_WHEEL_CLEAR_EVENT));
}
