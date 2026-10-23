"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EVERGRIT_WIPES_DELAY_MS,
  EVERGRIT_WIPES_POPUP_TIMEOUT_MS,
} from "@/lib/evergrit-reset-wipes";

type PromoPhase = "waiting" | "popup" | "slider" | "off";

export function useEvergritWipesPromo(ready: boolean, hasProducts: boolean) {
  const [phase, setPhase] = useState<PromoPhase>("waiting");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || !hasProducts || startedRef.current) return;
    startedRef.current = true;
    const id = window.setTimeout(() => {
      setPhase("popup");
    }, EVERGRIT_WIPES_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [hasProducts, ready]);

  useEffect(() => {
    if (phase !== "popup") return;
    const id = window.setTimeout(() => {
      setPhase("slider");
    }, EVERGRIT_WIPES_POPUP_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const closePopup = useCallback(() => {
    setPhase("slider");
  }, []);

  const openPopup = useCallback(() => {
    setPhase("popup");
  }, []);

  return {
    popupOpen: phase === "popup",
    sliderVisible: phase === "slider",
    closePopup,
    openPopup,
  };
}
