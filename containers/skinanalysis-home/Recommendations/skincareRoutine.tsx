"use client";

import React, { useState } from "react";
import { Box, Card, Grid, Switch, Typography, useMediaQuery, useTheme } from "@mui/material";

/* ===============================
   PAGE BACKGROUND (FIXED)
================================ */
const PageBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        position: "relative", // 🔴 FIX: never fixed
        backgroundColor: "#fff",
        backgroundImage: {
          xs: "url('/wending/linesbg.svg')",
          sm: "url('/wending/linesbg.png')",
        },
        backgroundRepeat: "no-repeat",
        backgroundSize: {
          xs: "700px auto",
          sm: "100% auto",
        },
        backgroundPosition: {
          xs: "top -60px right -180px",
          sm: "top -80px right -240px",
        },
        pb: 4,
      }}
    >
      {children}
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
                fontSize: { xs: 14, sm: 24 },
                fontWeight: 600,
                color: "#000",
              }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.75, fontSize: { xs: 14, md: 16 }, color: "#000" }}>
          {body}
        </Typography>
      </Box>

      {image && (
        <Box
          component="img"
          src={image}
          sx={{
            width: { xs: 160, md: 198 },
            height: { xs: 160, md: 244 },
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
const ProductCard = ({
  title,
  price,
  image,
}: {
  title: string;
  price: string;
  image: string;
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Card
      sx={{
        p: 2,
        width: { xs: "100%", md: 307 },
        height: { xs: "auto", md: 422 },
        borderRadius: "13px",
        border: "1px solid #e5e7eb",
        boxShadow: "none",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          height: { xs: 160, md: 250 },
          width: { xs: 120, md: 130 },
          minWidth: { xs: 120, md: 130 },
          bgcolor: "#ffffff",
          borderRadius: "13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src={image} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: 14, md: 16 },
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            mt: 1,
            fontSize: { xs: 14, md: 16 },
            fontWeight: 700,
            color: "#d12b2b",
          }}
        >
          {price}
        </Typography>

        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: 999,
              bgcolor: "#2d5a3d",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              whiteSpace: "nowrap",
            }}
          >
            Buy Now
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
              <img src="/icons/cart.svg" style={{ width: 16, height: 16 }} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 1.5, display: "flex" }}>
          <Box
            sx={{
              px: 2,
              py: 0.8,
              border: "1px solid #2d5a3d",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              color: "#2d5a3d",
              whiteSpace: "nowrap",
            }}
          >
            UNEVEN SKIN
          </Box>
        </Box>
      </Box>
    </Card>
  );
};

