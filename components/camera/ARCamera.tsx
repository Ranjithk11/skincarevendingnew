import React, { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import { Box, Grid, Typography, styled } from "@mui/material";
import { Icon } from "@iconify/react";
import * as faceapi from "face-api.js";

const StyledCameraCapture = styled(Box)(({ theme }) => ({
  padding: 0,
  boxSizing: "border-box",
  overflow: "hidden",
  position: "relative",
}));

const StyledARCameraComponent = styled(Box)(({ theme }) => ({
  // height: `calc(100vh - ${APP_BAR_SIZE}px)`,
  // width: "60%",
  // display: "flex",
  // flexDirection: "column",
  // padding: 20,
  // [theme.breakpoints.only("xs")]: {
  //   padding: 0,
  //   width: "100%",
  //   height: `calc(100vh - ${56}px)`,
  // },
  // "& .camera_capture_view": {
  //   flex: 1,
  //   width: "100%",
  //   position: "relative",
  //   overflow: "hidden",
  //   borderRadius: 20,
  //   backgroundColor: theme.palette.secondary.main,
  //   [theme.breakpoints.only("xs")]: {
  //     borderRadius: 0,
  //   },
  //   "& .info_view": {
  //     width: "100%",
  //     height: "100%",
  //     display: "flex",
  //     flexDirection: "column",
  //     alignItems: "center",
  //     justifyContent: "center",
  //     backgroundColor: theme.palette.secondary.main,
  //     "& .MuiTypography-body1": {
  //       color: theme.palette.common.white,
  //       fontSize: 18,
  //       width: "55%",
  //       lineHeight: 1.3,
  //       textAlign: "center",
  //       [theme.breakpoints.only("xs")]: {
  //         fontSize: 18,
  //         width: "95%",
  //       },
  //     },
  //     "& svg": {
  //       fontSize: 120,
  //       [theme.breakpoints.only("xs")]: {
  //         fontSize: 100,
  //       },
  //     },
  //   },
  //   "& .camera_view": {
  //     width: "100%",
  //     height: "100%",
  //   },
  //   "& .footer": {
  //     display: "none",
  //     position: "absolute",
  //     width: "100%",
  //     bottom: 40,
  //     "& .MuiButtonBase-root": {
  //       minWidth: 0,
  //     },
  //     [theme.breakpoints.only("xs")]: {
  //       padding: 10,
  //       display: "block",
  //     },
  //   },
  // },
  // "& .camera_view_footer": {
  //   minHeight: 70,
  //   maxHeight: 70,
  //   width: "100%",
  //   display: "flex",
  //   flexDirection: "column",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   "& .MuiButtonBase-root": {
  //     minWidth: 0,
  //   },
  //   [theme.breakpoints.only("xs")]: {
  //     padding: 10,
  //     display: "none",
  //   },
  // },
}));

interface ARCameraComponentProps {
  onCaptured: (file: any) => void;
  onSkip: () => void;
  disabledSkipBtn?: boolean;
  initializing: boolean;
  autoStart?: boolean;
}

const ARCameraComponent = ({
  onCaptured,
  onSkip,
  disabledSkipBtn,
  initializing,
  autoStart = false,
}: ARCameraComponentProps) => {
  const [isCamOpen, setIsCamOpen] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const refAccessFiles = useRef<HTMLInputElement>(null);
  const hasAutoStartedRef = useRef(false);
  const faceDetectionIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isCapturingRef = useRef(false);

  useEffect(() => {
    return () => {
      try {
        if (faceDetectionIntervalRef.current !== null) {
          window.clearInterval(faceDetectionIntervalRef.current);
          faceDetectionIntervalRef.current = null;
        }
        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      } catch {}
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    if (videoRef.current) {
      try {
        (videoRef.current as any).srcObject = null;
      } catch {}
    }
  };

  async function handleTakePicture() {
    if (isCamOpen) return;
    setIsCamOpen(true);
    isCapturingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        (videoRef.current as any).srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      stopCamera();
      setIsCamOpen(false);
    }
  }

  const handleUploadFiles = async (event: any) => {
    let file = event?.target?.files[0];
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      onCaptured(reader.result);
    };
    reader.onerror = function (error) {
      alert("Something wrong please try again...");
    };
  };

  useEffect(() => {
    if (!autoStart) return;
    if (initializing) return;
    if (isCamOpen) return;
    if (hasAutoStartedRef.current) return;

    hasAutoStartedRef.current = true;
    handleTakePicture();
  }, [autoStart, initializing, isCamOpen]);

  useEffect(() => {
    if (!isCamOpen) {
      setCountdownSeconds(null);
      setFaceDetected(false);

      stopCamera();

      if (faceDetectionIntervalRef.current !== null) {
        window.clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    const detectFace = async () => {
      try {
        const video = videoRef.current;
        if (!video) {
          setFaceDetected(false);
          return;
        }

        if (video.readyState < 2) {
          setFaceDetected(false);
          return;
        }

        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            scoreThreshold: 0.5,
          })
        );

        setFaceDetected(!!detection);
      } catch {
        setFaceDetected(false);
      }
    };

    detectFace();
    faceDetectionIntervalRef.current = window.setInterval(detectFace, 250);

    return () => {
      if (faceDetectionIntervalRef.current !== null) {
        window.clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
    };
  }, [isCamOpen]);

  useEffect(() => {
    if (!isCamOpen) return;

    if (!faceDetected) {
      setCountdownSeconds(null);
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    if (countdownIntervalRef.current !== null) return;

    setCountdownSeconds(5);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [faceDetected, isCamOpen]);

  useEffect(() => {
    if (!isCamOpen) return;
    if (!faceDetected) return;
    if (countdownSeconds !== 0) return;
    if (isCapturingRef.current) return;

    const capture = async () => {
      try {
        isCapturingRef.current = true;
        const video = videoRef.current;
        if (!video) return;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) return;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.92);
        stopCamera();
        onCaptured(base64 as any);
        setIsCamOpen(false);
      } finally {
        isCapturingRef.current = false;
      }
    };

    capture();
  }, [countdownSeconds, faceDetected, isCamOpen, onCaptured]);

  return (
    <>
      {!isCamOpen && (
        <Box
          component="div"
          className="scanning-section"
        >
          <Box pt={2}>
            <Grid container spacing={6}>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ color: "white" }}>
                  Take a selfie and receive your <br />
                  personal recommendations
                </Typography>
              </Grid>
              <Grid
                container
                alignItems="center"
                justifyContent="center"
                item
                spacing={3}
                xs={12}
              >
                <Grid item>
                  <Button
                    disabled={initializing}
                    sx={{ backgroundColor: "#3AC862" }}
                    endIcon={<Icon icon="material-symbols:camera" />}
                    onClick={() => {
                      if (isCamOpen) {
                        return null;
                      } else {
                        handleTakePicture();
                      }
                    }}
                  >
                    Take Selfie
                  </Button>
                </Grid>
                {/* <Grid item>
                  <Button
                    disabled={initializing}
                    sx={{ backgroundColor: "#48C2DD" }}
                    onClick={() => {
                      if (isCamOpen) {
                        return null;
                      } else {
                        refAccessFiles?.current?.click();
                      }
                    }}
                    endIcon={
                      <Icon icon="material-symbols:backup-outline-rounded" />
                    }
                    color="primary"
                  >
                    Gallery
                  </Button>
                </Grid> */}
              </Grid>
              <Grid
                container
                alignItems="center"
                justifyContent="center"
                item
                xs={12}
              >
                <Box
                  sx={{
                    maxWidth: 300,
                    backgroundColor: "#464646C9",
                    color: "white",
                    textAlign: "center",
                  }}
                  padding={1}
                >
                  Please stand in a well lit area with as few objects as
                  possible.
                </Box>
              </Grid>
              
            </Grid>
          </Box>
          <input
            ref={refAccessFiles}
            type="file"
            accept="image/*"
            hidden
            onChange={handleUploadFiles}
          />
        </Box>
      )}
      {isCamOpen && (
        <StyledCameraCapture
          component="div"
          className="scanning-section"
          sx={{
            m: 0,
            borderRadius: 0,
            height: "100dvh",
          }}
        >
          <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
            <Box
              component="video"
              ref={videoRef}
              muted
              playsInline
              autoPlay
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                backgroundColor: "black",
              }}
            />

            <Box
              sx={{
                position: "absolute",
                top: 16,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 3,
                px: 2,
              }}
            >
              <Box
                sx={{
                  maxWidth: 520,
                  width: "100%",
                  borderRadius: 999,
                  bgcolor: "rgba(0,0,0,0.55)",
                  color: "#66eb13ff",
                  textAlign: "center",
                  py: 2,
                  px: 2,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
                }}
              >
                <Typography sx={{ fontSize: 28, fontWeight: 400, lineHeight: 1.2 }}>
                  Please keep your face straight and look directly at the camera.
                </Typography>
              </Box>
            </Box>
          </Box>
          {countdownSeconds !== null && countdownSeconds > 0 && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: "999px",
                  backgroundColor: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="h2"
                  sx={{ color: "white", fontWeight: 700, lineHeight: 1 }}
                >
                  {countdownSeconds}
                </Typography>
              </Box>
            </Box>
          )}
        </StyledCameraCapture>
      )}
    </>
    // <StyledARCameraComponent>
    //   <Box component="div" className="camera_capture_view">
    //     {!isCamOpen && (
    //       <Box component="div" className="info_view">
    //         <Box mb={2}>
    //           <Icon icon="tabler:camera-selfie" />
    //         </Box>
    //         <Typography variant="body1">
    //           {initializing
    //             ? "Please wait..."
    //             : "Please, set your desired configurations and press the Capture button to start"}
    //         </Typography>
    //       </Box>
    //     )}
    //     {isCamOpen && (
    //       <Box component="div" id="elementId" className="camera_view"></Box>
    //     )}
    //     <Box component="div" className="footer">
    //       <Grid
    //         container
    //         spacing={2}
    //         alignItems="center"
    //         justifyContent="space-between"
    //       >
    //         <Grid item xs={4}>
    //           <Button
    //             disabled={initializing}
    //             fullWidth={true}
    //             variant="contained"
    //             color="milkWhite"
    //             onClick={() => {
    //               if (isCamOpen) {
    //                 return null;
    //               } else {
    //                 refAccessFiles?.current?.click();
    //               }
    //             }}
    //           >
    //             Gallery
    //           </Button>
    //         </Grid>
    //         <Grid item xs={4}>
    //           <Button
    //             fullWidth={true}
    //             onClick={() => {
    //               if (isCamOpen) {
    //                 return null;
    //               } else {
    //                 handleTakePicture();
    //               }
    //             }}
    //           >
    //             Capture
    //           </Button>
    //         </Grid>
    //         <Grid item xs={4}>
    //           <Button
    //             disabled={initializing}
    //             color="inherit"
    //             fullWidth={true}
    //             onClick={() => {
    //               if (isCamOpen || disabledSkipBtn) {
    //                 return null;
    //               } else {
    //                 onSkip();
    //               }
    //             }}
    //           >
    //             Skip
    //           </Button>
    //         </Grid>
    //       </Grid>
    //     </Box>
    //   </Box>
    //   <Box component="div" className="camera_view_footer">
    //     <Grid
    //       container
    //       spacing={2}
    //       alignItems="center"
    //       justifyContent="space-between"
    //     >
    //       <Grid item xs={4}>
    //         <Button
    //           fullWidth={true}
    //           variant="outlined"
    //           disabled={initializing}
    //           onClick={() => {
    //             if (isCamOpen) {
    //               return null;
    //             } else {
    //               refAccessFiles?.current?.click();
    //             }
    //           }}
    //         >
    //           Gallery
    //         </Button>
    //       </Grid>
    //       <Grid item xs={4}>
    //         <Button
    //           fullWidth={true}
    //           disabled={isCamOpen || initializing}
    //           onClick={handleTakePicture}
    //         >
    //           Capture
    //         </Button>
    //       </Grid>
    //       <Grid item xs={4}>
    //         <Button
    //           color="inherit"
    //           disabled={disabledSkipBtn || initializing}
    //           fullWidth={true}
    //           onClick={() => {
    //             if (isCamOpen) {
    //               return null;
    //             } else {
    //               onSkip();
    //             }
    //           }}
    //         >
    //           Skip
    //         </Button>
    //       </Grid>
    //     </Grid>
    //   </Box>
    //   <input
    //     ref={refAccessFiles}
    //     type="file"
    //     accept="image/*"
    //     hidden
    //     onChange={handleUploadFiles}
    //   />
    // </StyledARCameraComponent>
  );
};

export default ARCameraComponent;
