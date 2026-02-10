"use client";

import { Box, Typography, Radio } from "@mui/material";
import PageBackground from "@/components/ui/PageBackground";

interface SkinTypeOption {
  id: string;
  title: string;
  description: string;
}

interface Slide2Props {
  currentSlide: number;
  selectedSkinType: string;
  setSelectedSkinType: (id: string) => void;
  handleNext: (skinType?: string) => void;
  skinTypeOptions: SkinTypeOption[];
}

export default function Slide2({
  currentSlide,
  selectedSkinType,
  setSelectedSkinType,
  handleNext,
  skinTypeOptions,
}: Slide2Props) {
  const handleOptionClick = (optionId: string) => {
    setSelectedSkinType(optionId);

    if (currentSlide !== 1) return;

    window.setTimeout(() => {
      handleNext(optionId);
    }, 250);
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        transform: `translateX(${currentSlide === 1 ? "0%" : "100%"})`,
        transition: "transform 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageBackground showGreenCurve fitParent>
        <Box sx={{ flex: 1, px: 3, pt: 3, pb: 2, overflow: "auto" }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: "Roboto",
              fontWeight: 510,
              fontStyle: "normal",
              color: "#1a1a1a",
              fontSize: "64px",
              lineHeight: "100%",
              letterSpacing: 0,
              mb: 0.5,
              mt: 1,
            }}
          >
            What is your skin type?
          </Typography>
          <Typography
            sx={{
              fontFamily: "Roboto",
              fontWeight: 400,
              fontStyle: "normal",
              color: "#6b7280",
              fontSize: "32px",
              lineHeight: "100%",
              letterSpacing: 0,
              mb: 2,
            }}
          >
            AI Powered Skincare Analysis
          </Typography>

          {/* Skin Type Options */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              width: "100%",
              maxWidth: "922px",
              mx: "auto",
            }}
          >
            {skinTypeOptions.map((option) => (
              <Box
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                sx={{
                  bgcolor: "white",
                  width: "100%",
                  maxWidth: "921.9998779296875px",
                  height: "170px",
                  borderRadius: "19px",
                  pt: "20px",
                  pr: "98px",
                  pb: "30px",
                  pl: "31px",
                
                  cursor: "pointer",
                  border:
                    selectedSkinType === option.id
                      ? "5px solid #2d5a3d"
                      : "5px solid #c4c6c9ff",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                }}
              >
                <Radio
                  checked={selectedSkinType === option.id}
                  sx={{
                    color: "#e5e7eb",
                    "&.Mui-checked": { color: "#2d5a3d" },
                    p: 0,
                    mt: 5,
                  }}
                />
                <Box>
                  <Typography
                    sx={{
                      fontFamily: "Roboto",
                      fontWeight: 510,
                      fontStyle: "normal",
                      color: "#1a1a1a",
                      fontSize: "40px",
                      lineHeight: "100%",
                      letterSpacing: 0,
                      mb: 0.5,
                    }}
                  >
                    {option.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "Roboto",
                      fontWeight: 400,
                      fontStyle: "normal",
                      color: "#6b7280",
                      fontSize: "24px",
                      lineHeight: 1.4,
                      letterSpacing: 0,
                      maxWidth: "600px",
                      mb: 2,
                    }}
                  >
                    {option.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </PageBackground>
    </Box>
  );
}




