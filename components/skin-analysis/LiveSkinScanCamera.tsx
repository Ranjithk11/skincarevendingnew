"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import {
  DrawingUtils,
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import { analyzeSkinLandmarks } from "./analyzer";
import {
  DEFAULT_SCAN_DISPLAY,
  FACE_LANDMARKER_MODEL_URL,
  MEDIAPIPE_WASM_BASE,
  SKIN_SCAN_GREEN,
} from "./constants";
import { drawSkinScanOverlay } from "./drawing";
import { evaluateFacePlacement } from "./facePlacement";
import SkinScanReportPanel from "./SkinScanReportPanel";
import type { SkinAnalysisResult, SkinScanDisplayOptions } from "./types";

const FACE_HOLD_MS = 400;
const SCAN_DURATION_MS = 5000;

const STEPS = [
  { id: "place", label: "Place" },
  { id: "hold", label: "Hold" },
  { id: "scan", label: "Scan" },
  { id: "routing", label: "Report" },
] as const;
type Props = {
  /** Called with JPEG + MediaPipe analysis when scan completes. */
  onCaptured: (base64: string, analysis: SkinAnalysisResult | null) => void;
  onBack?: () => void;
  autoStart?: boolean;
  showLiveReport?: boolean;
  /** When true, auto-route after attributes are found (no Continue button / no timer). */
  autoContinue?: boolean;
  display?: Partial<SkinScanDisplayOptions>;
};

let videoLandmarker: FaceLandmarker | null = null;
let videoLandmarkerPromise: Promise<FaceLandmarker> | null = null;

async function createLandmarker(delegate: "GPU" | "CPU"): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_LANDMARKER_MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

async function getVideoLandmarker(): Promise<FaceLandmarker> {
  if (videoLandmarker) return videoLandmarker;
  if (videoLandmarkerPromise) return videoLandmarkerPromise;

  videoLandmarkerPromise = (async () => {
    try {
      videoLandmarker = await createLandmarker("GPU");
      return videoLandmarker;
    } catch (gpuErr) {
      console.warn("[LiveSkinScan] GPU failed, trying CPU:", gpuErr);
      try {
        videoLandmarker = await createLandmarker("CPU");
        return videoLandmarker;
      } catch (cpuErr) {
        videoLandmarkerPromise = null;
        throw cpuErr;
      }
    }
  })();

  return videoLandmarkerPromise;
}

function waitForVideoDimensions(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera stream timed out"));
    }, 8000);
    const onReady = () => {
      if (video.videoWidth > 0) {
        cleanup();
        resolve();
      }
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
  });
}

/**
 * Full-screen MediaPipe face scan (from newyolo.html).
 * No countdown timer — user continues after attributes are detected.
 */
