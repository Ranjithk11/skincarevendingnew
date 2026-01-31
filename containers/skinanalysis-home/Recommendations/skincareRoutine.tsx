"use client";

import React, { useState } from "react";
import { Box, Card, Grid, Switch, Typography } from "@mui/material";
import ProductCard from "./ProductCard";

type Props = {
  recommendationData?: any;
};

/* ===============================
   PAGE BACKGROUND (FIXED)
================================ */
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

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          pb: 4,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

/* ===============================
   STEP RAIL (PIXEL PERFECT)
================================ */
const StepRail = ({ index, total }: { index: number; total: number }) => {
  return (
    <Box
      sx={{
        width: 36,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Vertical Line */}
      <Box
        sx={(theme) => ({
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: index === 0 ? 0 : `calc(-1 * ${theme.spacing(3)})`,
          bottom: index === total - 1 ? 0 : `calc(-1 * ${theme.spacing(3)})`,
          width: 5,
          background: "linear-gradient(360deg, #1DC9A0 0%, #316D52 100%)",
          borderRadius: 999,
          zIndex: 1,
        })}
      />


      {/* Step Number */}
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "linear-gradient(360deg, #1DC9A0 0%, #316D52 100%)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          mt: 0.5,
        }}
      >
        {index + 1}
      </Box>
    </Box>
  );
};

/* ===============================
   HOW TO USE CARD (WITH IMAGE)
================================ */
const HowToUseCard = ({
  title,
  body,
  image,
}: {
  title: string;
  body: string;
  image?: string;
}) => {
  return (
    <Card
      sx={{
        mt: 1.5,
        p: { xs: 1.5, md: 2.5 },
        borderRadius: 2,
        border: "1px solid #e5e7eb",
        boxShadow: "none",
        display: "flex",
        alignItems: { md: "center" },
        gap: { xs: 1.5, md: 3 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#000",
        }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.75, fontSize: "20px", fontWeight: 400, color: "#000" }}>
          {body}
        </Typography>
      </Box>

      {image && (
        <Box
          component="img"
          src={image}
          sx={{
            width: { xs: 200, md: 244 },
            height: { xs: 240, md: 244 },
            objectFit: "contain",
            flexShrink: 0,
            alignSelf: "flex-start",
          }}
        />
      )}
    </Card>
  );
};

/* ===============================
   PRODUCT CARD
================================ */
const RoutineProductCard = ({ product, category }: { product: any; category?: string }) => {
  return (
    <ProductCard
      {...product}
      category={category}
      enabledMask={false}
      compact={false}
      horizontalLayout={true}
      cardSx={{ width: "100%" }}
    />
  );
};