/* ===============================
   MAIN PAGE
================================ */
export default function SkincareRoutinePage() {
  const [night, setNight] = useState(false);

  const steps = night
    ? [
      {
        title: "Cleanser",
        subtitle: "A cleanser gently removes dirt, oil, and impurities, leaving your skin fresh and clean. It’s the first step to a clear, healthy, and glowing complexion.",
        howTitle: "How to Use Your Cleanser",
        howBody: "Wet your face with lukewarm water and apply a small amount of cleanser to your fingertips. Gently massage it onto your skin in circular motions for 20–30 seconds, focusing on areas with excess oil or buildup. Rinse thoroughly and pat your skin dry with a clean towel. Use twice daily for best results.",
        howImg: "/products/ceta1.svg",
        products: [
          { title: "Cetaphil Creamy Cleanser", price: "Rs. 599/-", image: "/products/cetaPink.png" },
          { title: "Cetaphil Gentle Skin Cleanser", price: "Rs. 654/-", image: "/products/ceta1.svg" },
        ],
      },
      {
        title: "Face Serum",
        subtitle: "A face serum is a lightweight, fast-absorbing treatment designed to deliver concentrated active ingredients deep into the skin. It helps target specific concerns such as dullness, uneven tone, fine lines, or dehydration.",
        howTitle: "How to Use Serum",
        howBody: "After cleansing, apply 2–3 drops of serum to your face and neck. Gently press or massage it into the skin until fully absorbed. Allow it to settle for a minute before applying moisturizer. Use once or twice daily depending on your skin’s needs and the serum’s instructions.",
        howImg: "/products/pilgram.svg",
        products: [
          { title: "Pilgrim Niacinamide Serum", price: "Rs. 590/-", image: "/products/pilgram.svg" },
        ],
      },
    ]
    : [
      {
        title: "Cleanser",
        subtitle: "A cleanser gently removes dirt, oil, and impurities, leaving your skin fresh and clean. It’s the first step to a clear, healthy, and glowing complexion.",
        howTitle: "How to Use Your Cleanser",
        howBody: "Wet your face with lukewarm water and apply a small amount of cleanser to your fingertips. Gently massage it onto your skin in circular motions for 20–30 seconds, focusing on areas with excess oil or buildup. Rinse thoroughly and pat your skin dry with a clean towel. Use twice daily for best results.",
        howImg: "/products/ceta1.svg",
        products: [
          { title: "Cetaphil Creamy Cleanser", price: "Rs. 599/-", image: "/products/cetaPink.png" },
          { title: "Cetaphil Gentle Skin Cleanser", price: "Rs. 654/-", image: "/products/ceta1.svg" },
        ],
      },
      {
        title: "Daycream",
        subtitle: "Day cream provides essential hydration and protection, shielding your skin from environmental damage. It keeps your complexion smooth, radiant, and ready to face the day.",
        howTitle: "How to Use Daycream",
        howBody: "After cleansing, apply a small amount of day cream to your face and neck. Gently massage it in using upward, circular motions until fully absorbed. Allow it to settle for a minute before applying sunscreen or makeup. Use every morning for optimal hydration and protection.",
        howImg: "/products/cetapik.svg",
        products: [
          { title: "Cetaphil Brightening Day Cream", price: "Rs. 1019/-", image: "/products/cetapik.svg" },
        ],
      },
      {
        title: "Sunscreen",
        subtitle: "Sunscreen protects your skin from harmful UV rays, preventing sunburn and premature aging. It's an essential daily step for healthy, radiant, and safeguarded skin.",
        howTitle: "How to Use Sunscreen",
        howBody: "Apply sunscreen as the final step in your morning routine. Use a generous amount and spread it evenly over your face and neck. Let it absorb for a minute before heading outdoors. Reapply every 2–3 hours, especially after sweating or sun exposure, for consistent protection.",
        howImg: "/products/cetayellow.svg",
        products: [
          { title: "Pilgrim SPF 50", price: "Rs. 599/-", image: "/products/ultrasun.png" },
        ],
      },
    ];

  return (
    <PageBackground>
      <Box sx={{ px: 2, pt: 2, width: "100%" }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{
              mt: 2.5,
              mb: 0.75,
              fontFamily: '"SF Pro Display", "SF Pro", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
              fontWeight: 510,
              fontSize: "40px",
              lineHeight: "100%",
              letterSpacing: "0%",
            }}>
              My Skincare Routine – {night ? "Night" : "Day"}
            </Typography>
            <Typography sx={{
              mt: 2,
              mb: 2.5,
              fontSize: { xs: 18, sm: 24 },
              color: "#6b7280",
              letterSpacing: 1.2,
            }}>
              {night ? "NIGHTTIME ROUTINE" : "DAYTIME ROUTINE"}
            </Typography>
          </Box>
          <Switch checked={night} onChange={(e) => setNight(e.target.checked)} />
        </Box>

        {/* STEPS */}
        {steps.map((s, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, mb: 3 }}>
            <StepRail index={i} total={steps.length} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{
                fontSize: { xs: 20, sm: 24 },
                fontWeight: 800,
                color: "#000",
                letterSpacing: 1.2,
              }}>{s.title}</Typography>
              <Typography sx={{
                            mt: 2,
                            mb: 2.5,
                            fontSize: { xs: 12, sm: 16 },
                            fontStyle:"SF Pro Display",
                            color: "#000",
                        }}>
                {s.subtitle}
              </Typography>

              <HowToUseCard title={s.howTitle} body={s.howBody} image={s.howImg} />

              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                {s.products.map((p, idx) => (
                  <Grid item xs={6} key={idx}>
                    <ProductCard {...p} />
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
