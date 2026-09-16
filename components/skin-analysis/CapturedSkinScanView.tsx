"use client";

import { useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { useFaceLandmarkerSkinScan } from "./useFaceLandmarkerSkinScan";
import SkinScanReportPanel from "./SkinScanReportPanel";
import { SKIN_SCAN_GREEN, SKIN_SCAN_GREEN_LIGHT } from "./constants";
import type { SkinAnalysisResult, SkinScanDisplayOptions } from "./types";

type Props = {
  imageSrc: string;
  enabled?: boolean;
  showReport?: boolean;
  compactReport?: boolean;
  display?: Partial<SkinScanDisplayOptions>;
  onAnalysisComplete?: (result: SkinAnalysisResult) => void;
  onScanError?: (message: string) => void;
  className?: string;
};

export default function CapturedSkinScanView({
  imageSrc,
  enabled = true,
  showReport = true,
  compactReport = true,
  display,
  onAnalysisComplete,
  onScanError,
  className,
}: Props) {
  const { status, result, errorMessage, overlayCanvasRef } = useFaceLandmarkerSkinScan(
    imageSrc,
    { enabled, display }
  );

  useEffect(() => {
    if (result) onAnalysisComplete?.(result);
  }, [result, onAnalysisComplete]);

  useEffect(() => {
    if (errorMessage) onScanError?.(errorMessage);
  }, [errorMessage, onScanError]);

  const isBusy = status === "loading-model" || status === "scanning";

  return (
    <Box className={className} sx={{ width: "100%" }}>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          borderRadius: "10px",
          overflow: "hidden",
          bgcolor: "#eef3f7",
          aspectRatio: "3 / 4",
          maxHeight: 440,
        }}
      >
        <Box
          component="img"
          src={imageSrc}
          alt="Captured selfie"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: "scaleX(-1)",
          }}
        />
        <Box
          component="canvas"
          ref={overlayCanvasRef}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />

        {isBusy ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              bgcolor: "rgba(47, 93, 70, 0.35)",
              backdropFilter: "blur(2px)",
            }}
          >
            <CircularProgress size={42} sx={{ color: "#FFD700" }} />
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                textShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
            >
              Scanning skin concerns…
            </Typography>
          </Box>
        ) : null}

        {status === "ready" ? (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              bgcolor: "rgba(47, 93, 70, 0.92)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <Icon icon="mdi:face-recognition" width={14} />
            Scan complete
          </Box>
        ) : null}

        {status === "no-face" || status === "error" ? (
          <Box
            sx={{
              position: "absolute",
              bottom: 10,
              left: 10,
              right: 10,
              px: 1.25,
              py: 0.75,
              borderRadius: "8px",
              bgcolor: "rgba(239, 78, 93, 0.92)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {errorMessage || "Could not scan face"}
          </Box>
        ) : null}
      </Box>

      {showReport && result ? (
        <Box sx={{ mt: 1.5 }}>
          <SkinScanReportPanel
            scores={result.topConcerns}
            topOnly
            compact={compactReport}
          />
        </Box>
      ) : null}

      {!showReport && result ? (
        <Box
          sx={{
            mt: 1,
            px: 1,
            py: 0.75,
            borderRadius: "8px",
            bgcolor: SKIN_SCAN_GREEN_LIGHT,
            border: `1px solid ${SKIN_SCAN_GREEN}33`,
          }}
        >
          <Typography sx={{ fontSize: 12, color: SKIN_SCAN_GREEN, fontWeight: 600 }}>
            Top signals:{" "}
            {result.topConcerns
              .slice(0, 3)
              .map((c) => `${c.name} (${c.value})`)
              .join(" · ")}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
