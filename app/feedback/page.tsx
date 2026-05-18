"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PageBackground from "@/components/ui/PageBackground";
import { HelpDialog } from "@/components/ui";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";
import { APP_ROUTES } from "@/utils/routes";
import { useAppDispatch } from "@/redux/store/store";
import { clearCart } from "@/redux/reducers/cartSlice";
import { persistor } from "@/redux/store/store";
import { useVoiceMessages } from "@/contexts/VoiceContext";
import DispenseErrorReporter from "./components/DispenseErrorReporter";
import DispenseReporter from "./components/DispenseReporter";

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

function generateInvoiceNo(orderId?: string): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const seq = orderId ? orderId.replace(/\D/g, "").slice(-3).padStart(3, "0") : "001";
  return `LW/${mm}/${yy}/${seq}`;
}

function formatDate(d: Date): string {
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

const parsePrice = (priceText?: string): number => {
  if (!priceText) return 0;
  const normalized = String(priceText).replace(/,/g, " ");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : 0;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeedbackPage() {
  const theme = useTheme();
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

  // Keyboard target: which field the virtual keyboard is typing into
  const [keyboardTarget, setKeyboardTarget] = useState<"notes" | "email">("notes");

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const emailFieldRef = useRef<HTMLDivElement>(null);

  // Tax Invoice accordion
  const [invoiceExpanded, setInvoiceExpanded] = useState(false);

  // Machine location from environment or default
  const machineLocation =
    process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
    (session?.user as any)?.machineLocation ||
    (checkoutSummary?.payment?.machineLocation) ||
    "LeafWater Vending Machine";

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
    } finally {
      router.push(APP_ROUTES.HOME);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.sessionStorage.getItem("kiosk_checkout_summary");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setCheckoutSummary(parsed);
      try {
        window.sessionStorage.removeItem("kiosk_checkout_summary");
      } catch {
      }
    } catch {
    }
    dispatch(clearCart());
    void persistor.purge();
  }, []);

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

  // Pickup timer countdown after dispense succeeds
  useEffect(() => {
    if (dispenseState.status !== "done") return;
    
    // Start 10 second countdown for pickup
    setPickupTimer(10);
    
    // Announce successful dispense and pickup instruction
    speakMessage('dispense');
    speakMessage('dispenseCollect');
    
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
  }, [dispenseState.status, speakMessage]);

  // Voice announcement for errors
  useEffect(() => {
    if (dispenseState.status === "error") {
      speakMessage('error');
    }
  }, [dispenseState.status, speakMessage]);

  const checkoutItems = useMemo(() => {
    const items = checkoutSummary?.items;
    return Array.isArray(items) ? items : [];
  }, [checkoutSummary]);

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
        handleEmailEditConfirm();
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

  const handleEmailEditConfirm = async () => {
    setIsEditingEmail(false);
    setIsKeyboardOpen(false);
    setKeyboardTarget("notes");

    if (!userEmail || !userEmail.includes("@")) return;

    const uid = (session?.user as any)?.id;
    if (!uid) return;

    try {
      const res = await fetch("/api/user/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, email: userEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ message: "User details updated successfully", type: "success" });
      } else {
        setNotification({ message: data.error || "Failed to update email", type: "error" });
      }
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to update", type: "error" });
    }

    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const run = async () => {
      if (dispenseState.status !== "idle") return;
      if (!checkoutSummary) return;
      if (checkoutItems.length === 0) return;
      setDispenseState({ status: "running" });

      try {
        const productCodes: string[] = [];
        for (const item of checkoutItems) {
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

          const slotsResponse = await fetch(slotsUrl);
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

        if (productCodes.length === 0) {
          setDispenseState({ status: "error", message: "No slots found for dispensing" });
          return;
        }

        const response = await fetch("/api/stm32/dispense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productCodes }),
        });
        const result = await response.json();
        if (!response.ok || !result?.success) {
          const msg = result?.error?.message || "Dispense failed";
          setDispenseState({ status: "error", message: msg });
          return;
        }

        setDispenseState({ status: "done", results: result?.data?.results });
      } catch (e: any) {
        setDispenseState({ status: "error", message: e?.message || "Dispense failed" });
      }
    };

    void run();
  }, [checkoutItems, checkoutSummary, dispenseState.status]);

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

  // Initialize email from session
  useEffect(() => {
    const email = (session?.user as any)?.email;
    if (email && !userEmail) setUserEmail(email);
  }, [session]);

  // Compute invoice data
  const invoiceData = useMemo(() => {
    if (!checkoutSummary) return null;
    const now = new Date();
    const orderId = checkoutSummary?.payment?.orderId || "";
    const subtotal = Number(checkoutSummary?.payableTotal || 0);
    const baseForTax = subtotal / 1.05;
    const cgst = baseForTax * 0.025;
    const sgst = baseForTax * 0.025;
    const beforeRound = baseForTax + cgst + sgst;
    const roundOff = subtotal - beforeRound;

    return {
      invoiceNo: generateInvoiceNo(orderId),
      invoiceDate: formatDate(now),
      orderReference: orderId ? `${orderId} dated ${formatDate(now)}` : formatDate(now),
      gstin: process.env.NEXT_PUBLIC_GSTIN || "36AAKCL W1234A1ZC",
      state: process.env.NEXT_PUBLIC_STATE || "Telangana, Code : 36",
      placeOfSupply: process.env.NEXT_PUBLIC_STATE || "Telangana",
      items: checkoutItems.map((item: any) => {
        const price = Number(item?.retail_price || 0) || parsePrice(item?.priceText);
        const qty = Number(item?.quantity) || 1;
        return {
          name: item?.name || "",
          quantity: qty,
          price,
          amount: price * qty,
        };
      }),
      subtotal,
      cgst,
      sgst,
      roundOff,
      grandTotal: subtotal,
      amountInWords: numberToWords(subtotal),
      buyerName: (session?.user as any)?.name || "",
      buyerEmail: (session?.user as any)?.email || "",
      buyerPhone: (session?.user as any)?.mobileNumber || (session?.user as any)?.phoneNumber || "",
    };
  }, [checkoutSummary, checkoutItems, session]);

  const handleSendEmail = async () => {
    if (!userEmail || !userEmail.includes("@") || !invoiceData) return;
    setIsSendingEmail(true);
    setEmailError("");
    try {
      // Include updated user details in the invoice payload
      const invoiceWithUser = {
        ...invoiceData,
        buyerEmail: userEmail,
        buyerName: (session?.user as any)?.name || invoiceData.buyerName || "",
        buyerPhone: (session?.user as any)?.mobileNumber || (session?.user as any)?.phoneNumber || (session?.user as any)?.phone || invoiceData.buyerPhone || "",
      };

      const response = await fetch("/api/send-invoice-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, invoice: invoiceWithUser }),
      });
      const result = await response.json();
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
        {/* Close / Help button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 40,
            height: 40,
            bgcolor: "#ffffff",
            border: "1px solid #d1d5db",
            "&:hover": { bgcolor: "#ffffff" },
          }}
        >
          <Icon icon="mdi:help-circle-outline" width={22} />
        </IconButton>

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
                <Typography sx={{ fontSize: 24, color: "#374151" }}>Dispensing your products...</Typography>
              </Box>
            )}
            {dispenseState.status === "done" && (
              <>
                <DispenseReporter
                  active
                  user={{
                    userId: (session?.user as any)?.id,
                    name: (session?.user as any)?.name,
                    email: (session?.user as any)?.email,
                    phone: (session?.user as any)?.mobileNumber || (session?.user as any)?.phoneNumber || (session?.user as any)?.phone,
                  }}
                  products={checkoutItems.map((item: any) => ({
                    id: item?.id, name: item?.name, quantity: item?.quantity,
                    slotId: item?.slotId, retailPrice: item?.retail_price, amount: item?.amount,
                  }))}
                  transaction={checkoutSummary?.payment}
                  command={{
                    productId: (dispenseState.results as any)?.productId || checkoutItems[0]?.id,
                    productName: (dispenseState.results as any)?.productName || checkoutItems[0]?.name,
                    slotId: (dispenseState.results as any)?.slotId || checkoutItems[0]?.slotId || (checkoutItems[0]?.id?.replace(/^products\//, "")),
                    command: (dispenseState.results as any)?.command || "DISPENSE",
                    timestamp: new Date().toISOString(),
                  }}
                  machineLocation={machineLocation}
                />
                {pickupTimer > 0 && (
                  <Box sx={{ bgcolor: "#fef3c7", borderRadius: 2, border: "2px solid #f59e0b", textAlign: "center", p: 2 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#92400e" }}>
                      Pickup your product
                    </Typography>
                    <Typography sx={{ fontSize: 36, fontWeight: 800, color: "#d97706", mt: 1 }}>{pickupTimer}s</Typography>
                    <Typography sx={{ fontSize: 24, color: "#92400e", mt: 0.5 }}>Tray door will close soon</Typography>
                  </Box>
                )}
              </>
            )}
            {dispenseState.status === "error" && (
              <>
                <DispenseErrorReporter
                  active
                  errorMessage={dispenseState.message}
                  user={{
                    userId: (session?.user as any)?.id,
                    name: (session?.user as any)?.name,
                    email: (session?.user as any)?.email,
                    phone: (session?.user as any)?.mobileNumber || (session?.user as any)?.phoneNumber || (session?.user as any)?.phone,
                  }}
                  products={checkoutItems.map((item: any) => ({
                    id: item?.id, name: item?.name, quantity: item?.quantity,
                    slotId: item?.slotId, retailPrice: item?.retail_price, amount: item?.amount,
                  }))}
                  payment={checkoutSummary?.payment}
                  raw={dispenseState}
                  machineLocation={machineLocation}
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
                      For immediate assistance: +91 8008675263
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}

        {/* -------- SEND INVOICE TO EMAIL -------- */}
        {invoiceData && (
          <Box sx={{ width: "min(860px, 100%)", mt: 2 }}>
            <Box
              sx={{
                bgcolor: "#fff",
                borderRadius: 3,
                px: 3,
                py: 2.5,
                border: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ position: "relative" }}>
                  <Image src="/NewFeedback/sparkle_gold.svg" alt="" width={16} height={16} style={{ position: "absolute", top: -4, left: -4 }} />
                  <Image src="/NewFeedback/email_outline.svg" alt="Email" width={40} height={40} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>Send invoice to your email</Typography>
                  <Typography sx={{ fontSize: 24, color: "#6b7280" }}>We&apos;ll email your invoice instantly.</Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }} ref={emailFieldRef}>
                {isEditingEmail ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ bgcolor: "#fff", border: "2px solid #1a3c34", borderRadius: "8px", px: 1.5, py: 0.75, minWidth: 220 }}>
                      <Typography sx={{ fontSize: 20, color: "#111827", minHeight: 24 }}>
                        {userEmail || " "}
                        <Box component="span" sx={{ borderRight: "2px solid #1a3c34", animation: "blink 1s infinite", ml: 0.25 }}>&nbsp;</Box>
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleEmailEditConfirm}
                      sx={{ bgcolor: "#1a3c34", color: "#fff", textTransform: "none", fontSize: 16, borderRadius: "8px", "&:hover": { bgcolor: "#16362c" } }}
                    >
                      Done
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", px: 1.5, py: 0.75 }}>
                    <Typography sx={{ fontSize: 20, color: "#374151" }}>{userEmail || "Enter email"}</Typography>
                    <IconButton size="small" onClick={() => {
                      setIsEditingEmail(true);
                      setKeyboardTarget("email");
                      setIsKeyboardOpen(true);
                      setTimeout(() => { emailFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
                    }}>
                      <Icon icon="mdi:pencil-outline" width={18} color="#6b7280" />
                    </IconButton>
                  </Box>
                )}
                <Button
                  variant="contained"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || emailSent || !userEmail.includes("@")}
                  startIcon={<Image src="/NewFeedback/send_email_icon.svg" alt="" width={18} height={18} />}
                  sx={{
                    bgcolor: emailSent ? "#16a34a" : "#1a3c34",
                    color: "#fff",
                    borderRadius: "10px",
                    textTransform: "none",
                    fontSize: 24,
                    fontWeight: 600,
                    px: 2.5,
                    py: 1,
                    "&:hover": { bgcolor: emailSent ? "#16a34a" : "#16362c" },
                    "&:disabled": { bgcolor: emailSent ? "#16a34a" : "#d1d5db", color: "#fff" },
                  }}
                >
                  {isSendingEmail ? "Sending..." : emailSent ? "Sent!" : "Send to Email"}
                </Button>
              </Box>
            </Box>
            {emailError && (
              <Typography sx={{ fontSize: 24, color: "#dc2626", mt: 0.5, px: 1 }}>{emailError}</Typography>
            )}
          </Box>
        )}

        {/* -------- TAX INVOICE (collapsible) -------- */}
        {invoiceData && (
          <Box sx={{ width: "min(860px, 100%)", mt: 2 }}>
            <Box sx={{ bgcolor: "#fff", borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              {/* Invoice Header — clickable to toggle */}
              <Box
                onClick={() => setInvoiceExpanded((prev) => !prev)}
                sx={{ textAlign: "center", py: 1.5, borderBottom: invoiceExpanded ? "1px solid #e5e7eb" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 1, userSelect: "none" }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, color: "#9ca3af", letterSpacing: 2 }}>✦ ✦ ✦</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#1a3c34" }}>Tax Invoice</Typography>
                  <Typography sx={{ fontSize: 13, color: "#6b7280" }}>LeafWater Invoice</Typography>
                </Box>
                <Icon icon={invoiceExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} width={28} color="#6b7280" style={{ marginRight: 12 }} />
              </Box>

              {/* Collapsible content */}
              {invoiceExpanded && (
                <>
              {/* Invoice Details - 3 columns */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
                {[
                  { icon: "/NewFeedback/invoice_document.svg", label: "Invoice No.", value: invoiceData.invoiceNo },
                  { icon: "/NewFeedback/calendar.svg", label: "Invoice Date", value: invoiceData.invoiceDate },
                  { icon: "/NewFeedback/reference_document.svg", label: "Order Reference", value: invoiceData.orderReference },
                ].map((item, idx) => (
                  <Box key={idx} sx={{ p: 2, borderRight: idx < 2 ? "1px solid #e5e7eb" : "none", display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Image src={item.icon} alt="" width={20} height={20} style={{ marginTop: 2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 14, color: "#9ca3af" }}>{item.label}</Typography>
                      <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#111827", wordBreak: "break-word" }}>{item.value}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* GSTIN / State / Place of Supply - 3 columns */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
                {[
                  { icon: "/NewFeedback/gst_document.svg", label: "GSTIN / UIN", value: invoiceData.gstin },
                  { icon: "/NewFeedback/government_building.svg", label: "State", value: invoiceData.state },
                  { icon: "/NewFeedback/location_pin.svg", label: "Place of Supply", value: invoiceData.placeOfSupply },
                ].map((item, idx) => (
                  <Box key={idx} sx={{ p: 2, borderRight: idx < 2 ? "1px solid #e5e7eb" : "none", display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Image src={item.icon} alt="" width={20} height={20} style={{ marginTop: 2, flexShrink: 0 }} />
                    <Box>
                      <Typography sx={{ fontSize: 14, color: "#9ca3af" }}>{item.label}</Typography>
                      <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{item.value}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Items Table */}
              <Box sx={{ px: 2, py: 1.5 }}>
                <Box
                  component="table"
                  sx={{
                    width: "100%",
                    borderCollapse: "collapse",
                    "& th": { fontSize: 13, fontWeight: 600, color: "#6b7280", textAlign: "left", py: 1, px: 1.5, borderBottom: "2px solid #e5e7eb", bgcolor: "#f9fafb" },
                    "& td": { fontSize: 14, color: "#111827", py: 1, px: 1.5, borderBottom: "1px solid #f3f4f6" },
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "35%" }}>Description of Goods</th>
                      <th style={{ width: "15%", textAlign: "center" }}>HSN/SAC</th>
                      <th style={{ width: "10%", textAlign: "center" }}>Qty</th>
                      <th style={{ width: "17%", textAlign: "right" }}>Rate (Incl. of Tax)</th>
                      <th style={{ width: "18%", textAlign: "right" }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td style={{ textAlign: "center" }}>3304</td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "right" }}>{Number(item.price).toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>{Number(item.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>

              {/* Subtotals */}
              <Box sx={{ px: 3, pb: 1.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  {[
                    { label: "Subtotal", value: invoiceData.subtotal },
                    { label: "CGST @ 2.50%", value: invoiceData.cgst },
                    { label: "SGST @ 2.50%", value: invoiceData.sgst },
                    { label: "Round Off", value: invoiceData.roundOff },
                  ].map((row, idx) => (
                    <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
                      <Typography sx={{ fontSize: 14, color: idx === 0 ? "#111827" : "#6b7280" }}>{row.label}</Typography>
                      <Typography sx={{ fontSize: 14, color: idx === 0 ? "#111827" : "#6b7280" }}>{Number(row.value).toFixed(2)}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* Grand Total Box */}
                <Box sx={{ bgcolor: "#1a3c34", borderRadius: 2, px: 3, py: 1.5, textAlign: "center", minWidth: 160 }}>
                  <Typography sx={{ fontSize: 13, color: "#a7f3d0" }}>Grand Total</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#fff", mt: 0.25 }}>
                    ₹{Number(invoiceData.grandTotal).toFixed(2)}
                  </Typography>
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, bgcolor: "#16a34a", borderRadius: "20px", px: 1.5, py: 0.25, mt: 0.5 }}>
                    <Image src="/NewFeedback/paid_badge.svg" alt="" width={14} height={14} />
                    <Typography sx={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Paid</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Amount in Words + Payment Status */}
              <Box sx={{ px: 3, py: 1.5, borderTop: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Image src="/NewFeedback/lock_icon.svg" alt="" width={16} height={16} style={{ marginTop: 2 }} />
                  <Box>
                    <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>Amount in words</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{invoiceData.amountInWords}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>Payment Status</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Paid</Typography>
                    <Image src="/NewFeedback/shield_security.svg" alt="" width={16} height={16} />
                  </Box>
                </Box>
              </Box>

              {/* Thank You */}
              <Box sx={{ px: 3, py: 1.5, borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 2 }}>
                <Image src="/NewFeedback/heart_badge.svg" alt="" width={28} height={28} />
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#1a3c34" }}>Thank you for choosing LeafWater!</Typography>
                  <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Your skincare journey matters to us.</Typography>
                </Box>
              </Box>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* -------- FEEDBACK SECTION -------- */}
        <Box
          sx={{
            width: "min(860px, 100%)",
            mt: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 700, pb: 0.5 }}>Quick Favour?</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>
            Kindly rate your experience with us so far.
          </Typography>

          <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <IconButton
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => handleStarHover(star)}
                onMouseLeave={handleStarLeave}
                sx={{ p: 0.25, bgcolor: "transparent" }}
              >
                <Box
                  component="span"
                  sx={{
                    fontSize: 40,
                    lineHeight: 1,
                    color: star <= displayRating ? "#f59e0b" : "#cfcfcf",
                    cursor: "pointer",
                    transition: "color 0.15s",
                  }}
                >
                  {star <= displayRating ? "\u2605" : "\u2606"}
                </Box>
              </IconButton>
            ))}
          </Box>

          <Box sx={{ width: "min(520px, 100%)", mt: 1, pb: isKeyboardOpen ? "320px" : 0 }} ref={textFieldRef}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Tell us more (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={() => {
                setKeyboardTarget("notes");
                setIsKeyboardOpen(true);
                setTimeout(() => { textFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
              }}
              onClick={() => {
                setKeyboardTarget("notes");
                setIsKeyboardOpen(true);
                setTimeout(() => { textFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "#ffffff",
                  fontSize: 16,
                  "& textarea": { fontSize: 16 },
                  "& textarea::placeholder": { fontSize: 16, opacity: 0.8 },
                  "& fieldset": { borderColor: "#d1d5db" },
                  "&:hover fieldset": { borderColor: "#9ca3af" },
                  "&.Mui-focused fieldset": { borderColor: "#9ca3af" },
                },
              }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
              sx={{
                mt: 1.5,
                bgcolor: "#1a3c34",
                color: "#fff",
                py: 1,
                borderRadius: "12px",
                fontSize: 16,
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { bgcolor: "#16362c" },
                "&:disabled": { bgcolor: "#d1d5db", color: "#ffffff" },
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </Box>
        </Box>

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
              <VirtualKeyboard onKeyPress={handleKeyboardKeyPress} layout="default" visible={isKeyboardOpen} />
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
            <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{notification.message}</Typography>
          </Box>
        )}
      </Box>

      {/* Help Dialog */}
      <HelpDialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </PageBackground>
  );
}
