"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { Icon } from "@iconify/react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import { pauseKioskIdle, resumeKioskIdle } from "@/utils/kioskIdleGate";
import CardPayment from "@/components/payments/CardPayment";
import CashAgentPayment from "@/components/payments/CashAgentPayment";
import type { CashAuthResult } from "@/lib/staff-qr";
import {
  HEADING_WEIGHT,
  MIN_FONT,
  PAGE_PADDING_X,
  RADIUS_LG,
  REPORT_BORDER,
  REPORT_GREEN,
  REPORT_MUTED,
  TITLE_FONT,
} from "./constants";
import type { ReportProduct } from "./types";

type PayMethod = "cash" | "upi" | "card";

type Props = {
  products: ReportProduct[];
  total: number;
};

const softPulse = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(47, 93, 70, 0.12);
  }
  50% {
    transform: scale(1.03);
    box-shadow: 0 6px 18px rgba(47, 93, 70, 0.28);
  }
`;

const gentleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

const tapHint = keyframes`
  0%, 100% { opacity: 0.55; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(2px); }
`;

const iconGlow = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

const methodBtnBase = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 0.75,
  width: "100%",
  textAlign: "left" as const,
  textTransform: "none" as const,
  borderRadius: 1.5,
  px: 1,
  py: 0.75,
  minHeight: 44,
  border: `1px solid ${REPORT_BORDER}`,
  bgcolor: "#fff",
  color: "#111827",
  boxShadow: "0 2px 8px rgba(47, 93, 70, 0.08)",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease",
  animation: `${gentleFloat} 2.8s ease-in-out infinite`,
  "&:hover": {
    bgcolor: "#F0F7F2",
    borderColor: REPORT_GREEN,
    boxShadow: "0 6px 16px rgba(47, 93, 70, 0.2)",
    transform: "translateY(-2px) scale(1.02)",
  },
  "&:active": {
    transform: "scale(0.97)",
    boxShadow: "0 1px 4px rgba(47, 93, 70, 0.15)",
  },
  "&.Mui-disabled": {
    opacity: 0.5,
    animation: "none",
  },
};

export default function ScanToPaySection({ products, total }: Props) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PayMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrContent, setQrContent] = useState("");
  const [qrAmount, setQrAmount] = useState(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const verifiedRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const idlePausedRef = useRef(false);
  const paymentRecordedRef = useRef<string | null>(null);
  const productsRef = useRef(products);
  const totalRef = useRef(total);
  const machineRef = useRef({
    machineId: "",
    machineName: "Vending Machine",
    machineLocation: "LeafWater Vending Machine",
  });

  productsRef.current = products;
  totalRef.current = total;

  useEffect(() => {
    const fetchMachineSettings = async () => {
      try {
        const response = await fetch("/api/admin/machine-name");
        const data = await response.json();
        if (data.success) {
          machineRef.current = {
            machineId: data.machineId || "",
            machineName: data.machineName || "Vending Machine",
            machineLocation: data.machineLocation || "LeafWater Vending Machine",
          };
        }
      } catch {
        // keep defaults
      }
    };
    void fetchMachineSettings();
  }, []);

  const setIdlePaused = useCallback((paused: boolean) => {
    if (paused === idlePausedRef.current) return;
    idlePausedRef.current = paused;
    if (paused) pauseKioskIdle();
    else resumeKioskIdle();
  }, []);

  const cleanup = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollingRef.current = null;
    timeoutRef.current = null;
    setIdlePaused(false);
  }, [setIdlePaused]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const resetQr = useCallback(() => {
    cleanup();
    setShowQR(false);
    setQrImageUrl("");
    setQrContent("");
    setQrAmount(0);
    setIsLoading(false);
    setIsCompleting(false);
    verifiedRef.current = false;
    pollInFlightRef.current = false;
  }, [cleanup]);

  useEffect(() => {
    if (!showQR) return;
    if (Math.round(total) !== Math.round(qrAmount)) {
      resetQr();
    }
  }, [total, qrAmount, showQR, resetQr]);

  const backToMethods = useCallback(() => {
    resetQr();
    setPaymentMethod(null);
  }, [resetQr]);

  const handleCancelUpi = useCallback(() => {
    resetQr();
    setPaymentMethod(null);
    toast.info("Payment cancelled");
  }, [resetQr]);

  const recordAndDispense = useCallback(
    async (payload: {
      orderId?: string;
      paymentId?: string;
      qrCodeId?: string;
      method: PayMethod;
      agentName?: string;
      staffAuthMethod?: "qr" | "password";
      staff?: { hash?: string; role?: string; branch?: string; phone?: string };
    }) => {
      const itemsToDispense = productsRef.current.map((item) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        priceText: `INR.${item.payablePrice}/-`,
        originalPrice: item.retailPrice,
        payablePrice: item.payablePrice,
        discountValue: item.discountValue,
        quantity: 1,
        slotId: item.slotId,
        category: item.category,
        isTravelKit: Boolean(item.isTravelKit) || item.category === "Travel Kit",
      }));
      const amount = totalRef.current;
      const { machineId, machineName, machineLocation } = machineRef.current;
      const paymentMode =
        payload.method === "cash" ? "cash" : payload.method === "card" ? "card" : "live";

      try {
        window.sessionStorage.setItem(
          "kiosk_checkout_summary",
          JSON.stringify({
            items: itemsToDispense,
            total: amount,
            discount: 0,
            payableTotal: amount,
            couponApplied: false,
            createdAt: Date.now(),
            payment: {
              orderId: payload.orderId,
              paymentId: payload.paymentId,
              qrCodeId: payload.qrCodeId,
              amount,
              currency: "INR",
              status: "paid",
              method: payload.method,
              agentName: payload.agentName,
              staffAuthMethod: payload.staffAuthMethod,
              staffHash: payload.staff?.hash,
              staffRole: payload.staff?.role,
              staffBranch: payload.staff?.branch,
              staffPhone: payload.staff?.phone,
              machineId,
              machineName,
              machineLocation,
            },
          })
        );
      } catch {
        // ignore storage errors
      }

      router.push(APP_ROUTES.FEEDBACK);

      void (async () => {
        try {
          const pricedItems = itemsToDispense.map((item) => ({
            productId: item.id || "",
            productName: item.name,
            quantity: 1,
            price:
              item.payablePrice ??
              Number(String(item.priceText || "").replace(/[^\d.]/g, "")),
            slotId: item.slotId,
          }));

          const orderResponse = await fetch("/api/admin/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: pricedItems,
              totalAmount: amount,
              paymentId: payload.paymentId,
              qrCodeId: payload.qrCodeId,
              razorpayOrderId: payload.orderId,
              paymentMode,
            }),
          });
          const orderData = await orderResponse.json();

          await fetch("/api/admin/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: payload.paymentId || `txn_${Date.now()}`,
              amount,
              paymentId: payload.paymentId,
              status: "completed",
            }),
          }).catch(() => {});

          await fetch("/api/posifly/bills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderData?.order?.id || payload.paymentId || payload.orderId,
              items: pricedItems,
              totalAmount: amount,
              discountAmount: 0,
              paymentId: payload.paymentId,
              razorpayOrderId: payload.orderId,
              paymentMode,
            }),
          }).catch(() => {});
        } catch (err) {
          console.error("[KioskReport] Failed to record order:", err);
        }
      })();
    },
    [router]
  );

  const startPolling = useCallback(
    (qrId: string, oId: string) => {
      cleanup();
      verifiedRef.current = false;
      pollInFlightRef.current = false;

      const pollBody = { qrCodeId: qrId, ...(oId ? { orderId: oId } : {}), mode: "live" };

      pollingRef.current = setInterval(async () => {
        if (verifiedRef.current || pollInFlightRef.current) return;
        pollInFlightRef.current = true;
        try {
          const res = await fetch("/api/razorpay/check-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pollBody),
          });
          const data = await res.json();
          if (data.success && data.paid) {
            const paymentId = data.paymentId || "";
            const resolvedOrderId = data.orderId || oId;
            if (!paymentId) return;
            if (verifiedRef.current) {
              cleanup();
              return;
            }
            verifiedRef.current = true;
            cleanup();
            setIsCompleting(true);
            setShowQR(false);
            setIsLoading(false);

            const dedupeKey = paymentId || qrId || resolvedOrderId;
            if (paymentRecordedRef.current === dedupeKey) return;
            paymentRecordedRef.current = dedupeKey;
            if (typeof window !== "undefined") {
              const storageKey = `kiosk_order_recorded::${dedupeKey}`;
              if (window.sessionStorage.getItem(storageKey)) return;
              window.sessionStorage.setItem(storageKey, "1");
            }

            await recordAndDispense({
              orderId: resolvedOrderId,
              paymentId,
              qrCodeId: qrId,
              method: "upi",
            });
          }
        } catch (err) {
          console.error("[KioskReport QR] Poll error:", err);
        } finally {
          pollInFlightRef.current = false;
        }
      }, 3000);

      timeoutRef.current = setTimeout(() => {
        cleanup();
        setShowQR(false);
        setIsLoading(false);
        setPaymentMethod(null);
        toast.info("Payment timed out. Please try again.");
      }, 600000);
    },
    [cleanup, recordAndDispense]
  );

  const generateQR = useCallback(async () => {
    if (isLoading || isCompleting) return;
    if (!products.length || total <= 0) {
      toast.error("Select at least one product");
      return;
    }

    const amountPaise = Math.round(total * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      toast.error("Invalid amount");
      return;
    }

    verifiedRef.current = false;
    setIsLoading(true);

    try {
      const res = await fetch("/api/razorpay/create-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `report_${Date.now()}`,
          mode: "live",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create QR code");
      }
      setQrImageUrl(json.data.imageUrl || "");
      setQrContent(typeof json.data.imageContent === "string" ? json.data.imageContent : "");
      setQrAmount(total);
      setShowQR(true);
      setIdlePaused(true);
      startPolling(json.data.qrCodeId, json.data.orderId);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate QR code");
      setPaymentMethod(null);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isCompleting, products.length, total, setIdlePaused, startPolling]);

  const selectMethod = useCallback(
    (method: PayMethod) => {
      if (!products.length || total <= 0) {
        toast.error("Select at least one product");
        return;
      }
      setPaymentMethod(method);
      if (method === "upi") {
        void generateQR();
      }
    },
    [generateQR, products.length, total]
  );

  const handleCashConfirmed = useCallback(
    async (auth: CashAuthResult | string) => {
      const agentName = typeof auth === "string" ? auth : auth.agentName;
      const staffAuthMethod = typeof auth === "string" ? "password" : auth.method;
      const staff = typeof auth === "string" ? undefined : auth.staff;
      const txnId = `CASH-${Date.now()}`;

      if (paymentRecordedRef.current === txnId) return;
      if (typeof window !== "undefined") {
        const storageKey = `kiosk_order_recorded::${txnId}`;
        if (window.sessionStorage.getItem(storageKey)) return;
        window.sessionStorage.setItem(storageKey, "1");
      }
      paymentRecordedRef.current = txnId;
      setIsCompleting(true);

      await recordAndDispense({
        orderId: txnId,
        paymentId: txnId,
        method: "cash",
        agentName,
        staffAuthMethod,
        staff,
      });
    },
    [recordAndDispense]
  );

  const handleCardVerified = useCallback(
    async (payload: { orderId: string; paymentId: string; signature: string }) => {
      const dedupeKey = payload.paymentId || payload.orderId;
      if (paymentRecordedRef.current === dedupeKey) return;
      if (typeof window !== "undefined") {
        const storageKey = `kiosk_order_recorded::${dedupeKey}`;
        if (window.sessionStorage.getItem(storageKey)) return;
        window.sessionStorage.setItem(storageKey, "1");
      }
      paymentRecordedRef.current = dedupeKey;
      setIsCompleting(true);

      await recordAndDispense({
        orderId: payload.orderId,
        paymentId: payload.paymentId,
        method: "card",
      });
    },
    [recordAndDispense]
  );

  const amountPaise = Math.round(Math.max(0, total) * 100);
  const canPay = products.length > 0 && total > 0 && !isCompleting;

  // Full-screen card / cash flows (cover kiosk). Back returns to method list.
  if (paymentMethod === "card" || paymentMethod === "cash") {
    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 2100,
          bgcolor: "#F7FBF7",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          px: 2,
          pt: 2,
          pb: 2,
        }}
      >
        {paymentMethod === "card" ? (
          <CardPayment
            amountPaise={amountPaise}
            currency="INR"
            mode="live"
            receipt={`report_card_${Date.now()}`}
            onBack={backToMethods}
            onVerified={(payload) => void handleCardVerified(payload)}
          />
        ) : (
          <CashAgentPayment
            amount={total}
            onBack={backToMethods}
            onConfirmed={(auth) => void handleCashConfirmed(auth)}
          />
        )}
      </Box>
    );
  }

  const upiActive = paymentMethod === "upi" && (showQR || isLoading || isCompleting);

  const iconCircle = (bg: string, border?: string) => ({
    width: 28,
    height: 28,
    borderRadius: "50%",
    bgcolor: bg,
    border: border ? `1px solid ${border}` : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        px: `${PAGE_PADDING_X}px`,
        pt: 0.5,
        pb: 1.25,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75, flexShrink: 0 }}>
        <Box sx={{ flex: 1, borderTop: "1px dashed #C4C4C4" }} />
        <Typography
          sx={{
            fontSize: TITLE_FONT,
            fontWeight: HEADING_WEIGHT,
            letterSpacing: 0.2,
            color: "#111",
            whiteSpace: "nowrap",
          }}
        >
          {upiActive ? "Scan to pay and dispense" : "Pay and dispense"}
        </Typography>
        <Box sx={{ flex: 1, borderTop: "1px dashed #C4C4C4" }} />
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 240,
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 1.25,
          alignItems: "stretch",
          border: `1px solid ${REPORT_BORDER}`,
          borderRadius: RADIUS_LG,
          overflow: "hidden",
          bgcolor: "#fff",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 1,
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            px: 1.25,
            py: 1.25,
            bgcolor: "#F7FBF7",
            borderRight: `1px solid ${REPORT_BORDER}`,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 14, color: REPORT_MUTED, lineHeight: 1.3 }}>
              {upiActive
                ? isCompleting
                  ? "Processing payment..."
                  : "Waiting for UPI payment..."
                : "Choose how you’d like to pay."}
            </Typography>
            <Typography
              sx={{
                fontSize: 28,
                fontWeight: HEADING_WEIGHT,
                color: REPORT_GREEN,
                lineHeight: 1.1,
              }}
            >
              ₹{Math.round(total)}
            </Typography>

            {!upiActive ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 0.75 }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: REPORT_GREEN,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    animation: `${tapHint} 1.6s ease-in-out infinite`,
                  }}
                >
                  <Icon icon="mdi:gesture-tap" width={14} />
                  Tap a method to pay
                </Typography>

                <Button
                  disabled={!canPay || isLoading}
                  onClick={() => selectMethod("upi")}
                  sx={{
                    ...methodBtnBase,
                    borderColor: REPORT_GREEN,
                    bgcolor: "#EAF4EE",
                    animation: `${softPulse} 2.2s ease-in-out infinite`,
                    animationDelay: "0s",
                  }}
                  startIcon={
                    <Box
                      sx={{
                        ...iconCircle("#fff", REPORT_BORDER),
                        animation: `${iconGlow} 2.2s ease-in-out infinite`,
                      }}
                    >
                      <Icon icon="mdi:qrcode-scan" width={15} color={REPORT_GREEN} />
                    </Box>
                  }
                  endIcon={
                    <Icon
                      icon="mdi:chevron-right"
                      width={18}
                      color={REPORT_GREEN}
                      style={{ animation: `${tapHint} 1.6s ease-in-out infinite` }}
                    />
                  }
                >
                  <Box sx={{ textAlign: "left", lineHeight: 1.1, flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>
                      UPI QR
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: REPORT_MUTED }}>
                      Scan &amp; pay
                    </Typography>
                  </Box>
                </Button>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
                  <Button
                    disabled={!canPay}
                    onClick={() => selectMethod("cash")}
                    sx={{
                      ...methodBtnBase,
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.35,
                      minHeight: 76,
                      px: 0.75,
                      py: 0.75,
                      animationDelay: "0.25s",
                    }}
                  >
                    <Box
                      sx={{
                        ...iconCircle(REPORT_GREEN),
                        animation: `${iconGlow} 2.6s ease-in-out infinite`,
                        animationDelay: "0.25s",
                      }}
                    >
                      <Icon icon="mdi:cash-multiple" width={15} color="#fff" />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>
                      Cash
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: REPORT_MUTED, lineHeight: 1.1 }}>
                      Staff
                    </Typography>
                  </Button>

                  <Button
                    disabled={!canPay}
                    onClick={() => selectMethod("card")}
                    sx={{
                      ...methodBtnBase,
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.35,
                      minHeight: 76,
                      px: 0.75,
                      py: 0.75,
                      animationDelay: "0.5s",
                    }}
                  >
                    <Box
                      sx={{
                        ...iconCircle("#fff", REPORT_BORDER),
                        animation: `${iconGlow} 2.6s ease-in-out infinite`,
                        animationDelay: "0.5s",
                      }}
                    >
                      <Icon icon="mdi:credit-card-outline" width={15} color={REPORT_GREEN} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>
                      Card
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: REPORT_MUTED, lineHeight: 1.1 }}>
                      Debit/Credit
                    </Typography>
                  </Button>
                </Box>
              </Box>
            ) : null}
          </Box>

          {upiActive ? (
            <Button
              onClick={handleCancelUpi}
              disabled={isCompleting}
              sx={{
                flexShrink: 0,
                alignSelf: "stretch",
                bgcolor: "#fff",
                color: "#444",
                textTransform: "none",
                fontWeight: 700,
                fontSize: 14,
                px: 1.25,
                py: 1,
                minHeight: 44,
                minWidth: 0,
                width: "100%",
                borderRadius: 1,
                border: "1px solid #D1D5DB",
                "&:hover": { bgcolor: "#F3F4F6" },
              }}
            >
              {isCompleting ? "Processing..." : "Cancel payment"}
            </Button>
          ) : null}
        </Box>

        <Box
          sx={{
            width: "100%",
            height: "100%",
            minHeight: 220,
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {isCompleting ? (
            <CircularProgress size={40} sx={{ color: REPORT_GREEN }} />
          ) : showQR && qrContent ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#fff",
                p: 2,
                boxSizing: "border-box",
              }}
            >
              <Box
                sx={{
                  width: "min(100%, 100%)",
                  height: "min(100%, 100%)",
                  maxWidth: 320,
                  maxHeight: 320,
                  aspectRatio: "1 / 1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QRCodeSVG
                  value={qrContent}
                  size={320}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  style={{ width: "100%", height: "100%" }}
                />
              </Box>
            </Box>
          ) : showQR && qrImageUrl ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                position: "relative",
                bgcolor: "#fff",
              }}
            >
              <Box
                component="img"
                src={qrImageUrl}
                alt="UPI QR"
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: "46%",
                  width: "220%",
                  height: "220%",
                  transform: "translate(-50%, -50%)",
                  objectFit: "cover",
                  objectPosition: "center center",
                  display: "block",
                }}
              />
            </Box>
          ) : isLoading ? (
            <CircularProgress size={40} sx={{ color: REPORT_GREEN }} />
          ) : (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                bgcolor: "#FAFCFA",
                px: 2,
              }}
            >
              <Icon icon="mdi:qrcode" width={100} color="#C5D5CB" />
              <Typography sx={{ fontSize: 14, color: REPORT_MUTED, fontWeight: 600 }}>
                UPI QR appears here
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
