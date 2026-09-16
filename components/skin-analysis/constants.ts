import type { SkinConcernCode } from "./types";

/** LeafWater brand green — matches KioskReport. */
export const SKIN_SCAN_GREEN = "#2F5D46";
export const SKIN_SCAN_GREEN_LIGHT = "#edf6ed";
export const SKIN_SCAN_BORDER = "#d7e5da";

/** Prefer local WASM (kiosk-friendly). Falls back to CDN if missing. */
export const MEDIAPIPE_WASM_BASE = "/mediapipe/wasm";

export const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** 18 visual skin signals from the POC (non-diagnostic). */
export const SKIN_CONCERNS: Array<[SkinConcernCode, string]> = [
  ["F", "Fine Lines"],
  ["DS", "Dark Spots"],
  ["A", "Acne"],
  ["C", "Comedone"],
  ["W", "Wrinkle"],
  ["OP", "Open Pores"],
  ["R", "Rashes"],
  ["DL", "Dark Lips"],
  ["EB", "Eye Bag"],
  ["DC", "Dark Circles"],
  ["ST", "Skin Tags"],
  ["P", "Pigmentation"],
  ["SB", "Skin Bag"],
  ["SP", "Spot"],
  ["UT", "Uneven Tone"],
  ["M", "Mole"],
  ["PA", "Patches"],
  ["ML", "Melasma"],
];

/** Approximate ROI landmark indices — display regions, not trained lesion masks. */
export const SKIN_ROI: Record<string, number[]> = {
  forehead: [10, 338, 297, 332, 284, 251, 389, 356, 127, 162, 54, 21],
  leftCheek: [50, 101, 118, 117, 111, 123, 147, 187, 205, 36, 206],
  rightCheek: [280, 330, 347, 346, 340, 355, 376, 411, 425, 266, 426],
  nose: [168, 6, 197, 195, 5, 4, 1, 19, 94, 48],
  chin: [149, 150, 152, 175, 199, 200, 428, 379, 378, 377],
  leftEye: [33, 160, 159, 145, 153, 154, 155, 133],
  rightEye: [362, 385, 386, 374, 380, 381, 382, 263],
  leftUnder: [33, 160, 159, 145, 153, 154, 155, 133, 173, 147, 187],
  rightUnder: [362, 385, 386, 374, 380, 381, 382, 263, 398, 376, 411],
  lips: [61, 146, 91, 181, 84, 17, 314, 405, 321, 291, 375, 409, 270, 269],
  jaw: [172, 136, 150, 149, 176, 148, 152, 377, 400, 379, 365, 397, 361, 454],
};

export const SKIN_ANCHOR: Partial<
  Record<SkinConcernCode, [string, number[]]>
> = {
  F: ["Fine Lines", SKIN_ROI.forehead],
  DS: ["Dark Spots", SKIN_ROI.forehead],
  A: ["Acne", SKIN_ROI.leftCheek],
  C: ["Comedone", SKIN_ROI.nose],
  W: ["Wrinkle", SKIN_ROI.forehead],
  OP: ["Open Pores", SKIN_ROI.rightCheek],
  R: ["Rashes", SKIN_ROI.rightCheek],
  DL: ["Dark Lips", SKIN_ROI.lips],
  EB: ["Eye Bag", SKIN_ROI.leftUnder],
  DC: ["Dark Circles", SKIN_ROI.rightUnder],
  P: ["Pigmentation", SKIN_ROI.leftCheek],
  SB: ["Skin Bag", SKIN_ROI.jaw],
  SP: ["Spot", SKIN_ROI.rightCheek],
  UT: ["Uneven Tone", SKIN_ROI.forehead],
  PA: ["Patches", SKIN_ROI.forehead],
  ML: ["Melasma", SKIN_ROI.leftCheek],
};

export const DEFAULT_SCAN_DISPLAY = {
  showLabels: true,
  showHotspots: true,
  showMesh: false,
  showZones: true,
};
