import type { SpinWheelIconKey } from "@/lib/spin-wheel/rewards";

const ICON_COLORS: Record<SpinWheelIconKey, string> = {
  percent_tag: "#C2325A",
  headset: "#2E7D4F",
  gift: "#C2325A",
  shopping_bag: "#C2325A",
  cart: "#2F6FAE",
  sad_face: "#7B4B9A",
};

/** Draw a compact reward icon centered at (0, 0) in the current transform. */
export function drawSpinWheelIcon(
  ctx: CanvasRenderingContext2D,
  icon: SpinWheelIconKey,
  size = 100
) {
  const color = ICON_COLORS[icon];
  const s = size;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, s * 0.07);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (icon) {
    case "percent_tag": {
      // Price tag shape
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.42);
      ctx.lineTo(s * 0.36, -s * 0.42);
      ctx.lineTo(s * 0.36, s * 0.18);
      ctx.lineTo(0, s * 0.44);
      ctx.lineTo(-s * 0.36, s * 0.18);
      ctx.lineTo(-s * 0.36, -s * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, -s * 0.22, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `800 ${Math.round(s * 0.36)}px Montserrat, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("%", 0, s * 0.08);
      break;
    }
    case "headset": {
      // Headband
      ctx.beginPath();
      ctx.arc(0, -s * 0.02, s * 0.34, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      // Ear cups
      ctx.fillRect(-s * 0.42, -s * 0.06, s * 0.16, s * 0.32);
      ctx.fillRect(s * 0.26, -s * 0.06, s * 0.16, s * 0.32);
      // Mic
      ctx.beginPath();
      ctx.moveTo(s * 0.34, s * 0.22);
      ctx.quadraticCurveTo(s * 0.18, s * 0.42, 0, s * 0.38);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, s * 0.38, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "gift": {
      // Box
      ctx.fillRect(-s * 0.32, -s * 0.02, s * 0.64, s * 0.4);
      // Lid
      ctx.fillRect(-s * 0.38, -s * 0.18, s * 0.76, s * 0.16);
      // Ribbon
      ctx.fillStyle = "#9E1B3D";
      ctx.fillRect(-s * 0.06, -s * 0.18, s * 0.12, s * 0.56);
      // Bow loops
      ctx.beginPath();
      ctx.ellipse(-s * 0.16, -s * 0.28, s * 0.14, s * 0.1, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.16, -s * 0.28, s * 0.14, s * 0.1, 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "shopping_bag": {
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.1);
      ctx.lineTo(-s * 0.26, s * 0.4);
      ctx.lineTo(s * 0.26, s * 0.4);
      ctx.lineTo(s * 0.3, -s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.18, Math.PI, 0);
      ctx.stroke();
      break;
    }
    case "cart": {
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.28);
      ctx.lineTo(-s * 0.28, -s * 0.28);
      ctx.lineTo(-s * 0.18, s * 0.12);
      ctx.lineTo(s * 0.28, s * 0.12);
      ctx.lineTo(s * 0.36, -s * 0.14);
      ctx.lineTo(-s * 0.08, -s * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.08, s * 0.3, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.2, s * 0.3, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "sad_face": {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.14, -s * 0.08, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.14, -s * 0.08, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, s * 0.22, s * 0.18, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}
