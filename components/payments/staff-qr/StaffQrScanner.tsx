"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Icon } from "@iconify/react";

type StaffQrScannerProps = {
  /** Called once per successful decode (parent should pause further handling). */
  onScan: (rawText: string) => void;
  disabled?: boolean;
  /** Restart camera after an error / rescan request. */
  scanKey?: number;
};

/**
 * Isolated QR camera scanner for kiosk staff auth.
 * Uses html5-qrcode; tears down the camera on unmount to avoid leaked streams.
 */
export default function StaffQrScanner({
  onScan,
  disabled = false,
  scanKey = 0,
}: StaffQrScannerProps) {
  const reactId = useId();
  const elementId = `staff-qr-reader-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  onScanRef.current = onScan;

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      /* already stopped */
    }
  }, []);

  useEffect(() => {
    handledRef.current = false;
    setReady(false);
    setError("");

    if (disabled) {
      void stopScanner();
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        await stopScanner();
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1,
            disableFlip: false,
          },
          (decoded) => {
            if (handledRef.current || disabled) return;
            handledRef.current = true;
            onScanRef.current(decoded);
            void stopScanner();
          },
          () => {
            /* frame miss — ignore */
          }
        );

        if (!cancelled) setReady(true);
      } catch (err: any) {
        console.warn("[StaffQrScanner] start failed:", err);
        if (!cancelled) {
          setError(
            err?.message?.includes("Permission")
              ? "Camera permission denied. Allow camera access or use password."
              : "Unable to start camera. Use password login instead."
          );
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [disabled, elementId, scanKey, stopScanner]);

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "#0f172a",
          border: "2px solid #316D52",
          minHeight: 320,
        }}
      >
        <Box id={elementId} sx={{ width: "100%", "& video": { objectFit: "cover" } }} />

        {!ready && !error ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              bgcolor: "rgba(15,23,42,0.85)",
            }}
          >
            <CircularProgress size={36} sx={{ color: "#86efac" }} />
            <Typography sx={{ color: "#e5e7eb", fontSize: 18 }}>
              Starting camera…
            </Typography>
          </Box>
        ) : null}

        {error ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              p: 3,
              textAlign: "center",
              bgcolor: "rgba(15,23,42,0.92)",
            }}
          >
            <Icon icon="mdi:camera-off" width={40} color="#fca5a5" />
            <Typography sx={{ color: "#fecaca", fontSize: 18, fontWeight: 600 }}>
              {error}
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Typography sx={{ mt: 1.5, fontSize: 18, color: "#6b7280", textAlign: "center" }}>
        Hold the staff QR code inside the frame
      </Typography>
    </Box>
  );
}
