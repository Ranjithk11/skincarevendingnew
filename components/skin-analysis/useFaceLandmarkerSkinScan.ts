"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
} from "./constants";
import { drawSkinScanOverlay } from "./drawing";
import type {
  SkinAnalysisResult,
  SkinScanDisplayOptions,
  SkinScanStatus,
} from "./types";

type UseFaceLandmarkerSkinScanOptions = {
  display?: Partial<SkinScanDisplayOptions>;
  enabled?: boolean;
};

let sharedLandmarker: FaceLandmarker | null = null;
let sharedLandmarkerPromise: Promise<FaceLandmarker> | null = null;

async function getSharedLandmarker(): Promise<FaceLandmarker> {
  if (sharedLandmarker) return sharedLandmarker;
  if (sharedLandmarkerPromise) return sharedLandmarkerPromise;

  sharedLandmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
    sharedLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numFaces: 1,
      minFaceDetectionConfidence: 0.55,
      minFacePresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
    return sharedLandmarker;
  })();

  return sharedLandmarkerPromise;
}

export function useFaceLandmarkerSkinScan(
  imageSrc: string | null | undefined,
  options: UseFaceLandmarkerSkinScanOptions = {}
) {
  const { enabled = true, display = {} } = options;
  const displayOptions: SkinScanDisplayOptions = {
    ...DEFAULT_SCAN_DISPLAY,
    ...display,
  };

  const [status, setStatus] = useState<SkinScanStatus>("idle");
  const [result, setResult] = useState<SkinAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestIdRef = useRef(0);

  const drawOverlay = useCallback(
    (
      lm: Array<{ x: number; y: number }>,
      values: Record<string, number>,
      canvas: HTMLCanvasElement
    ) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const drawingUtils = new DrawingUtils(ctx);
      drawSkinScanOverlay(ctx, lm, values, displayOptions, drawingUtils, true);
    },
    [displayOptions]
  );

  const scanImage = useCallback(
    async (src: string) => {
      const requestId = ++requestIdRef.current;
      setStatus("loading-model");
      setErrorMessage(null);
      setResult(null);

      try {
        const landmarker = await getSharedLandmarker();
        if (requestId !== requestIdRef.current) return;

        setStatus("scanning");

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.crossOrigin = "anonymous";
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Failed to load captured image"));
          el.src = src;
        });

        if (requestId !== requestIdRef.current) return;

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (!workCanvasRef.current) {
          workCanvasRef.current = document.createElement("canvas");
        }
        const workCanvas = workCanvasRef.current;
        workCanvas.width = width;
        workCanvas.height = height;
        const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });
        if (!workCtx) throw new Error("Canvas not supported");

        workCtx.drawImage(img, 0, 0, width, height);
        const imageData = workCtx.getImageData(0, 0, width, height);

        const detection = landmarker.detect(img);
        const lm = detection.faceLandmarks?.[0];

        if (!lm) {
          setStatus("no-face");
          setErrorMessage("No face detected in the photo.");
          return;
        }

        const analysis = analyzeSkinLandmarks(lm, imageData, width, height);
        setResult(analysis);
        setStatus("ready");

        const overlayCanvas = overlayCanvasRef.current;
        if (overlayCanvas) {
          overlayCanvas.width = width;
          overlayCanvas.height = height;
          drawOverlay(lm, analysis.values, overlayCanvas);
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Skin scan failed");
      }
    },
    [drawOverlay]
  );

  useEffect(() => {
    if (!enabled || !imageSrc) {
      setStatus("idle");
      setResult(null);
      setErrorMessage(null);
      return;
    }

    void scanImage(imageSrc);

    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, imageSrc, scanImage]);

  const redraw = useCallback(() => {
    if (!result || !overlayCanvasRef.current) return;
    const landmarker = sharedLandmarker;
    if (!landmarker || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const detection = landmarker.detect(img);
      const lm = detection.faceLandmarks?.[0];
      if (lm && overlayCanvasRef.current) {
        drawOverlay(lm, result.values, overlayCanvasRef.current);
      }
    };
    img.src = imageSrc;
  }, [drawOverlay, imageSrc, result]);

  useEffect(() => {
    redraw();
  }, [displayOptions.showHotspots, displayOptions.showLabels, displayOptions.showMesh, displayOptions.showZones, redraw]);

  return {
    status,
    result,
    errorMessage,
    overlayCanvasRef,
    rescan: () => {
      if (imageSrc) void scanImage(imageSrc);
    },
  };
}
