"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { Box, Typography, CircularProgress, Button, ButtonProps } from "@mui/material";
import ActionButton from "@/components/ui/ActionButton";
import { pauseKioskIdle, resumeKioskIdle } from "@/utils/kioskIdleGate";

type UpiQrPaymentProps = {
  amountPaise: number;
  currency?: string;
  receipt?: string;
  productId?: string;
  mode?: "test" | "live";
  onVerified?: (payload: {
    orderId: string;
    paymentId: string;
    qrCodeId: string;
    signature: string;
    productId?: string;
  }) => void;
  onError?: (message: string) => void;
  onProcessingStart?: () => void;
  autoTrigger?: boolean;
  label?: string;
  buttonProps?: Omit<ButtonProps, "onClick" | "children" | "variant"> & {
    variant?: "primary" | "outline";
  };
};

export default function UpiQrPayment({
  amountPaise,
  currency = "INR",
  receipt,
  productId,
  mode = "live",
  onVerified,
  onError,
  onProcessingStart,
  autoTrigger = false,
  label = "Pay with UPI",
  buttonProps,
}: UpiQrPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrCodeId, setQrCodeId] = useState("");
  const [orderId, setOrderId] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggered = useRef(false);
  const verifiedRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const idlePausedRef = useRef(false);

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

  const reportError = useCallback(
    (message: string) => {
      toast.error(message);
      onError?.(message);
    },
    [onError]
  );

  const startPolling = useCallback(
    (qrId: string, oId: string) => {
      cleanup();
      verifiedRef.current = false;
      pollInFlightRef.current = false;

      const pollBody = {
        qrCodeId: qrId,
        ...(oId ? { orderId: oId } : {}),
        mode,
      };

      pollingRef.current = setInterval(async () => {
        // Prevent overlapping polls (slow check-payment can outlive the 3s interval).
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
            let resolvedOrderId = data.orderId || oId;

            if (!paymentId) {
              try {
                const retry = await fetch("/api/razorpay/check-payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(pollBody),
                });
                const retryData = await retry.json();
                if (retryData.success) {
                  paymentId = retryData.paymentId || "";
                  resolvedOrderId = retryData.orderId || resolvedOrderId;
                }
              } catch (err) {
                console.warn("[UpiQR] paymentId retry failed:", err);
              }
            }

            // Keep polling until Razorpay exposes pay_xxx (QR payments need qrCodeId).
            if (!paymentId) return;
            if (verifiedRef.current) {
              cleanup();
              return;
            }
            // Claim before any further async work / parent callbacks.
            verifiedRef.current = true;

            cleanup();
            setIsCompleting(true);
            setShowQR(false);
            setIsLoading(false);
            onVerified?.({
              orderId: resolvedOrderId,
              paymentId,
              qrCodeId: qrId,
              signature: "",
              productId,
            });
          }
        } catch (err) {
          console.error("[UpiQR] Poll error:", err);
        } finally {
          pollInFlightRef.current = false;
        }
      }, 3000);

      // Timeout after 10 minutes
      timeoutRef.current = setTimeout(() => {
        cleanup();
        setShowQR(false);
        setIsLoading(false);
        toast.info("Payment timed out. Please try again.");
      }, 600000);
    },
    [cleanup, mode, onVerified, productId]
  );

  const generateQR = useCallback(async () => {
    if (isLoading) return;
    verifiedRef.current = false;

    if (typeof amountPaise !== "number" || !Number.isFinite(amountPaise) || amountPaise <= 0) {
      reportError("Invalid amount");
      return;
    }

    setIsLoading(true);
    onProcessingStart?.();

    try {
      const res = await fetch("/api/razorpay/create-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt: receipt || `qr_${Date.now()}`,
          mode,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create QR code");
      }

      setQrImageUrl(json.data.imageUrl);
      setQrCodeId(json.data.qrCodeId);
      setOrderId(json.data.orderId);
      setShowQR(true);
      setIdlePaused(true);

      // Start polling for payment
      startPolling(json.data.qrCodeId, json.data.orderId);
    } catch (err: any) {
      console.error("[UpiQR] Error:", err);
      reportError(err.message || "Failed to generate QR code");
      setIsLoading(false);
    }
  }, [amountPaise, currency, receipt, mode, isLoading, onProcessingStart, reportError, setIdlePaused, startPolling]);

  // Auto-trigger on mount if requested
  useEffect(() => {
    if (autoTrigger && !hasTriggered.current) {
      hasTriggered.current = true;
      generateQR();
    }
  }, [autoTrigger, generateQR]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const handleCancel = () => {
    cleanup();
    setShowQR(false);
    setIsLoading(false);
    setIsCompleting(false);
    onError?.("Payment cancelled");
  };

  if (isCompleting) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          p: 4,
          width: "100%",
          maxWidth: 600,
          mx: "auto",
          minHeight: 400,
        }}
      >
        <CircularProgress size={56} sx={{ color: "#316D52" }} />
        <Typography sx={{ fontSize: 28, fontWeight: 600, color: "#111827" }}>
          Processing your order...
        </Typography>
      </Box>
    );
  }

  if (showQR) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          p: 4,
          width: "100%",
          maxWidth: 600,
          mx: "auto",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 32, color: "#111827" }}>
          Scan QR Code to Pay
        </Typography>

        <Typography sx={{ fontSize: 48, fontWeight: 700, color: "#316D52" }}>
          ₹{(amountPaise / 100).toFixed(2)}
        </Typography>

        <Box
          sx={{
            width: 500,
            height: 500,
            borderRadius: 3,
            overflow: "hidden",
            border: "3px solid #e5e7eb",
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="UPI QR Code"
              style={{ width: "120%", height: "120%", objectFit: "contain" }}
            />
          ) : (
            <CircularProgress size={40} sx={{ color: "#316D52" }} />
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
          <CircularProgress size={24} sx={{ color: "#316D52" }} />
          <Typography sx={{ fontSize: 24, color: "#6b7280" }}>
            Waiting for payment...
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 16, color: "#9ca3af", textAlign: "center" }}>
          Open any UPI app (Google Pay, PhonePe, Paytm etc.)
          <br />
          and scan this QR code to pay
        </Typography>

        <Button
          variant="outlined"
          onClick={handleCancel}
          sx={{
            mt: 1,
            px: 4,
            py: 1.5,
            fontSize: 24,
            color: "#6b7280",
            borderColor: "#d1d5db",
            textTransform: "none",
            borderRadius: "10px",
            "&:hover": { borderColor: "#0000", bgcolor: "#f9fafb" },
          }}
        >
          Cancel
        </Button>
      </Box>
    );
  }

  return (
    <ActionButton
      onClick={generateQR}
      disabled={isLoading}
      {...(buttonProps || {})}
    >
      {isLoading ? "Processing..." : label}
    </ActionButton>
  );
}
