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
  /** Notifies parent when camera stream is fully released. */
  onCameraReleased?: () => void;
};

function stopMediaInElement(elementId: string) {
  try {
    const root = document.getElementById(elementId);
    if (!root) return;
    const videos = root.querySelectorAll("video");
    videos.forEach((video) => {
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      });
      video.pause?.();
      video.srcObject = null;
      try {
        video.removeAttribute("src");
        video.load?.();
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}

/**
 * Staff QR scanner with frosted preview (photo of kiosk screen can't reuse QR).
 * Decoder still uses the raw MediaStream.
 */
export default function StaffQrScanner({
  onScan,
  disabled = false,
  scanKey = 0,
  onCameraReleased,
}: StaffQrScannerProps) {
  const reactId = useId();
  const elementId = `staff-qr-reader-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onReleasedRef = useRef(onCameraReleased);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  onScanRef.current = onScan;
  onReleasedRef.current = onCameraReleased;

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    // Always kill tracks first so Chrome drops "Camera in use"
    stopMediaInElement(elementId);

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        /* already stopped */
      }
      try {
        await scanner.clear();
      } catch {
        /* ignore */
      }
    }

    // Second pass in case library re-attached a stream during stop()
    stopMediaInElement(elementId);
    onReleasedRef.current?.();
  }, [elementId]);

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
        if (cancelled) return;

        const scanner = new Html5Qrcode(elementId, {
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            // Larger decode window = more reliable reads on kiosk distance
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const edge = Math.floor(
                Math.min(viewfinderWidth, viewfinderHeight) * 0.78
              );
              return { width: edge, height: edge };
            },
            aspectRatio: 1,
            disableFlip: false,
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          } as any,
          (decoded) => {
            if (handledRef.current || cancelled) return;
            handledRef.current = true;
            onScanRef.current(decoded);
            void stopScanner();
          },
          () => {
            /* frame miss */
          }
        );

        if (cancelled) {
          await stopScanner();
          return;
        }
        setReady(true);
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
    <Box
      sx={{ width: "100%" }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "#111827",
          border: "2px solid #316D52",
          minHeight: 340,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        {/* Raw camera — blurred for display only; stream stays sharp for decode */}
        <Box
          id={elementId}
          sx={{
            width: "100%",
            minHeight: 340,
            position: "relative",
            zIndex: 1,
            "& video": {
              objectFit: "cover",
              width: "100% !important",
              minHeight: "340px !important",
              filter: "blur(18px) brightness(0.65)",
            },
            "& img": {
              filter: "blur(18px) brightness(0.65)",
            },
            // Hide html5-qrcode green frame / shade (library default is neon green)
            "& #qr-shaded-region": {
              border: "0 !important",
              outline: "none !important",
              boxShadow: "none !important",
              background: "transparent !important",
              opacity: "0 !important",
              visibility: "hidden !important",
            },
            "& #qr-shaded-region *": {
              borderColor: "transparent !important",
              background: "transparent !important",
            },
            "& svg, & canvas + div": {
              display: "none !important",
            },
          }}
        />

        {/* Dim outside the white lens */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background: "rgba(17,24,39,0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            WebkitMaskImage:
              "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
            maskImage:
              "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            maskPosition: "0 0, 50% 46%",
            WebkitMaskPosition: "0 0, 50% 46%",
            maskSize: "100% 100%, 240px 240px",
            WebkitMaskSize: "100% 100%, 240px 240px",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />

        {/* White lens — aim target for staff QR */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            zIndex: 6,
            top: "46%",
            left: "50%",
            width: { xs: 230, sm: 260 },
            height: { xs: 230, sm: 260 },
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            borderRadius: "12px",
            border: "2px solid #ffffff",
            boxShadow:
              "0 0 0 9999px rgba(17,24,39,0.45), 0 0 20px rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 36,
              height: 36,
              borderTop: "4px solid #fff",
              borderLeft: "4px solid #fff",
              borderTopLeftRadius: 10,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 36,
              height: 36,
              borderTop: "4px solid #fff",
              borderRight: "4px solid #fff",
              borderTopRightRadius: 10,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 36,
              height: 36,
              borderBottom: "4px solid #fff",
              borderLeft: "4px solid #fff",
              borderBottomLeftRadius: 10,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 36,
              height: 36,
              borderBottom: "4px solid #fff",
              borderRight: "4px solid #fff",
              borderBottomRightRadius: 10,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              left: 16,
              right: 16,
              height: 2,
              borderRadius: 1,
              background:
                "linear-gradient(90deg, transparent, #ffffff, transparent)",
              boxShadow: "0 0 12px rgba(255,255,255,0.9)",
              animation: "staffQrScanSweep 2.2s ease-in-out infinite",
              "@keyframes staffQrScanSweep": {
                "0%": { top: "12%" },
                "50%": { top: "86%" },
                "100%": { top: "12%" },
              },
            }}
          />
        </Box>

        {ready && !error ? (
          <Box
            sx={{
              position: "absolute",
              zIndex: 4,
              left: 12,
              right: 12,
              bottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor: "rgba(15, 23, 42, 0.78)",
              border: "1px solid rgba(255,255,255,0.35)",
              pointerEvents: "none",
            }}
          >
            <Icon icon="mdi:shield-lock-outline" width={20} color="#fff" />
            <Typography
              sx={{
                color: "#fff",
                fontSize: { xs: 13, sm: 15 },
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.25,
              }}
            >
              Hold QR in the white frame · screen blurred for security
            </Typography>
          </Box>
        ) : null}

        {!ready && !error ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              bgcolor: "rgba(15,23,42,0.92)",
            }}
          >
            <CircularProgress size={36} sx={{ color: "#fff" }} />
            <Typography sx={{ color: "#e5e7eb", fontSize: 18 }}>
              Starting secure camera…
            </Typography>
          </Box>
        ) : null}

        {error ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
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

      <Typography sx={{ mt: 1.5, fontSize: 17, color: "#6b7280", textAlign: "center" }}>
        Align the staff QR inside the white lens. Preview stays blurred so kiosk
        photos cannot reuse the code.
      </Typography>
    </Box>
  );
}
