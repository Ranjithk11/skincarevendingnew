"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";
import { pauseKioskIdle, resumeKioskIdle } from "@/utils/kioskIdleGate";

/** Max time to wait on bank OTP / 3DS after card submit (same window as UPI QR). */
const CARD_OTP_WAIT_MS = 600_000;

/** Razorpay still needs a contact; we never ask the customer — use session or kiosk fallback. */
const KIOSK_FALLBACK_MOBILE = normalizeIndianMobile(
  process.env.NEXT_PUBLIC_KIOSK_PAYMENT_CONTACT || "8977016605"
);
const KIOSK_FALLBACK_EMAIL =
  process.env.NEXT_PUBLIC_KIOSK_PAYMENT_EMAIL || "kiosk@leafwater.in";

type CardField = "number" | "expiry" | "cvv" | "name";

type CreateOrderResponse =
  | {
      success: true;
      data: {
        keyId: string;
        order: { id: string; amount: number; currency: string };
      };
    }
  | { success: false; error: { message: string } };

type VerifyResponse =
  | { success: true; data: { verified: boolean } }
  | { success: false; error: { message: string } };

type RazorpayPaymentSuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type CardPaymentProps = {
  amountPaise: number;
  currency?: string;
  receipt?: string;
  mode?: "test" | "live";
  onBack: () => void;
  onVerified?: (payload: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) => void;
  /** Fatal payment failures only (not field validation). */
  onError?: (message: string) => void;
  onProcessingStart?: () => void;
};

const CUSTOM_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/razorpay.js";

