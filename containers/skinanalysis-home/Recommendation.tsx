"use client";
import {
  useGetUploadImageInfoMutation,
  useLazyFetchRecommnedSkinAttributesQuery,
  useLazyFetchUserQuestionsResponseQuery,
} from "@/redux/api/analysisApi";
import { Font, StyleSheet } from "@react-pdf/renderer";

import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  styled,
  Typography,
} from "@mui/material";
import { useSession } from "next-auth/react";
import React, { Fragment, useEffect, useRef } from "react";
import { APP_COLORS } from "@/theme/colors/colors";
import LoadingComponent from "@/components/loaders/Loading";
import { Icon } from "@iconify/react";
import SalonServices from "./Recommendations/SalonServices";
import DietChart from "./Recommendations/DietChart";
import MeetTeam from "./Recommendations/MeetTeam";
import Routine from "./Recommendations/Routines";
import CoverPage from "./Recommendations/Cover";
import PreventingView from "./Recommendations/Preventing";
import SkincareRoutine from "./Recommendations/skincareRoutine";
import CosmeticRecommdations from "./Recommendations/CosmeticRecommdations";
import ProductsView from "./Recommendations/Products";
import Payment from "./Recommendations/Payment";
import ViewAllProducts from "./Recommendations/ViewAllProducts";
import LipsProductsView from "./Recommendations/LipProducts";
import NewUiPage from "./Recommendations/newUi";

const defaultFont = "Roboto";
const extraBold = `/fonts/OpenSans-ExtraBold.ttf`;
const medium = `/fonts/OpenSans-Medium.ttf`;
const regular = `/fonts/OpenSans-Regular.ttf`;
const semiBold = `/fonts/OpenSans-SemiBold.ttf`;
const whatsappNumber = "918977016605";
const whatsappMessage = "Hello, I need help with my skin analysis!";
Font.register({
  family: defaultFont,
  fonts: [
    {
      src: extraBold,
      fontWeight: 900,
      fontStyle: "normal",
    },
    {
      src: medium,
      fontWeight: 500,
      fontStyle: "normal",
    },
    {
      src: regular,
      fontWeight: 400,
      fontStyle: "normal",
    },
    {
      src: semiBold,
      fontWeight: 600,
      fontStyle: "normal",
    },
  ],
});

const StyledSkinAnalysisRecommendation = styled(Container)(({ theme }) => ({
  minHeight: "100vh",
  position: "relative",
  overflowX: "hidden",
  backgroundRepeat: "no-repeat",
  backgroundSize: "contain",
  backgroundPosition: "top center",
  overflowY: "auto",
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
  [theme.breakpoints.only("xs")]: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  "& .floating-actions": {
    position: "fixed",
    right: 16,
    bottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    zIndex: 20,
  },
  "& .whatsapp-button": {
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
      fontSize: 60,
      color: "#25D366", // WhatsApp green color
    },
  },
  "& .scrool-to-top": {
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
      fontSize: 60,
      color: theme.palette.primary.main,
    },
  },
}));

const SkinAnalysisRecommendation = () => {
  const { data: session } = useSession();
  const containerRef: any = useRef(null);

  const [
    fetchUserQuestionsResponse,
    { isLoading: isLoadingFUQR, data: dataFUQR },
  ] = useLazyFetchUserQuestionsResponseQuery();

  const [fetchRecommnedSkinAttributes, { isLoading, isError, data }] =
    useLazyFetchRecommnedSkinAttributesQuery();
  const [
    getUploadImageInfo,
    { data: dataImageInfo, isLoading: isLoadingImageInfo },
  ] = useGetUploadImageInfoMutation();

  useEffect(() => {
    if (session?.user) {
      fetchRecommnedSkinAttributes({
        userId: session?.user?.id as string,
      });
      getUploadImageInfo({
        userId: session?.user?.id as string,
        fileName: session?.user?.selfyImage as string,
      });
      fetchUserQuestionsResponse({
        userId: session?.user?.id as string,
      });
    }
  }, [session]);
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

  return (
    <StyledSkinAnalysisRecommendation
      ref={containerRef}
      disableGutters
      maxWidth={false}
      className="block"
    >
      {!isLoading && data && !isLoadingImageInfo && (
        <Fragment>
          <NewUiPage useData={dataImageInfo} dataFUQR={dataFUQR} analysisData={data} />
          {/* <CoverPage useData={dataImageInfo} dataFUQR={dataFUQR} analysisData={data} /> */}
          {/* <PreventingView useData={dataImageInfo} data={data} /> */}
          {/* <ProductsView data={data} /> */}
          {/* {data?.data?.[0]?.recommendedLipProducts?.length > 0 && (
            <LipsProductsView
              data={data?.data?.[0]?.recommendedLipProducts}
              dataFUQR={dataFUQR}
            />
          )} */}

          {/* <ViewAllProducts/> */}
          {/* <Routine userData={dataImageInfo as any} />
          <SalonServices
            data={data?.data?.[0]?.recommendedSalonServices || []}
          />
          <CosmeticRecommdations
            data={data?.data?.[0]?.recommendedCosmeticServices || []}
          />
          <Payment />
          {data?.data?.[0]?.dietPlan?._id && (
            <DietChart dietPlan={data?.data?.[0]?.dietPlan} />
          )}
          <MeetTeam /> */}
        </Fragment>
      )}
      {(isLoadingImageInfo || (isLoading && !data)) && (
        <Box component="div" className="section_loading_indicator">
          <LoadingComponent />
        </Box>
      )}

      <Box component="div" className="floating-actions">
        {/* <Paper
          onClick={handleWhatsAppClick}
          component="div"
          className="whatsapp-button"
        >
          <Icon icon="logos:whatsapp-icon" />
        </Paper> */}
        <Paper
          onClick={handleScrollToTop}
          component="div"
          className="scrool-to-top"
        >
          <Icon icon="solar:round-arrow-up-outline" />
        </Paper>
      </Box>
    </StyledSkinAnalysisRecommendation>
  );
};

export default SkinAnalysisRecommendation;
