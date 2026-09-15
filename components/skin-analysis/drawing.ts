import { FaceLandmarker, type DrawingUtils } from "@mediapipe/tasks-vision";
import { SKIN_ANCHOR, SKIN_ROI } from "./constants";
import { severityColor } from "./analyzer";
import type { Point2D, SkinScanDisplayOptions } from "./types";

function pt(
  lm: Array<{ x: number; y: number }>,
  i: number,
  width: number,
  height: number,
  mirrorX: boolean
): Point2D {
  const p = lm[i];
  const xNorm = mirrorX ? 1 - p.x : p.x;
  return { x: xNorm * width, y: p.y * height };
}

function polygon(
  lm: Array<{ x: number; y: number }>,
  ids: number[],
  width: number,
  height: number,
  mirrorX: boolean
): Point2D[] {
  return ids.map((i) => pt(lm, i, width, height, mirrorX));
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

function mirrorLandmarks(lm: Array<{ x: number; y: number }>) {
  return lm.map((p) => ({ ...p, x: 1 - p.x }));
}

export function drawSkinScanOverlay(
  ctx: CanvasRenderingContext2D,
  lm: Array<{ x: number; y: number }>,
  values: Record<string, number>,
  options: SkinScanDisplayOptions,
  drawingUtils?: DrawingUtils,
  /** When video is CSS-mirrored, flip landmark X in canvas space so labels stay readable. */
  mirrorX = false
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  const drawLm = mirrorX ? mirrorLandmarks(lm) : lm;

  if (options.showMesh && drawingUtils) {
    drawingUtils.drawConnectors(
      drawLm as Parameters<DrawingUtils["drawConnectors"]>[0],
      FaceLandmarker.FACE_LANDMARKS_TESSELATION,
      {
        color: "rgba(47, 93, 70, 0.18)",
        lineWidth: 0.35,
      }
    );
  }

  if (options.showZones) {
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(47, 93, 70, 0.35)";
    ctx.lineWidth = 1;
    for (const ids of [
      SKIN_ROI.forehead,
      SKIN_ROI.leftCheek,
      SKIN_ROI.rightCheek,
      SKIN_ROI.leftUnder,
      SKIN_ROI.rightUnder,
      SKIN_ROI.lips,
    ]) {
      const ps = polygon(lm, ids, width, height, mirrorX);
      ctx.beginPath();
      ps.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  if (!options.showHotspots) return;

  const picks = Object.entries(values)
    .filter(([code, value]) => value >= 3 && SKIN_ANCHOR[code as keyof typeof SKIN_ANCHOR])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);

  picks.forEach(([code, value], i) => {
    const anchor = SKIN_ANCHOR[code as keyof typeof SKIN_ANCHOR];
    if (!anchor) return;

    const [name, ids] = anchor;
    const ps = polygon(lm, ids, width, height, mirrorX);
    const b = bounds(ps, 0, width, height);
    const x = b.x + b.w / 2;
    const y = b.y + b.h / 2;
    const color = severityColor(value);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 15 + value * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `${color}22`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (options.showLabels) {
      const side = x < width / 2 ? -1 : 1;
      const lx = side < 0 ? Math.max(8, x - 165) : Math.min(width - 160, x + 28);
      const ly = Math.max(22, Math.min(height - 22, y + ((i % 3) - 1) * 42));

      ctx.strokeStyle = "rgba(50, 70, 90, 0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(lx + (side < 0 ? 145 : 0), ly);
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(lx, ly - 19, 150, 38, 8);
      ctx.fill();
      ctx.strokeStyle = "#d9e3ec";
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lx + 14, ly, 9, 0, Math.PI * 2);
      ctx.fill();

      // Text is drawn in normal (unmirrored) canvas space — readable on screen.
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px Arial";
      ctx.textAlign = "center";
      ctx.fillText(code, lx + 14, ly + 3);

      ctx.textAlign = "left";
      ctx.fillStyle = "#24364b";
      ctx.font = "bold 10px Arial";
      ctx.fillText(name, lx + 29, ly - 3);
      ctx.font = "bold 12px Arial";
      ctx.fillText(`${value.toFixed(1)}/10`, lx + 29, ly + 11);
    }

    ctx.restore();
  });
}
