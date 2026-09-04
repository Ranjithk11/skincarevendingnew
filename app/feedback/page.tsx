"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
} from "@mui/material";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import PageBackground from "@/components/ui/PageBackground";
import { HelpDialog } from "@/components/ui";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";
import { APP_ROUTES } from "@/utils/routes";
import { clearSpinWheelSession } from "@/lib/spin-wheel/session";
import { buildSpinWheelWebhookPayload } from "@/lib/spin-wheel/webhook";
import { useAppDispatch } from "@/redux/store/store";
import { clearCart } from "@/redux/reducers/cartSlice";
import { persistor } from "@/redux/store/store";
import { useVoiceMessages } from "@/contexts/VoiceContext";
import DispenseErrorReporter from "./components/DispenseErrorReporter";
import DispenseReporter from "./components/DispenseReporter";
import SendInvoiceEmail from "./components/SendInvoiceEmail";
import TaxInvoice from "./components/TaxInvoice";
import FeedbackRating from "./components/FeedbackRating";
import PaymentReporter from "./components/PaymentReporter";
import { buildCheckoutInvoice } from "@/utils/checkoutInvoice";
import {
  getMachineFallbackInvoiceEmail,
  resolveInvoiceRecipientEmail,
} from "@/utils/invoiceEmail";
import {
  mergeMachineContext,
  getWebhookUserId,
  getWalkInDisplayName,
} from "@/lib/machineContext";
import { resolveCheckoutPaymentClient } from "@/lib/checkoutPaymentResolve";
import {
  sendDispenseErrorWebhook,
  sendDispenseSuccessWebhook,
} from "@/utils/webhook";

/** STM32 / network hang: fail with dispense_error instead of staying silent. */
const DISPENSE_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = "INR " + convert(rupees);
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  result += " Only";
  return result;
}

