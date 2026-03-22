"use client";

import React from "react";
import { Box, Card, Container, Divider, Grid, Typography, styled } from "@mui/material";

const PageBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <path
          d="M100,0 L100,100 L0,100 Q25,78 45,60 Q70,35 100,0 Z"
          fill="#E9F6E8"
        />
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, width: "100%" }}>{children}</Box>
    </Box>
  );
};

const SectionCard = styled(Card)(({ theme }) => ({
  width: "80%",
  padding: 16,
  borderRadius: 24,
  border: "1px solid #e5e7eb",
  boxShadow: "none",
  marginBottom: 16,
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    padding: 12,
    borderRadius: 16,
  },
}));

const Tile = ({ image, label }: { image: string; label: string }) => (
  <Box
    sx={{
      position: "relative",
      width: { xs: "100%", sm: 180 },
      height: { xs: 140, sm: 220 },
      borderRadius: "8px",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
    }}
  >
    <Box
      component="img"
      src={image}
      alt={label}
      sx={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: { xs: 50, sm: 70 },
        display: "flex",
        alignItems: "flex-end",
        px: { xs: 1, sm: 2 },
        pb: { xs: 1, sm: 2 },
        backgroundColor: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
      }}
    >
      <Typography 
        sx={{ 
          fontSize: { xs: 14, sm: 20 }, 
          fontWeight: 800, 
          color: "#fff", 
          lineHeight: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
    </Box>
  </Box>
);

interface DietPlanItem {
  title: string;
  items: string[];
  image: string;
}

interface DietPlanOption {
  heading?: string;
  description?: string;
}

interface DietPlanPlan {
  title?: string;
  options?: DietPlanOption[];
  sortOrder?: number;
}

interface DietPlanResponse {
  title?: string;
  description?: string;
  plans?: DietPlanPlan[];
}

interface DietChartProps {
  dietPlan?: DietPlanResponse;
}

export default function DietChart({ dietPlan }: DietChartProps) {
  const plans = (dietPlan?.plans ?? []).slice().sort((a, b) => {
    const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  const extractTileLabels = (description?: string, max = 3) => {
    if (!description) return [];
    const normalized = description
      .replace(/\//g, ",")
      .replace(/\./g, ",")
      .replace(/\r?\n/g, ",")
      .replace(/\s+/g, " ")
      .trim();

    const parts = normalized
      .split(/,|\bor\b|\band\b/gi)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^some\s+/i, "").trim())
      .filter(Boolean);

    return parts.slice(0, max);
  };

  const getPlanByTitle = (title: string) =>
    plans.find((p) => (p.title ?? "").toLowerCase() === title.toLowerCase());

  const breakfastPlan = getPlanByTitle("Breakfast");
  const lunchPlan = getPlanByTitle("Lunch");
  const dinnerPlan = getPlanByTitle("Dinner");
  const supplementsPlan =
    getPlanByTitle("Additional Supplements") || getPlanByTitle("Supplements") || getPlanByTitle("Snacks");

  const breakfastOption1 = breakfastPlan?.options?.[0];
  const breakfastOption2 = breakfastPlan?.options?.[1];

  const lunchOption1 = lunchPlan?.options?.[0];
  const lunchOption2 = lunchPlan?.options?.[1];

  const dinnerOption1 = dinnerPlan?.options?.[0];
  const dinnerOption2 = dinnerPlan?.options?.[1];

  const breakfastLabels1 = extractTileLabels(breakfastOption1?.description);
  const lunchLabels1 = extractTileLabels(lunchOption1?.description);
  const lunchLabels2 = extractTileLabels(lunchOption2?.description);
  const dinnerLabels1 = extractTileLabels(dinnerOption1?.description);
  const dinnerLabels2 = extractTileLabels(dinnerOption2?.description);

  return (
    <PageBackground>
      <Container maxWidth={false} sx={{ px: 2 }}>
        {/* HEADER */}
        <Typography sx={{
          mt: 2.5,
          mb: 0.75,
          fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
          fontWeight: 700,
          fontSize: { xs: "24px", sm: "32px" },
          lineHeight: "100%",
          letterSpacing: "0%",
        }}>
          {dietPlan?.title || "My Diet"}
        </Typography>
        {dietPlan?.description ? (
          <Typography
            sx={{
              mt: 2,
              mb: 0.75,
              fontSize: { xs: "16px", sm: "24px" },
              fontWeight: 400,
              color: "#000",
              letterSpacing: 1.2,
            }}
          >
            {dietPlan.description}
          </Typography>
        ) : null}
        <Typography
          sx={{
            mt: 2,
            mb: 2.5,
            fontSize: { xs: "16px", sm: "24px" },
            fontWeight: 400,
            color: "#000",
            letterSpacing: 1.2,
          }}
        >
          WHAT WE RECOMMEND
        </Typography>

        {/* BREAKFAST */}
        <SectionCard sx={{ width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <Box display="flex" alignItems="center" mb={0.5} flexWrap="wrap" gap={1}>
            <Typography sx={{
              mb: 0.75,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              fontWeight: 700,
              fontSize: { xs: "20px", sm: "28px" },
              lineHeight: "100%",
              letterSpacing: "0%",
            }}>{breakfastPlan?.title || "Breakfast"}</Typography>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: { xs: "16px", sm: "24px" }, fontWeight: 700, color: "#f97316" }}>
              {breakfastOption1?.heading || "Option 1"}
            </Typography>
          </Box>

          {/* <Typography fontSize="24px" fontWeight={400} color="#000" mb={1.5}>
            {breakfastOption1?.description || "--"}
          </Typography> */}

          <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ pr: { xs: 0, sm: "28px" } }}>
            <Grid item xs={4}>
              <Tile image="/diet/smoothies.jpg" label={breakfastLabels1[0] || "Smoothie"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/greenTea.jpg" label={breakfastLabels1[1] || "Green tea"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixednut.jpg" label={breakfastLabels1[2] || "Mixed nuts"} />
            </Grid>
          </Grid>

          {/* {breakfastOption2 ? (
            <>
              <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />
              <Box display="flex" alignItems="center" mb={0.5}>
                <Typography sx={{
                  mb: 0.75,
                  fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                  fontWeight: 700,
                  fontSize: "28px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                }}>{breakfastPlan?.title || "Breakfast"}</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography fontSize="24px" fontWeight={700} color="#22c55e">
                  {breakfastOption2.heading || "Option 2"}
                </Typography>
              </Box>
              <Typography fontSize="24px" fontWeight={400} color="#000" mb={1.5}>
                {breakfastOption2.description || "--"}
              </Typography>
            </>
          ) : null} */}
        </SectionCard>

        {/* LUNCH OPTION 1 */}
        <SectionCard sx={{ width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <Box display="flex" alignItems="center" mb={0.5} flexWrap="wrap" gap={1}>
            <Typography sx={{
              mb: 0.75,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              fontWeight: 700,
              fontSize: { xs: "20px", sm: "28px" },
              lineHeight: "100%",
              letterSpacing: "0%",
            }} >{lunchPlan?.title || "Lunch"}</Typography>
            <Box flex={1} />
            <Typography sx={{ fontSize: { xs: "16px", sm: "24px" }, fontWeight: 700, color: "#f97316" }}>
              {lunchOption1?.heading || "Option 1"}
            </Typography>
          </Box>

          {/* <Typography fontSize="24px" fontWeight={400} color="#000" mb={1.5}>
            {lunchOption1?.description || "--"}
          </Typography> */}

          <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ pr: { xs: 0, sm: "28px" } }}>
            <Grid item xs={4}>
              <Tile image="/diet/bakedSalmon.jpg" label={lunchLabels1[0] || "Baked salmon"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/fish.jpg" label={lunchLabels1[1] || "Grilled fish"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/grilledChicken.png" label={lunchLabels1[2] || "Grilled chicken"} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />

          <Box display="flex" alignItems="center" mb={0.5} flexWrap="wrap" gap={1}>
            <Typography sx={{
              mb: 0.75,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              fontWeight: 700,
              fontSize: { xs: "20px", sm: "28px" },
              lineHeight: "100%",
              letterSpacing: "0%",
            }}>{lunchPlan?.title || "Lunch"}</Typography>
            <Box flex={1} />
            <Typography sx={{ fontSize: { xs: "16px", sm: "24px" }, fontWeight: 700, color: "#22c55e" }}>
              {lunchOption2?.heading || "Option 2 (vegetarian)"}
            </Typography>
          </Box>
{/* 
          <Typography fontSize="24px" fontWeight={400} color="#000" mb={1.5}>
            {lunchOption2?.description || "--"}
          </Typography> */}

          <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ pr: { xs: 0, sm: "28px" } }}>
            <Grid item xs={4}>
              <Tile image="/diet/grain.jpg" label={lunchLabels2[0] || "Whole grain"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixedVeggis.jpg" label={lunchLabels2[1] || "Mixed Veggies"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixednut.jpg" label={lunchLabels2[2] || "Mixed nuts"} />
            </Grid>
          </Grid>
        </SectionCard>




        {/* DINNER OPTION 1 */}
        <SectionCard sx={{ mt: 3, width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <Box display="flex" alignItems="center" mb={0.5} flexWrap="wrap" gap={1}>
            <Typography sx={{ fontSize: { xs: "20px", sm: "28px" }, fontWeight: 700 }}>{dinnerPlan?.title || "Dinner"}</Typography>
            <Box flex={1} />
            <Typography sx={{ fontSize: { xs: "16px", sm: "24px" }, fontWeight: 700, color: "#f97316" }}>
              {dinnerOption1?.heading || "Option 1"}
            </Typography>
          </Box>

          {/* <Typography fontSize="24px" fontWeight={400} color="#000" mb={1.5}>
            {dinnerOption1?.description || "--"}
          </Typography> */}

          <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ pr: { xs: 0, sm: "28px" } }}>
            <Grid item xs={4}>
              <Tile image="/diet/bakedSalmon.jpg" label={dinnerLabels1[0] || "Baked salmon"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/fish.jpg" label={dinnerLabels1[1] || "Grilled fish"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/grilledChicken.png" label={dinnerLabels1[2] || "Grilled chicken"} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />

          <Box display="flex" alignItems="center" mb={0.5} flexWrap="wrap" gap={1}>
            <Typography sx={{ fontSize: { xs: "20px", sm: "28px" }, fontWeight: 700 }}>{dinnerPlan?.title || "Dinner"}</Typography>
            <Box flex={1} />
            <Typography sx={{ fontSize: { xs: "16px", sm: "24px" }, fontWeight: 700, color: "#22c55e" }}>
              {dinnerOption2?.heading || "Option 2 (vegetarian)"}
            </Typography>
          </Box>

          {/* <Typography fontSize=  "24px" fontWeight={400} color="#000" mb={1.5}>
            {dinnerOption2?.description || "--"}
          </Typography> */}

          <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ pr: { xs: 0, sm: "28px" } }}>
            <Grid item xs={4}>
              <Tile image="/diet/grain.jpg" label={dinnerLabels2[0] || "Whole grain"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixedVeggis.jpg" label={dinnerLabels2[1] || "Mixed Veggies"} />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixednut.jpg" label={dinnerLabels2[2] || "Mixed nuts"} />
            </Grid>
          </Grid>
        </SectionCard>

        {supplementsPlan ? (
          <SectionCard sx={{ mt: 3, width: { xs: "100%", md: 977 } }}>
            <Typography
              sx={{
                mb: 0.75,
                fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                fontWeight: 700,
                fontSize: { xs: "20px", sm: "28px" },
                lineHeight: "100%",
                letterSpacing: "0%",
              }}
            >
              {supplementsPlan.title || "Additional Supplements"}
            </Typography>

            {(supplementsPlan.options ?? []).map((opt, idx) => (
              <Box key={`${opt.heading ?? "option"}-${idx}`} sx={{ mt: idx === 0 ? 1 : 2 }}>
                <Typography sx={{ fontSize: { xs: "16px", sm: "24px" }, fontWeight: 700, color: "#111827" }}>
                  {opt.heading || `Option ${idx + 1}`}
                </Typography>
                <Typography sx={{ fontSize: { xs: "14px", sm: "24px" }, fontWeight: 400, color: "#000", mt: 0.5 }}>
                  {opt.description || "--"}
                </Typography>
              </Box>
            ))}
          </SectionCard>
        ) : null}

      </Container>
    </PageBackground>
  );
}
