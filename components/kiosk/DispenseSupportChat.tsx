"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { keyframes } from "@mui/system";
import Image from "next/image";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";
import { pauseKioskIdle, resumeKioskIdle } from "@/utils/kioskIdleGate";
import { useVoice } from "@/contexts/VoiceContext";
import {
  DISPENSE_SUPPORT_ISSUES,
  findDispenseSupportIssue,
  formatIndianMobile,
  isValidEmail,
  normalizeIndianMobile,
  normalizePersonName,
  WHATSAPP_SERVICE_DISPLAY,
  type DispenseSupportIssueId,
} from "@/lib/dispense-support";

const ASSISTANT_NAME = "Aurelia";
const VOICE = { rate: 0.94, pitch: 1.02, volume: 1 };
const CHOICES_SPOKEN =
  "You can choose: machine not responding after payment, a COM issue, the tray is not moving, the dispense door did not open, or you received only one product instead of multiple.";
const WHATSAPP_SPOKEN = "8 9 7 7 0, 1 6 6 0 5";

const CLOSE_AFTER_SEC = 30;
const FOREST = "#143028";
const FOREST_DEEP = "#0C2118";
const GOLD = "#C4A265";
const GOLD_SOFT = "#E7D3A1";
const IVORY = "#F8F4EC";
const INK = "#1C1915";
const MUTED = "#6E675E";

const rise = keyframes`
  from { opacity: 0; transform: translateY(22px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 10px 30px rgba(20, 48, 40, 0.28); }
  50% { box-shadow: 0 12px 34px rgba(196, 162, 101, 0.45); }
`;

