import { keyframes } from "@mui/material";

/** Shared kiosk-report motion — subtle, once-on-enter unless noted. */

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

/** Stagger delay for list/grid children (index-based). */
export function staggerDelay(index: number, stepMs = 70, baseMs = 80): string {
  return `${baseMs + index * stepMs}ms`;
}
