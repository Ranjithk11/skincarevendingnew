"use client";
import React, { Fragment, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { styled } from "@mui/material/styles";
import {
  Button,
  Card,
  Grid,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  useGetRecommnedSkinAttributesMutation,
  useGetSignedUploadUrlMutation,
  useGetUploadImageInfoMutation,
} from "@/redux/api/analysisApi";
import axios from "axios";
import { useSession } from "next-auth/react";
import LoadingComponent from "@/components/loaders/Loading";
import { useRouter, useSearchParams } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import SelectInputFieldComponent from "@/components/form-felds/SelectInput";
import { skinTypes } from "@/utils/constants";
import { useForm } from "react-hook-form";
import ARCameraComponent from "../../components/camera/ARCamera";
import * as faceapi from "face-api.js";
import SideMenuComponent from "@/views/home/selfie/SideMenu";
import { Icon } from "@iconify/react";
import PageBackground from "@/components/ui/PageBackground";
import { useAppSelector } from "@/redux/store/store";
import Image from "next/image";
import { ArrowBack } from "@mui/icons-material";
import { useVoiceMessages, useVoice } from "@/contexts/VoiceContext";
import { sendScanCompletedWebhook, extractScanAnalysisFields, sendConsultationWebhook } from "@/utils/webhook";
import ConsultationConfirmed from "./Recommendations/ConsultationConfirmed";
import {
  FREE_CONSULTATION_FLOW,
  isFreeConsultationFlow,
  questionnairePathForFlow,
  getConsultationTimeLabel,
} from "@/lib/consultationFlow";

// Friendly progressive-message loader shown while AI analysis is in progress.
const ANALYSIS_MESSAGES = [
  { icon: "mdi:robot-happy-outline", text: "Analysing your image using AI...", voice: "Analysing your image using A I." },
  { icon: "mdi:face-recognition", text: "Scanning your facial features...", voice: "Scanning your facial features." },
  { icon: "mdi:magnify-scan", text: "Detecting your skin concerns...", voice: "Detecting your skin concerns." },
  { icon: "mdi:flask-outline", text: "Curating recommended products for you...", voice: "Curating recommended products for you." },
  { icon: "mdi:file-document-edit-outline", text: "Preparing your personalised report...", voice: "Almost there. Preparing your personalised report." },
];

const ANALYSIS_TIMEOUT_MS = 90_000;
const FRIENDLY_ANALYSIS_ERROR =
  "Skin analysis failed. Please retry, or retake your photo.";
const FRIENDLY_TIMEOUT_ERROR =
  "The scan took too long. Please retry analysis, or retake your photo.";

function stringifyErrorValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(stringifyErrorValue).filter(Boolean).join(". ");
  }
  if (value && typeof value === "object" && "message" in (value as object)) {
    return stringifyErrorValue((value as { message?: unknown }).message);
  }
  return "";
}

function getRecommendSkinCareError(response: any): string | null {
  if (!response) return FRIENDLY_ANALYSIS_ERROR;

  const body = response?.error?.data ?? response?.data ?? response;
  const httpStatus = Number(response?.error?.status ?? body?.statusCode ?? 0);
  const apiStatus = String(body?.status ?? "").toLowerCase();
  const rawMessage =
    stringifyErrorValue(body?.error) ||
    stringifyErrorValue(body?.message) ||
    stringifyErrorValue(response?.error?.message);

  const failed =
    Boolean(response?.error) ||
    apiStatus === "failure" ||
    apiStatus === "error" ||
    (Number.isFinite(httpStatus) && httpStatus >= 400);

  if (!failed) return null;

  if (
    httpStatus >= 500 ||
    /status code 5\d\d|internal server/i.test(rawMessage)
  ) {
    return FRIENDLY_ANALYSIS_ERROR;
  }
  if (/timeout|timed out|network/i.test(rawMessage)) {
    return FRIENDLY_TIMEOUT_ERROR;
  }
  if (rawMessage && !/^request failed/i.test(rawMessage)) {
    return rawMessage;
  }
  return FRIENDLY_ANALYSIS_ERROR;
}