const blink = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
`;

type Step = "choose" | "details" | "sending" | "done";
type DetailField = "name" | "phone" | "email";

type ChatMessage = {
  id: string;
  from: "bot" | "user";
  text: string;
};

type ProductLine = {
  id?: string;
  name?: string;
  quantity?: number;
  slotId?: string | number;
};

export type DispenseSupportChatProps = {
  onActiveChange?: (active: boolean) => void;
  phoneHint?: string;
  emailHint?: string;
  nameHint?: string;
  orderId?: string;
  paymentId?: string;
  machineName?: string;
  machineLocation?: string;
  dispenseStatus?: string;
  products?: ProductLine[];
};

function CountdownRing({ seconds }: { seconds: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, seconds / CLOSE_AFTER_SEC));
  return (
    <Box sx={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
      <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden>
        <circle cx="23" cy="23" r={r} stroke="rgba(231,211,161,0.28)" strokeWidth="2.5" fill="none" />
        <circle
          cx="23"
          cy="23"
          r={r}
          stroke={GOLD_SOFT}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 23 23)"
        />
      </svg>
      <Typography
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: GOLD_SOFT,
        }}
      >
        {seconds}
      </Typography>
    </Box>
  );
}

export default function DispenseSupportChat({
  onActiveChange,
  phoneHint = "",
  emailHint = "",
  nameHint = "",
  orderId = "",
  paymentId = "",
  machineName = "",
  machineLocation = "",
  dispenseStatus = "",
  products = [],
}: DispenseSupportChatProps) {
  const { speak, speakQueued, cancel } = useVoice();
  const [mounted, setMounted] = useState(false);
  const [booted, setBooted] = useState(false);
  const [open, setOpen] = useState(true);
  const [heldOpen, setHeldOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [activeField, setActiveField] = useState<DetailField>("name");
  const [issueId, setIssueId] = useState<DispenseSupportIssueId | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CLOSE_AFTER_SEC);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const threadRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);
  const greetedRef = useRef(false);
  const stepRef = useRef<Step>("choose");
  const sendingRef = useRef(false);
  const queueRef = useRef(Promise.resolve());
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  const using = heldOpen || step !== "choose";
  const issue = issueId ? findDispenseSupportIssue(issueId) : undefined;
  stepRef.current = step;

  const say = useCallback((text: string, spoken?: string, mode: "queue" | "now" = "now") => {
    queueRef.current = queueRef.current.then(
      () =>
        new Promise<void>((resolve) => {
          if (!aliveRef.current) {
            resolve();
            return;
          }
          setTyping(true);
          window.setTimeout(() => {
            if (!aliveRef.current) {
              resolve();
              return;
            }
            setTyping(false);
            setMessages((current) => [
              ...current,
              { id: `b-${Date.now()}-${current.length}`, from: "bot", text },
            ]);
            const line = spoken || text;
            if (mode === "queue") speakQueued(line, VOICE);
            else speak(line, VOICE);
            resolve();
          }, 560);
        })
    );
  }, [speak, speakQueued]);

  const addUser = useCallback((text: string) => {
    queueRef.current = queueRef.current.then(() => {
      if (!aliveRef.current) return;
      setMessages((current) => [
        ...current,
        { id: `u-${Date.now()}-${current.length}`, from: "user", text },
      ]);
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    aliveRef.current = true;
    const bootTimer = window.setTimeout(() => setBooted(true), 700);
    return () => {
      aliveRef.current = false;
      window.clearTimeout(bootTimer);
      cancelRef.current();
    };
  }, []);

  useEffect(() => {
    if (!booted || greetedRef.current) return;
    greetedRef.current = true;
    say(
      `Hello, I'm ${ASSISTANT_NAME}. If something went wrong while your product was dispensing, tell me what happened.`,
      `Hello, I'm ${ASSISTANT_NAME}. If something went wrong while your product was dispensing, tell me what happened. ${CHOICES_SPOKEN}`,
      "queue"
    );
  }, [booted, say]);

  useEffect(() => {
    setPhone((current) => {
      if (current) return current;
      return normalizeIndianMobile(phoneHint) || "";
    });
  }, [phoneHint]);

  useEffect(() => {
    const next = emailHint.trim();
    if (!isValidEmail(next)) return;
    setEmail((current) => current || next);
  }, [emailHint]);

  useEffect(() => {
    const next = normalizePersonName(nameHint);
    if (!next) return;
    setCustomerName((current) => current || next);
  }, [nameHint]);

  useEffect(() => {
    const active = open && using;
    if (!active) {
      onActiveChangeRef.current?.(false);
      return;
    }
    pauseKioskIdle();
    onActiveChangeRef.current?.(true);
    return () => {
      resumeKioskIdle();
      onActiveChangeRef.current?.(false);
    };
  }, [open, using]);

  useEffect(() => {
    if (!booted || !open || using) return;
    const deadline = Date.now() + CLOSE_AFTER_SEC * 1000;
    setSecondsLeft(CLOSE_AFTER_SEC);
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft((current) => (current === left ? current : left));
      if (left <= 0) {
        window.clearInterval(timer);
        setOpen(false);
        setHeldOpen(false);
        cancelRef.current();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [booted, open, using]);

  useEffect(() => {
    if (step === "details") setKeyboardOpen(true);
    else setKeyboardOpen(false);
  }, [step]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = step === "sending" ? node.scrollHeight : 0;
  }, [messages, typing, step, fieldError, open]);

  const holdOpen = () => setHeldOpen(true);

  const closeChat = () => {
    setOpen(false);
    setKeyboardOpen(false);
    if (step === "choose") setHeldOpen(false);
    cancel();
  };

  const tellError = (text: string) => {
    setFieldError(text);
    speak(text, VOICE);
  };

  const chooseIssue = (id: DispenseSupportIssueId) => {
    if (stepRef.current !== "choose") return;
    const next = findDispenseSupportIssue(id);
    if (!next) return;
    stepRef.current = "details";
    setHeldOpen(true);
    setIssueId(id);
    setFieldError("");
    setActiveField("name");
    setStep("details");
    addUser(next.label);
    say("I'm sorry about that. Please share your name, mobile number, and email.");
  };

  const focusField = (field: DetailField) => {
    setActiveField(field);
    setKeyboardOpen(true);
    const node =
      field === "phone" ? phoneInputRef.current : field === "email" ? emailInputRef.current : nameInputRef.current;
    window.setTimeout(() => node?.focus({ preventScroll: true }), 0);
  };

  const submitDetails = async () => {
    if (sendingRef.current) return;
    const normalizedName = normalizePersonName(customerName);
    const normalizedPhone = normalizeIndianMobile(phone);
    const nextEmail = email.trim().toLowerCase();
    if (!issue || !normalizedName) {
      focusField("name");
      tellError("Enter your name, using letters.");
      return;
    }
    if (!normalizedPhone) {
      focusField("phone");
      tellError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      focusField("email");
      tellError("Enter a valid email address.");
      return;
    }
    setFieldError("");
    setCustomerName(normalizedName);
    setPhone(normalizedPhone);
    setEmail(nextEmail);
    sendingRef.current = true;
    setStep("sending");
    addUser(`${normalizedName}\n+91 ${formatIndianMobile(normalizedPhone)}\n${nextEmail}`);

    let noted = false;
    try {
      const response = await fetch("/api/dispense-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: issue.id,
          customerName: normalizedName,
          phone: normalizedPhone,
          email: nextEmail,
          orderId,
          paymentId,
          machineName,
          machineLocation,
          dispenseStatus,
          products,
        }),
      });
      const data = await response.json().catch(() => null);
      noted = Boolean(response.ok && data?.success);
      if (!noted) {
        setSaved(false);
        setSubmitError(
          "We saved your details on this screen. Please also send them on WhatsApp with your photos."
        );
      } else {
        setSaved(true);
        setSubmitError("");
      }
    } catch {
      setSaved(false);
      setSubmitError(
        "We saved your details on this screen. Please also send them on WhatsApp with your photos."
      );
    } finally {
      sendingRef.current = false;
      setStep("done");
      say(
        "Please keep a few photos of the issue, then message our WhatsApp care number. We will reach you on the phone and email you shared.",
        noted
          ? `Please keep photos of the screen, the tray, and the dispense door. Send them on WhatsApp to ${WHATSAPP_SPOKEN}. We will reach you on the phone and email you shared.`
          : `Please keep photos of the screen, the tray, and the dispense door. Send them on WhatsApp to ${WHATSAPP_SPOKEN}, with your name, phone, and email.`
      );
    }
  };

  const onKeyPress = (key: string) => {
    holdOpen();
    if (activeField === "name") {
      if (key === "backspace") {
        setCustomerName((current) => current.slice(0, -1));
        setFieldError("");
        return;
      }
      if (key === "return") {
        focusField("phone");
        return;
      }
      if (key === "space") {
        setCustomerName((current) => (current.endsWith(" ") || !current ? current : `${current} `));
        return;
      }
      if (key === "shift" || key === "123" || key === "ABC" || key === "arrowleft" || key === "arrowright") {
        return;
      }
      if (customerName.length < 40) {
        setCustomerName((current) => `${current}${key}`);
        setFieldError("");
      }
      return;
    }
    if (activeField === "phone") {
      if (key === "backspace") {
        setPhone((current) => current.slice(0, -1));
        setFieldError("");
        return;
      }
      if (key === "return") {
        focusField("email");
        return;
      }
      if (/^\d$/.test(key) && phone.length < 10) {
        setPhone((current) => `${current}${key}`.slice(0, 10));
        setFieldError("");
      }
      return;
    }
    if (activeField === "email") {
      if (key === "backspace") {
        setEmail((current) => current.slice(0, -1));
        setFieldError("");
        return;
      }
      if (key === "return") {
        void submitDetails();
        return;
      }
      if (
        key === "space" ||
        key === "shift" ||
        key === "123" ||
        key === "ABC" ||
        key === "arrowleft" ||
        key === "arrowright"
      ) {
        return;
      }
      setEmail((current) => `${current}${key}`);
      setFieldError("");
    }
  };

  if (!mounted || !booted || typeof document === "undefined") return null;

  const progressIndex = step === "choose" ? 0 : step === "done" ? 2 : 1;

  const panel = open ? (
    <Box
      role="dialog"
      aria-label="Aurelia"
      onPointerDown={holdOpen}
      sx={{
        pointerEvents: "auto",
        width: keyboardOpen ? "100%" : "min(580px, calc(100vw - 28px))",
        flex: keyboardOpen ? "1 1 auto" : "0 1 auto",
        maxHeight: keyboardOpen ? "none" : "min(780px, calc(100dvh - 96px))",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: keyboardOpen ? "22px 22px 0 0" : "28px",
        overflow: "hidden",
        alignSelf: "flex-end",
        background: FOREST_DEEP,
        boxShadow: "0 28px 70px rgba(12, 33, 24, 0.38), 0 0 0 1px rgba(196,162,101,0.55)",
        animation: `${rise} 420ms ease`,
      }}
    >
      <Box
        sx={{
          px: 2.25,
          pt: keyboardOpen ? 1.25 : 2,
          pb: keyboardOpen ? 1.25 : 1.75,
          background: `linear-gradient(135deg, ${FOREST} 0%, ${FOREST_DEEP} 70%)`,
          color: IVORY,
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${GOLD_SOFT}, ${GOLD}, transparent)`,
          }}
        />
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Box
            sx={{
              height: 48,
              px: 1,
              borderRadius: "12px",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Image
              src="/wending/goldlog.svg"
              alt="Leaf Water"
              width={116}
              height={30}
              style={{ objectFit: "contain", width: "auto", height: 30 }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, lineHeight: 1.05, color: GOLD_SOFT }}>
              {ASSISTANT_NAME}
            </Typography>
            <Typography sx={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(248,244,236,0.72)", mt: 0.35 }}>
              Care concierge
            </Typography>
          </Box>
          {using ? null : <CountdownRing seconds={secondsLeft} />}
          <Box
            component="button"
            type="button"
            aria-label="Close help chat"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={closeChat}
            sx={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "1px solid rgba(231,211,161,0.4)",
              bgcolor: "transparent",
              color: GOLD_SOFT,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon icon="mdi:close" width={22} />
          </Box>
        </Box>

        {keyboardOpen ? null : (
        <>
        <Box sx={{ display: "flex", gap: 0.75, mt: 1.75 }}>
          {["Problem", "Contact", "Photos"].map((label, index) => {
            const active = index <= progressIndex;
            return (
              <Box key={label} sx={{ flex: 1 }}>
                <Box
                  sx={{
                    height: 3,
                    borderRadius: 99,
                    bgcolor: active ? GOLD : "rgba(231,211,161,0.25)",
                  }}
                />
                <Typography sx={{ mt: 0.6, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: active ? GOLD_SOFT : "rgba(248,244,236,0.45)" }}>
                  {label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Typography sx={{ mt: 1.25, fontSize: 15, color: "rgba(248,244,236,0.86)" }}>
          {using
            ? "Take your time. This screen stays open while you finish."
            : `Closes in ${secondsLeft}s if you don't need help.`}
        </Typography>
        </>
        )}
      </Box>

      <Box
        ref={threadRef}
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          bgcolor: IVORY,
          px: 2,
          py: keyboardOpen ? 1.25 : 2,
        }}
      >
        <Box sx={{ display: keyboardOpen || step === "done" ? "none" : "flex", flexDirection: "column", gap: 1.25 }}>
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                alignSelf: message.from === "user" ? "flex-end" : "flex-start",
                maxWidth: "92%",
                px: 1.75,
                py: 1.25,
                borderRadius: message.from === "user" ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                bgcolor: message.from === "user" ? FOREST : "#fff",
                color: message.from === "user" ? IVORY : INK,
                boxShadow: "0 8px 20px rgba(28, 25, 21, 0.06)",
                border: message.from === "user" ? "none" : "1px solid rgba(196,162,101,0.28)",
              }}
            >
              <Typography sx={{ fontSize: 18, lineHeight: 1.45 }}>{message.text}</Typography>
            </Box>
          ))}
          {typing ? (
            <Box
              sx={{
                alignSelf: "flex-start",
                display: "flex",
                gap: 0.6,
                px: 1.75,
                py: 1.4,
                borderRadius: "18px",
                bgcolor: "#fff",
                border: "1px solid rgba(196,162,101,0.28)",
              }}
            >
              {[0, 1, 2].map((dot) => (
                <Box
                  key={dot}
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: GOLD,
                    animation: `${blink} 1s ${dot * 0.15}s infinite`,
                  }}
                />
              ))}
            </Box>
          ) : null}
        </Box>

        {step === "choose" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
            {DISPENSE_SUPPORT_ISSUES.map((option) => (
              <Box
                key={option.id}
                component="button"
                type="button"
                onClick={() => chooseIssue(option.id)}
                sx={{
                  textAlign: "left",
                  border: "1px solid rgba(196,162,101,0.45)",
                  bgcolor: "#fff",
                  borderRadius: "16px",
                  px: 1.5,
                  py: 1.25,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  cursor: "pointer",
                  minHeight: 76,
                  boxShadow: "0 8px 18px rgba(20, 48, 40, 0.04)",
                  "&:active": { transform: "scale(0.99)" },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#F4EBD8",
                    color: FOREST,
                    flexShrink: 0,
                  }}
                >
                  <Icon icon={option.icon} width={24} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: INK, lineHeight: 1.25 }}>
                    {option.label}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: MUTED, mt: 0.35 }}>{option.hint}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : null}

        {step === "details" ? (
          <Box
            sx={{
              mt: 0,
              p: keyboardOpen ? 1.25 : 1.75,
              borderRadius: "18px",
              bgcolor: "#fff",
              border: "1px solid rgba(196,162,101,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 1.15,
            }}
          >
            {(
              [
                { id: "name" as const, label: "Your name", placeholder: "Your name", value: customerName },
                { id: "phone" as const, label: "Mobile number", placeholder: "10-digit mobile", value: formatIndianMobile(phone) },
                { id: "email" as const, label: "Email address", placeholder: "name@email.com", value: email },
              ] as const
            ).map((field) => (
              <Box key={field.id}>
                <Typography sx={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>
                  {field.label}
                </Typography>
                <Box
                  component="input"
                  ref={field.id === "name" ? nameInputRef : field.id === "phone" ? phoneInputRef : emailInputRef}
                  value={field.value}
                  placeholder={field.placeholder}
                  inputMode={field.id === "phone" ? "numeric" : field.id === "email" ? "email" : "text"}
                  autoComplete="off"
                  onFocus={() => focusField(field.id)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFieldError("");
                    if (field.id === "name") {
                      setCustomerName(event.target.value.replace(/[^A-Za-z .'-]/g, "").slice(0, 40));
                    } else if (field.id === "phone") {
                      setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                    } else {
                      setEmail(event.target.value.replace(/\s/g, ""));
                    }
                  }}
                  sx={{
                    mt: 0.5,
                    width: "100%",
                    boxSizing: "border-box",
                    border: activeField === field.id ? `1.5px solid ${GOLD}` : "1.5px solid rgba(20,48,40,0.18)",
                    borderRadius: "14px",
                    px: 1.5,
                    py: 1.05,
                    fontSize: 20,
                    fontWeight: 700,
                    color: INK,
                    bgcolor: "#FFFcf7",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </Box>
            ))}
            {fieldError ? (
              <Typography sx={{ fontSize: 15, color: "#9F2D2D" }}>{fieldError}</Typography>
            ) : (
              <Typography sx={{ fontSize: 14, color: MUTED }}>
                Name, mobile, and email so the care team can reach you.
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  setFieldError("");
                  stepRef.current = "choose";
                  setStep("choose");
                  say(
                    "Of course. Which problem are you facing?",
                    `Of course. Which problem are you facing? ${CHOICES_SPOKEN}`
                  );
                }}
                sx={ghostButtonSx}
              >
                Back
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => void submitDetails()}
                sx={primaryButtonSx}
              >
                Send to care team
              </Box>
            </Box>
          </Box>
        ) : null}

        {step === "sending" ? (
          <Typography sx={{ mt: 2, fontSize: 16, color: MUTED }}>Sending your note to the care team…</Typography>
        ) : null}

        {step === "done" && issue ? (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: "18px",
                bgcolor: "#fff",
                border: "1px solid rgba(196,162,101,0.4)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Icon icon="mdi:camera-outline" width={22} color={FOREST} />
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: INK }}>
                  Please keep photos of this issue
                </Typography>
              </Box>
              {[
                "The screen after payment",
                "The tray and the dispense door",
                "The product that came out, if any",
              ].map((line) => (
                <Box key={line} sx={{ display: "flex", gap: 1, alignItems: "flex-start", mt: 0.75 }}>
                  <Icon icon="mdi:check-circle" width={18} color={GOLD} />
                  <Typography sx={{ fontSize: 16, color: INK, lineHeight: 1.4 }}>{line}</Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: "18px",
                background: `linear-gradient(160deg, ${FOREST} 0%, ${FOREST_DEEP} 100%)`,
                border: "1px solid rgba(231,211,161,0.45)",
                color: IVORY,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Icon icon="mdi:whatsapp" width={26} color="#8FE0B3" />
                <Typography sx={{ fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD_SOFT }}>
                  WhatsApp care
                </Typography>
              </Box>
              <Typography
                sx={{
                  mt: 1,
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  color: GOLD_SOFT,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  lineHeight: 1.15,
                }}
              >
                {WHATSAPP_SERVICE_DISPLAY}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 16, lineHeight: 1.45, color: "rgba(248,244,236,0.88)" }}>
                Send the photos to this number. Mention {issue.label.toLowerCase()}, plus the name, phone, and email you just shared.
              </Typography>
            </Box>

            <Box sx={{ px: 0.5 }}>
              <Typography sx={{ fontSize: 15, color: MUTED, lineHeight: 1.45 }}>
                {saved
                  ? `Your note is with the care team for ${issue.label}. We'll reach ${customerName} on ${formatIndianMobile(phone)} and ${email}.`
                  : submitError}
              </Typography>
            </Box>

            <Box component="button" type="button" onClick={closeChat} sx={primaryButtonSx}>
              Done
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  ) : (
    <Box
      component="button"
      type="button"
      onClick={() => {
        setSecondsLeft(CLOSE_AFTER_SEC);
        setOpen(true);
      }}
      sx={{
        pointerEvents: "auto",
        alignSelf: "flex-end",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        pl: 1.25,
        pr: 2.25,
        py: 1.1,
        borderRadius: 999,
        color: IVORY,
        background: `linear-gradient(135deg, ${FOREST}, ${FOREST_DEEP})`,
        boxShadow: "0 16px 40px rgba(12, 33, 24, 0.28)",
        animation: `${pulse} 2.8s ease-in-out infinite`,
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: `linear-gradient(160deg, ${GOLD_SOFT}, ${GOLD})`,
          color: FOREST_DEEP,
        }}
      >
        <Icon icon="mdi:chat-processing" width={22} />
      </Box>
      <Box sx={{ textAlign: "left" }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>Dispense help</Typography>
        <Typography sx={{ fontSize: 13, color: GOLD_SOFT }}>Chat with {ASSISTANT_NAME}</Typography>
      </Box>
    </Box>
  );

  return createPortal(
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1600,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: keyboardOpen ? "stretch" : "flex-end",
        pointerEvents: "none",
        p: keyboardOpen ? 0 : 1.75,
        boxSizing: "border-box",
        overflow: "hidden",
        height: "100dvh",
        maxHeight: "100dvh",
      }}
    >
      {panel}
      {open && keyboardOpen ? (
        <Box sx={{ pointerEvents: "auto", width: "100%", flexShrink: 0 }}>
          <VirtualKeyboard
            visible
            layout={activeField === "phone" ? "numeric" : activeField === "email" ? "email" : "default"}
            onKeyPress={onKeyPress}
            skipApplyToActiveElement
            onClose={() => setKeyboardOpen(false)}
          />
        </Box>
      ) : null}
    </Box>,
    document.body
  );
}

const primaryButtonSx = {
  flex: 1,
  border: "none",
  cursor: "pointer",
  borderRadius: "14px",
  minHeight: 52,
  px: 2,
  bgcolor: FOREST,
  color: GOLD_SOFT,
  fontSize: 17,
  fontWeight: 700,
  fontFamily: "inherit",
} as const;

const ghostButtonSx = {
  border: "1px solid rgba(20,48,40,0.16)",
  cursor: "pointer",
  borderRadius: "14px",
  minHeight: 52,
  px: 2,
  bgcolor: "transparent",
  color: FOREST,
  fontSize: 17,
  fontWeight: 650,
  fontFamily: "inherit",
} as const;