export default function LiveSkinScanCamera({
  onCaptured,
  onBack,
  autoStart = true,
  showLiveReport = true,
  autoContinue = false,
  display = {},
}: Props) {
  const displayOptions: SkinScanDisplayOptions = {
    ...DEFAULT_SCAN_DISPLAY,
    showMesh: true,
    ...display,
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const lastAnalysisRef = useRef(0);
  const isCapturingRef = useRef(false);
  const faceDetectedRef = useRef(false);
  const liveResultRef = useRef<SkinAnalysisResult | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const autoContinueFiredRef = useRef(false);
  const goodPoseSinceRef = useRef<number | null>(null);
  const scanStartedAtRef = useRef<number | null>(null);
  const displayOptionsRef = useRef(displayOptions);
  displayOptionsRef.current = displayOptions;

  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [statusText, setStatusText] = useState("Loading AI face scanner…");
  const [suggestion, setSuggestion] = useState(
    "Look straight at the camera with your face centered"
  );
  const [placementOk, setPlacementOk] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSecondsLeft, setScanSecondsLeft] = useState(5);
  const [scanComplete, setScanComplete] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [liveResult, setLiveResult] = useState<SkinAnalysisResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [bootKey, setBootKey] = useState(0);
  const [scanStep, setScanStep] = useState<"place" | "hold" | "scan" | "routing">(
    "place"
  );

  const attributesReady = Boolean(scanComplete && liveResult);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopLoop]);

  const captureFrame = useCallback(() => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const video = videoRef.current;
      const analysis = liveResultRef.current;
      let base64 = "";

      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          base64 = canvas.toDataURL("image/jpeg", 0.92);
        }
      }

      // Fallback: last analysis work canvas
      if (!base64 && workCanvasRef.current && workCanvasRef.current.width > 0) {
        base64 = workCanvasRef.current.toDataURL("image/jpeg", 0.92);
      }

      stopCamera();
      onCaptured(base64 || "data:image/jpeg;base64,", analysis);
    } finally {
      isCapturingRef.current = false;
    }
  }, [onCaptured, stopCamera]);

  const captureFrameRef = useRef(captureFrame);
  captureFrameRef.current = captureFrame;
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        setModelStatus("loading");
        setStatusText("Loading AI face scanner…");
        setCameraError(null);
        await getVideoLandmarker();
        if (cancelled) return;
        setModelStatus("ready");
        setStatusText("Position your face in the frame");
      } catch (err) {
        if (cancelled) return;
        console.error("[LiveSkinScan] model load failed:", err);
        setModelStatus("error");
        setStatusText("Scanner failed to load");
        setCameraError(
          err instanceof Error
            ? err.message
            : "Could not load MediaPipe face scanner"
        );
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [bootKey]);

  useEffect(() => {
    if (!autoStart || modelStatus !== "ready") return;

    let cancelled = false;

    const start = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        await waitForVideoDimensions(video);
        if (cancelled) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;

        const overlay = overlayRef.current;
        if (overlay) {
          overlay.width = vw;
          overlay.height = vh;
          const ctx = overlay.getContext("2d");
          if (ctx) drawingUtilsRef.current = new DrawingUtils(ctx);
        }

        if (!workCanvasRef.current) {
          workCanvasRef.current = document.createElement("canvas");
        }
        workCanvasRef.current.width = vw;
        workCanvasRef.current.height = vh;

        runningRef.current = true;
        lastVideoTimeRef.current = -1;
        lastAnalysisRef.current = 0;
        goodPoseSinceRef.current = null;
        scanStartedAtRef.current = null;
        setScanComplete(false);
        setScanProgress(0);
        setScanSecondsLeft(5);
        setStatusText("Step 1 · Show your face");
        setSuggestion("Look straight at the camera");

        const loop = () => {
          if (!runningRef.current) return;
          const v = videoRef.current;
          const canvas = overlayRef.current;
          const landmarker = videoLandmarker;

          if (!v || !canvas || !landmarker || v.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          if (v.currentTime !== lastVideoTimeRef.current) {
            try {
              const result = landmarker.detectForVideo(v, performance.now());
              const lm = result.faceLandmarks?.[0];
              const ctx = canvas.getContext("2d");

              if (!lm) {
                if (faceDetectedRef.current) {
                  faceDetectedRef.current = false;
                  setFaceDetected(false);
                }
                goodPoseSinceRef.current = null;
                scanStartedAtRef.current = null;
                setPlacementOk(false);
                setHoldProgress(0);
                setScanProgress(0);
                setScanSecondsLeft(5);
                setScanComplete(false);
                liveResultRef.current = null;
                setLiveResult(null);
                setScanStep("place");
                setStatusText("Step 1 · Show your face");
                setSuggestion("Look straight at the camera");
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
              } else {
                if (!faceDetectedRef.current) {
                  faceDetectedRef.current = true;
                  setFaceDetected(true);
                }

                const placement = evaluateFacePlacement(lm);

                if (!placement.ok) {
                  goodPoseSinceRef.current = null;
                  scanStartedAtRef.current = null;
                  setPlacementOk(false);
                  setHoldProgress(0);
                  setScanProgress(0);
                  setScanSecondsLeft(5);
                  setScanComplete(false);
                  liveResultRef.current = null;
                  setLiveResult(null);
                  setScanStep("place");
                  setStatusText("Step 1 · Show your face");
                  setSuggestion(placement.suggestion);
                  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                } else {
                  const now = performance.now();
                  if (goodPoseSinceRef.current == null) {
                    goodPoseSinceRef.current = now;
                  }
                  const held = now - goodPoseSinceRef.current;

                  if (held < FACE_HOLD_MS) {
                    setScanStep("hold");
                    setPlacementOk(false);
                    setHoldProgress(Math.min(1, held / FACE_HOLD_MS));
                    setStatusText("Step 2 · Hold still");
                    setSuggestion("Keep looking straight — starting scan…");
                    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                  } else {
                    // 5-second scan window
                    if (scanStartedAtRef.current == null) {
                      scanStartedAtRef.current = now;
                    }
                    const scanned = now - scanStartedAtRef.current;
                    const progress = Math.min(1, scanned / SCAN_DURATION_MS);
                    const secondsLeft = Math.max(
                      1,
                      Math.ceil((SCAN_DURATION_MS - scanned) / 1000)
                    );
                    setPlacementOk(true);
                    setHoldProgress(1);
                    setScanProgress(progress);
                    setScanSecondsLeft(secondsLeft);
                    setScanStep("scan");
                    setStatusText(`Step 3 · Scanning… ${secondsLeft}s`);
                    setSuggestion("Stay still while we detect skin concerns");

                    if (now - lastAnalysisRef.current > 160) {
                      const work = workCanvasRef.current;
                      const wctx = work?.getContext("2d", {
                        willReadFrequently: true,
                      });
                      if (work && wctx && work.width > 0) {
                        wctx.drawImage(v, 0, 0, work.width, work.height);
                        const imageData = wctx.getImageData(
                          0,
                          0,
                          work.width,
                          work.height
                        );
                        const analysis = analyzeSkinLandmarks(
                          lm,
                          imageData,
                          work.width,
                          work.height
                        );
                        liveResultRef.current = analysis;
                        setLiveResult(analysis);

                        if (ctx) {
                          if (!drawingUtilsRef.current) {
                            drawingUtilsRef.current = new DrawingUtils(ctx);
                          }
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                          drawSkinScanOverlay(
                            ctx,
                            lm,
                            analysis.values,
                            {
                              ...displayOptionsRef.current,
                              showLabels: false,
                              showMesh: false,
                              showZones: false,
                              showHotspots: true,
                            },
                            drawingUtilsRef.current,
                            true
                          );
                        }
                      }
                      lastAnalysisRef.current = now;
                    }

                    if (scanned >= SCAN_DURATION_MS) {
                      setScanComplete(true);
                      setStatusText("Step 3 · Scan complete");
                      setSuggestion("Preparing your report…");
                    }
                  }
                }
              }
            } catch (detectErr) {
              console.warn("[LiveSkinScan] detect frame error:", detectErr);
            }

            lastVideoTimeRef.current = v.currentTime;
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("[LiveSkinScan] camera error:", err);
        setCameraError(
          err instanceof Error ? err.message : "Camera permission denied"
        );
        setStatusText("Camera error");
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [autoStart, modelStatus, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Auto-continue once attributes ready — do NOT depend on captureFrame identity
  // (that was clearing the timeout and never navigating).
  useEffect(() => {
    if (!autoContinue || !attributesReady) return;
    if (autoContinueFiredRef.current) return;

    setScanStep("routing");
    setStatusText("Step 4 · Opening your report");
    setSuggestion("Almost done — preparing your skincare report");

    const t = window.setTimeout(() => {
      if (autoContinueFiredRef.current) return;
      autoContinueFiredRef.current = true;
      captureFrameRef.current();
    }, 600);

    return () => window.clearTimeout(t);
  }, [autoContinue, attributesReady]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        bgcolor: "#0b1218",
        overflow: "hidden",
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        muted
        playsInline
        autoPlay
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
          backgroundColor: "#000",
        }}
      />
      {/* Canvas is NOT CSS-mirrored — landmarks are flipped in draw code so labels read normally */}
      <Box
        component="canvas"
        ref={overlayRef}
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Soft edge vignette only — no oval frame */}
      {scanStep !== "routing" ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(8,14,20,0.45) 0%, transparent 18%, transparent 78%, rgba(8,14,20,0.55) 100%)",
          }}
        />
      ) : null}

      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 5,
          px: 2,
          pt: 2,
          pb: 1.5,
          background:
            "linear-gradient(180deg, rgba(11,18,24,0.95) 0%, rgba(11,18,24,0.6) 80%, transparent 100%)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {onBack ? (
              <Box
                component="button"
                onClick={onBack}
                aria-label="Go back"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.25)",
                  bgcolor: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <Icon icon="mdi:arrow-left" width={24} />
              </Box>
            ) : null}
            <Box>
              <Typography
                sx={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 22,
                  lineHeight: 1.1,
                }}
              >
                AI Face Scan
              </Typography>
              <Typography sx={{ color: "#9FB3C8", fontSize: 14 }}>
                Follow the steps below
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.6,
              borderRadius: 999,
              border: "1px solid rgba(124,255,178,0.45)",
              color: "#7CFFB2",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.04em",
              animation: "livePulse 1.6s ease-in-out infinite",
              "@keyframes livePulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.55 },
              },
            }}
          >
            LIVE
          </Box>
        </Box>

        {/* Attractive step buttons — min 20px */}
        <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
          {STEPS.map((step, i) => {
            const activeIdx = STEPS.findIndex((s) => s.id === scanStep);
            const done = i < activeIdx || scanStep === "routing";
            const active = step.id === scanStep;
            return (
              <Box
                key={step.id}
                sx={{
                  flex: 1,
                  minHeight: 56,
                  px: 0.5,
                  py: 1,
                  borderRadius: "14px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "0.01em",
                  lineHeight: 1.15,
                  color: "#fff",
                  bgcolor: active
                    ? "linear-gradient(135deg, #2F5D46 0%, #3d7a5c 100%)"
                    : done
                      ? "rgba(47,93,70,0.7)"
                      : "rgba(255,255,255,0.1)",
                  background: active
                    ? "linear-gradient(135deg, #2F5D46 0%, #4a9a6a 55%, #2F5D46 100%)"
                    : done
                      ? "rgba(47,93,70,0.75)"
                      : "rgba(255,255,255,0.1)",
                  backgroundSize: active ? "200% 200%" : undefined,
                  border: active
                    ? "2px solid #7CFFB2"
                    : done
                      ? "1px solid rgba(124,255,178,0.35)"
                      : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: active
                    ? "0 0 18px rgba(124,255,178,0.35)"
                    : "none",
                  animation: active
                    ? "stepGlow 1.8s ease-in-out infinite"
                    : undefined,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  transform: active ? "scale(1.04)" : "scale(1)",
                  "@keyframes stepGlow": {
                    "0%, 100%": {
                      boxShadow: "0 0 10px rgba(124,255,178,0.25)",
                      backgroundPosition: "0% 50%",
                    },
                    "50%": {
                      boxShadow: "0 0 22px rgba(124,255,178,0.55)",
                      backgroundPosition: "100% 50%",
                    },
                  },
                }}
              >
                {i + 1}. {step.label}
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            px: 1.75,
            py: 1.5,
            borderRadius: "16px",
            bgcolor: "rgba(0,0,0,0.58)",
            border: `1px solid ${
              scanStep === "routing" || scanStep === "scan"
                ? "rgba(124,255,178,0.45)"
                : "rgba(255,215,0,0.35)"
            }`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            {scanStep === "routing" || modelStatus === "loading" ? (
              <CircularProgress size={22} sx={{ color: "#FFD700" }} />
            ) : scanStep === "scan" ? (
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "rgba(124,255,178,0.2)",
                  border: "2px solid #7CFFB2",
                  color: "#7CFFB2",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {scanSecondsLeft}
              </Box>
            ) : (
              <Icon
                icon={
                  faceDetected ? "mdi:check-circle" : "mdi:account-box-outline"
                }
                width={24}
                color={faceDetected ? "#7CFFB2" : "#FFD700"}
              />
            )}
            <Typography sx={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>
              {statusText}
            </Typography>
          </Box>
          <Typography sx={{ color: "#E8F0F8", fontSize: 16, pl: 5, lineHeight: 1.35 }}>
            {suggestion}
          </Typography>
          {scanStep === "scan" ? (
            <Box
              sx={{
                ml: 5,
                height: 10,
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.18)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${Math.round(scanProgress * 100)}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #2F5D46, #7CFFB2)",
                  transition: "width 100ms linear",
                }}
              />
            </Box>
          ) : null}
          {scanStep === "hold" && holdProgress > 0 && holdProgress < 1 ? (
            <Box
              sx={{
                ml: 5,
                height: 8,
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.18)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${Math.round(holdProgress * 100)}%`,
                  height: "100%",
                  bgcolor: "#7CFFB2",
                  transition: "width 80ms linear",
                }}
              />
            </Box>
          ) : null}
        </Box>
      </Box>

      {cameraError ? (
        <Box
          sx={{
            position: "absolute",
            top: "40%",
            left: 16,
            right: 16,
            zIndex: 6,
            px: 2,
            py: 2,
            borderRadius: "14px",
            bgcolor: "rgba(20,12,12,0.92)",
            border: "1px solid rgba(239,78,93,0.55)",
            textAlign: "center",
          }}
        >
          <Typography sx={{ color: "#fff", fontWeight: 700, mb: 1 }}>
            Scanner unavailable
          </Typography>
          <Typography sx={{ color: "#ffb4b4", fontSize: 13, mb: 2 }}>
            {cameraError}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              videoLandmarker = null;
              videoLandmarkerPromise = null;
              setBootKey((k) => k + 1);
            }}
            sx={{ bgcolor: SKIN_SCAN_GREEN, "&:hover": { bgcolor: "#244A38" } }}
          >
            Retry scanner
          </Button>
        </Box>
      ) : null}

      {attributesReady && !autoContinue ? (
        <Box
          sx={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 28,
            zIndex: 6,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            onClick={captureFrame}
            sx={{
              py: 1.75,
              fontSize: 18,
              fontWeight: 800,
              borderRadius: "14px",
              bgcolor: SKIN_SCAN_GREEN,
              boxShadow: "0 8px 24px rgba(47,93,70,0.45)",
              "&:hover": { bgcolor: "#244A38" },
            }}
            endIcon={<Icon icon="mdi:arrow-right" width={22} />}
          >
            Continue to recommendations
          </Button>
        </Box>
      ) : null}

      {scanStep === "routing" ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            bgcolor: "rgba(8,14,20,0.72)",
            backdropFilter: "blur(4px)",
            px: 3,
          }}
        >
          <CircularProgress size={48} sx={{ color: "#FFD700" }} />
          <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 22, textAlign: "center" }}>
            Opening your skincare report
          </Typography>
          <Typography sx={{ color: "#9FB3C8", fontSize: 14, textAlign: "center" }}>
            Taking you to your detected concerns & recommendations…
          </Typography>
        </Box>
      ) : null}

      {showLiveReport && liveResult && scanStep === "scan" ? (
        <Box
          sx={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 16,
            zIndex: 5,
            maxHeight: "28%",
            overflow: "auto",
          }}
        >
          <SkinScanReportPanel
            scores={liveResult.topConcerns}
            topOnly
            compact
          />
        </Box>
      ) : scanStep === "place" || scanStep === "hold" ? (
        <Box
          sx={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 28,
            zIndex: 5,
            textAlign: "center",
            color: "rgba(255,255,255,0.85)",
            fontSize: 18,
            fontWeight: 700,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          Look straight at the camera · keep your head level
        </Box>
      ) : null}
    </Box>
  );
}
