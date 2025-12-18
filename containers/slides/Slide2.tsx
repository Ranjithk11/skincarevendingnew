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
  handleNext: () => void;
  skinTypeOptions: SkinTypeOption[];
}

export default function Slide2({
  currentSlide,
  selectedSkinType,
  setSelectedSkinType,
  handleNext,
  skinTypeOptions,
}: Slide2Props) {
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
              fontFamily: "SF Pro",
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
              fontFamily: "SF Pro",
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
                onClick={() => setSelectedSkinType(option.id)}
                sx={{
                  bgcolor: "white",
                  width: "100%",
                  maxWidth: "921.9998779296875px",
                  height: "160px",
                  borderRadius: "19px",
                  pt: "20px",
                  pr: "98px",
                  pb: "20px",
                  pl: "31px",
                
                  cursor: "pointer",
                  border:
                    selectedSkinType === option.id
                      ? "2px solid #2d5a3d"
                      : "1px solid #e5e7eb",
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
                      fontFamily: "SF Pro",
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
                      fontFamily: "SF Pro",
                      fontWeight: 400,
                      fontStyle: "normal",
                      color: "#6b7280",
                      fontSize: "18px",
                      lineHeight: 1.4,
                      letterSpacing: 0,
                      maxWidth: "600px",
                    }}
                  >
                    {option.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Submit Button */}
        <Box
          sx={{
            bgcolor: "#2d5a3d",
            py: 3,
            mx: 3,
            mb: 3,
            borderRadius: 2,
            textAlign: "center",
            cursor: "pointer",
          }}
          onClick={handleNext}
        >
          <Typography sx={{ color: "white", fontWeight: 600, fontSize: "30px" }}>Continue</Typography>
        </Box>
      </PageBackground>
    </Box>
  );
}