function formatDate(d: Date): string {
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

async function enrichCheckoutPayment(summary: any): Promise<any> {
  if (!summary?.payment) return summary;
  const resolved = await resolveCheckoutPaymentClient(summary.payment, 8);
  if (!resolved || resolved === summary.payment) return summary;
  return { ...summary, payment: resolved };
}

function isTravelKitItem(item: any): boolean {
  if (!item || typeof item !== "object") return false;
  if (item.isTravelKit === true) return true;
  if (String(item.category || "") === "Travel Kit") return true;
  const id = String(item.id || "");
  return (
    id === "travel-ready" ||
    id === "hydration" ||
    id === "sun" ||
    id === "simple"
  );
}

/** Normalize checkout summary lines for payment / dispense Make webhooks. */
function mapCheckoutItemForWebhook(item: any) {
  const isKit = isTravelKitItem(item);
  const retail =
    item?.retailPrice ??
    item?.retail_price ??
    item?.originalPrice ??
    null;
  const amount =
    item?.amount ??
    item?.payablePrice ??
    retail;
  return {
    id: item?.id,
    name: item?.name,
    quantity: item?.quantity ?? 1,
    slotId: item?.slotId,
    retailPrice: retail,
    amount,
    isTravelKit: isKit,
    fulfillment: (isKit ? "agent_handoff" : "machine") as
      | "agent_handoff"
      | "machine",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeedbackPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const dispatch = useAppDispatch();
  const { speakMessage } = useVoiceMessages();

  const autoHomeTimerRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const hasAnnouncedFeedbackPromptRef = useRef(false);
  const textFieldRef = useRef<HTMLDivElement>(null);

  const userId = (session?.user as any)?.id as string | undefined;

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const [checkoutSummary, setCheckoutSummary] = useState<any>(null);
  const [dispenseState, setDispenseState] = useState<
    | { status: "idle" }
    | { status: "running" }
    | { status: "done"; results: any }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [pickupTimer, setPickupTimer] = useState<number>(0);

  // Email state
  const [userEmail, setUserEmail] = useState<string>("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string>("");
  // Stable unique invoice number allocated server-side (SQLite monthly sequence)
  const [invoiceNo, setInvoiceNo] = useState<string>("");

  // Keyboard target: which field the virtual keyboard is typing into
  const [keyboardTarget, setKeyboardTarget] = useState<"notes" | "email">("notes");

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const emailFieldRef = useRef<HTMLDivElement>(null);
  const emailInitializedRef = useRef(false);

  // Machine info (fallback when no user session, e.g. direct purchase from /products or /slots)
  const [machineInfo, setMachineInfo] = useState<{ machineId: string; machineName: string; machineLocation: string } | null>(null);
  const [machineInfoReady, setMachineInfoReady] = useState(false);

  useEffect(() => {
    fetch("/api/admin/machine-name")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMachineInfo({
            machineId: data.machineId || "",
            machineName: data.machineName || "",
            machineLocation: data.machineLocation || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setMachineInfoReady(true));
  }, []);

  // Tax Invoice accordion
  const [invoiceExpanded, setInvoiceExpanded] = useState(false);

  // Machine location from environment or default
  const machineLocation =
    process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
    (session?.user as any)?.machineLocation ||
    (checkoutSummary?.payment?.machineLocation) ||
    "LeafWater Vending Machine";

  const checkoutItems = useMemo(() => {
    const items = checkoutSummary?.items;
    return Array.isArray(items) ? items : [];
  }, [checkoutSummary]);

  const kitItems = useMemo(
    () => checkoutItems.filter((item: any) => isTravelKitItem(item)),
    [checkoutItems]
  );

  const vendableItems = useMemo(
    () => checkoutItems.filter((item: any) => !isTravelKitItem(item)),
    [checkoutItems]
  );

  const hasTravelKits = kitItems.length > 0;
  const hasVendableProducts = vendableItems.length > 0;

  const goHome = async () => {
    hasCompletedRef.current = true;
    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current);
      autoHomeTimerRef.current = null;
    }
    try {
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem("kiosk_checkout_summary");
        } catch {
        }
      }
      dispatch(clearCart());
      await persistor.purge();
      clearSpinWheelSession();
      try {
        await signOut({ redirect: false });
      } catch {}
    } finally {
      router.push(APP_ROUTES.HOME);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCheckout = async () => {
      try {
        const raw = window.sessionStorage.getItem("kiosk_checkout_summary");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const enriched = await enrichCheckoutPayment(parsed);
        setCheckoutSummary(enriched);
        try {
          window.sessionStorage.removeItem("kiosk_checkout_summary");
        } catch {
        }
      } catch {
      }
    };

    void loadCheckout();
    dispatch(clearCart());
    void persistor.purge();
  }, [dispatch]);

  useEffect(() => {
    if (hasAnnouncedFeedbackPromptRef.current) return;
    hasAnnouncedFeedbackPromptRef.current = true;
    const t = window.setTimeout(() => {
      speakMessage("feedbackPrompt");
    }, 500);

    return () => window.clearTimeout(t);
  }, [speakMessage]);

  // Start 60s auto-home timer only after dispense succeeds
  useEffect(() => {
    if (dispenseState.status !== "done") return;
    if (typeof window === "undefined") return;

    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current);
      autoHomeTimerRef.current = null;
    }

    autoHomeTimerRef.current = window.setTimeout(() => {
      if (hasCompletedRef.current) return;
      if (isSubmitting) return;
      void goHome();
    }, 180_000);

    return () => {
      if (autoHomeTimerRef.current !== null) {
        window.clearTimeout(autoHomeTimerRef.current);
        autoHomeTimerRef.current = null;
      }
    };
  }, [dispenseState.status]);

  // Pickup timer countdown after machine dispense succeeds (skip for kit-only)
  useEffect(() => {
    if (dispenseState.status !== "done") return;
    if (!hasVendableProducts) {
      setPickupTimer(0);
      return;
    }

    // Start 10 second countdown for pickup
    setPickupTimer(10);

    // Announce successful dispense and pickup instruction
    speakMessage("dispense");
    speakMessage("dispenseCollect");

    const interval = setInterval(() => {
      setPickupTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dispenseState.status, speakMessage, hasVendableProducts]);

  // Voice announcement for errors
  useEffect(() => {
    if (dispenseState.status === "error") {
      speakMessage('error');
    }
  }, [dispenseState.status, speakMessage]);

  const mergedMachine = useMemo(
    () =>
      mergeMachineContext(
        machineInfo,
        checkoutSummary?.payment,
        session?.user as { machineId?: string; machineName?: string; machineLocation?: string }
      ),
    [machineInfo, checkoutSummary?.payment, session?.user]
  );

  const webhookUserId = useMemo(
    () => getWebhookUserId(session, mergedMachine),
    [session, mergedMachine]
  );

  const webhookUser = useMemo(
    () => ({
      userId: webhookUserId,
      name: getWalkInDisplayName(session, mergedMachine),
      email: (session?.user as any)?.email || "",
      phone:
        (session?.user as any)?.mobileNumber ||
        (session?.user as any)?.phoneNumber ||
        (session?.user as any)?.phone ||
        "",
    }),
    [session, mergedMachine, webhookUserId]
  );

  const spinWheelWebhookData = useMemo(
    () =>
      buildSpinWheelWebhookPayload({
        reward: checkoutSummary?.spinWheelReward,
        couponApplied:
          checkoutSummary?.couponApplied ??
          Boolean(checkoutSummary?.discount && checkoutSummary?.spinWheelReward),
        discountAmount: checkoutSummary?.discount,
        cartTotal: checkoutSummary?.total,
        payableTotal: checkoutSummary?.payableTotal,
        appliedAt: checkoutSummary?.createdAt,
      }),
    [checkoutSummary]
  );

  const dispenseSuccessCommand = useMemo(() => {
    if (dispenseState.status !== "done") return null;
    const results = Array.isArray((dispenseState as { results?: unknown }).results)
      ? ((dispenseState as { results: Array<{ productCode?: string; ok?: boolean }> }).results)
      : [];
    const firstOk = results.find(
      (r) =>
        r?.ok &&
        String(r?.productCode || "").toUpperCase() !== "TRAY" &&
        String(r?.productCode || "").toUpperCase() !== "KIT_HANDOFF"
    );
    const item = vendableItems[0] || kitItems[0] || checkoutItems[0];
    const slotId = item?.slotId || firstOk?.productCode || "";

    return {
      productId: item?.id || "",
      productName: item?.name || "",
      slotId,
      command: firstOk?.productCode
        ? `RQ${firstOk.productCode}`
        : hasTravelKits && !hasVendableProducts
          ? "KIT_HANDOFF"
          : "DISPENSE",
      timestamp: new Date().toISOString(),
    };
  }, [dispenseState, checkoutItems, vendableItems, kitItems, hasTravelKits, hasVendableProducts]);

  const handleKeyboardKeyPress = (key: string) => {
    const setter = keyboardTarget === "email" ? setUserEmail : setNotes;

    if (key === "backspace") {
      setter((prev) => prev.slice(0, -1));
      return;
    }
    if (key === "space") {
      setter((prev) => `${prev} `);
      return;
    }
    if (key === "return") {
      if (keyboardTarget === "email") {
        setIsKeyboardOpen(false);
        setIsEditingEmail(false);
        setKeyboardTarget("notes");
      } else {
        setter((prev) => `${prev}\n`);
        setIsKeyboardOpen(false);
      }
      return;
    }
    if (key === "shift" || key === "123" || key === "ABC" || key === "arrowleft" || key === "arrowright") {
      return;
    }
    setter((prev) => `${prev}${key}`);
  };

  const handleEmailEditConfirm = () => {
    setIsEditingEmail(false);
    setIsKeyboardOpen(false);
    setKeyboardTarget("notes");
  };

  useEffect(() => {
    const run = async () => {
      if (dispenseState.status !== "idle") return;
      if (!checkoutSummary) return;
      if (checkoutItems.length === 0) return;
      setDispenseState({ status: "running" });

      const payment = checkoutSummary?.payment;
      const productsForWebhook = checkoutItems.map(mapCheckoutItemForWebhook);

      const fireError = async (message: string, raw?: unknown) => {
        setDispenseState({ status: "error", message });
        const resolvedTx =
          (await resolveCheckoutPaymentClient(payment, 4)) || payment;
        void sendDispenseErrorWebhook({
          errorMessage: message,
          user: webhookUser,
          products: productsForWebhook,
          payment: resolvedTx,
          raw,
          machineLocation: mergedMachine.machineLocation,
          machineName: mergedMachine.machineName || "Vending Machine",
        });
      };

      const fireSuccess = async (results: unknown) => {
        setDispenseState({ status: "done", results });
        const resolvedTx =
          (await resolveCheckoutPaymentClient(payment, 4)) || payment;
        const resultList = Array.isArray(results)
          ? (results as Array<{ productCode?: string; ok?: boolean }>)
          : [];
        const firstOk = resultList.find(
          (r) =>
            r?.ok &&
            String(r?.productCode || "").toUpperCase() !== "TRAY" &&
            String(r?.productCode || "").toUpperCase() !== "KIT_HANDOFF"
        );
        const item = vendableItems[0] || kitItems[0] || checkoutItems[0];
        const slotId = item?.slotId || firstOk?.productCode || "";
        void sendDispenseSuccessWebhook({
          user: webhookUser,
          products: productsForWebhook,
          transaction: resolvedTx,
          command: {
            productId: item?.id || "",
            productName: item?.name || "",
            slotId,
            command: firstOk?.productCode
              ? `RQ${firstOk.productCode}`
              : slotId
                ? `RQ${slotId}`
                : hasTravelKits && !hasVendableProducts
                  ? "KIT_HANDOFF"
                  : "DISPENSE",
            timestamp: new Date().toISOString(),
          },
          agentName: payment?.agentName,
          machineLocation: mergedMachine.machineLocation,
          machineName: mergedMachine.machineName || "Vending Machine",
        });
      };

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), DISPENSE_TIMEOUT_MS);

      try {
        const productCodes: string[] = [];

        // Travel kits are prepared/handed over by an agent — never send to STM32.
        for (const item of vendableItems) {
          const quantity = Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
          
          // If slotId is set and quantity is 1, use it directly (user selected specific slot)
          // This preserves the original behavior for single-item purchases from /slots page
          if (item?.slotId && quantity === 1) {
            productCodes.push(String(item.slotId));
            continue;
          }
          
          // For quantity > 1 or no slotId, fetch slots from API to distribute across multiple slots
          const productIdRaw = typeof item?.id === "string" ? item.id : "";
          const cleanProductId = productIdRaw.replace(/^products\//, "");
          const name = typeof item?.name === "string" ? item.name : "";
          const encodedName = encodeURIComponent(name);
          const slotsUrl = `/api/admin/products/${cleanProductId || "unknown"}/slots?name=${encodedName}`;

          const slotsResponse = await fetch(slotsUrl, { signal: controller.signal });
          const slotsData = await slotsResponse.json();
          const slots = Array.isArray(slotsData?.slots) ? slotsData.slots : [];
          
          // If slotId is set, prioritize that slot first, then others
          let availableSlots = slots
            .filter((s: any) => Number(s?.quantity) > 0)
            .sort((a: any, b: any) => Number(b?.slot_id) - Number(a?.slot_id));
          
          // If item has slotId, move that slot to the front
          if (item?.slotId) {
            const preferredSlotId = Number(item.slotId);
            availableSlots = [
              ...availableSlots.filter((s: any) => Number(s?.slot_id) === preferredSlotId),
              ...availableSlots.filter((s: any) => Number(s?.slot_id) !== preferredSlotId),
            ];
          }

          let remaining = quantity;

          for (const s of availableSlots) {
            if (remaining <= 0) break;
            const slotId = Number(s?.slot_id);
            const slotQty = Number(s?.quantity);
            if (!Number.isFinite(slotId) || slotId <= 0) continue;
            if (!Number.isFinite(slotQty) || slotQty <= 0) continue;

            const take = Math.min(remaining, Math.floor(slotQty));
            for (let i = 0; i < take; i++) productCodes.push(String(slotId));
            remaining -= take;
          }

          if (remaining > 0) {
            const fallback = slots[0];
            const slotId = Number(fallback?.slot_id);
            if (Number.isFinite(slotId) && slotId > 0) {
              for (let i = 0; i < remaining; i++) productCodes.push(String(slotId));
              remaining = 0;
            }
          }
        }

        // Kit-only purchase: skip machine dispense and mark success for agent handoff UI.
        if (productCodes.length === 0) {
          if (hasTravelKits && !hasVendableProducts) {
            await fireSuccess([{ productCode: "KIT_HANDOFF", ok: true }]);
            return;
          }
          await fireError("No slots found for dispensing");
          return;
        }

        const response = await fetch("/api/stm32/dispense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productCodes }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result?.success) {
          const msg = result?.error?.message || "Dispense failed";
          await fireError(msg, result);
          return;
        }

        await fireSuccess(result?.data?.results);
      } catch (e: any) {
        const aborted = e?.name === "AbortError" || controller.signal.aborted;
        const msg = aborted
          ? `Dispense timed out after ${Math.round(DISPENSE_TIMEOUT_MS / 1000)}s`
          : e?.message || "Dispense failed";
        await fireError(msg, e);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void run();
  }, [
    checkoutItems,
    checkoutSummary,
    dispenseState.status,
    webhookUser,
    mergedMachine.machineLocation,
    mergedMachine.machineName,
    vendableItems,
    hasTravelKits,
    hasVendableProducts,
  ]);

  const handleStarClick = (starIndex: number) => {
    setRating(starIndex);
  };

  const handleStarHover = (starIndex: number) => {
    setHoveredRating(starIndex);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleClose = () => {
    hasCompletedRef.current = true;
    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current);
      autoHomeTimerRef.current = null;
    }
    dispatch(clearCart());
    void persistor.purge();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("kiosk_checkout_summary");
      } catch {
      }
    }
    router.push(APP_ROUTES.HOME);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    hasCompletedRef.current = true;
    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current);
      autoHomeTimerRef.current = null;
    }

    setIsSubmitting(true);
    try {
      if (userId) {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            rating,
            notes,
          }),
        });

        const result = await response.json();

        if (result.success || result.status === "success") {
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      } else {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;
  const canSubmit = rating > 0 && !isSubmitting;

  // Initialize email once from session, or machine-location fallback when phone-only / walk-in
  useEffect(() => {
    if (!machineInfoReady || emailInitializedRef.current) return;

    const sessionEmail = ((session?.user as any)?.email || "").trim();
    if (sessionEmail.includes("@")) {
      setUserEmail(sessionEmail);
    } else {
      setUserEmail(
        getMachineFallbackInvoiceEmail(
          machineInfo?.machineId,
          machineInfo?.machineLocation
        )
      );
    }
    emailInitializedRef.current = true;
  }, [session, machineInfo, machineInfoReady]);

  // Allocate a unique invoice number once per payment/order (idempotent on server).
  useEffect(() => {
    if (!checkoutSummary?.payment || invoiceNo) return;
    const orderId = String(checkoutSummary.payment.orderId || "").trim();
    const paymentId = String(checkoutSummary.payment.paymentId || "").trim();
    const qrCodeId = String(checkoutSummary.payment.qrCodeId || "").trim();
    if (!orderId && !paymentId && !qrCodeId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/invoice/allocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paymentId, qrCodeId }),
        });
        const data = await res.json();
        if (!cancelled && data?.success && data?.invoiceNo) {
          setInvoiceNo(String(data.invoiceNo));
        }
      } catch (err) {
        console.warn("[FeedbackPage] Invoice number allocate failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutSummary, invoiceNo]);

  const buildInvoicePayload = useCallback(
    (buyerEmailOverride?: string) => {
      if (!checkoutSummary || !invoiceNo) return null;
      const now = new Date();
      const orderId = checkoutSummary?.payment?.orderId || "";
      const buyerEmail = buyerEmailOverride ?? (session?.user as any)?.email ?? "";

      return buildCheckoutInvoice({
        checkoutSummary,
        checkoutItems,
        invoiceNo,
        invoiceDate: formatDate(now),
        orderReference: orderId ? `${orderId} dated ${formatDate(now)}` : formatDate(now),
        amountInWords: numberToWords,
        gstin: process.env.NEXT_PUBLIC_GSTIN,
        state: process.env.NEXT_PUBLIC_STATE,
        placeOfSupply: process.env.NEXT_PUBLIC_STATE,
        buyerName:
          (session?.user as any)?.name ||
          `Walk-in Customer – ${machineInfo?.machineName || "Vending Machine"}`,
        buyerEmail,
        buyerPhone:
          (session?.user as any)?.mobileNumber ||
          (session?.user as any)?.phoneNumber ||
          "",
        machineId: machineInfo?.machineId || "",
        machineName: machineInfo?.machineName || "",
        machineLocation: machineInfo?.machineLocation || "",
        command: dispenseSuccessCommand
          ? {
              productId: dispenseSuccessCommand.productId,
              productName: dispenseSuccessCommand.productName,
              slotId: String(dispenseSuccessCommand.slotId || ""),
              command: dispenseSuccessCommand.command,
              timestamp: dispenseSuccessCommand.timestamp,
            }
          : undefined,
      });
    },
    [checkoutSummary, checkoutItems, session, machineInfo, dispenseSuccessCommand, invoiceNo]
  );

  const invoiceData = useMemo(() => buildInvoicePayload(), [buildInvoicePayload]);

  const postInvoiceEmail = useCallback(async (email: string, invoice: NonNullable<ReturnType<typeof buildInvoicePayload>>) => {
    const response = await fetch("/api/send-invoice-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, invoice }),
    });
    return response.json();
  }, []);

  // Auto-send once after checkout: session email, or {machineLocation}@gmail.com fallback
  const invoiceWebhookFiredRef = useRef(false);
  useEffect(() => {
    if (!invoiceData || !machineInfoReady || invoiceWebhookFiredRef.current) return;

    const recipientEmail = resolveInvoiceRecipientEmail(
      (session?.user as any)?.email,
      machineInfo?.machineId,
      machineInfo?.machineLocation
    );

    invoiceWebhookFiredRef.current = true;
    const invoicePayload = buildInvoicePayload(recipientEmail);
    if (!invoicePayload) return;

    postInvoiceEmail(recipientEmail, invoicePayload)
      .then((result) => {
        if (result.success) {
          console.log("[FeedbackPage] Invoice webhook auto-sent to", recipientEmail);
        } else {
          console.warn("[FeedbackPage] Invoice webhook failed:", result.error);
        }
      })
      .catch((err) => {
        console.warn("[FeedbackPage] Invoice webhook error:", err);
      });
  }, [invoiceData, machineInfoReady, session, machineInfo, buildInvoicePayload, postInvoiceEmail]);

  const handleSendEmail = async () => {
    const nextEmail = userEmail.trim();
    if (!nextEmail.includes("@") || !invoiceData) return;

    setIsEditingEmail(false);
    setIsSendingEmail(true);
    setEmailError("");

    try {
      // Invoice email only — do not call /api/user/update-email here; SAVE_USER sends OTP, not invoice.
      const invoiceWithUser = buildInvoicePayload(nextEmail);
      if (!invoiceWithUser) {
        setEmailError("Invoice data is not available");
        return;
      }

      invoiceWithUser.buyerEmail = nextEmail;
      invoiceWithUser.buyerName =
        (session?.user as any)?.name ||
        invoiceWithUser.buyerName ||
        `Walk-in Customer – ${machineInfo?.machineName || "Vending Machine"}`;
      invoiceWithUser.buyerPhone =
        (session?.user as any)?.mobileNumber ||
        (session?.user as any)?.phoneNumber ||
        (session?.user as any)?.phone ||
        invoiceWithUser.buyerPhone ||
        "";

      const result = await postInvoiceEmail(nextEmail, invoiceWithUser);
      if (result.success) {
        setEmailSent(true);
      } else {
        setEmailError(result.error || "Failed to send email");
      }
    } catch (err: any) {
      setEmailError(err.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <PageBackground fitParent>
      {/* Payment webhook safety net — fires once per orderId if cartProduct unmounted too fast */}
      {(checkoutSummary?.payment?.orderId || checkoutSummary?.payment?.paymentId) && (
        <PaymentReporter
          active
          user={webhookUser}
          products={checkoutItems.map(mapCheckoutItemForWebhook)}
          transaction={checkoutSummary?.payment}
          machineLocation={mergedMachine.machineLocation}
          machineName={mergedMachine.machineName || "Vending Machine"}
          spinWheel={spinWheelWebhookData}
        />
      )}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          px: 3,
          pt: 3,
          pb: 6,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        {/* Close + Need Help buttons */}
        <Box sx={{ position: "absolute", top: 18, right: 18, display: "flex", gap: 1, zIndex: 10 }}>
          <Button
            onClick={() => setHelpDialogOpen(true)}
            variant="outlined"
            sx={{
              height: 40,
              borderRadius: "20px",
              textTransform: "none",
              fontSize: 24,
              fontWeight: 600,
              color: "#2d5a3d",
              borderColor: "#d1d5db",
              bgcolor: "#ffffff",
              px: 2,
              "&:hover": { bgcolor: "#f0fdf4", borderColor: "#2d5a3d" },
            }}
          >
            Need Help?
          </Button>
          {/* <IconButton
            onClick={handleClose}
            sx={{
              width: 40,
              height: 40,
              bgcolor: "#ffffff",
              border: "1px solid #d1d5db",
              "&:hover": { bgcolor: "#f5f5f5" },
            }}
          >
            <Icon icon="mdi:close" width={22} />
          </IconButton> */}
        </Box>

        {/* -------- LOGO -------- */}
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center", mt: 2, mb: 2 }}>
          <Box
            sx={{
              bgcolor: "#ffffff",
              px: 2.5,
              py: 1,
              borderRadius: 0,
              width: "min(520px, 100%)",
              height: 80,
              position: "relative",
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={goHome}
              sx={{ all: "unset", cursor: "pointer", display: "block", width: "100%", height: "100%", position: "relative" }}
            >
              <Image src="/wending/goldlog.svg" alt="Leaf Water" fill sizes="520px" style={{ objectFit: "contain" }} priority />
            </Box>
          </Box>
        </Box>

        {/* -------- PAYMENT SUCCESSFUL BANNER -------- */}
        <Box sx={{ width: "min(860px, 100%)", mt: 1 }}>
          <Box
            sx={{
              bgcolor: "#f0faf5",
              borderRadius: 3,
              px: 3,
              py: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              border: "1px solid #d1fae5",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Image src="/NewFeedback/check_success_circle.svg" alt="Success" width={48} height={48} />
              <Box>
                <Typography sx={{ fontSize: 32, fontWeight: 700, color: "#111827" }}>
                  Payment Successful
                </Typography>
                <Typography sx={{ fontSize: 24, color: "#6b7280", mt: 0.5 }}>
                  Your tax invoice is available below.
                </Typography>
              </Box>
            </Box>
            <Image src="/NewFeedback/shopping_bag_and_bottle.svg" alt="" width={80} height={80} />
          </Box>
        </Box>

        {/* -------- DISPENSE STATUS -------- */}
        {checkoutSummary && (
          <Box sx={{ width: "min(860px, 100%)", mt: 2 }}>
            {(dispenseState.status === "idle" || dispenseState.status === "running") && (
              <Box sx={{ bgcolor: "#fff", borderRadius: 3, px: 3, py: 2, border: "1px solid #e5e7eb", textAlign: "center" }}>
                <Typography sx={{ fontSize: 24, color: "#374151" }}>
                  {hasVendableProducts
                    ? "Dispensing your products..."
                    : hasTravelKits
                      ? "Confirming your travel kit order..."
                      : "Processing your order..."}
                </Typography>
              </Box>
            )}
            {dispenseState.status === "done" && (
              <>
                <DispenseReporter
                  active
                  user={webhookUser}
                  products={checkoutItems.map(mapCheckoutItemForWebhook)}
                  transaction={checkoutSummary?.payment}
                  command={dispenseSuccessCommand || undefined}
                  agentName={checkoutSummary?.payment?.agentName}
                  machineLocation={mergedMachine.machineLocation}
                  machineName={mergedMachine.machineName || "Vending Machine"}
                />
                {hasVendableProducts && pickupTimer > 0 && (
                  <Box sx={{ bgcolor: "#fef3c7", borderRadius: 2, border: "2px solid #f59e0b", textAlign: "center", p: 2, mb: hasTravelKits ? 2 : 0 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#92400e" }}>
                      Pickup your product
                    </Typography>
                    <Typography sx={{ fontSize: 36, fontWeight: 800, color: "#d97706", mt: 1 }}>{pickupTimer}s</Typography>
                    <Typography sx={{ fontSize: 24, color: "#92400e", mt: 0.5 }}>Tray door will close soon</Typography>
                  </Box>
                )}
                {hasTravelKits && (
                  <Box
                    sx={{
                      bgcolor: "#ecfdf5",
                      borderRadius: 2,
                      border: "2px solid #2F5D46",
                      p: 2.5,
                      textAlign: "center",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 1 }}>
                      <Icon icon="mdi:bag-suitcase-outline" width={32} color="#2F5D46" />
                      <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#2F5D46" }}>
                        Travel kit handover
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 24, color: "#14532d", lineHeight: 1.45, mb: 1.5 }}>
                      Our agent is preparing your travel kit and will hand it over to you shortly.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      {kitItems.map((kit: any) => (
                        <Typography
                          key={String(kit?.id || kit?.name)}
                          sx={{ fontSize: 22, fontWeight: 600, color: "#166534" }}
                        >
                          {kit?.name || "Travel Kit"}
                          {kit?.payablePrice != null ? ` · ₹${kit.payablePrice}` : ""}
                        </Typography>
                      ))}
                    </Box>
                    <Typography sx={{ fontSize: 20, color: "#6b7280", mt: 1.5 }}>
                      Available 7 am to 7 pm
                    </Typography>
                  </Box>
                )}
              </>
            )}
            {dispenseState.status === "error" && (
              <>
                <DispenseErrorReporter
                  active
                  errorMessage={dispenseState.message}
                  user={webhookUser}
                  products={checkoutItems.map(mapCheckoutItemForWebhook)}
                  payment={checkoutSummary?.payment}
                  raw={dispenseState}
                  machineLocation={mergedMachine.machineLocation}
                  machineName={mergedMachine.machineName || "Vending Machine"}
                />
                <Box sx={{ bgcolor: "#fef2f2", borderRadius: 2, border: "2px solid #ef4444", p: 2 }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#b91c1c", mb: 1 }}>
                    Product Dispensing Issue
                  </Typography>
                  <Typography sx={{ fontSize: 24, color: "#7f1d1d", mb: 1 }}>{dispenseState.message}</Typography>
                  <Box sx={{ bgcolor: "#fff", p: 2, borderRadius: 2, border: "1px solid #fecaca" }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#166534", mb: 1 }}>
                      Don&apos;t worry!
                    </Typography>
                    <Typography sx={{ fontSize: 24, color: "#374151", lineHeight: 1.6 }}>
                      Your amount will be refunded to your original payment method. Our team will get back to you shortly.
                    </Typography>
                    <Typography sx={{ fontSize: 24, color: "#6b7280", mt: 1, fontStyle: "italic" }}>
                      For immediate assistance: +91 8977016605
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}

        {/* -------- SEND INVOICE TO EMAIL -------- */}
        {invoiceData && (
          <SendInvoiceEmail
            userEmail={userEmail}
            isEditingEmail={isEditingEmail}
            isSendingEmail={isSendingEmail}
            emailSent={emailSent}
            emailError={emailError}
            emailFieldRef={emailFieldRef}
            onEditStart={() => {
              setIsEditingEmail(true);
              setEmailSent(false);
              setEmailError("");
              setKeyboardTarget("email");
              setIsKeyboardOpen(true);
              setTimeout(() => { emailFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
            }}
            onEditConfirm={handleEmailEditConfirm}
            onSendEmail={handleSendEmail}
            onEmailChange={setUserEmail}
          />
        )}

        {/* -------- TAX INVOICE (collapsible) -------- */}
        {invoiceData && (
          <TaxInvoice
            invoiceData={invoiceData}
            invoiceExpanded={invoiceExpanded}
            onToggleExpanded={() => setInvoiceExpanded((prev) => !prev)}
          />
        )}

        {/* -------- FEEDBACK SECTION -------- */}
        <FeedbackRating
          rating={rating}
          displayRating={displayRating}
          notes={notes}
          isSubmitting={isSubmitting}
          canSubmit={canSubmit}
          isKeyboardOpen={isKeyboardOpen}
          textFieldRef={textFieldRef}
          onStarClick={handleStarClick}
          onStarHover={handleStarHover}
          onStarLeave={handleStarLeave}
          onNotesChange={setNotes}
          onNotesFocus={() => {
            setKeyboardTarget("notes");
            setIsKeyboardOpen(true);
            setTimeout(() => { textFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
          }}
          onNotesClick={() => {
            setKeyboardTarget("notes");
            setIsKeyboardOpen(true);
            setTimeout(() => { textFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
          }}
          onSubmit={handleSubmit}
        />

        {/* -------- COMPUTER GENERATED INVOICE FOOTER -------- */}
        <Box sx={{ width: "min(860px, 100%)", mt: 3, mb: 2, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <Image src="/NewFeedback/lock_icon.svg" alt="" width={14} height={14} />
          <Typography sx={{ fontSize: 24, color: "#9ca3af" }}>This is a computer generated invoice.</Typography>
        </Box>

        {/* -------- VIRTUAL KEYBOARD -------- */}
        {isKeyboardOpen ? (
          <Box
            onClick={() => {
              setIsKeyboardOpen(false);
              if (keyboardTarget === "email") {
                handleEmailEditConfirm();
              }
            }}
            sx={{ position: "fixed", inset: 0, zIndex: 1400 }}
          >
            <Box onClick={(e) => e.stopPropagation()} sx={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
              <VirtualKeyboard onKeyPress={handleKeyboardKeyPress} layout={keyboardTarget === "email" ? "email" : "default"} visible={isKeyboardOpen} />
            </Box>
          </Box>
        ) : null}

        {/* -------- NOTIFICATION TOAST -------- */}
        {notification && (
          <Box
            sx={{
              position: "fixed",
              top: 24,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2000,
              bgcolor: notification.type === "success" ? "#16a34a" : "#dc2626",
              color: "#fff",
              px: 3,
              py: 1.5,
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Icon icon={notification.type === "success" ? "mdi:check-circle" : "mdi:alert-circle"} width={22} />
            <Typography sx={{ fontSize: 24, fontWeight: 600 }}>{notification.message}</Typography>
          </Box>
        )}
      </Box>

      {/* Help Dialog */}
      <HelpDialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </PageBackground>
  );
}
