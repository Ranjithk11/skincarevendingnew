"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSpinWheel } from "@/contexts/SpinWheelContext";
import { SPIN_WHEEL_SEGMENTS } from "@/lib/spin-wheel/rewards";
import {
  resolveSpinWheelContinuePath,
  sanitizeReturnTo,
} from "@/lib/spin-wheel/navigation";
import { APP_ROUTES } from "@/utils/routes";
import styles from "./spin-wheel.module.scss";

const CANVAS_SIZE = 1200;
const WHEEL_RADIUS = 600;
const SEGMENT_COUNT = SPIN_WHEEL_SEGMENTS.length;
const SEGMENT_ARC = (2 * Math.PI) / SEGMENT_COUNT;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;

  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  });

  ctx.fillText(line, x, yy);
}

function drawWheel(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const inner = WHEEL_RADIUS - 58;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.translate(WHEEL_RADIUS, WHEEL_RADIUS);

  const rim = ctx.createLinearGradient(-WHEEL_RADIUS, -WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS);
  rim.addColorStop(0, "#C2325A");
  rim.addColorStop(0.5, "#B41E45");
  rim.addColorStop(1, "#8E1638");
  ctx.beginPath();
  ctx.arc(0, 0, WHEEL_RADIUS - 4, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();

  SPIN_WHEEL_SEGMENTS.forEach((segment, index) => {
    const start = -Math.PI / 2 - SEGMENT_ARC / 2 + index * SEGMENT_ARC;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, inner, start, start + SEGMENT_ARC);
    ctx.closePath();
    ctx.fillStyle = segment.fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.65)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + SEGMENT_ARC / 2 + Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillStyle = "#7C2340";
    ctx.font = "700 34px Montserrat, sans-serif";
    segment.titleLines.forEach((line, lineIndex) => {
      ctx.fillText(line, 0, -inner * 0.62 + lineIndex * 40);
    });

    ctx.fillStyle = "#8C5567";
    ctx.font = "600 22px Montserrat, sans-serif";
    wrapText(
      ctx,
      segment.description,
      0,
      -inner * 0.62 + segment.titleLines.length * 40 + 26,
      250,
      28
    );
    ctx.restore();
  });

  for (let i = 0; i < 20; i += 1) {
    const angle = (i / 20) * Math.PI * 2;
    const x = Math.cos(angle) * (WHEEL_RADIUS - 29);
    const y = Math.sin(angle) * (WHEEL_RADIUS - 29);
    const bulb = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 11);
    bulb.addColorStop(0, "#FFF3CF");
    bulb.addColorStop(1, "#E8B84B");
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = bulb;
    ctx.fill();
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

type SpinWheelProps = {
  onContinue?: () => void;
};

