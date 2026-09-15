"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  useGetSignedUploadUrlMutation,
} from "@/redux/api/analysisApi";
import { APP_ROUTES } from "@/utils/routes";
import { useVoiceMessages } from "@/contexts/VoiceContext";
import {
  FREE_CONSULTATION_FLOW,
  isFreeConsultationFlow,
  questionnairePathForFlow,
} from "@/lib/consultationFlow";
import { LiveSkinScanCamera } from "@/components/skin-analysis";
import type { SkinAnalysisResult } from "@/components/skin-analysis/types";
import {
  saveMediapipeScanResult,
  saveMediapipePreview,
} from "@/lib/mediapipe-scan-session";

function base64ToJpegFile(base64String: string, filename: string): File {
  const arr = base64String.split(",");
  const mimeMatch = arr[0]?.match(/:(.*?);/);
  const mime = mimeMatch?.[1] || "image/jpeg";
  const bstr = atob(arr[arr.length - 1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

/**
 * MediaPipe-only selfie flow (newyolo.html).
 * Detect concerns once → save them → auto-route to kiosk report.
 * No second “Analysing with AI…” pass.
 */
export default function FaceScanSelfie() {
  const { speakMessage } = useVoiceMessages();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const consultationFlow = isFreeConsultationFlow(searchParams.get("flow"));
  const routedRef = useRef(false);

  const [getSignedUploadUrl] = useGetSignedUploadUrlMutation();
  const resolvedUserId = (session?.user?.id as string) || "";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(
        consultationFlow
          ? questionnairePathForFlow(FREE_CONSULTATION_FLOW)
          : "/questionnaire"
      );
    }
  }, [router, status, consultationFlow]);

  useEffect(() => {
    speakMessage("scanFace");
  }, [speakMessage]);

  /** Best-effort upload for report photo — does NOT run skin-analysis API again. */
  const uploadSelfieInBackground = async (base64String: string) => {
    if (!resolvedUserId) return;
    try {
      const signed: any = await getSignedUploadUrl({
        fileName: `${Date.now()}.jpeg`,
        contentType: "image/jpeg",
        userId: resolvedUserId,
      });
      const payload = signed?.data?.data;
      if (!payload?.url || !payload?.fileName) return;

      const file = base64ToJpegFile(base64String, payload.fileName);
      const putRes = await axios.put(payload.url, file, {
        headers: { "Content-Type": "image/jpeg" },
      });

      await update({
        ...session,
        user: {
          ...session?.user,
          selfyImage: payload.fileName,
          selfyImagePath: putRes?.config?.url,
        },
      });
    } catch (err) {
      console.warn("[FaceScanSelfie] background upload skipped:", err);
    }
  };

  const handleCaptured = (base64: string, analysis: SkinAnalysisResult | null) => {
    if (routedRef.current) return;
    routedRef.current = true;

    if (analysis) {
      saveMediapipeScanResult(analysis);
    }

    saveMediapipePreview(base64);

    speakMessage("kioskReport");
    router.replace(APP_ROUTES.KIOSK_REPORT);

    // Upload only — no second AI analysis scan
    void uploadSelfieInBackground(base64);
  };

  return (
    <LiveSkinScanCamera
      autoStart
      showLiveReport
      autoContinue
      onCaptured={handleCaptured}
      onBack={() => router.back()}
    />
  );
}
