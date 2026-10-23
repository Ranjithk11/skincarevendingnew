import { keyframes } from "@mui/material";

export const wipeFadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

export const wipeGoldSheen = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`;

export const wipeSlideInRight = keyframes`
  from { opacity: 0; transform: translateX(110%); }
  to { opacity: 1; transform: translateX(0); }
`;

export const wipeHighlightPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(196, 163, 90, 0.35);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(196, 163, 90, 0);
    transform: scale(1.06);
  }
`;
