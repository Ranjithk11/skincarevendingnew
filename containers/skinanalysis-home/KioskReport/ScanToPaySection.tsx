"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import { pauseKioskIdle, resumeKioskIdle } from "@/utils/kioskIdleGate";
import { HEADING_WEIGHT, MIN_FONT, REPORT_GREEN, REPORT_GREEN_DARK, REPORT_MUTED, TITLE_FONT } from "./constants";
import type { ReportProduct } from "./types";

type Props = {
  products: ReportProduct[];
  total: number;
};

export default function ScanToPaySection({ products, total }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrAmount, setQrAmount] = useState(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const verifiedRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const idlePausedRef = useRef(false);
  const paymentRecordedRef = useRef<string | null>(null);
  const productsRef = useRef(products);
  const totalRef = useRef(total);
  const machineRef = useRef({ machineId: "", machineName: "Vending Machine", machineLocation: "LeafWater Vending Machine" });

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

  const handleCancel = useCallback(() => {
    resetQr();
    toast.info("Payment cancelled");
  }, [resetQr]);

  const recordAndDispense = useCallback(
    async (payload: { orderId?: string; paymentId?: string; qrCodeId?: string }) => {
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
              method: "live",
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
            price: item.payablePrice ?? Number(String(item.priceText || "").replace(/[^\d.]/g, "")),
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
              paymentMode: "live",
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
              paymentMode: "live",
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
            let paymentId = data.paymentId || "";
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
      setQrImageUrl(json.data.imageUrl);
      setQrAmount(total);
      setShowQR(true);
      setIdlePaused(true);
      startPolling(json.data.qrCodeId, json.data.orderId);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate QR code");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isCompleting, products.length, total, setIdlePaused, startPolling]);

  return (
    <Box sx={{ px: 1.5, pt: 0.25, pb: 1.25, flexShrink: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.6 }}>
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
          Scan to pay and dispense
        </Typography>
        <Box sx={{ flex: 1, borderTop: "1px dashed #C4C4C4" }} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "210px 1fr",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.7, minWidth: 0 }}>
          <Typography sx={{ fontSize: MIN_FONT, color: REPORT_MUTED, lineHeight: 1.3, fontWeight: 400 }}>
            Tick items, then generate QR.
          </Typography>
          <Typography sx={{ fontSize: MIN_FONT, color: REPORT_MUTED, lineHeight: 1.3, fontWeight: 400 }}>
            Scan to pay and dispense.
          </Typography>
          <Typography sx={{ fontSize: TITLE_FONT, fontWeight: HEADING_WEIGHT, color: REPORT_GREEN, lineHeight: 1.2 }}>
            ₹{Math.round(total)}
          </Typography>
          {showQR && !isCompleting ? (
            <Typography sx={{ fontSize: MIN_FONT, color: REPORT_MUTED, lineHeight: 1.2 }}>
              Waiting for payment...
            </Typography>
          ) : null}
          {showQR || isCompleting ? (
            <Button
              onClick={handleCancel}
              disabled={isCompleting}
              sx={{
                alignSelf: "stretch",
                bgcolor: "#fff",
                color: "#444",
                textTransform: "none",
                fontWeight: 700,
                fontSize: MIN_FONT,
                px: 1.25,
                py: 0.7,
                minWidth: 0,
                width: "100%",
                borderRadius: 1,
                border: "1px solid #D1D5DB",
                "&:hover": { bgcolor: "#F3F4F6" },
              }}
            >
              {isCompleting ? "Processing..." : "Cancel payment"}
            </Button>
          ) : (
            <Button
              onClick={() => void generateQR()}
              disabled={isLoading || products.length === 0 || total <= 0}
              sx={{
                alignSelf: "stretch",
                bgcolor: REPORT_GREEN,
                color: "#fff",
                textTransform: "none",
                fontWeight: 700,
                fontSize: MIN_FONT,
                px: 1.25,
                py: 0.7,
                minWidth: 0,
                width: "100%",
                borderRadius: 1,
                "&:hover": { bgcolor: REPORT_GREEN_DARK },
                "&.Mui-disabled": { bgcolor: "#9CA3AF", color: "#fff" },
              }}
            >
              {isLoading ? "Generating..." : "click to pay"}
            </Button>
          )}
        </Box>

        <Box
          sx={{
            width: "100%",
            height: 248,
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {isCompleting ? (
            <CircularProgress size={32} sx={{ color: REPORT_GREEN }} />
          ) : showQR && qrImageUrl ? (
            <Box
              component="img"
              src={qrImageUrl}
              alt="UPI QR"
              sx={{
                width: "168%",
                height: "168%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          ) : isLoading ? (
            <CircularProgress size={32} sx={{ color: REPORT_GREEN }} />
          ) : (
            <Icon icon="mdi:qrcode" width={72} color="#D1D5DB" />
          )}
        </Box>
      </Box>
    </Box>
  );
}
