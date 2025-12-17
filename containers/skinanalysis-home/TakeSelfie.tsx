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

const StyledTakeSelfie = styled(Container)(({ theme }) => ({
  flexGrow: 1,
  display: "flex",
  alignItems: "stretch",

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
      width: 280,
      height: 330,
      borderRadius: "10px",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      "& .camera_icon": {
        position: "absolute",
        right: 20,
        bottom: 20,
        width: 40,
        height: 40,
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
      width: 280,
      height: 330,
      borderRadius: "10px",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      "& .camera_icon": {
        position: "absolute",
        right: 20,
        bottom: 20,
        width: 40,
        height: 40,
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
      width: 280,
      height: 330,
      borderRadius: "10px",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      "& .camera_icon": {
        position: "absolute",
        right: 20,
        bottom: 20,
        width: 40,
        height: 40,
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
  const [initializing, setInitializing] = useState(false);
  const [croppedFace, setCroppedFace] = useState(null);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [openCamera, setOpenCamera] = useState<boolean>(true);
  const [image, setImage] = useState<any>(null);
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [localSelfyImage, setLocalSelfyImage] = useState<string | null>(null);
  const imageRef = useRef<any>();
  const canvasRef = useRef<any>();
  const theme = useTheme();
  const isUpMdDevice = useMediaQuery(theme.breakpoints.up("md"));

  const [skinAttributeStatus, setSkinAttributeStatus] = useState<any>(null);
  const { control, getValues } = useForm({
    mode: "all",
  });
  const router = useRouter();

  const [getRecommnedSkinAttributes, { isLoading: isLoadingSkinAttributes }] =
    useGetRecommnedSkinAttributesMutation();

  const [
    getUploadImageInfo,
    { data: dataImageInfo, isLoading: isLoadingImageInfo },
  ] = useGetUploadImageInfoMutation();
  const [getSignedUploadUrl] = useGetSignedUploadUrlMutation();
  const { data: session, update } = useSession();
  useEffect(() => {}, []);

  useEffect(() => {
    try {
      setLocalUserId(localStorage.getItem("leafwater_userId"));
      setLocalSelfyImage(localStorage.getItem("leafwater_selfyImage"));
    } catch {
      setLocalUserId(null);
      setLocalSelfyImage(null);
    }
  }, []);

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
    getRecommnedSkinAttributes({
      userId: (session?.user?.id as string) || (localUserId as string),
      fileName:
        (session?.user?.selfyImage as string) || (localSelfyImage as string),
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
      const resolvedUserId =
        (session?.user?.id as string) || (localUserId as string) || "";
      if (!resolvedUserId) {
        console.error("Missing userId for upload (session/localStorage)");
        setCroppedFace(null);
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
          try {
            if (fileName) localStorage.setItem("leafwater_selfyImage", fileName);
          } catch {}
          update({
            ...session,
            user: {
              ...session?.user,
              selfyImage: _res?.config?.data?.name,
              selfyImagePath: _res?.config?.url,
            },
          });
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
    const resolvedUserId = (session?.user?.id as string) || (localUserId as string);
    const resolvedFileName =
      (session?.user?.selfyImage as string) || (localSelfyImage as string);
    if (resolvedUserId && resolvedFileName) {
      getUploadImageInfo({
        fileName: resolvedFileName,
        userId: resolvedUserId,
      });
    }
  }, [session?.user?.selfyImage, session?.user?.id, localUserId, localSelfyImage]);

  useEffect(() => {
    if (croppedFace) {
      handleUploadToServer(croppedFace);
    }
  }, [croppedFace]);

  return (
    <StyledTakeSelfie disableGutters maxWidth="xl">
      {/* {isUpMdDevice && <SideMenuComponent />} */}

      {!openCamera && (
        <Box
          style={{ backgroundImage: `url(/images/homeBg_1.png)` }}
          component="div"
          className="photo-wrapper"
        >
          {(isImageUploading ||
            (isLoadingImageInfo && !dataImageInfo?.data?.url)) && (
            <LoadingComponent />
          )}
          {!isImageUploading &&
            !isLoadingImageInfo &&
            dataImageInfo?.data?.url && (
              <Fragment>
                <Box
                  sx={{ backgroundImage: `url(${dataImageInfo?.data?.url})` }}
                  component="div"
                  className="selfy_image"
                >
                  <Card component="div" className="camera_icon">
                    <IconButton
                      onClick={() => {
                        setSkinAttributeStatus(null);
                        setOpenCamera(true);
                      }}
                      color="primary"
                    >
                      <Icon width={20} icon="bxs:camera" />
                    </IconButton>
                  </Card>
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
                  {isLoadingSkinAttributes && (
                    <div className="ocrloader">
                      <p>Analysing...</p>
                      <em></em>
                      <span></span>
                    </div>
                  )}
                </Box>
                {!isLoadingSkinAttributes && (
                  <Box mt={3}>
                    <Box mb={2}>
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
                    <Button
                      color={
                        skinAttributeStatus?.type === "SUCCESS"
                          ? "primary"
                          : "secondary"
                      }
                      onClick={() => {
                        if (skinAttributeStatus?.type === "SUCCESS") {
                          handleGetSkinRecommendations();
                        } else {
                          handleSkinAnalysis();
                        }
                      }}
                    >
                      {skinAttributeStatus?.type === "SUCCESS"
                        ? "Get Our Recommendations"
                        : "Start Skin Analysis"}
                    </Button>
                  </Box>
                )}
              </Fragment>
            )}
          {!isImageUploading &&
            !isLoadingImageInfo &&
            !dataImageInfo?.data?.url && (
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
        </Box>
      )}
      {openCamera && (
        <ARCameraComponent
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
  );
};

export default TakeSelfie;
