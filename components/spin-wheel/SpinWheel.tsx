"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSpinWheel } from "@/contexts/SpinWheelContext";
import {
  SPIN_WHEEL_SEGMENTS,
  isNextPurchaseSpinReward,
} from "@/lib/spin-wheel/rewards";
import { drawSpinWheelIcon } from "@/lib/spin-wheel/drawIcons";
import {
  sanitizeReturnTo,
} from "@/lib/spin-wheel/navigation";
import {
  isNextPurchaseLeadClaimed,
  markNextPurchaseLeadClaimed,
} from "@/lib/spin-wheel/session";
import { sendBirthdayOfferWebhook } from "@/utils/webhook";
import { APP_ROUTES } from "@/utils/routes";
import SpinWheelConsultationPopup from "@/components/spin-wheel/SpinWheelConsultationPopup";
import SpinWheelBirthdayPopup from "@/components/spin-wheel/SpinWheelBirthdayPopup";
import SpinWheelNextPurchasePopup from "@/components/spin-wheel/SpinWheelNextPurchasePopup";
import TopLogo from "@/containers/skinanalysis-home/Recommendations/TopLogo";
import { useVoiceMessages } from "@/contexts/VoiceContext";
import { Icon } from "@iconify/react";
import styles from "./spin-wheel.module.scss";

const CANVAS_SIZE = 1200;
const WHEEL_RADIUS = 600;
const SEGMENT_COUNT = SPIN_WHEEL_SEGMENTS.length;
const SEGMENT_ARC = (2 * Math.PI) / SEGMENT_COUNT;

