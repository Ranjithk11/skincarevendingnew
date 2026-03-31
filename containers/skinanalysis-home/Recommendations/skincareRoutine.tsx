"use client";

import React, { useEffect, useState } from "react";
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
            width: { xs: 240, md: 244 },
            height: { xs: 240, md: 244 },
            objectFit: "cover",
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

  const normalizeProductId = (id: unknown) => {
    const raw = String(id ?? "").trim();
    if (!raw) return "";

    const numericMatch = raw.match(/(\d{5,})\/?$/);
    if (numericMatch?.[1]) return numericMatch[1];

    return raw.replace(/^products\//, "");
  };

  const normalizeProductName = (name: unknown) =>
    String(name ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const [slotsMap, setSlotsMap] = useState<
    Record<string, { slotNumber: number; quantity: number }>
  >({});

  const [slotsNameMap, setSlotsNameMap] = useState<
    Record<string, { slotNumber: number; quantity: number }>
  >({});

  // Store vending machine products with their full details
  const [vendingProducts, setVendingProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch("/api/admin/slots");
        if (!res.ok) return;

        const slotsData = await res.json();
        const map: Record<string, { slotNumber: number; quantity: number }> = {};
        const nameMap: Record<string, { slotNumber: number; quantity: number }> = {};
        const slotsArray = Array.isArray(slotsData) ? slotsData : Object.values(slotsData);
        const productIds: string[] = [];

        slotsArray.forEach((slot: any) => {
          const quantity = Number(slot?.quantity || 0);

          const update = (
            target: Record<string, { slotNumber: number; quantity: number }>,
            key: string
          ) => {
            if (!key) return;
            const existing = target[key];
            if (!existing || quantity > existing.quantity) {
              target[key] = {
                slotNumber: slot.slot_id,
                quantity,
              };
            }
          };

          if (slot?.product_id) {
            const rawId = String(slot.product_id);
            const cleanId = normalizeProductId(rawId);
            update(map, rawId);
            if (cleanId && cleanId !== rawId) update(map, cleanId);
            if (quantity > 0) {
              productIds.push(cleanId || rawId);
            }
          }

          const slotNameKey = normalizeProductName(slot?.product_name);
          if (slotNameKey) update(nameMap, slotNameKey);
        });

        setSlotsMap(map);
        setSlotsNameMap(nameMap);

        // Fetch product details from cloud API for vending machine products
        if (productIds.length > 0) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN || "";
          if (apiUrl) {
            try {
              const productsRes = await fetch(
                `${apiUrl}/product/fetch-by-filter?limit=100&isShopifyAvailable=true&hasBrand=true`,
                { headers: { "x-db-token": dbToken } }
              );
              const productsData = await productsRes.json();
              const allCloudProducts = productsData?.data?.[0]?.products || [];
              
              // Filter to only products in vending machine
              const vendingProds = allCloudProducts.filter((p: any) => {
                const id = p?._id || p?.id;
                return productIds.includes(String(id)) || productIds.includes(normalizeProductId(id));
              });
              setVendingProducts(vendingProds);
            } catch (err) {
              console.warn("Failed to fetch vending products:", err);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch slots:", err);
      }
    };

    fetchSlots();
  }, []);

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

  // Helper to check if product is available in vending machine
  const isProductAvailable = (p: any) => {
    const productId = p?.id ?? p?._id;
    const slotInfo =
      slotsMap[String(productId)] ||
      slotsMap[normalizeProductId(productId)] ||
      slotsNameMap[normalizeProductName(p?.name)];
    return slotInfo && slotInfo.quantity > 0;
  };

  const pickProducts = (keywords: string[], limit: number) => {
    const kw = keywords.map(normalize);
    let candidates: any[] = [];
    
    // First try to find products from matching category in recommendations
    for (const b of productBuckets) {
      const title = b.categoryTitle;
      if (kw.some((k) => title.includes(k))) {
        candidates = [...candidates, ...b.products];
      }
    }

    // Also search in all recommendation products by name/use
    const flat = productBuckets.flatMap((b) => b.products);
    const nameMatches = flat.filter((p: any) => {
      const use = normalize(p?.productUse);
      const name = normalize(p?.name);
      const category = normalize(p?.productCategory?.title);
      return kw.some((k) => use.includes(k) || name.includes(k) || category.includes(k));
    });
    
    // FALLBACK: Also search in vending machine products directly
    const vendingMatches = vendingProducts.filter((p: any) => {
      const use = normalize(p?.productUse);
      const name = normalize(p?.name);
      const category = normalize(p?.productCategory?.title);
      return kw.some((k) => use.includes(k) || name.includes(k) || category.includes(k));
    });
    
    // Combine and deduplicate (recommendations first, then vending fallback)
    const seenIds = new Set<string>();
    const allCandidates: any[] = [];
    [...candidates, ...nameMatches, ...vendingMatches].forEach((p) => {
      const id = p?._id || p?.id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        allCandidates.push(p);
      }
    });
    
    // Filter to only show available products
    const availableProducts = allCandidates.filter(isProductAvailable);
    
    return availableProducts.slice(0, limit);
  };

  const cleanserProducts = pickProducts(["face wash", "cleanser"], 2);
  const serumProducts = pickProducts(["face serum", "serum"], 1);
  const daycreamProducts = pickProducts([
    "day cream",
    "daycream",
    "moisturizer",
    "moisturiser",
    "moisturizing cream",
    "moisturising cream",
  ], 1);
  const sunscreenProducts = pickProducts(["sunscreen", "sun screen", "sunblock", "spf"], 1);
  const underEyeProducts = pickProducts(["under-eye", "under eye", "eye cream"], 1);
  const nightcreamProducts = pickProducts(["night cream", "nightcream", "night"], 1);

  const steps = night
    ? [
      {
        title: "Cleanser",
        subtitle: "A cleanser gently removes dirt, oil, and impurities, leaving your skin fresh and clean. It’s the first step to a clear, healthy, and glowing complexion.",
        howTitle: "How to Use Your Cleanser",
        howBody: " Wet your face with lukewarm water and apply a small amount of cleanser. Gently massage your face in circular motions for 30–60 seconds, then rinse thoroughly. Pat your face dry with a clean towel and apply moisturizer.",
        howImg: "/products/dummyproduct2.jpeg",
        products: cleanserProducts,
      },
      {
        title: "Face Serum",
        subtitle: "A face serum is a lightweight, fast-absorbing treatment designed to deliver concentrated active ingredients deep into the skin. It helps target specific concerns such as dullness, uneven tone, fine lines, or dehydration.",
        howTitle: "How to Use Serum",
        howBody: " Apply a few drops of face serum on clean, dry skin after washing your face. Gently pat or massage it into your skin until fully absorbed. Use it before applying moisturizer, usually once or twice a day (morning and night).",
        howImg: "/products/dummyproduct2.jpeg",
        products: serumProducts,
      },
      // {
      //   title: "Under Eye Cream",
      //   subtitle: "Under eye cream helps hydrate and nourish the delicate under-eye area, reducing the appearance of dark circles, puffiness, and fine lines.",
      //   howTitle: "How to Use Under Eye Cream",
      //   howBody: "Take a small amount of under eye cream on your fingertip. Gently dab it around the under eye area without rubbing. Use it every night to help reduce dark circles and keep the skin hydrated.",
      //   howImg: "/products/dummyproduct2.jpeg",
      //   products: underEyeProducts,
      // },
           {
        title: "Night Cream",
        subtitle: "Night cream provides essential hydration and protection, shielding your skin from environmental damage. It keeps your complexion smooth, radiant, and ready to face the day.",
        howTitle: "How to Use Your Night Cream",
        howBody: "Take a small amount of under eye cream on your fingertip. Gently dab it around the under eye area without rubbing. Use it every night to help reduce dark circles and keep the skin hydrated.",
        howImg: "/products/dummyproduct2.jpeg",
        products: nightcreamProducts,
      },
    ]
    : [
      {
        title: "Cleanser",
        subtitle: "A cleanser gently removes dirt, oil, and impurities, leaving your skin fresh and clean. It’s the first step to a clear, healthy, and glowing complexion.",
        howTitle: "How to Use Your Cleanser",
        howBody: " Wet your face with lukewarm water and apply a small amount of cleanser. Gently massage your face in circular motions for 30–60 seconds, then rinse thoroughly. Pat your face dry with a clean towel and apply moisturizer.",
        howImg: "/products/dummyProduct.jpeg",
        products: cleanserProducts,
      },
      {
        title: "Daycream",
        subtitle: "Day cream provides essential hydration and protection, shielding your skin from environmental damage. It keeps your complexion smooth, radiant, and ready to face the day.",
        howTitle: "How to Use Daycream",
        howBody: "Take a small amount of day cream and apply it on your clean face. Gently massage in circular motions until it is fully absorbed into the skin. Use it every morning to keep your skin moisturized and protected.",
        howImg: "/products/dummyProduct.jpeg",
        products: daycreamProducts,
      },
      // {
      //   title: "Under Eye Cream",
      //   subtitle: "Under eye cream helps hydrate and nourish the delicate under-eye area, reducing the appearance of dark circles, puffiness, and fine lines.",
      //   howTitle: "How to Use Under Eye Cream",
      //   howBody: "Take a small amount of under eye cream on your fingertip. Gently dab it around the under eye area without rubbing. Use it every day to keep the under-eye area hydrated.",
      //   howImg: "/products/dummyProduct.jpeg",
      //   products: underEyeProducts,
      // },
      {
        title: "Sunscreen",
        subtitle: "Sunscreen protects your skin from harmful UV rays, preventing sunburn and premature aging. It's an essential daily step for healthy, radiant, and safeguarded skin.",
        howTitle: "How to Use Sunscreen",
        howBody: "Take a small amount of sunscreen and apply it evenly on your face and neck. Gently spread it until it is fully absorbed into the skin. Apply it every morning and reapply if you are exposed to sunlight for a long time.",
        howImg: "/products/dummyProduct.jpeg",
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
                NIGHT
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
                    {(() => {
                      const productId = p?.id ?? p?._id;
                      const slotInfo =
                        slotsMap[String(productId)] ||
                        slotsMap[normalizeProductId(productId)] ||
                        slotsNameMap[normalizeProductName(p?.name)];
                      const productQty = slotInfo?.quantity ?? 0;
                      const isAvailable = slotInfo ? slotInfo.quantity > 0 : false;

                      return (
                        <ProductCard
                          {...p}
                          category={s.title}
                          enabledMask={false}
                          compact={false}
                          horizontalLayout={true}
                          slotNumber={slotInfo?.slotNumber ?? null}
                          isAvailable={isAvailable}
                          quantity={productQty}
                          cardSx={{ width: "100%" }}
                        />
                      );
                    })()}
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
