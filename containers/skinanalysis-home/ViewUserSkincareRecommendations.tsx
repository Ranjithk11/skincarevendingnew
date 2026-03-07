"use client";
import {
  useGetUploadImageInfoMutation,
  useLazyFetchRecommnedSkinAttributesByIdQuery,
} from "@/redux/api/analysisApi";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Container,
  styled,
  Typography,
  Button,
  Paper,
} from "@mui/material";
import React, { Fragment, useEffect, useMemo } from "react";
import LoadingComponent from "@/components/loaders/Loading";
import DietChart from "./Recommendations/DietChart";
import _ from "lodash";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { updateVisitCount } from "@/redux/reducers/analysisSlice";
import { Icon } from "@iconify/react";
import NewUiPage from "./Recommendations/newUi";

const StyledUserSkinAnalysisRecommendation = styled(Container)(({ theme }) => ({
  minHeight: "100vh",
  position: "relative",
  overflowX: "hidden",
  backgroundColor: theme.palette.grey[100],
  overflowY: "auto",
  "& .whatsapp-button": {
    position: "fixed",
    right: 30,
    bottom: 120, // Adjust this to position above the scroll-to-top button
    backgroundColor: theme.palette.common.white,
    width: 50,
    height: 50,
    borderRadius: 100,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    "& :hover": {
      cursor: "pointer",
    },
    "& svg": {
      fontSize: 40,
      color: "#25D366", // WhatsApp green color
    },
  },
  "& .scrool-to-top": {
    position: "fixed",
    right: 30,
    bottom: 50,
    backgroundColor: theme.palette.common.white,
    width: 50,
    height: 50,
    borderRadius: 100,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    "& :hover": {
      cursor: "pointer",
    },
    "& svg": {
      fontSize: 40,
      color: theme.palette.primary.main,
    },
  },
  "& .sectionHeader": {
    width: "100%",
    backgroundColor: theme.palette.common.black,
  },
  "& .section_loading_indicator": {
    position: "absolute",
    width: "100%",
    height: "100%",
    left: 0,
    top: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  "& .MuiTypography-h4": {
    fontWeight: 700,
    fontSize: 26,
  },
  "& a": {
    backgroundColor: theme.palette.primary.main,
    textDecoration: "none",
    color: theme.palette.common.white,
    padding: 8,
    minWidth: 200,
    textAlign: "center",
    fontSize: 14,
    borderRadius: 5,
  },
}));

const UserSkinAnalysisRecommendation = () => {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const whatsappNumber = "918977016605";
  const whatsappMessage = "Hello, I need help with my skin analysis!";
  const [fetchRecommnedSkinAttributesById, { isLoading, isError, data }] =
    useLazyFetchRecommnedSkinAttributesByIdQuery();
  const [
    getUploadImageInfo,
    { data: dataImageInfo, isLoading: isLoadingImageInfo },
  ] = useGetUploadImageInfoMutation();
  const handleWhatsAppClick = () => {
    window.open(
      `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(
        whatsappMessage
      )}`,
      "_blank"
    );
  };
  const handleScrollToTop = () => {
    window.scrollTo({ top: 64, behavior: "smooth" });
  };

  const userId = searchParams?.get("userId") || "";
  const productRecommendationId = searchParams?.get("productRecommendationId") || "";

  useEffect(() => {
    if (!userId || !productRecommendationId) return;
    fetchRecommnedSkinAttributesById({
      userId,
      productRecommendationId,
    });
  }, [fetchRecommnedSkinAttributesById, userId, productRecommendationId]);

  useEffect(() => {
    if (!_.isEmpty(data)) {
      dispatch(updateVisitCount(data?.data?.countTimeseries));
      getUploadImageInfo({
        userId: data?.data?.user?._id,
        fileName:
          data?.data?.productRecommendation?.capturedImages[0]?.fileName,
      });
    }
  }, [data]);

  const dataFUQR = useMemo(() => {
    const age = data?.data?.user?.onBoardingQuestions?.[0]?.responses?.[0]?.value;
    const gender = data?.data?.user?.onBoardingQuestions?.[1]?.responses?.[0]?.value;
    return { age, gender };
  }, [data]);

  return (
    <StyledUserSkinAnalysisRecommendation disableGutters maxWidth="xl">
      {!isLoading && !isError && !isLoadingImageInfo && data && (
        <Fragment>
          <NewUiPage
            useData={dataImageInfo}
            dataFUQR={dataFUQR}
            publicUserProfile={data?.data?.user}
            analysisData={data?.data?.productRecommendation}
          />
{/* 
          {data?.data?.productRecommendation?.dietPlan && (
            <DietChart dietPlan={data?.data?.productRecommendation?.dietPlan} />
          )} */}
        </Fragment>
      )}

      {(isLoading || isLoadingImageInfo) &&
        !isError &&
        !data &&
        !dataImageInfo && (
          <Box component="div" className="section_loading_indicator">
            <LoadingComponent />
          </Box>
        )}

      {!isLoading && isError && !data && (
        <Box component="div" className="section_loading_indicator">
          <img src="/icons/no-content.png" />
          <Typography fontWeight={700} textAlign="center" variant="h6">
            No Recommendations Found!
          </Typography>
          <Typography textAlign="center">
            Sorry, we couldn't find any results
          </Typography>
          <Box mt={3}>
            <Button
              onClick={() => {
                router.replace("/");
              }}
            >
              Go to Skin Analysis
            </Button>
          </Box>
        </Box>
      )}
      <Paper
        onClick={handleWhatsAppClick}
        component="div"
        className="whatsapp-button"
      >
        <Icon icon="logos:whatsapp-icon" />
      </Paper>
      <Paper
        onClick={handleScrollToTop}
        component="div"
        className="scrool-to-top"
      >
        <Icon icon="solar:round-arrow-up-outline" />
      </Paper>
    </StyledUserSkinAnalysisRecommendation>
  );
};

export default UserSkinAnalysisRecommendation;
