"use client";

import React from "react";
import { Box, Card, Container, Divider, Grid, Typography, styled } from "@mui/material";
import {
  type DietMealRow,
  type DietSkinTypePlan,
  dietFoodImageUrl,
  getDietPlanForSkinType,
} from "@/data/dietBySkinType";

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

const mealTitleSx = {
  mb: 0.75,
  fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  fontWeight: 700,
  fontSize: { xs: "20px", sm: "28px" },
  lineHeight: "100%",
  letterSpacing: "0%",
} as const;

function MealRowHeader({
  mealTitle,
  rowHeading,
  headingColor,
}: {
  mealTitle: string;
  rowHeading: string;
  headingColor: "#f97316" | "#22c55e";
}) {
  return (
    <Box display="flex" alignItems="center" mb={0.5} flexWrap="wrap" gap={1}>
      <Typography sx={mealTitleSx}>{mealTitle}</Typography>
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontSize: { xs: "16px", sm: "24px" }, fontWeight: 700, color: headingColor }}>
        {rowHeading}
      </Typography>
    </Box>
  );
}

function TileRow({ row }: { row: DietMealRow }) {
  return (
    <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ pr: { xs: 0, sm: "28px" } }}>
      {row.tiles.map((food) => (
        <Grid item xs={4} key={food.label}>
          <Tile image={dietFoodImageUrl(food.imageFile)} label={food.label} />
        </Grid>
      ))}
    </Grid>
  );
}

interface DietChartProps {
  /** e.g. SENSITIVE_SKIN, combination, or from session user */
  skinType?: string | null;
}

export default function DietChart({ skinType }: DietChartProps) {
  const plan: DietSkinTypePlan = getDietPlanForSkinType(skinType);

  return (
    <PageBackground>
      <Container maxWidth={false} sx={{ px: 2 }}>
        <Typography
          sx={{
            mt: 2.5,
            mb: 0.75,
            fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
            fontWeight: 700,
            fontSize: { xs: "24px", sm: "32px" },
            lineHeight: "100%",
            letterSpacing: "0%",
          }}
        >
          {plan.title}
        </Typography>

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

        {/* Breakfast */}
        <SectionCard sx={{ width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <MealRowHeader mealTitle="Breakfast" rowHeading={plan.breakfast.heading} headingColor="#f97316" />
          <TileRow row={plan.breakfast} />
        </SectionCard>

        {/* Lunch */}
        <SectionCard sx={{ width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <MealRowHeader mealTitle="Lunch" rowHeading={plan.lunchFirst.heading} headingColor="#f97316" />
          <TileRow row={plan.lunchFirst} />

          <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />

          <MealRowHeader mealTitle="Lunch" rowHeading={plan.lunchSecond.heading} headingColor="#22c55e" />
          <TileRow row={plan.lunchSecond} />
        </SectionCard>

        {/* Dinner */}
        <SectionCard sx={{ mt: 3, width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <MealRowHeader mealTitle="Dinner" rowHeading={plan.dinnerFirst.heading} headingColor="#f97316" />
          <TileRow row={plan.dinnerFirst} />

          <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />

          <MealRowHeader mealTitle="Dinner" rowHeading={plan.dinnerSecond.heading} headingColor="#22c55e" />
          <TileRow row={plan.dinnerSecond} />
        </SectionCard>

        {/* Additional supplements */}
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
            Additional Supplements
          </Typography>

          {plan.supplements.map((item, idx) => (
            <Box key={item.heading} sx={{ mt: idx === 0 ? 1 : 2 }}>
              <Typography sx={{ fontSize: { xs: "16px", sm: "24px" }, fontWeight: 700, color: "#111827" }}>
                {item.heading}
              </Typography>
              <Typography sx={{ fontSize: { xs: "14px", sm: "24px" }, fontWeight: 400, color: "#000", mt: 0.5 }}>
                {item.description}
              </Typography>
            </Box>
          ))}
        </SectionCard>
      </Container>
    </PageBackground>
  );
}