/** Wrap so each line respects the chord width at its own Y (narrower toward center). */
function wrapTextLinesRadial(
  ctx: CanvasRenderingContext2D,
  text: string,
  startY: number,
  lineHeight: number,
  widthAt: (y: number) => number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  let lineIndex = 0;

  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    const maxWidth = widthAt(startY + lineIndex * lineHeight);
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      lineIndex += 1;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
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

  // Chord width at a given radius — wider near the rim, narrower toward center.
  const chordWidthAt = (radius: number) =>
    Math.max(40, Math.sin(SEGMENT_ARC / 2) * Math.abs(radius) * 2 * 0.9);

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
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, inner - 6, start, start + SEGMENT_ARC);
    ctx.closePath();
    ctx.clip();

    ctx.rotate(start + SEGMENT_ARC / 2 + Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Icon first — outer rim side (top of the wedge).
    const iconSize = Math.min(92, inner * 0.16);
    const iconY = -inner * 0.88;
    ctx.save();
    ctx.translate(0, iconY);
    drawSpinWheelIcon(ctx, segment.icon, iconSize);
    ctx.restore();

    // Titles sit under the icon with clear padding below the icon.
    const titleSize = 36;
    const paddingBelowIcon = 20;
    const titleStartY = iconY + iconSize * 0.62 + paddingBelowIcon;
    const titleLineHeight = titleSize + 1;
    ctx.font = `800 ${titleSize}px Montserrat, sans-serif`;
    ctx.fillStyle = "#7C2340";
    segment.titleLines.forEach((line, lineIndex) => {
      const y = titleStartY + lineIndex * titleLineHeight;
      ctx.fillText(line, 0, y, chordWidthAt(y) * 0.98);
    });

    // Description starts just under the title.
    const descSize = 20;
    const descLineHeight = descSize + 2;
    const descStartY =
      titleStartY + segment.titleLines.length * titleLineHeight + titleSize * 0.28;
    ctx.font = `600 ${descSize}px Montserrat, sans-serif`;
    const descLines = wrapTextLinesRadial(
      ctx,
      segment.description,
      descStartY,
      descLineHeight,
      chordWidthAt
    );

    ctx.fillStyle = "#8C5567";
    descLines.forEach((line, lineIndex) => {
      const y = descStartY + lineIndex * descLineHeight;
      ctx.fillText(line, 0, y, chordWidthAt(y) * 0.98);
    });

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
  const { data: session } = useSession();
  const { speakMessage } = useVoiceMessages();
  const returnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo")),
    [searchParams]
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const scanPulseTimerRef = useRef<number | null>(null);
  const [spinning, setSpinningLocal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultTitle, setResultTitle] = useState("");
  const [resultDesc, setResultDesc] = useState("");
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [consultationClaimed, setConsultationClaimed] = useState(false);
  const [birthdayClaimed, setBirthdayClaimed] = useState(false);
  /** User closed the ₹100 claim UI without submitting — Collect & continue clears this. */
  const [nextPurchaseDismissed, setNextPurchaseDismissed] = useState(false);
  const [nextPurchaseClaimed, setNextPurchaseClaimed] = useState(false);
  const [pulseAiScan, setPulseAiScan] = useState(false);
  const { hasSpun, reward, isSpinning, saveReward, setIsSpinning, clearRewardSession, scopeId } =
    useSpinWheel();

  const sessionUser = useMemo(
    () => ({
      userId: session?.user?.id ? String(session.user.id) : undefined,
      name: (session?.user as { name?: string } | undefined)?.name || "",
      email: (session?.user as { email?: string } | undefined)?.email || "",
      phone:
        (session?.user as { mobileNumber?: string; phoneNumber?: string; phone?: string } | undefined)
          ?.mobileNumber ||
        (session?.user as { phoneNumber?: string } | undefined)?.phoneNumber ||
        (session?.user as { phone?: string } | undefined)?.phone ||
        "",
    }),
    [session]
  );

  const hasExistingContact = Boolean(
    sessionUser.name.trim() && sessionUser.phone.trim()
  );

  useEffect(() => {
    if (isNextPurchaseLeadClaimed(scopeId)) {
      setNextPurchaseClaimed(true);
    }
  }, [scopeId]);

  const submitNextPurchaseLead = useCallback(
    async (nextReward: typeof reward) => {
      if (!nextReward) return;
      await sendBirthdayOfferWebhook({
        event: "next_purchase_offer_lead",
        user: {
          userId: sessionUser.userId,
          name: sessionUser.name,
          phone: sessionUser.phone,
          email: sessionUser.email,
        },
        spinWheel: {
          couponCode: nextReward.code,
          rewardType: nextReward.type,
          title: nextReward.title,
          segmentId: nextReward.segmentId,
        },
      });
      markNextPurchaseLeadClaimed(scopeId);
      setNextPurchaseClaimed(true);
      setNextPurchaseDismissed(true);
    },
    [scopeId, sessionUser]
  );

  // Only ask for details on the spin-wheel page when contact is missing and not already claimed.
  const nextPurchaseOpen = Boolean(
    reward &&
      isNextPurchaseSpinReward(reward) &&
      !reward.redeemed &&
      !nextPurchaseClaimed &&
      !nextPurchaseDismissed &&
      !hasExistingContact &&
      !spinning &&
      !isSpinning
  );

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

  const promptAiScan = useCallback(() => {
    setShowResult(false);
    setPulseAiScan(true);
    speakMessage("spinWheelUseAiScan");

    if (scanPulseTimerRef.current) {
      window.clearTimeout(scanPulseTimerRef.current);
    }
    scanPulseTimerRef.current = window.setTimeout(() => {
      setPulseAiScan(false);
      scanPulseTimerRef.current = null;
    }, 7000);
  }, [speakMessage]);

  const openNextPurchaseClaim = useCallback(() => {
    setShowResult(false);
    setConsultationOpen(false);
    setBirthdayOpen(false);
    setNextPurchaseClaimed(false);
    setNextPurchaseDismissed(false);
  }, []);

  const handleContinue = useCallback(() => {
    if (onContinue) {
      setShowResult(false);
      onContinue();
      return;
    }

    // For claimable lead rewards, reopen popup until details are submitted.
    if (reward?.type === "FREE_CONSULTATION" && !consultationClaimed) {
      setShowResult(false);
      setConsultationOpen(true);
      return;
    }
    if (reward?.type === "PERCENT_BIRTHDAY_15" && !birthdayClaimed) {
      setShowResult(false);
      setBirthdayOpen(true);
      return;
    }
    if (isNextPurchaseSpinReward(reward) && !nextPurchaseClaimed) {
      if (hasExistingContact) {
        void submitNextPurchaseLead(reward);
        promptAiScan();
        return;
      }
      openNextPurchaseClaim();
      return;
    }

    promptAiScan();
  }, [
    birthdayClaimed,
    consultationClaimed,
    hasExistingContact,
    nextPurchaseClaimed,
    onContinue,
    openNextPurchaseClaim,
    promptAiScan,
    reward,
    submitNextPurchaseLead,
  ]);

  const handleBack = useCallback(() => {
    router.push(returnTo ?? APP_ROUTES.HOME);
  }, [returnTo, router]);

  useEffect(() => {
    return () => {
      if (scanPulseTimerRef.current) {
        window.clearTimeout(scanPulseTimerRef.current);
      }
    };
  }, []);

  const spin = useCallback(() => {
    const forceFlat100 = searchParams.get("force") === "flat_100";
    if (spinning || isSpinning || (hasSpun && !forceFlat100)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (forceFlat100 && hasSpun) {
      clearRewardSession();
    }

    setSpinningLocal(true);
    setIsSpinning(true);

    // Pick the winning segment first, then animate to that index.
    // Do NOT recompute winner from rotation later — that desyncs popup from the pointer.
    const winningIndex = forceFlat100
      ? Math.max(
          0,
          SPIN_WHEEL_SEGMENTS.findIndex((s) => s.type === "FLAT_100")
        )
      : Math.floor(Math.random() * SEGMENT_COUNT);
    const segmentDegrees = 360 / SEGMENT_COUNT;
    const jitter = forceFlat100
      ? 0
      : (Math.random() * 0.6 - 0.3) * segmentDegrees;
    const target = 360 * 6 - winningIndex * segmentDegrees + jitter;

    rotationRef.current += target;
    canvas.classList.add(styles.wheelSpinning);
    canvas.style.transform = `rotate(${rotationRef.current}deg)`;

    window.setTimeout(() => {
      const segment = SPIN_WHEEL_SEGMENTS[winningIndex];
      const nextReward = saveReward(winningIndex);

      setConsultationClaimed(false);
      setBirthdayClaimed(false);
      setNextPurchaseClaimed(false);
      setNextPurchaseDismissed(false);
      setConsultationOpen(false);
      setBirthdayOpen(false);
      setResultTitle(segment.title);
      setResultDesc(segment.description);
      setSpinningLocal(false);
      setIsSpinning(false);

      if (nextReward.type === "FREE_CONSULTATION") {
        setShowResult(false);
        setConsultationOpen(true);
        return;
      }
      if (nextReward.type === "PERCENT_BIRTHDAY_15") {
        setShowResult(false);
        setBirthdayOpen(true);
        return;
      }
      if (isNextPurchaseSpinReward(nextReward)) {
        setShowResult(false);
        // Contact already known (login / earlier form) — send lead quietly, no popup.
        if (hasExistingContact || isNextPurchaseLeadClaimed(scopeId)) {
          if (!isNextPurchaseLeadClaimed(scopeId)) {
            void submitNextPurchaseLead(nextReward);
          } else {
            setNextPurchaseClaimed(true);
            setNextPurchaseDismissed(true);
          }
          setShowResult(true);
          return;
        }
        setNextPurchaseDismissed(false);
        return;
      }
      setShowResult(true);
    }, 6100);
  }, [
    clearRewardSession,
    hasExistingContact,
    hasSpun,
    isSpinning,
    saveReward,
    scopeId,
    searchParams,
    setIsSpinning,
    spinning,
    submitNextPurchaseLead,
  ]);

  const forceFlat100 = searchParams.get("force") === "flat_100";
  const spinDisabled = spinning || isSpinning || (hasSpun && !forceFlat100);

  return (
    <div className={styles.stage}>
      <TopLogo
        isKiosk
        firstButtonLabel="Slots"
        firstButtonIcon="/wending/dashboard-gauge.svg"
        onCartClick={() => router.push(APP_ROUTES.SLOTS)}
        secondButtonLabel="Use AI scan"
        secondButtonSubLabel="Skin analysis"
        secondButtonIcon="/wending/scanlogo.svg"
        secondButtonIconTone="black"
        onSpinWheelClick={() => router.push("/questionnaire")}
        highlightActiveReward={false}
        pulseSecondButton={pulseAiScan}
      />

      <header className={styles.header}>
        <div className={styles.giftWrap} aria-hidden>
          <span className={styles.giftSpark} />
          <span className={styles.giftSpark} />
          <span className={styles.giftSpark} />
          <span className={styles.giftSpark} />
          <div className={styles.giftScene}>
            <div className={styles.giftBox}>
              <div className={styles.giftLid}>
                <span className={styles.giftBow} />
              </div>
              <div className={styles.giftBody}>
                <span className={styles.giftRibbonV} />
                <span className={styles.giftGlow} />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.headerCopy}>
          <div className={styles.title}>
            Spin<span>the Wheel</span>
          </div>
          <div className={styles.ribbon}>WIN EXCITING REWARDS!</div>
        </div>
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
          <span className={styles.stepIcon} aria-hidden>
            <Icon icon="mdi:gesture-tap" width={30} height={30} />
          </span>
          <p>Tap SPIN NOW to spin the wheel</p>
        </div>
        <div className={styles.step}>
          <span className={styles.stepIcon} aria-hidden>
            <Icon icon="mdi:gift" width={30} height={30} />
          </span>
          <p>Win amazing offers and discounts</p>
        </div>
        <div className={styles.step}>
          <span className={styles.stepIcon} aria-hidden>
            <Icon icon="mdi:shopping" width={30} height={30} />
          </span>
          <p>Make your purchase and enjoy your reward</p>
        </div>
      </div>

      <button type="button" className={styles.cta} onClick={spin} disabled={spinDisabled}>
        SPIN NOW &nbsp;&rsaquo;
      </button>
      <div className={styles.tc}>*T&amp;C Apply</div>

      {hasSpun && reward && !nextPurchaseOpen ? (
        <div className={styles.existingReward}>
          <div className={styles.cardEyebrow}>YOUR REWARD</div>
          <div className={styles.cardTitle}>{reward.title}</div>
          <div className={styles.cardDesc}>{reward.description}</div>
          <div className={styles.existingRewardCode}>Coupon: {reward.code}</div>
          {reward.redeemed ? (
            <div className={styles.cardDesc}>Already used on a previous order this session.</div>
          ) : isNextPurchaseSpinReward(reward) && !nextPurchaseClaimed ? (
            <button
              type="button"
              className={styles.cardButton}
              onClick={openNextPurchaseClaim}
            >
              Claim ₹100 offer
            </button>
          ) : (
            <button type="button" className={styles.cardButton} onClick={handleContinue}>
              Collect &amp; continue
            </button>
          )}
        </div>
      ) : null}

      <button type="button" className={styles.backLink} onClick={handleBack}>
        <span style={{ fontSize: "24px" }}>
          {returnTo ? "Go back" : "Back to home"}
        </span>
      </button>

      <div
        className={`${styles.overlay} ${showResult ? styles.overlayShow : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowResult(false);
        }}
      >
        <div className={styles.card}>
          <button
            type="button"
            className={styles.cardClose}
            aria-label="Close"
            onClick={() => setShowResult(false)}
          >
            ×
          </button>
          <div className={styles.cardEyebrow}>YOUR WINNINGS</div>
          <h2 className={styles.cardTitle}>{resultTitle}</h2>
          <p className={styles.cardDesc}>{resultDesc}</p>
          <button type="button" className={styles.cardButton} onClick={handleContinue}>
            Collect &amp; continue
          </button>
        </div>
      </div>

      <SpinWheelConsultationPopup
        open={consultationOpen}
        onClose={() => {
          setConsultationOpen(false);
          setShowResult(true);
        }}
        onClaimed={() => setConsultationClaimed(true)}
        user={sessionUser}
        reward={reward}
      />

      <SpinWheelBirthdayPopup
        open={birthdayOpen}
        onClose={() => {
          setBirthdayOpen(false);
          setShowResult(true);
        }}
        onClaimed={() => setBirthdayClaimed(true)}
        user={sessionUser}
        reward={reward}
      />

      <SpinWheelNextPurchasePopup
        open={nextPurchaseOpen}
        onClose={() => {
          setNextPurchaseDismissed(true);
          setShowResult(false);
        }}
        onClaimed={() => {
          markNextPurchaseLeadClaimed(scopeId);
          setNextPurchaseClaimed(true);
        }}
        user={sessionUser}
        reward={reward}
      />
    </div>
  );
}