const AnalysisLoader: React.FC = () => {
  const [index, setIndex] = useState(0);
  const { speak } = useVoice();

  useEffect(() => {
    // Speak the first message immediately
    speak(ANALYSIS_MESSAGES[0].voice);

    const id = setInterval(() => {
      setIndex((prev) => {
        // Stop at the last message - don't loop
        if (prev >= ANALYSIS_MESSAGES.length - 1) {
          return prev;
        }
        const next = prev + 1;
        speak(ANALYSIS_MESSAGES[next].voice);
        return next;
      });
    }, 5000);

    return () => clearInterval(id);
  }, [speak]);

  const current = ANALYSIS_MESSAGES[index];

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 2,
        borderRadius: "10px",
        overflow: "hidden",
        background:
          "linear-gradient(160deg, rgba(45,90,61,0.55) 0%, rgba(212,175,55,0.35) 50%, rgba(45,90,61,0.65) 100%)",
        backdropFilter: "blur(2px)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,215,0,0.25), transparent 55%), radial-gradient(circle at 80% 80%, rgba(45,90,61,0.4), transparent 55%)",
          animation: "pulseGlow 3s ease-in-out infinite",
          "@keyframes pulseGlow": {
            "0%, 100%": { opacity: 0.7 },
            "50%": { opacity: 1 },
          },
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: 72,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "4px solid rgba(255,255,255,0.25)",
            borderTopColor: "#FFD700",
            boxShadow: "0 0 20px rgba(255,215,0,0.4)",
            animation: "spin 1.1s linear infinite",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" },
            },
          }}
        />
        <Icon icon={current.icon} width={36} color="#fff" />
      </Box>
      <Typography
        key={current.text}
        sx={{
          fontSize: "24px",
          fontWeight: 600,
          color: "#fff",
          textAlign: "center",
          px: 1,
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          zIndex: 1,
          animation: "fadeSlide 0.5s ease",
          "@keyframes fadeSlide": {
            "0%": { opacity: 0, transform: "translateY(6px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {current.text}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.75, mt: 0.5, zIndex: 1 }}>
        {ANALYSIS_MESSAGES.map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              bgcolor: i === index ? "#FFD700" : "rgba(255,255,255,0.4)",
              boxShadow: i === index ? "0 0 8px rgba(255,215,0,0.6)" : "none",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </Box>
      <Typography sx={{ fontSize: "24px", color: "rgba(255,255,255,0.85)", textAlign: "center", px: 1, zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        Just a few seconds...
      </Typography>
    </Box>
  );
};

const StyledTakeSelfie = styled(Container)(({ theme }) => ({
  flexGrow: 1,
  display: "flex",
  alignItems: "stretch",

  "--selfiePreviewWidth": "min(250vw, 360px)",
  "--selfiePreviewHeight": "min(250vh, 440px)",

  "& .photo-wrapper": {
    flexGrow: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    backgroundRepeat: "no-repeat",
    backgroundSize: "100% 50%",
    backgroundPosition: "top",

    "& .selfy_image": {
      overflow: "hidden",
      width: "var(--selfiePreviewWidth)",
      height: "var(--selfiePreviewHeight)",
      borderRadius: "10px",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      "& .camera_icon": {
        position: "absolute",
        right: 20,
        bottom: 20,
        width: 90,
        height: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.common.white,
        borderRadius: "100%",
      },
      "& .errorInfo": {
        padding: 10,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        "& .MuiTypography-body1": {
          color: theme.palette.common.white,
          marginTop: 10,
          fontSize: "12px",
          lineHeight: 1.5,
        },
        "& .MuiButton-outlined": {
          minWidth: 50,
          marginTop: 20,
        },
      },
      "& .successInfo": {
        padding: 10,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(70, 138, 11, 0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        "& .MuiTypography-body1": {
          color: theme.palette.common.white,
          marginTop: 10,
          fontSize: "12px",
          lineHeight: 1.5,
        },
        "& .MuiButton-outlined": {
          minWidth: 50,
          marginTop: 20,
        },
      },
    },
  },
  "& .scanning-section": {
    flexGrow: 1,
    margin: 10,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "bottom",
    position: "relative",
    overflow: "hidden",
    borderRadius: 10,
    "& .MuiTypography-h6": {
      textAlign: "center",
      fontSize: 30,
      lineHeight: 1,
    },
    "& .MuiButton-root": {
      minWidth: 150,
      borderRadius: 100,
      svg: {
        color: theme.palette.common.white,
      },
    },
    "& .selfy_image": {
      overflow: "hidden",
      width: "var(--selfiePreviewWidth)",
      height: "var(--selfiePreviewHeight)",
      borderRadius: "10px",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      "& .camera_icon": {
        position: "absolute",
        right: 20,
        bottom: 20,
        width: 90,
        height: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.common.white,
        borderRadius: "100%",
      },
      "& .errorInfo": {
        padding: 10,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        "& .MuiTypography-body1": {
          color: theme.palette.common.white,
          marginTop: 10,
          fontSize: "12px",
          lineHeight: 1.5,
        },
        "& .MuiButton-outlined": {
          minWidth: 50,
          marginTop: 20,
        },
      },
      "& .successInfo": {
        padding: 10,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(70, 138, 11, 0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        "& .MuiTypography-body1": {
          color: theme.palette.common.white,
          marginTop: 10,
          fontSize: "12px",
          lineHeight: 1.5,
        },
        "& .MuiButton-outlined": {
          minWidth: 50,
          marginTop: 20,
        },
      },
    },
  },
  "& .MuiCardContent-root": {
    "& .MuiTypography-h4": {
      fontWeight: 700,
    },
    "& .MuiTypography-subtitle1": {
      fontWeight: 700,
      fontSize: 24,
    },
    "& .MuiTypography-subtitle2": {
      fontWeight: 500,
      fontSize: 20,
    },
    "& .MuiTypography-body1": {
      fontWeight: 400,
      fontSize: 14,
      color: theme.palette.text.secondary,
    },
  },
  "& .photo_wrapper": {
    width: "100%",
    position: "relative",
    height: "100%",
    border: `5px dotted ${theme.palette.grey[200]}`,
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    "& .selfy_image": {
      overflow: "hidden",
      width: "var(--selfiePreviewWidth)",
      height: "var(--selfiePreviewHeight)",
      borderRadius: "10px",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      "& .camera_icon": {
        position: "absolute",
        right: 20,
        bottom: 20,
        width: 120,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.common.white,
        borderRadius: "100%",
      },
      "& .errorInfo": {
        padding: 10,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        "& .MuiTypography-body1": {
          color: theme.palette.common.white,
          marginTop: 10,
          fontSize: "12px",
          lineHeight: 1.5,
        },
        "& .MuiButton-outlined": {
          minWidth: 50,
          marginTop: 20,
        },
      },
      "& .successInfo": {
        padding: 10,
        width: "75%",
        height: "100%",
        backgroundColor: "rgba(70, 138, 11, 0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        "& .MuiTypography-body1": {
          color: theme.palette.common.white,
          marginTop: 10,
          fontSize: "12px",
          lineHeight: 1.5,
        },
        "& .MuiButton-outlined": {
          minWidth: 50,
          marginTop: 20,
        },
      },
    },
  },
  "& .MuiButton-root": {
    minWidth: 280,
  },
  "& .MuiDialogContent-root": {
    position: "relative",
    padding: 40,
  },
  svg: {
    color: theme.palette.grey[400],
  },
}));

const TakeSelfie = () => {
  const { speakMessage } = useVoiceMessages();
  const [initializing, setInitializing] = useState(true);
  const [modelsReady, setModelsReady] = useState(false);
  const modelsReadyRef = useRef(false);
  const [croppedFace, setCroppedFace] = useState(null);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState<boolean>(false);
  const [openCamera, setOpenCamera] = useState<boolean>(true);
  const [image, setImage] = useState<any>(null);
  const imageRef = useRef<any>();
  const canvasRef = useRef<any>();
  const autoAnalyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisRequestIdRef = useRef(0);
  const analysisAbortRef = useRef<{ abort: () => void } | null>(null);
  const theme = useTheme();
  const isUpMdDevice = useMediaQuery(theme.breakpoints.up("md"));

  // Get skinType from Redux store (set in Slide2)
  const reduxSkinType = useAppSelector((state: any) => state.analysisSlice?.skinType);

  const [skinAttributeStatus, setSkinAttributeStatus] = useState<any>(null);
  const { control, getValues } = useForm({
    mode: "all",
    defaultValues: {
      skinType: reduxSkinType || "NORMAL_SKIN",
    },
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultationFlow = isFreeConsultationFlow(searchParams.get("flow"));
  const preferredTime = searchParams.get("preferredTime") || "";
  const preferredTimeLabel = getConsultationTimeLabel(preferredTime);
  const [showConsultationConfirmed, setShowConsultationConfirmed] = useState(false);
  const consultationWebhookFiredRef = useRef(false);

  const [getRecommnedSkinAttributes, { isLoading: isLoadingSkinAttributes }] =
    useGetRecommnedSkinAttributesMutation();

  const [
    getUploadImageInfo,
    { data: dataImageInfo, isLoading: isLoadingImageInfo },
  ] = useGetUploadImageInfoMutation();
  const [getSignedUploadUrl] = useGetSignedUploadUrlMutation();
  const { data: session, status, update } = useSession();
  useEffect(() => {}, []);

  useEffect(() => {
    return () => {
      if (autoAnalyzeTimerRef.current) {
        clearTimeout(autoAnalyzeTimerRef.current);
        autoAnalyzeTimerRef.current = null;
      }
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = null;
      }
      analysisAbortRef.current?.abort();
      analysisAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(
        consultationFlow
          ? questionnairePathForFlow(FREE_CONSULTATION_FLOW)
          : "/questionnaire"
      );
    }
  }, [router, status, consultationFlow]);

  // Welcome message when selfie page loads
  useEffect(() => {
    setTimeout(() => {
      speakMessage('scanFace');
    }, 500);
  }, [speakMessage]);

  const resolvedUserId = (session?.user?.id as string) || "";

  const hasAnnouncedAnalysisSuccessRef = useRef(false);

  useEffect(() => {
    if (skinAttributeStatus?.type === "SUCCESS") {
      if (hasAnnouncedAnalysisSuccessRef.current) return;
      hasAnnouncedAnalysisSuccessRef.current = true;
      speakMessage(
        consultationFlow ? "success" : "kioskReport"
      );
      return;
    }

    hasAnnouncedAnalysisSuccessRef.current = false;
  }, [skinAttributeStatus?.type, speakMessage, consultationFlow]);

  useEffect(() => {
    if (skinAttributeStatus?.type !== "SUCCESS" || consultationFlow) return;
    const timer = window.setTimeout(() => {
      router.push(APP_ROUTES.KIOSK_REPORT);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [skinAttributeStatus?.type, consultationFlow, router]);

  const completeConsultationAfterAnalysis = (
    response: unknown,
    formValues: { skinType?: string }
  ) => {
    setShowConsultationConfirmed(true);

    if (consultationWebhookFiredRef.current) return;
    consultationWebhookFiredRef.current = true;

    const analysisFields = extractScanAnalysisFields(response);
    const sessUser = session?.user as Record<string, unknown> | undefined;
    const phone = String(
      sessUser?.mobileNumber ||
        sessUser?.phoneNumber ||
        sessUser?.phone ||
        resolvedUserId ||
        ""
    );

    const sendWebhook = (machineName: string, machineLocation: string) => {
      void sendConsultationWebhook({
        user: {
          userId: resolvedUserId,
          name: typeof sessUser?.name === "string" ? sessUser.name : "",
          email: typeof sessUser?.email === "string" ? sessUser.email : "",
          phone,
        },
        preferredTime: preferredTimeLabel || preferredTime,
        detectedAttributes: analysisFields.detectedAttributes,
        keyConcerns: analysisFields.highRecommendation,
        skinType: formValues?.skinType || analysisFields.skinType,
        machineName,
        machineLocation,
      });
    };

    fetch("/api/admin/machine-name")
      .then((res) => res.json())
      .then((machineData) => {
        sendWebhook(
          (machineData?.success && machineData.machineName) ||
            process.env.NEXT_PUBLIC_MACHINE_NAME ||
            "Vending Machine",
          (machineData?.success && machineData.machineLocation) ||
            process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
            "LeafWater Vending Machine"
        );
      })
      .catch(() => {
        sendWebhook(
          process.env.NEXT_PUBLIC_MACHINE_NAME || "Vending Machine",
          process.env.NEXT_PUBLIC_MACHINE_LOCATION || "LeafWater Vending Machine"
        );
      });
  };

  const extractFaceWithForehead = async (
    imageElement: any,
    detection: any,
    landmarks: any
  ) => {
    const { box } = detection;
    // Get forehead landmarks
    const foreheadLandmarks = landmarks.positions.slice(17, 35); // Eyebrow landmarks
    // Calculate the highest point of the eyebrows
    const eyebrowTop = Math.min(
      ...foreheadLandmarks.map((point: any) => point.y)
    );
    // Calculate additional forehead space (50% more above eyebrows)
    const foreheadExtension = box.height * 0.3; // Adjust this value to increase/decrease forehead space
    // Create new box dimensions
    const newBox = {
      x: box.x,
      y: Math.max(0, eyebrowTop - foreheadExtension), // Ensure we don't go outside the image
      width: box.width,
      height: box.height + (box.y - (eyebrowTop - foreheadExtension)),
    };
    // Extract face with extended forehead
    const regionsToExtract = [
      new faceapi.Rect(newBox.x, newBox.y, newBox.width, newBox.height),
    ];
    let faceImages = await faceapi.extractFaces(imageElement, regionsToExtract);
    if (faceImages.length === 0) {
      return;
    }

    // Convert to data URL
    const faceCanvas = faceImages[0];
    const croppedFaceUrl = faceCanvas.toDataURL() as any;
    setCroppedFace(croppedFaceUrl);
    return newBox;
  };

  const processImage = async () => {
    if (!image || !imageRef.current || !modelsReadyRef.current) return;

    // Clear previous results
    if (canvasRef.current) {
      canvasRef.current
        .getContext("2d")
        .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    try {
      // Detect face with landmarks
      const detection = await faceapi
        .detectSingleFace(
          imageRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks();

      if (detection) {
        // Get display size
        const displaySize = {
          width: imageRef.current.width,
          height: imageRef.current.height,
        };

        // Match canvas dimensions
        faceapi.matchDimensions(canvasRef.current, displaySize);

        // Extract face with extended forehead
        const newBox = await extractFaceWithForehead(
          imageRef.current,
          detection.detection,
          detection.landmarks
        );

        // Draw detection box (optional)
        if (newBox) {
          const drawBox = new faceapi.Box(newBox);
          const resizedBox = faceapi.resizeResults(drawBox, displaySize);
          const drawOptions = {
            label: "Face",
            boxColor: "blue",
          };
          new faceapi.draw.DrawBox(resizedBox, drawOptions).draw(
            canvasRef.current
          );
        }
      } else {
        setSkinAttributeStatus({
          type: "ERROR",
          message: "No Face Detected!",
        });
      }
    } catch (error) {
      setSkinAttributeStatus({
        type: "ERROR",
        message: "Error processing image Please try again...",
      });
    }
  };

  const handleConvertBase64toJpeg = (
    base64String: string,
    filename: string
  ) => {
    if (base64String.startsWith("data:")) {
      var arr: any = base64String.split(","),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[arr.length - 1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      var file = new File([u8arr], filename, { type: mime });
      return Promise.resolve(file);
    }
    return fetch(base64String)
      .then((res) => res.arrayBuffer())
      .then((buf) => new File([buf], filename, { type: mime }));
  };

  const clearAnalysisRequest = () => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    analysisAbortRef.current?.abort();
    analysisAbortRef.current = null;
  };

  const failSkinAnalysis = (requestId: number, message: string) => {
    if (requestId !== analysisRequestIdRef.current) return;
    clearAnalysisRequest();
    setIsAutoAnalyzing(false);
    setSkinAttributeStatus({ type: "ERROR", message });
    speakMessage("error", message);
  };

  const startSkinAnalysis = (fileName?: string, imageUrl?: string) => {
    const formValues = getValues();
    if (!resolvedUserId) {
      router.push("/questionnaire");
      return;
    }
    const resolvedFileName = fileName || (session?.user?.selfyImage as string);
    if (!resolvedFileName) {
      setIsAutoAnalyzing(false);
      setSkinAttributeStatus({
        type: "ERROR",
        message: "No selfie found. Please retake your photo.",
      });
      return;
    }

    const requestId = ++analysisRequestIdRef.current;
    clearAnalysisRequest();
    setSkinAttributeStatus(null);
    setIsAutoAnalyzing(true);

    const request = getRecommnedSkinAttributes({
      userId: resolvedUserId,
      fileName: resolvedFileName,
      skinType: formValues?.skinType as string,
    });
    analysisAbortRef.current = request;

    analysisTimeoutRef.current = setTimeout(() => {
      request.abort?.();
      failSkinAnalysis(requestId, FRIENDLY_TIMEOUT_ERROR);
    }, ANALYSIS_TIMEOUT_MS);

    request
      .then((response: any) => {
        if (requestId !== analysisRequestIdRef.current) return;
        const aborted =
          response?.error?.name === "AbortError" ||
          /abort/i.test(String(response?.error?.message || ""));
        if (aborted) return;
        console.log("Skin analysis response:", response);
        const errorMessage = getRecommendSkinCareError(response);
        if (errorMessage) {
          failSkinAnalysis(requestId, errorMessage);
          return;
        }

        clearAnalysisRequest();
        setIsAutoAnalyzing(false);
        update({
          ...session,
          user: {
            ...session?.user,
            selfyImage: resolvedFileName,
            selfyImagePath: imageUrl || (session?.user as any)?.selfyImagePath,
            skinTypes: formValues?.skinType?.replace("_", " "),
          },
        });
        setSkinAttributeStatus({
          type: "SUCCESS",
          message: response?.data?.message || "Analysis completed successfully!",
        });

        if (consultationFlow) {
          completeConsultationAfterAnalysis(response, formValues);
          return;
        }

        try {
          const analysisFields = extractScanAnalysisFields(response);
          fetch("/api/admin/scans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: resolvedUserId,
              imageUrl: imageUrl || (session?.user as any)?.selfyImagePath,
              localCapturedImage: resolvedFileName,
              skinType: formValues?.skinType,
              detectedAttributes: analysisFields.detectedAttributes,
              recommendedProducts: {
                highRecommendation: analysisFields.highRecommendation,
              },
            }),
          }).catch((err) => console.warn("Failed to save scan to local DB:", err));

          const sessUser = session?.user as any;
          const scanWebhookPayload = {
            name: sessUser?.name as string,
            email: sessUser?.email as string,
            phone: (sessUser?.mobileNumber ||
              sessUser?.phoneNumber ||
              sessUser?.phone) as string,
            userId: resolvedUserId,
            skinType: (formValues?.skinType as string) || analysisFields.skinType,
            detectedAttributes: analysisFields.detectedAttributes,
            highRecommendation: analysisFields.highRecommendation,
          };

          const dispatchScanWebhook = (machineName: string, machineLocation: string) => {
            void sendScanCompletedWebhook({
              ...scanWebhookPayload,
              machineName,
              machineLocation,
            });
          };

          fetch("/api/admin/machine-name")
            .then((res) => res.json())
            .then((machineData) => {
              dispatchScanWebhook(
                (machineData?.success && machineData.machineName) ||
                  process.env.NEXT_PUBLIC_MACHINE_NAME ||
                  "Vending Machine",
                (machineData?.success && machineData.machineLocation) ||
                  process.env.NEXT_PUBLIC_MACHINE_LOCATION ||
                  "LeafWater Vending Machine"
              );
            })
            .catch((err) => {
              console.error("[TakeSelfie] Failed to fetch machine settings:", err);
              dispatchScanWebhook(
                process.env.NEXT_PUBLIC_MACHINE_NAME || "Vending Machine",
                process.env.NEXT_PUBLIC_MACHINE_LOCATION || "LeafWater Vending Machine"
              );
            });
        } catch (postAnalysisError) {
          console.warn("[TakeSelfie] Post-analysis webhook/DB step failed:", postAnalysisError);
        }
      })
      .catch((error) => {
        if (requestId !== analysisRequestIdRef.current) return;
        const isAbort =
          error?.name === "AbortError" ||
          /abort/i.test(String(error?.message || ""));
        if (isAbort) return;
        console.error("Skin analysis error:", error);
        failSkinAnalysis(
          requestId,
          getRecommendSkinCareError({ error }) || FRIENDLY_ANALYSIS_ERROR
        );
      });
  };

  const handleSkinAnalysis = () => {
    startSkinAnalysis();
  };

  const handleGetSkinRecommendations = () => {
    speakMessage('kioskReport');
    router.push(APP_ROUTES.KIOSK_REPORT);
  };

  // handle captured Image
  const handleAutoCaptured = (base64String: string) => {
    setOpenCamera(false);
    setImage(base64String);
  };

  // handle captured Image
  const handleUploadToServer = async (base64String: string) => {
    try {
      if (autoAnalyzeTimerRef.current) {
        clearTimeout(autoAnalyzeTimerRef.current);
        autoAnalyzeTimerRef.current = null;
      }

      if (!resolvedUserId) {
        console.error("Missing userId for upload (session)");
        setCroppedFace(null);
        router.push("/questionnaire");
        return;
      }
      const getSignedUrl: any = await getSignedUploadUrl({
        fileName: `${Date.now()}.jpeg`,
        contentType: "image/jpeg",
        userId: resolvedUserId,
      });
      if (getSignedUrl?.data?.data) {
        const fileName = getSignedUrl?.data?.data?.fileName as string;
        const file = await handleConvertBase64toJpeg(
          base64String,
          fileName
        );
        const axiosResponse = axios.put(getSignedUrl?.data?.data?.url, file, {
          headers: {
            "Content-Type": "image/jpeg",
          },
          onUploadProgress(progressEvent: any) {
            setIsImageUploading(true);
            const { loaded, total } = progressEvent;
            if (total) {
              let percent = Math.floor((loaded * 100) / total);
              if (percent <= 100) {
                console.log(percent);
              }
            }
          },
        });
        const _res = await axiosResponse;
        if (_res) {
          setCroppedFace(null);
          setIsImageUploading(false);
          // Update session with the new image
          await update({
            ...session,
            user: {
              ...session?.user,
              selfyImage: fileName,
              selfyImagePath: _res?.config?.url,
            },
          });
          // Auto-start skin analysis after successful upload
          autoAnalyzeTimerRef.current = setTimeout(() => {
            startSkinAnalysis(fileName, _res?.config?.url);
          }, 2000);
        }
      }
    } catch (error) {
      setCroppedFace(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      setInitializing(true);
      setModelsReady(false);
      modelsReadyRef.current = false;

      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        if (cancelled) return;
        modelsReadyRef.current = true;
        setModelsReady(true);
      } catch (e) {
        console.error("Error loading face detection models:", e);
        if (!cancelled) {
          setSkinAttributeStatus({
            type: "ERROR",
            message: "Failed to load face detection. Please refresh and try again.",
          });
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const resolvedFileName = session?.user?.selfyImage as string;
    if (resolvedUserId && resolvedFileName) {
      getUploadImageInfo({
        fileName: resolvedFileName,
        userId: resolvedUserId,
      });
    }
  }, [resolvedUserId, session?.user?.selfyImage]);

  useEffect(() => {
    if (croppedFace) {
      handleUploadToServer(croppedFace);
    }
  }, [croppedFace]);

  return (
    <PageBackground showGreenCurve>
      {/* Top Header with Back Arrow and Logo */}
      <Box
        sx={{
          position: "fixed",
          top: 10,
          left: 12,
          right: 12,
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            bgcolor: "#ffffff",
            borderRadius: 2,
            boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
          }}
        >
          <IconButton
            onClick={() => router.back()}
            sx={{
              border: "1px solid #e5e7eb",
              borderRadius: "50%",
              width: 48,
              height: 48,
            }}
          >
            <ArrowBack sx={{ color: "#111827" }} />
          </IconButton>

          <Box
            onClick={() => router.push(APP_ROUTES.HOME)}
            sx={{ position: "relative", width: 270, height: 69, cursor: "pointer" }}
          >
            <Image
              src="/wending/goldlog.svg"
              alt="Leaf Water Logo"
              fill
              sizes="280px"
              style={{ objectFit: "contain" }}
            />
          </Box>
        </Box>
      </Box>

      <StyledTakeSelfie disableGutters maxWidth="xl" sx={{ pt: 12 }}>
        {/* {isUpMdDevice && <SideMenuComponent />} */}

        {!openCamera && (
          <Box
            // style={{ backgroundImage: `url(/images/homeBg_1.png)` }}
            component="div"
            className="photo-wrapper"
          >
            {(() => {
              const previewUrl = dataImageInfo?.data?.url || image;
              return (
                <>
            {(isImageUploading ||
              (isLoadingImageInfo && !dataImageInfo?.data?.url && !isAutoAnalyzing && !image)) && (
              <LoadingComponent />
            )}
            {!isImageUploading &&
              (!isLoadingImageInfo || isAutoAnalyzing) &&
              previewUrl && (
                <Fragment>
                  <Box
                    sx={{ backgroundImage: `url(${previewUrl})` }}
                    component="div"
                    className="selfy_image"
                  >
                    {skinAttributeStatus?.type === "ERROR" && !skinAttributeStatus?.overlayHidden && (
                      <Box component="div" className="errorInfo">
                        <Icon width={55} color="white" icon="bx:error" />
                        <Typography variant="body1" textAlign="center" sx={{ px: 2, fontSize: "18px !important" }}>
                          {typeof skinAttributeStatus?.message === "string"
                            ? skinAttributeStatus.message
                            : FRIENDLY_ANALYSIS_ERROR}
                        </Typography>
                        <Button
                          size="small"
                          color="milkWhite"
                          variant="outlined"
                          sx={{ minWidth: 50 }}
                          fullWidth={false}
                          onClick={() =>
                            setSkinAttributeStatus((prev: any) =>
                              prev ? { ...prev, overlayHidden: true } : prev
                            )
                          }
                        >
                          Ok
                        </Button>
                      </Box>
                    )}
                    {skinAttributeStatus?.type === "SUCCESS" && (
                      <Box component="div" className="successInfo">
                        <Icon
                          width={55}
                          color="white"
                          icon="clarity:success-standard-line"
                        />
                        <Typography variant="body1" textAlign="center">
                          {skinAttributeStatus?.message}
                        </Typography>
                        {/* <Button
                          size="small"
                          color="milkWhite"
                          variant="outlined"
                          sx={{ minWidth: 50 }}
                          fullWidth={false}
                          onClick={() => setSkinAttributeStatus(null)}
                        >
                          Ok
                        </Button> */}
                      </Box>
                    )}
                    {(isLoadingSkinAttributes || isAutoAnalyzing) &&
                      skinAttributeStatus?.type !== "ERROR" &&
                      skinAttributeStatus?.type !== "SUCCESS" && (
                      <AnalysisLoader />
                    )}
                  </Box>
                  {skinAttributeStatus?.type &&
                    (skinAttributeStatus.type === "ERROR" ||
                      (!isLoadingSkinAttributes && !isAutoAnalyzing)) && (
                    <Box
                      mt={3}
                      sx={{
                        width: "var(--selfiePreviewWidth)",
                        mx: "auto",
                      }}
                    >
                      {/* Hidden skin type selector - keeping functionality intact */}
                      <Box mb={2} sx={{ display: "none" }}>
                        <SelectInputFieldComponent
                          id="skintype"
                          name="skinType"
                          displayLabelName="name"
                          targetValue="_id"
                          control={control}
                          defaultValue="NORMAL_SKIN"
                          label=""
                          options={skinTypes}
                        />
                      </Box>
                      {/* Only show button after analysis completes (SUCCESS or ERROR) */}
                      {skinAttributeStatus?.type === "SUCCESS" && !consultationFlow && (
                        <Button
                          color="primary"
                          fullWidth
                          onClick={handleGetSkinRecommendations}
                        >
                          Get Our Recommendations
                        </Button>
                      )}
                      {skinAttributeStatus?.type === "ERROR" && (
                        <Button
                          color="secondary"
                          fullWidth
                          onClick={handleSkinAnalysis}
                        >
                          Retry Analysis
                        </Button>
                      )}
                      {/* Retake Button - only show after analysis completes */}
                      {(skinAttributeStatus?.type === "SUCCESS" || skinAttributeStatus?.type === "ERROR") && (
                        <Button
                          color="inherit"
                          variant="outlined"
                          fullWidth
                          sx={{ mt: 2, borderColor: "#9ca3af", color: "#1a1a1a" }}
                          onClick={() => {
                            analysisRequestIdRef.current += 1;
                            clearAnalysisRequest();
                            if (autoAnalyzeTimerRef.current) {
                              clearTimeout(autoAnalyzeTimerRef.current);
                              autoAnalyzeTimerRef.current = null;
                            }
                            setIsAutoAnalyzing(false);
                            setSkinAttributeStatus(null);
                            setOpenCamera(true);
                          }}
                        >
                          Retake Photo
                        </Button>
                      )}
                    </Box>
                  )}
                </Fragment>
              )}
            {!isImageUploading &&
              !isLoadingImageInfo &&
              !previewUrl && (
                <Fragment>
                  <IconButton
                    onClick={() => {
                      setOpenCamera(true);
                    }}
                  >
                    <Icon width={100} icon="bxs:camera" />
                  </IconButton>
                  <Typography textAlign="center">
                    Click camera icon and take selfie
                  </Typography>
                </Fragment>
              )}
                </>
              );
            })()}
          </Box>
        )}
        {openCamera && (
          <ARCameraComponent
            autoStart={true}
            initializing={initializing}
            modelsReady={modelsReady}
            disabledSkipBtn={!dataImageInfo}
            onSkip={() => {
              setOpenCamera(!openCamera);
            }}
            onCaptured={handleAutoCaptured}
          />
        )}
        {image && (
          <div hidden={true} className="image-container">
            {image && (
              <div hidden={true} className="original-image">
                <h3 hidden={true}>Original Image</h3>
                <div style={{ position: "relative" }}>
                  <img
                    ref={imageRef}
                    src={image}
                    alt="Original"
                    onLoad={processImage}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </StyledTakeSelfie>
      {showConsultationConfirmed && (
        <ConsultationConfirmed
          phone={String(
            (session?.user as any)?.mobileNumber ||
              (session?.user as any)?.phoneNumber ||
              (session?.user as any)?.phone ||
              resolvedUserId ||
              ""
          )}
          preferredTimeLabel={preferredTimeLabel}
          onGoHome={() => router.push(APP_ROUTES.HOME)}
        />
      )}
    </PageBackground>
  );
};

export default TakeSelfie;
