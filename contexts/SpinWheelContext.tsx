"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import {
  SPIN_WHEEL_SEGMENTS,
  computeSpinWheelDiscount,
  createRewardFromSegment,
  type SpinWheelDiscountResult,
  type SpinWheelReward,
} from "@/lib/spin-wheel/rewards";
import {
  clearSpinWheelSession,
  getSpinWheelScopeId,
  markSpinWheelRewardRedeemed,
  readSpinWheelReward,
  SPIN_WHEEL_CLEAR_EVENT,
  writeSpinWheelReward,
} from "@/lib/spin-wheel/session";

type SpinWheelContextValue = {
  scopeId: string;
  reward: SpinWheelReward | null;
  hasSpun: boolean;
  isSpinning: boolean;
  segments: typeof SPIN_WHEEL_SEGMENTS;
  saveReward: (segmentIndex: number) => SpinWheelReward;
  setIsSpinning: (value: boolean) => void;
  reloadReward: () => void;
  clearRewardSession: () => void;
  markRewardRedeemed: () => void;
  validateForCart: (cartTotal: number) => SpinWheelDiscountResult;
};

const SpinWheelContext = createContext<SpinWheelContextValue | null>(null);

export function SpinWheelProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [scopeVersion, setScopeVersion] = useState(0);
  const scopeId = useMemo(() => {
    void scopeVersion;
    return getSpinWheelScopeId(session);
  }, [session, scopeVersion]);
  const [reward, setReward] = useState<SpinWheelReward | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const reloadReward = useCallback(() => {
    setReward(readSpinWheelReward(scopeId));
  }, [scopeId]);

  useEffect(() => {
    reloadReward();
  }, [reloadReward]);

  useEffect(() => {
    const handleClear = () => {
      setScopeVersion((value) => value + 1);
      setReward(null);
      setIsSpinning(false);
    };

    window.addEventListener(SPIN_WHEEL_CLEAR_EVENT, handleClear);
    return () => window.removeEventListener(SPIN_WHEEL_CLEAR_EVENT, handleClear);
  }, []);

  const saveReward = useCallback(
    (segmentIndex: number) => {
      const segment = SPIN_WHEEL_SEGMENTS[segmentIndex];
      if (!segment) {
        throw new Error("Invalid spin wheel segment");
      }

      const next = createRewardFromSegment(segment);
      writeSpinWheelReward(scopeId, next);
      setReward(next);
      return next;
    },
    [scopeId]
  );

  const clearRewardSession = useCallback(() => {
    clearSpinWheelSession();
    setReward(null);
    setIsSpinning(false);
  }, []);

  const markRewardRedeemed = useCallback(() => {
    const next = markSpinWheelRewardRedeemed(scopeId);
    setReward(next);
  }, [scopeId]);

  const validateForCart = useCallback(
    (cartTotal: number) => computeSpinWheelDiscount(reward, cartTotal),
    [reward]
  );

  const value = useMemo(
    () => ({
      scopeId,
      reward,
      hasSpun: Boolean(reward),
      isSpinning,
      segments: SPIN_WHEEL_SEGMENTS,
      saveReward,
      setIsSpinning,
      reloadReward,
      clearRewardSession,
      markRewardRedeemed,
      validateForCart,
    }),
    [
      scopeId,
      reward,
      isSpinning,
      saveReward,
      reloadReward,
      clearRewardSession,
      markRewardRedeemed,
      validateForCart,
    ]
  );

  return <SpinWheelContext.Provider value={value}>{children}</SpinWheelContext.Provider>;
}

export function useSpinWheel(): SpinWheelContextValue {
  const ctx = useContext(SpinWheelContext);
  if (!ctx) {
    throw new Error("useSpinWheel must be used within SpinWheelProvider");
  }
  return ctx;
}