export default function SpinWheel({ onContinue }: SpinWheelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo")),
    [searchParams]
  );
  const continuePath = useMemo(
    () => resolveSpinWheelContinuePath(returnTo),
    [returnTo]
  );
  const continueLabel =
    returnTo === APP_ROUTES.RECOMMENDATIONS ? "Back to recommendations" : "Continue shopping";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const [spinning, setSpinningLocal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultTitle, setResultTitle] = useState("");
  const [resultDesc, setResultDesc] = useState("");
  const { hasSpun, reward, isSpinning, saveReward, setIsSpinning } = useSpinWheel();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => drawWheel(canvas);
    if (document.fonts?.ready) {
      document.fonts.ready.then(render).catch(render);
    } else {
      render();
    }
  }, []);

  const handleContinue = useCallback(() => {
    setShowResult(false);
    if (onContinue) {
      onContinue();
      return;
    }
    router.push(continuePath);
  }, [continuePath, onContinue, router]);

  const handleBack = useCallback(() => {
    router.push(returnTo ?? APP_ROUTES.HOME);
  }, [returnTo, router]);

  const spin = useCallback(() => {
    if (spinning || isSpinning || hasSpun) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSpinningLocal(true);
    setIsSpinning(true);

    const winningIndex = Math.floor(Math.random() * SEGMENT_COUNT);
    const segmentDegrees = 360 / SEGMENT_COUNT;
    const jitter = (Math.random() * 0.6 - 0.3) * segmentDegrees;
    const target = 360 * 6 - winningIndex * segmentDegrees + jitter;

    rotationRef.current += target;
    canvas.classList.add(styles.wheelSpinning);
    canvas.style.transform = `rotate(${rotationRef.current}deg)`;

    window.setTimeout(() => {
      const segment = SPIN_WHEEL_SEGMENTS[winningIndex];
      saveReward(winningIndex);
      setResultTitle(segment.title);
      setResultDesc(segment.description);
      setShowResult(true);
      setSpinningLocal(false);
      setIsSpinning(false);
    }, 6100);
  }, [hasSpun, isSpinning, saveReward, setIsSpinning, spinning]);

  const spinDisabled = spinning || isSpinning || hasSpun;

  return (
    <div className={styles.stage}>
      <header className={styles.header}>
        <div className={styles.title}>
          Spin<span>the Wheel</span>
        </div>
        <div className={styles.ribbon}>WIN EXCITING REWARDS!</div>
      </header>

      <div className={styles.wheelWrap}>
        <svg className={styles.pointer} viewBox="0 0 46 64" aria-hidden>
          <path
            d="M23 64C23 64 42 34 42 21A19 19 0 1 0 4 21C4 34 23 64 23 64Z"
            fill="#E8B84B"
          />
          <path
            d="M23 62C23 62 40 33 40 21A17 17 0 1 0 6 21C6 33 23 62 23 62Z"
            fill="#F7DC93"
          />
          <circle cx="23" cy="21" r="8" fill="#9E1B3D" />
        </svg>
        <canvas
          ref={canvasRef}
          id="wheel"
          className={styles.wheel}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
        />
        <button
          type="button"
          className={`${styles.hub} ${spinDisabled ? styles.hubDisabled : ""}`}
          onClick={spin}
          disabled={spinDisabled}
        >
          SPIN
          <br />
          NOW
        </button>
      </div>

      <div className={styles.steps}>
        <div className={styles.step}>
          <b>1</b>
          <p>Tap SPIN NOW to spin the wheel</p>
        </div>
        <div className={styles.step}>
          <b>2</b>
          <p>Win amazing offers and discounts</p>
        </div>
        <div className={styles.step}>
          <b>3</b>
          <p>Make your purchase and enjoy your reward</p>
        </div>
      </div>

      <button type="button" className={styles.cta} onClick={spin} disabled={spinDisabled}>
        SPIN NOW &nbsp;&rsaquo;
      </button>
      <div className={styles.tc}>*T&amp;C Apply</div>

      {hasSpun && reward ? (
        <div className={styles.existingReward}>
          <div className={styles.cardEyebrow}>YOUR REWARD</div>
          <div className={styles.cardTitle}>{reward.title}</div>
          <div className={styles.cardDesc}>{reward.description}</div>
          <div className={styles.existingRewardCode}>Coupon: {reward.code}</div>
          {reward.redeemed ? (
            <div className={styles.cardDesc}>Already used on a previous order this session.</div>
          ) : (
            <button type="button" className={styles.cardButton} onClick={handleContinue}>
              {continueLabel}
            </button>
          )}
        </div>
      ) : null}

      <button type="button" className={styles.backLink} onClick={handleBack}>
        {returnTo ? "Go back" : "Back to home"}
      </button>

      <div className={`${styles.overlay} ${showResult ? styles.overlayShow : ""}`}>
        <div className={styles.card}>
          <div className={styles.cardEyebrow}>YOUR WINNINGS</div>
          <h2 className={styles.cardTitle}>{resultTitle}</h2>
          <p className={styles.cardDesc}>{resultDesc}</p>
          <button type="button" className={styles.cardButton} onClick={handleContinue}>
            Collect &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}
