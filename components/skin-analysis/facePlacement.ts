export type FacePlacementIssue =
  | "no-face"
  | "too-far"
  | "too-close"
  | "tilt"
  | "ok";

export type FacePlacementResult = {
  ok: boolean;
  issue: FacePlacementIssue;
  suggestion: string;
};

const SUGGESTIONS: Record<FacePlacementIssue, string> = {
  "no-face": "Look at the camera so we can see your face",
  "too-far": "Come a little closer",
  "too-close": "Step a little farther back",
  tilt: "Keep your head straight and level",
  ok: "Great — scanning your skin now",
};

const IDX = {
  nose: 1,
  chin: 152,
  forehead: 10,
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftCheek: 234,
  rightCheek: 454,
};

function deg(rad: number) {
  return (rad * 180) / Math.PI;
}

/** Light face check — no oval framing required. */
export function evaluateFacePlacement(
  lm: Array<{ x: number; y: number; z?: number }>
): FacePlacementResult {
  if (!lm?.length) {
    return { ok: false, issue: "no-face", suggestion: SUGGESTIONS["no-face"] };
  }

  const leftEye = lm[IDX.leftEyeOuter];
  const rightEye = lm[IDX.rightEyeOuter];
  const nose = lm[IDX.nose];
  if (!leftEye || !rightEye || !nose) {
    return { ok: false, issue: "no-face", suggestion: SUGGESTIONS["no-face"] };
  }

  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  if (eyeDist < 0.09) {
    return { ok: false, issue: "too-far", suggestion: SUGGESTIONS["too-far"] };
  }
  if (eyeDist > 0.45) {
    return { ok: false, issue: "too-close", suggestion: SUGGESTIONS["too-close"] };
  }

  const roll = Math.abs(deg(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)));
  if (roll > 14) {
    return { ok: false, issue: "tilt", suggestion: SUGGESTIONS.tilt };
  }

  return { ok: true, issue: "ok", suggestion: SUGGESTIONS.ok };
}
