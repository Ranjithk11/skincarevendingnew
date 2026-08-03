"use client";
import LandingPage from "@/containers/slides/landingPage";
import { Container } from "@mui/material";

const HomePage = () => {
  return (
    <>
      <Container disableGutters maxWidth="xl">
        <LandingPage />
      </Container>
    </>
  );
};

export default HomePage;
