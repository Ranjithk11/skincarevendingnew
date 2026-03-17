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
import { useRouter } from "next/navigation";
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
import { useVoiceMessages } from "@/contexts/VoiceContext";

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
  const [initializing, setInitializing] = useState(false);
  const [croppedFace, setCroppedFace] = useState(null);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState<boolean>(false);
  const [openCamera, setOpenCamera] = useState<boolean>(true);
  const [image, setImage] = useState<any>(null);
  const imageRef = useRef<any>();
  const canvasRef = useRef<any>();
  const autoAnalyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/questionnaire");
    }
  }, [router, status]);

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
      speakMessage("analysisCompleteClickRecommendations");
      return;
    }

    hasAnnouncedAnalysisSuccessRef.current = false;
  }, [skinAttributeStatus?.type, speakMessage]);

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
    if (!image || !imageRef.current) return;

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

  const handleSkinAnalysis = () => {
    const formValues = getValues();
    if (!resolvedUserId) {
      router.push("/questionnaire");
      return;
    }
    getRecommnedSkinAttributes({
      userId: resolvedUserId,
      fileName: session?.user?.selfyImage as string,
      skinType: formValues?.skinType as string,
    })
      .then((response: any) => {
        if (response?.error?.data?.error) {
          setSkinAttributeStatus({
            type: "ERROR",
            message: response?.error?.data?.error,
          });
        } else {
          update({
            ...session,
            user: {
              ...session?.user,
              skinTypes: formValues?.skinType?.replace("_", " "),
            },
          });
          setSkinAttributeStatus({
            type: "SUCCESS",
            message: response?.data?.message,
          });
        }
      })
      .catch((error) => {});
  };

  const handleGetSkinRecommendations = () => {
    speakMessage('recommendations');
    router.push(APP_ROUTES.RECOMMENDATIONS);
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
          const formValues = getValues();

          autoAnalyzeTimerRef.current = setTimeout(() => {
            setIsAutoAnalyzing(true);
            speakMessage('analyzing');
            getRecommnedSkinAttributes({
              userId: resolvedUserId,
              fileName: fileName,
              skinType: formValues?.skinType as string,
            })
              .then((response: any) => {
                console.log("Skin analysis response:", response);
                setIsAutoAnalyzing(false);
                if (response?.error?.data?.error) {
                  setSkinAttributeStatus({
                    type: "ERROR",
                    message: response?.error?.data?.error,
                  });
                } else if (response?.error) {
                  setSkinAttributeStatus({
                    type: "ERROR",
                    message: response?.error?.message || "Analysis failed",
                  });
                } else {
                  update({
                    ...session,
                    user: {
                      ...session?.user,
                      selfyImage: fileName,
                      selfyImagePath: _res?.config?.url,
                      skinTypes: formValues?.skinType?.replace("_", " "),
                    },
                  });
                  setSkinAttributeStatus({
                    type: "SUCCESS",
                    message: response?.data?.message || "Analysis completed successfully!",
                  });
                  
                  // Save scan record to local SQLite database
                  try {
                    fetch('/api/admin/scans', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: resolvedUserId,
                        imageUrl: _res?.config?.url,
                        localCapturedImage: fileName,
                        skinType: formValues?.skinType,
                        detectedAttributes: response?.data?.detected_attributes || response?.data?.detectedAttributes,
                        analysisAiSummary: response?.data?.analysis_ai_summary || response?.data?.analysisAiSummary,
                        recommendedProducts: response?.data?.recommended_products || response?.data?.recommendedProducts,
                      }),
                    }).catch(err => console.warn('Failed to save scan to local DB:', err));
                  } catch (localDbError) {
                    console.warn('Failed to save scan to local DB:', localDbError);
                  }
                }
              })
              .catch((error) => {
                console.error("Auto skin analysis error:", error);
                setIsAutoAnalyzing(false);
                setSkinAttributeStatus({
                  type: "ERROR",
                  message: "Analysis failed. Please try again.",
                });
              });
          }, 2000);
        }
      }
    } catch (error) {
      setCroppedFace(null);
    }
  };

  useEffect(() => {
    const loadModels = async () => {
      setInitializing(true);
      Promise.all([
        faceapi.nets.tinyFaceDetector.load("/models"),
        faceapi.nets.faceLandmark68Net.load("/models"),
        faceapi.nets.faceRecognitionNet.load("/models"),
      ])
        .then(() => setInitializing(false))
        .catch((e) => console.error("Error loading models:", e));
    };
    loadModels();
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
                    {skinAttributeStatus?.type === "ERROR" && (
                      <Box component="div" className="errorInfo">
                        <Icon width={55} color="white" icon="bx:error" />
                        <Typography variant="body1" textAlign="center">
                          {skinAttributeStatus?.message}
                        </Typography>
                        <Button
                          size="small"
                          color="milkWhite"
                          variant="outlined"
                          sx={{ minWidth: 50 }}
                          fullWidth={false}
                          onClick={() => setSkinAttributeStatus(null)}
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
                    {(isLoadingSkinAttributes || isAutoAnalyzing) && (
                      <div className="ocrloader">
                        <p>Analysing...</p>
                        <em></em>
                        <span></span>
                      </div>
                    )}
                  </Box>
                  {!isLoadingSkinAttributes && !isAutoAnalyzing && (
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
                      {skinAttributeStatus?.type === "SUCCESS" && (
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
    </PageBackground>
  );
};

export default TakeSelfie;
