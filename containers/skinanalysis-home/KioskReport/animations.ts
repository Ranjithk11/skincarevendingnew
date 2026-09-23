import { keyframes } from "@mui/material";

/** Shared kiosk-report motion — subtle, once-on-enter unless noted. */

export const PREMIUM_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const softPulse = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(229, 57, 53, 0);
  }
  50% {
    transform: scale(1.03);
    box-shadow: 0 0 0 6px rgba(229, 57, 53, 0.12);
  }
`;

export const cornerPulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`;

export const selectPop = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.04); }
  100% { transform: scale(1); }
`;

/** Modal paper: rise + soft scale into the kiosk frame. */
export const dialogRise = keyframes`
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

/** Soft opacity breathe for info icons — no scale bounce. */
export const infoGlow = keyframes`
  0%, 100% {
    opacity: 0.72;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 0 3px rgba(47, 93, 70, 0.12);
  }
`;

/** Light sweep across badges / save pills. */
export const shimmerSweep = keyframes`
  0% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
`;

/** Gentle vertical float for teaser icons. */
export const gentleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

/** Arrow nudge to invite “View”. */
export const arrowNudge = keyframes`
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
`;

/** Image / media reveal inside cards. */
export const imageReveal = keyframes`
  from {
    opacity: 0;
    transform: scale(1.06);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

/** CTA press success flash when routine/product is added. */
export const successFlash = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(47, 93, 70, 0.35);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(47, 93, 70, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(47, 93, 70, 0);
  }
`;

/** Stagger delay for list/grid children (index-based). */
export function staggerDelay(index: number, stepMs = 70, baseMs = 80): string {
  return `${baseMs + index * stepMs}ms`;
}