/* ===============================
   MAIN PAGE
================================ */
export default function SkincareRoutinePage({ recommendationData }: Props) {
  const [night, setNight] = useState(false);

  const normalize = (v: any) => String(v ?? "").toLowerCase().trim();

  const highRecommendations = recommendationData?.recommendedProducts?.highRecommendation;
  const productBuckets: Array<{ categoryTitle: string; products: any[] }> = Array.isArray(highRecommendations)
    ? highRecommendations
      .filter(Boolean)
      .map((c: any) => ({
        categoryTitle: normalize(c?.productCategory?.title),
        products: Array.isArray(c?.products) ? c.products.filter(Boolean) : [],
      }))
    : [];

  const pickProducts = (keywords: string[], limit: number) => {
    const kw = keywords.map(normalize);
    for (const b of productBuckets) {
      const title = b.categoryTitle;
      if (kw.some((k) => title.includes(k))) {
        return b.products.slice(0, limit);
      }
    }

    const flat = productBuckets.flatMap((b) => b.products);
    const matches = flat.filter((p: any) => {
      const use = normalize(p?.productUse);
      const name = normalize(p?.name);
      return kw.some((k) => use.includes(k) || name.includes(k));
    });
    return matches.slice(0, limit);
  };

  const cleanserProducts = pickProducts(["face wash", "cleanser"], 2);
  const serumProducts = pickProducts(["face serum", "serum"], 1);
  const daycreamProducts = pickProducts(["day cream", "daycream"], 1);
  const sunscreenProducts = pickProducts(["sunscreen", "sun screen", "sunblock", "spf"], 1);
  const underEyeProducts = pickProducts(["under-eye", "under eye", "eye cream"], 1);
  const nightcreamProducts = pickProducts(["night cream", "nightcream", "night"], 1);

  const steps = night
    ? [
      {
        title: "Cleanser",
        subtitle: "A cleanser gently removes dirt, oil, and impurities, leaving your skin fresh and clean. It’s the first step to a clear, healthy, and glowing complexion.",
        howTitle: "How to Use Your Cleanser",
        howBody: "Wet your face with lukewarm water and apply a small amount of cleanser to your fingertips. Gently massage it onto your skin in circular motions for 20–30 seconds, focusing on areas with excess oil or buildup. Rinse thoroughly and pat your skin dry with a clean towel. Use twice daily for best results.",
        howImg: "/products/ceta1.svg",
        products: cleanserProducts,
      },
      {
        title: "Face Serum",
        subtitle: "A face serum is a lightweight, fast-absorbing treatment designed to deliver concentrated active ingredients deep into the skin. It helps target specific concerns such as dullness, uneven tone, fine lines, or dehydration.",
        howTitle: "How to Use Serum",
        howBody: "After cleansing, apply 2–3 drops of serum to your face and neck. Gently press or massage it into the skin until fully absorbed. Allow it to settle for a minute before applying moisturizer. Use once or twice daily depending on your skin’s needs and the serum’s instructions.",
        howImg: "/products/pilgram.svg",
        products: serumProducts,
      },
           {
        title: "Night Cream",
        subtitle: "Night cream provides essential hydration and protection, shielding your skin from environmental damage. It keeps your complexion smooth, radiant, and ready to face the day.",
        howTitle: "How to Use Your Night Cream",
        howBody: "After cleansing, apply a small amount of night cream to your face and neck. Gently massage it in using upward, circular motions until fully absorbed. Allow it to settle for a minute before applying sunscreen or makeup. Use every morning for optimal hydration and protection.",
        howImg: "/products/nightcream.jpeg",
        products: nightcreamProducts,
      },
    ]
    : [
      {
        title: "Cleanser",
        subtitle: "A cleanser gently removes dirt, oil, and impurities, leaving your skin fresh and clean. It’s the first step to a clear, healthy, and glowing complexion.",
        howTitle: "How to Use Your Cleanser",
        howBody: "Wet your face with lukewarm water and apply a small amount of cleanser to your fingertips. Gently massage it onto your skin in circular motions for 20–30 seconds, focusing on areas with excess oil or buildup. Rinse thoroughly and pat your skin dry with a clean towel. Use twice daily for best results.",
        howImg: "/products/ceta1.svg",
        products: cleanserProducts,
      },
      {
        title: "Daycream",
        subtitle: "Day cream provides essential hydration and protection, shielding your skin from environmental damage. It keeps your complexion smooth, radiant, and ready to face the day.",
        howTitle: "How to Use Daycream",
        howBody: "After cleansing, apply a small amount of day cream to your face and neck. Gently massage it in using upward, circular motions until fully absorbed. Allow it to settle for a minute before applying sunscreen or makeup. Use every morning for optimal hydration and protection.",
        howImg: "/products/cetapik.svg",
        products: daycreamProducts,
      },
      {
        title: "Sunscreen",
        subtitle: "Sunscreen protects your skin from harmful UV rays, preventing sunburn and premature aging. It's an essential daily step for healthy, radiant, and safeguarded skin.",
        howTitle: "How to Use Sunscreen",
        howBody: "Apply sunscreen as the final step in your morning routine. Use a generous amount and spread it evenly over your face and neck. Let it absorb for a minute before heading outdoors. Reapply every 2–3 hours, especially after sweating or sun exposure, for consistent protection.",
        howImg: "/products/cetayellow.svg",
        products: sunscreenProducts,
      },
    ];

  return (
    <PageBackground>
      <Box sx={{ px: 2, pt: 4, width: "100%" }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
          {/* Day/Night Toggle Button - Top Center */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "#f3f4f6",
              borderRadius: "999px",
              p: 0.5,
              gap: 0.5,
              mb: 4,
            }}
          >
            <Box
              onClick={() => setNight(false)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderRadius: "999px",
                cursor: "pointer",
                bgcolor: !night ? "#FFDD1B" : "transparent",
                transition: "all 0.3s ease",
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: "24px",
                }}
              >
                ☀️
              </Box>
              <Typography
                sx={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: !night ? "#000" : "#6b7280",
                }}
              >
                Day
              </Typography>
            </Box>

            <Box
              onClick={() => setNight(true)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderRadius: "999px",
                cursor: "pointer",
                bgcolor: night ? "#1DC9A0" : "transparent",
                transition: "all 0.3s ease",
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: "24px",
                }}
              >
                🌙
              </Box>
              <Typography
                sx={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: night ? "#fff" : "#6b7280",
                }}
              >
                Night
              </Typography>
            </Box>
          </Box>

          {/* Title - Below Center */}
          <Typography sx={{
            mb: 5,
            fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
            fontWeight: 700,
            fontSize: "36px",
            lineHeight: "100%",
            letterSpacing: "0%",
            textAlign: "center",
          }}>
            My Skincare Routine – {night ? "Night" : "Day"}
          </Typography>
          {/* <Typography sx={{
            mt: 1,
            mb: 0,
            fontSize: "24px",
            color: "#6b7280",
            letterSpacing: 1.2,
            textAlign: "center",
          }}>
            {night ? "NIGHTTIME ROUTINE" : "DAYTIME ROUTINE"}
          </Typography> */}
        </Box>

        {/* Hidden original Switch - keeping functionality intact */}
        {/* <Switch
          checked={night}
          onChange={(e) => setNight(e.target.checked)}
          sx={{
            display: "none",
            width: 56,
            height: 30,
            p: 0,
            "& .MuiSwitch-switchBase": {
              p: 0.5,
              "&.Mui-checked": {
                transform: "translateX(26px)",
                color: "#ffffff",
                "& + .MuiSwitch-track": {
                  opacity: 1,
                  backgroundImage: "linear-gradient(90deg, #1DC9A0 0%, #FFDD1B 100%)",
                },
              },
            },
            "& .MuiSwitch-thumb": {
              width: 24,
              height: 24,
              backgroundColor: "#FFDD1B",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            },
            "& .MuiSwitch-track": {
              borderRadius: 999,
              opacity: 1,
              backgroundImage: "linear-gradient(90deg, #FFDD1B 0%, #1DC9A0 100%)",
            },
            "& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb": {
              backgroundColor: "#1DC9A0",
            },
          }}
        /> */}

        {/* STEPS */}
        {steps.map((s, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, mb: 3 }}>
            <StepRail index={i} total={steps.length} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#000",
                letterSpacing: 1.2,
              }}>{s.title}</Typography>
              <Typography sx={{
                mt: 2,
                mb: 2.5,
                fontSize: "20px",
                fontStyle: "normal",
                color: "#000",
              }}>
                {s.subtitle}
              </Typography>

              <HowToUseCard title={s.howTitle} body={s.howBody} image={s.howImg} />

              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                {s.products.map((p: any, idx: number) => (
                  <Grid item xs={6} key={idx}>
                    <RoutineProductCard product={p} category={s.title} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        ))}
      </Box>
    </PageBackground>
  );
}
