import { SKIN_CONCERNS, SKIN_ROI } from "./constants";
import type { Point2D, RegionStats, SkinAnalysisResult, SkinConcernScore } from "./types";

function clamp(v: number) {
  return Math.max(0, Math.min(10, v));
}

export function severityLevel(value: number): string {
  if (value < 2) return "Minimal";
  if (value < 4) return "Mild";
  if (value < 6) return "Moderate";
  if (value < 8) return "High";
  return "Very high";
}

export function severityColor(value: number): string {
  if (value < 2) return "#43bf84";
  if (value < 4) return "#a9cf3c";
  if (value < 6) return "#f3bd3d";
  if (value < 8) return "#ff7c35";
  return "#ef4e5d";
}

function pt(lm: Array<{ x: number; y: number }>, i: number, width: number, height: number): Point2D {
  const p = lm[i];
  return { x: p.x * width, y: p.y * height };
}

function polygon(
  lm: Array<{ x: number; y: number }>,
  ids: number[],
  width: number,
  height: number
): Point2D[] {
  return ids.map((i) => pt(lm, i, width, height));
}

function bounds(ps: Point2D[], pad = 0, maxWidth = 99999, maxHeight = 99999) {
  const xs = ps.map((p) => p.x);
  const ys = ps.map((p) => p.y);
  const x = Math.max(0, Math.floor(Math.min(...xs) - pad));
  const y = Math.max(0, Math.floor(Math.min(...ys) - pad));
  return {
    x,
    y,
    w: Math.min(maxWidth, Math.ceil(Math.max(...xs) + pad)) - x,
    h: Math.min(maxHeight, Math.ceil(Math.max(...ys) + pad)) - y,
  };
}

function inside(x: number, y: number, ps: Point2D[]) {
  let insidePoly = false;
  for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
    const a = ps[i];
    const b = ps[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      insidePoly = !insidePoly;
    }
  }
  return insidePoly;
}

function statsFromImage(
  imageData: ImageData,
  ps: Point2D[],
  canvasWidth: number,
  canvasHeight: number
): RegionStats | null {
  const b = bounds(ps, 2, canvasWidth, canvasHeight);
  if (b.w < 2 || b.h < 2) return null;

  const clippedX = Math.max(0, b.x);
  const clippedY = Math.max(0, b.y);
  const clippedW = Math.min(canvasWidth - clippedX, b.w);
  const clippedH = Math.min(canvasHeight - clippedY, b.h);
  if (clippedW < 2 || clippedH < 2) return null;

  const d = imageData.data;
  const stride = canvasWidth * 4;

  let n = 0;
  let r = 0;
  let g = 0;
  let bl = 0;
  const lum: number[] = [];
  let red = 0;
  let dark = 0;
  let bright = 0;

  for (let y = 0; y < clippedH; y++) {
    for (let x = 0; x < clippedW; x++) {
      const px = clippedX + x;
      const py = clippedY + y;
      if (!inside(px, py, ps)) continue;

      const k = py * stride + px * 4;
      const R = d[k];
      const G = d[k + 1];
      const B = d[k + 2];
      const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;

      n++;
      r += R;
      g += G;
      bl += B;
      lum.push(L);
      if (R > G * 1.13 && R > B * 1.08) red++;
      if (L < 70) dark++;
      if (L > 220) bright++;
    }
  }

  if (!n) return null;

  const m = lum.reduce((a, v) => a + v, 0) / n;
  const sd = Math.sqrt(lum.reduce((a, v) => a + (v - m) ** 2, 0) / n);

  return {
    lum: m,
    sd,
    red: red / n,
    dark: dark / n,
    bright: bright / n,
    r: r / n,
    g: g / n,
    b: bl / n,
  };
}

function avg(stats: Array<RegionStats | null>, key: keyof RegionStats) {
  const filtered = stats.filter(Boolean) as RegionStats[];
  return filtered.length
    ? filtered.reduce((sum, item) => sum + item[key], 0) / filtered.length
    : 0;
}

/**
 * Heuristic skin signal scorer — POC only, not clinically diagnostic.
 * Ported from newyolo.html MediaPipe demo.
 */
export function analyzeSkinLandmarks(
  lm: Array<{ x: number; y: number }>,
  imageData: ImageData,
  width: number,
  height: number
): SkinAnalysisResult {
  const regionStats: Record<string, RegionStats | null> = {};
  for (const [key, ids] of Object.entries(SKIN_ROI)) {
    regionStats[key] = statsFromImage(imageData, polygon(lm, ids, width, height), width, height);
  }

  const skin = [
    regionStats.forehead,
    regionStats.leftCheek,
    regionStats.rightCheek,
    regionStats.nose,
    regionStats.chin,
  ].filter(Boolean) as RegionStats[];

  const under = [regionStats.leftUnder, regionStats.rightUnder].filter(Boolean) as RegionStats[];
  const lips = regionStats.lips;

  const texture = avg(skin, "sd");
  const red = avg(skin, "red");
  const dark = avg(skin, "dark");
  const bright = avg(skin, "bright");
  const eyeDark = avg(under, "dark");
  const eyeLum = avg(under, "lum");
  const skinLum = avg(skin, "lum");
  const lipDark = lips?.lum ? Math.max(0, (125 - lips.lum) / 15) : 0;

  const values: Record<string, number> = {
    F: clamp((texture - 12) / 2.4),
    DS: clamp((texture - 16) / 2.5 + dark * 10),
    A: clamp((red - 0.025) * 24 + (texture - 18) / 3),
    C: clamp(((regionStats.nose?.sd || 0) - 12) / 2.2 + (texture - 15) / 7),
    W: clamp((texture - 14) / 2.7),
    OP: clamp(((regionStats.nose?.sd || 0) - 11) / 2.0 + (avg([regionStats.leftCheek, regionStats.rightCheek], "sd") - 13) / 3),
    R: clamp((red - 0.02) * 35),
    DL: clamp(lipDark),
    EB: clamp((eyeDark - 0.015) * 18 + (skinLum - eyeLum) / 18),
    DC: clamp((eyeDark - 0.01) * 25 + (skinLum - eyeLum) / 15),
    ST: 0,
    P: clamp((texture - 14) / 3 + dark * 8),
    SB: clamp((texture - 15) / 5),
    SP: clamp((texture - 15) / 2.7 + dark * 8),
    UT: clamp(
      texture / 7 +
        Math.max(
          0,
          20 -
            Math.abs(
              (regionStats.leftCheek?.lum || skinLum) - (regionStats.rightCheek?.lum || skinLum)
            )
        ) /
          20
    ),
    M: 0,
    PA: clamp((texture - 17) / 4 + dark * 5),
    ML: clamp((texture - 18) / 4 + dark * 7),
  };

  const scores: SkinConcernScore[] = SKIN_CONCERNS.map(([code, name]) => {
    const value = +clamp(values[code] ?? 0).toFixed(1);
    return {
      code,
      name,
      value,
      level: severityLevel(value),
      color: severityColor(value),
    };
  });

  const topConcerns = [...scores].sort((a, b) => b.value - a.value).slice(0, 5);

  return {
    scores,
    topConcerns,
    values,
    analyzedAt: new Date().toISOString(),
  };
}
