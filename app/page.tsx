"use client";
import HomeBannerComponent from "@/containers/home/Banner/Banner";
import HowItWork from "@/containers/home/HowItWork/HowItWork";
import ScanYourFace from "@/containers/home/ScanFace/ScanFace";
import StepThree from "@/containers/home/SetpThree/StepThree";
import DesktopLandingPage from "@/containers/slides/desktopLading";
import LandingPage from "@/containers/slides/landingPage";
import { useValidateDomainMutation } from "@/redux/api/authApi";
import { Container, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect } from "react";

const HomePage = () => {
    const [validateDomain, { data }] = useValidateDomainMutation();

  useEffect(() => {
    validateDomain({
     subDomain:"skinska"
    })
  }, []);

  return (
    <>
      <Container disableGutters maxWidth="xl">
        {/* <HomeBannerComponent />
        <HowItWork />
        <ScanYourFace />
        <StepThree /> */}
        <LandingPage />
      </Container>
    </>
  );
};

export default HomePage;
