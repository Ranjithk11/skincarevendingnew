"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import HomeBannerComponent from "@/containers/home/Banner/Banner";
import HowItWork from "@/containers/home/HowItWork/HowItWork";
import ScanYourFace from "@/containers/home/ScanFace/ScanFace";
import StepThree from "@/containers/home/SetpThree/StepThree";
import DesktopLandingPage from "@/containers/slides/desktopLading";
import LandingPage from "@/containers/slides/landingPage";
import { Container, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const MACHINE_LOCATION_KEY = "kiosk_machine_location";

const HomePage = () => {
  const searchParams = useSearchParams();

  // Store machine location from URL param in localStorage
  useEffect(() => {
    const machineParam = searchParams.get("machine");
    if (machineParam && typeof window !== "undefined") {
      localStorage.setItem(MACHINE_LOCATION_KEY, machineParam);
    }
  }, [searchParams]);
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