/** Custom Checkout (`razorpay.js`) — required for card details → bank OTP. */
const loadCustomCheckoutScript = (retries = 3): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    const hasCreatePayment = () => {
      try {
        return typeof (window.Razorpay as any)?.prototype?.createPayment === "function";
      } catch {
        return false;
      }
    };

    if (typeof window.Razorpay === "function" && hasCreatePayment()) {
      return resolve(true);
    }

    const existing = document.querySelector(
      `script[src="${CUSTOM_CHECKOUT_SCRIPT}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      setTimeout(() => {
        if (hasCreatePayment()) resolve(true);
        else if (retries > 0) {
          existing.remove();
          loadCustomCheckoutScript(retries - 1).then(resolve);
        } else resolve(false);
      }, 800);
      return;
    }

    // Prefer Custom Checkout over Standard (`checkout.js`) for this flow.
    const standard = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (standard) standard.remove();

    const script = document.createElement("script");
    script.src = CUSTOM_CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () =>
      setTimeout(() => resolve(hasCreatePayment() || typeof window.Razorpay === "function"), 100);
    script.onerror = () => {
      if (retries > 1) {
        script.remove();
        setTimeout(() => loadCustomCheckoutScript(retries - 1).then(resolve), 800);
      } else resolve(false);
    };
    document.body.appendChild(script);
  });

function onlyDigits(value: string, max?: number) {
  const digits = value.replace(/\D/g, "");
  return typeof max === "number" ? digits.slice(0, max) : digits;
}

function formatCardNumber(digits: string) {
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(digits: string) {
  const d = digits.slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function normalizeIndianMobile(raw: string): string {
  let d = onlyDigits(raw);
  if (d.startsWith("91") && d.length > 10) d = d.slice(-10);
  return d.slice(0, 10);
}

function fieldSx(active: boolean) {
  return {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      minHeight: 64,
      fontSize: 22,
      bgcolor: "#fff",
      borderColor: active ? "#316D52" : undefined,
      "& fieldset": {
        borderWidth: 2,
        borderColor: active ? "#316D52" : "#e5e7eb",
      },
    },
    "& .MuiInputLabel-root": { fontSize: 18 },
  } as const;
}

/**
 * Online card payment via Razorpay.
 * Customer only enters card details. Phone/email are taken from the logged-in
 * session (or a silent kiosk fallback) because Razorpay requires contact metadata.
 */
export default function CardPayment({
  amountPaise,
  currency = "INR",
  receipt,
  mode = "live",
  onBack,
  onVerified,
  onError,
  onProcessingStart,
}: CardPaymentProps) {
  const { data: session } = useSession();
  const sessionPhone = normalizeIndianMobile(
    String(
      (session?.user as { mobileNumber?: string; phoneNumber?: string; phone?: string } | undefined)
        ?.mobileNumber ||
        (session?.user as { phoneNumber?: string } | undefined)?.phoneNumber ||
        (session?.user as { phone?: string } | undefined)?.phone ||
        ""
    )
  );
  const sessionEmail = String(
    (session?.user as { email?: string } | undefined)?.email || ""
  ).trim();
  const sessionName = String(
    (session?.user as { name?: string } | undefined)?.name || ""
  ).trim();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState(sessionName);
  const [activeField, setActiveField] = useState<CardField>("number");
  const [isPaying, setIsPaying] = useState(false);
  const [otpWaitMessage, setOtpWaitMessage] = useState(false);
  const inFlightRef = useRef(false);
  const idlePausedRef = useRef(false);
  const otpTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cardName && sessionName) setCardName(sessionName);
  }, [sessionName, cardName]);

  const clearOtpTimeout = useCallback(() => {
    if (otpTimeoutRef.current !== null) {
      window.clearTimeout(otpTimeoutRef.current);
      otpTimeoutRef.current = null;
    }
  }, []);

  const releasePaymentGate = useCallback(() => {
    clearOtpTimeout();
    setOtpWaitMessage(false);
    if (idlePausedRef.current) {
      idlePausedRef.current = false;
      resumeKioskIdle();
    }
  }, [clearOtpTimeout]);

  const armPaymentGate = useCallback(() => {
    if (!idlePausedRef.current) {
      idlePausedRef.current = true;
      pauseKioskIdle();
    }
    clearOtpTimeout();
    setOtpWaitMessage(true);
    otpTimeoutRef.current = window.setTimeout(() => {
      setIsPaying(false);
      inFlightRef.current = false;
      releasePaymentGate();
      toast.info("Card OTP timed out after 10 minutes. Please try again.");
      onError?.("Card OTP timed out");
    }, CARD_OTP_WAIT_MS);
  }, [clearOtpTimeout, onError, releasePaymentGate]);

  useEffect(() => {
    void loadCustomCheckoutScript();
    return () => {
      clearOtpTimeout();
      if (idlePausedRef.current) {
        idlePausedRef.current = false;
        resumeKioskIdle();
      }
    };
  }, [clearOtpTimeout]);

  const amountLabel = useMemo(
    () => `Rs. ${Math.round(Math.max(0, amountPaise) / 100)}/-`,
    [amountPaise]
  );

  const keyboardLayout =
    activeField === "name" ? "default" : ("numeric" as const);

  const showToastError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const reportFatalError = useCallback(
    (message: string) => {
      toast.error(message);
      onError?.(message);
    },
    [onError]
  );

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === "shift" || key === "123" || key === "ABC") return;
      if (key === "return") return;

      const apply = (
        prev: string,
        maxDigits: number,
        formatter?: (d: string) => string
      ) => {
        if (key === "backspace") {
          const digits = onlyDigits(prev).slice(0, -1);
          return formatter ? formatter(digits) : digits;
        }
        if (key === "space") {
          if (activeField !== "name") return prev;
          return `${prev} `;
        }
        if (key.length !== 1) return prev;

        if (activeField === "name") {
          if (!/^[a-zA-Z.\-']$/.test(key) && key !== " ") return prev;
          return `${prev}${key}`.slice(0, 40);
        }

        if (!/\d/.test(key)) return prev;
        const digits = onlyDigits(prev + key, maxDigits);
        return formatter ? formatter(digits) : digits;
      };

      if (activeField === "number") {
        setCardNumber((prev) => apply(prev, 19, formatCardNumber));
        return;
      }
      if (activeField === "expiry") {
        setExpiry((prev) => apply(prev, 4, formatExpiry));
        return;
      }
      if (activeField === "cvv") {
        setCvv((prev) => apply(prev, 4));
        return;
      }
      setCardName((prev) => apply(prev, 40));
    },
    [activeField]
  );

  // Physical / native keyboard → same path as on-screen VirtualKeyboard.
  // Fields stay readOnly so OS soft-keyboard doesn't fight the kiosk keyboard,
  // but USB/hardware keys still update the active field.
  useEffect(() => {
    if (isPaying) return;

    const onNativeKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest(".simple-keyboard") ||
          target.closest("[data-virtual-keyboard]"))
      ) {
        return;
      }

      let mapped: string | null = null;
      if (e.key === "Backspace") mapped = "backspace";
      else if (e.key === "Enter") mapped = "return";
      else if (e.key === " ") mapped = "space";
      else if (e.key.length === 1) mapped = e.key;

      if (!mapped) return;

      e.preventDefault();
      e.stopPropagation();
      handleKeyPress(mapped);
    };

    window.addEventListener("keydown", onNativeKeyDown, true);
    return () => window.removeEventListener("keydown", onNativeKeyDown, true);
  }, [handleKeyPress, isPaying]);

  const validate = useCallback(() => {
    const number = onlyDigits(cardNumber);
    const expDigits = onlyDigits(expiry);
    const month = Number(expDigits.slice(0, 2));
    const year = Number(expDigits.slice(2, 4));
    const name = cardName.trim();

    if (number.length < 13 || number.length > 19) {
      return "Enter a valid card number";
    }
    if (expDigits.length !== 4 || month < 1 || month > 12) {
      return "Enter expiry as MM/YY";
    }
    if (!Number.isFinite(year)) {
      return "Enter a valid expiry year";
    }
    if (cvv.length < 3 || cvv.length > 4) {
      return "Enter a valid CVV";
    }
    if (name.length < 2) {
      return "Enter the name on card";
    }
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return "Invalid amount";
    }
    return null;
  }, [amountPaise, cardName, cardNumber, cvv, expiry]);

  const handlePay = useCallback(async () => {
    if (inFlightRef.current) return;
    const validationError = validate();
    if (validationError) {
      showToastError(validationError);
      return;
    }

    // Silent contact for Razorpay only — never shown on the kiosk form.
    const mobile =
      sessionPhone.length === 10 ? sessionPhone : KIOSK_FALLBACK_MOBILE;
    // Custom Checkout docs use 10-digit contact (not +91…).
    const contact = mobile;
    const mail =
      sessionEmail ||
      (mobile ? `kiosk+${mobile}@leafwater.in` : KIOSK_FALLBACK_EMAIL);

    try {
      inFlightRef.current = true;
      setIsPaying(true);
      armPaymentGate();
      onProcessingStart?.();

      const loaded = await loadCustomCheckoutScript();
      if (!loaded || typeof window.Razorpay !== "function") {
        reportFatalError("Failed to load Razorpay Custom Checkout. Check internet.");
        setIsPaying(false);
        inFlightRef.current = false;
        releasePaymentGate();
        return;
      }

      const createOrderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt,
          mode,
        }),
      });

      const createOrderJson = (await createOrderRes
        .json()
        .catch(() => null)) as CreateOrderResponse | null;

      if (!createOrderRes.ok || !createOrderJson || createOrderJson.success === false) {
        const msg =
          createOrderJson && "error" in createOrderJson
            ? createOrderJson.error.message
            : `Create order failed (${createOrderRes.status})`;
        reportFatalError(msg);
        setIsPaying(false);
        inFlightRef.current = false;
        releasePaymentGate();
        return;
      }

      const { keyId, order } = createOrderJson.data;
      const expDigits = onlyDigits(expiry);
      const number = onlyDigits(cardNumber);
      const expiryMonth = expDigits.slice(0, 2);
      const expiryYear2 = expDigits.slice(2, 4);

      const unlock = () => {
        setIsPaying(false);
        inFlightRef.current = false;
        releasePaymentGate();
      };

      const verifyAndComplete = async (response: RazorpayPaymentSuccessResponse) => {
        try {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              mode,
            }),
          });
          const verifyJson = (await verifyRes
            .json()
            .catch(() => null)) as VerifyResponse | null;

          if (!verifyRes.ok || !verifyJson || verifyJson.success === false) {
            const msg =
              verifyJson && "error" in verifyJson
                ? verifyJson.error.message
                : "Payment verification failed";
            reportFatalError(msg);
            return;
          }

          toast.success("Card payment successful");
          onVerified?.({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        } catch {
          reportFatalError("Payment verification failed");
        } finally {
          unlock();
        }
      };

      // Custom Checkout instance (NOT Standard Checkout open()).
      const rzp = new window.Razorpay({
        key: keyId,
        image: "/wending/goldlog.svg",
      } as any);

      if (typeof (rzp as any).createPayment !== "function") {
        reportFatalError(
          "Razorpay Custom Checkout is not enabled on this account. Enable it in Razorpay Dashboard, or use UPI."
        );
        unlock();
        return;
      }

      rzp.on("payment.success", (response: RazorpayPaymentSuccessResponse) => {
        void verifyAndComplete(response);
      });

      rzp.on("payment.error", (err: unknown) => {
        const e = err as {
          error?: { description?: string; reason?: string; code?: string };
        };
        reportFatalError(
          e?.error?.description ||
            e?.error?.reason ||
            e?.error?.code ||
            "Card payment failed"
        );
        unlock();
      });

      // Also listen for legacy failed event name used by some builds.
      rzp.on("payment.failed", (err: unknown) => {
        const e = err as { error?: { description?: string; reason?: string } };
        reportFatalError(
          e?.error?.description || e?.error?.reason || "Card payment failed"
        );
        unlock();
      });

      // Submit card → Razorpay opens bank OTP / 3DS (not Payment Options).
      (rzp as any).createPayment({
        amount: order.amount,
        currency: order.currency || currency,
        order_id: order.id,
        email: mail,
        contact,
        method: "card",
        "card[number]": number,
        "card[name]": cardName.trim(),
        "card[expiry_month]": expiryMonth,
        "card[expiry_year]": expiryYear2,
        "card[cvv]": cvv,
      });
    } catch (err) {
      console.error("[CardPayment]", err);
      reportFatalError("Something went wrong. Please try again.");
      setIsPaying(false);
      inFlightRef.current = false;
      releasePaymentGate();
    }
  }, [
    amountPaise,
    armPaymentGate,
    cardName,
    cardNumber,
    currency,
    cvv,
    expiry,
    mode,
    onProcessingStart,
    onVerified,
    receipt,
    releasePaymentGate,
    reportFatalError,
    sessionEmail,
    sessionPhone,
    showToastError,
    validate,
  ]);

  return (
    <Box sx={{ width: "100%", maxWidth: 720, mx: "auto", pb: "320px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Button
          onClick={onBack}
          startIcon={<Icon icon="mdi:arrow-left" width={22} />}
          sx={{
            textTransform: "none",
            fontSize: 18,
            fontWeight: 700,
            color: "#316D52",
          }}
        >
          Back
        </Button>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
          To Pay {amountLabel}
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#111827", mb: 0.5 }}>
        Pay Via Card
      </Typography>
      <Typography sx={{ fontSize: 18, color: "#6b7280", mb: 3 }}>
        Enter your card details. Payment is processed securely by Razorpay.
      </Typography>

      <TextField
        fullWidth
        label="Card number"
        value={cardNumber}
        placeholder="XXXX XXXX XXXX XXXX"
        onFocus={() => setActiveField("number")}
        onClick={() => setActiveField("number")}
        inputProps={{ inputMode: "numeric", readOnly: true }}
        sx={{ ...fieldSx(activeField === "number"), mb: 2 }}
      />

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Expiry (MM/YY)"
          value={expiry}
          placeholder="MM/YY"
          onFocus={() => setActiveField("expiry")}
          onClick={() => setActiveField("expiry")}
          inputProps={{ inputMode: "numeric", readOnly: true }}
          sx={fieldSx(activeField === "expiry")}
        />
        <TextField
          fullWidth
          label="CVV"
          value={cvv}
          placeholder="CVV"
          type="password"
          onFocus={() => setActiveField("cvv")}
          onClick={() => setActiveField("cvv")}
          inputProps={{ inputMode: "numeric", readOnly: true }}
          sx={fieldSx(activeField === "cvv")}
        />
      </Box>

      <TextField
        fullWidth
        label="Name on card"
        value={cardName}
        placeholder="Name as on card"
        onFocus={() => setActiveField("name")}
        onClick={() => setActiveField("name")}
        inputProps={{ readOnly: true }}
        sx={{ ...fieldSx(activeField === "name"), mb: 3 }}
      />

      <Button
        fullWidth
        variant="contained"
        disabled={isPaying}
        onClick={() => void handlePay()}
        startIcon={
          isPaying ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            <Icon icon="mdi:lock" width={22} />
          )
        }
        sx={{
          textTransform: "none",
          fontSize: 22,
          fontWeight: 700,
          py: 1.6,
          borderRadius: 2,
          bgcolor: "#316D52",
          "&:hover": { bgcolor: "#234a31" },
        }}
      >
        {isPaying ? "Waiting for OTP..." : `Pay ${amountLabel}`}
      </Button>

      {otpWaitMessage ? (
        <Typography sx={{ mt: 2, fontSize: 16, color: "#6b7280", textAlign: "center" }}>
          Complete bank OTP on the Razorpay screen. Idle logout is paused for up to 10 minutes.
        </Typography>
      ) : null}

      <Box
        data-virtual-keyboard
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1400,
        }}
      >
        <VirtualKeyboard
          layout={keyboardLayout}
          visible
          skipApplyToActiveElement
          onKeyPress={handleKeyPress}
        />
      </Box>
    </Box>
  );
}
