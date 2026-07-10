"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, Grid, Typography } from "@mui/material";
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
const normalizeText = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const normalizeProductId = (id: unknown) => {
  const raw = String(id ?? "").trim();
  if (!raw) return "";

  const numericMatch = raw.match(/(\d{5,})\/?$/);
  if (numericMatch?.[1]) return numericMatch[1];

  return raw.replace(/^products\//, "");
};

const normalizeProductName = (name: unknown) => normalizeText(name);

const normalizeNamePrefix = (name: unknown) =>
  String(name ?? "")
    .toUpperCase()
    .trim()
    .slice(0, 20);

type SlotInfo = { slotNumber: number; quantity: number };

const ROUTINE_STEP_MATCHERS: Record<
  string,
  { positives: string[]; negatives: string[]; categoryHints: string[] }
> = {
  cleanser: {
    positives: ["face wash", "facewash", "cleanser", "cleansing water", "micellar"],
    negatives: [
      "serum",
      "sunscreen",
      "sun screen",
      "sunblock",
      "sun lotion",
      "sun gel",
      "moistur",
      "night cream",
      "night creme",
      "night gel",
      "eye cream",
      "body lotion",
      "peeling solution",
      "face mask",
      "sleeping mask",
      "toner",
      "cleansing bar",
    ],
    categoryHints: ["face wash", "cleanser"],
  },
  serum: {
    positives: ["face serum", "serum"],
    negatives: [
      "cleanser",
      "face wash",
      "sunscreen",
      "moistur",
      "night cream",
      "eye cream",
      "mask",
      "toner",
      "body lotion",
    ],
    categoryHints: ["face serum", "serum"],
  },
  daycream: {
    positives: [
      "day cream",
      "daycream",
      "day creme",
      "moisturizer",
      "moisturiser",
      "moisturis",
      "moisturiz",
      "moisturizing cream",
      "moisturising cream",
      "face moisturizer",
      "face moisturiser",
      "hydration",
      "hydrating",
    ],
    negatives: [
      "cleanser",
      "face wash",
      "serum",
      "sunscreen",
      "sun screen",
      "sunblock",
      "sun lotion",
      "sun gel",
      "night cream",
      "night creme",
      "night gel",
      "eye cream",
      "body lotion",
      "baby",
      "peeling",
      "face mask",
      "sleeping mask",
      "toner",
      "cleansing bar",
    ],
    categoryHints: ["day cream", "moistur"],
  },
  sunscreen: {
    positives: ["sunscreen", "sun screen", "sunblock", "spf", "sun lotion", "sun gel"],
    negatives: [
      "cleanser",
      "face wash",
      "serum",
      "moistur",
      "night cream",
      "eye cream",
      "mask",
      "toner",
      "body lotion",
      "baby body",
    ],
    categoryHints: ["sunscreen"],
  },
  nightcream: {
    positives: [
      "night cream",
      "nightcream",
      "night creme",
      "night gel",
      "night comfort cream",
      "sleeping mask",
    ],
    negatives: [
      "cleanser",
      "face wash",
      "sunscreen",
      "sun screen",
      "serum",
      "eye cream",
      "body lotion",
      "baby",
      "toner",
      "peeling",
      "face mask",
    ],
    categoryHints: ["night cream", "night"],
  },
  undereye: {
    positives: ["under-eye", "under eye", "eye cream"],
    negatives: ["cleanser", "sunscreen", "serum", "face wash"],
    categoryHints: ["under eye", "eye cream"],
  },
};

function getProductText(product: any): string {
  return normalizeText(
    [
      product?.name,
      product?.productUse,
      product?.productCategory?.title,
      product?.category,
      product?.productBenefits,
    ].join(" ")
  );
}

function matchesRoutineStep(product: any, stepId: string): boolean {
  const matcher = ROUTINE_STEP_MATCHERS[stepId];
  if (!matcher) return false;

  const text = getProductText(product);
  const category = normalizeText(product?.productCategory?.title || product?.category);

  const positiveMatch =
    matcher.positives.some((term) => text.includes(term)) ||
    matcher.categoryHints.some((term) => category.includes(term));

  if (!positiveMatch) return false;
  if (matcher.negatives.some((term) => text.includes(term))) return false;
  return true;
}

function mapProductToCardProps(product: any) {
  const productId = product?._id || product?.id;
  const imageUrl =
    product?.images?.[0]?.url ||
    product?.image_url ||
    (typeof product?.images?.[0] === "string" ? product.images[0] : "");

  return {
    ...product,
    _id: productId,
    id: productId,
    name: product?.name,
    productBenefits: product?.productBenefits || product?.description || "",
    productUse: product?.productUse || "",
    retailPrice: product?.retailPrice ?? product?.retail_price ?? 0,
    matches: product?.matches || [],
    images: imageUrl ? [{ url: imageUrl }] : product?.images || [],
    shopifyUrl: product?.shopifyUrl || product?.shopify_url || "#buy",
    productCategory: product?.productCategory || {
      title: product?.category || "",
    },
    skinTypes: product?.skinTypes || product?.skin_types || [],
  };
}

/* ===============================
   MAIN PAGE
================================ */
export default function SkincareRoutinePage({ recommendationData }: Props) {
  const [night, setNight] = useState(false);

  const [slotsMap, setSlotsMap] = useState<Record<string, SlotInfo>>({});
  const [slotsNameMap, setSlotsNameMap] = useState<Record<string, SlotInfo>>({});
  const [vendingProducts, setVendingProducts] = useState<any[]>([]);

  useEffect(() => {
    const mergeSlotEntry = (
      target: Record<string, SlotInfo>,
      key: string,
      slotNumber: number,
      quantity: number
    ) => {
      if (!key || !Number.isFinite(slotNumber)) return;
      const existing = target[key];
      if (!existing || quantity > existing.quantity) {
        target[key] = { slotNumber, quantity };
      }
    };

    const fetchMachineCatalog = async () => {
      try {
        const [slotsRes, productsRes] = await Promise.all([
          fetch("/api/admin/slots"),
          fetch("/api/admin/products?limit=1000&hasBrand=true&isShopifyAvailable=true"),
        ]);

        if (!slotsRes.ok) return;

        const slotsData = await slotsRes.json();
        const map: Record<string, SlotInfo> = {};
        const nameMap: Record<string, SlotInfo> = {};
        const slotsArray = Array.isArray(slotsData) ? slotsData : Object.values(slotsData);

        slotsArray.forEach((slot: any) => {
          const quantity = Number(slot?.quantity || 0);
          const slotNumber = Number(slot?.slot_id);
          if (!Number.isFinite(slotNumber)) return;

          if (slot?.product_id) {
            const rawId = String(slot.product_id);
            const cleanId = normalizeProductId(rawId);
            mergeSlotEntry(map, rawId, slotNumber, quantity);
            if (cleanId && cleanId !== rawId) mergeSlotEntry(map, cleanId, slotNumber, quantity);
            if (cleanId) mergeSlotEntry(map, `products/${cleanId}`, slotNumber, quantity);
          }

          const fullNameKey = normalizeProductName(slot?.product_name);
          const prefixNameKey = normalizeNamePrefix(slot?.product_name);
          if (fullNameKey) mergeSlotEntry(nameMap, fullNameKey, slotNumber, quantity);
          if (prefixNameKey) mergeSlotEntry(nameMap, `prefix:${prefixNameKey}`, slotNumber, quantity);
        });

        setSlotsMap(map);
        setSlotsNameMap(nameMap);

        // The catalog fetch is only used to ENRICH slot products (benefits,
        // shopify url, images). It is capped by the backend (max ~100 items)
        // and filtered by brand/shopify, so it must NOT be the source of truth
        // for what's in the machine — otherwise slotted products outside that
        // window (e.g. night cream, sunscreen, cleanser, moisturizer) would be
        // silently dropped from the routine.
        const productsPayload = productsRes.ok ? await productsRes.json() : null;
        const allProducts = Array.isArray(productsPayload)
          ? productsPayload
          : productsPayload?.data || [];

        const catalogById = new Map<string, any>();
        const catalogByName = new Map<string, any>();
        allProducts.forEach((product: any) => {
          const cleanId = normalizeProductId(product?.id ?? product?._id);
          if (cleanId && !catalogById.has(cleanId)) catalogById.set(cleanId, product);
          const nameKey = normalizeProductName(product?.name);
          if (nameKey && !catalogByName.has(nameKey)) catalogByName.set(nameKey, product);
        });

        // Build the machine product list directly from the slots. Every product
        // physically loaded into a slot is included, regardless of the catalog
        // window, so each routine step can find its match.
        const inMachine = slotsArray
          .filter((slot: any) => {
            const hasProduct = slot?.product_id || slot?.product_name;
            return hasProduct && Number(slot?.quantity || 0) > 0;
          })
          .map((slot: any) => {
            const cleanId = normalizeProductId(slot?.product_id);
            const nameKey = normalizeProductName(slot?.product_name);
            const catalog =
              (cleanId && catalogById.get(cleanId)) ||
              (nameKey && catalogByName.get(nameKey)) ||
              {};

            const resolvedId =
              cleanId ||
              normalizeProductId(catalog?._id ?? catalog?.id) ||
              `slot-${slot.slot_id}`;

            return mapProductToCardProps({
              ...catalog,
              _id: resolvedId,
              id: resolvedId,
              name: catalog?.name || slot?.product_name,
              category:
                slot?.category ||
                catalog?.category ||
                catalog?.productCategory?.title ||
                "",
              image_url: slot?.image_url || catalog?.image_url,
              retail_price:
                slot?.retail_price ?? catalog?.retail_price ?? catalog?.retailPrice,
              quantity: Number(slot?.quantity || 0),
            });
          });

        setVendingProducts(inMachine as any[]);
      } catch (err) {
        console.warn("Failed to fetch machine catalog for routine:", err);
      }
    };

    fetchMachineCatalog();
  }, []);

  const highRecommendations = recommendationData?.recommendedProducts?.highRecommendation;
  const productBuckets: Array<{ categoryTitle: string; products: any[] }> = useMemo(
    () =>
      Array.isArray(highRecommendations)
        ? highRecommendations
            .filter(Boolean)
            .map((c: any) => ({
              categoryTitle: normalizeText(c?.productCategory?.title),
              products: Array.isArray(c?.products)
                ? c.products.filter(Boolean).map(mapProductToCardProps)
                : [],
            }))
        : [],
    [highRecommendations]
  );

  const recommendedProductIds = useMemo(() => {
    const ids = new Set<string>();
    productBuckets.forEach((bucket) => {
      bucket.products.forEach((product) => {
        const id = normalizeProductId(product?._id || product?.id);
        if (id) ids.add(id);
      });
    });
    return ids;
  }, [productBuckets]);

  const getSlotInfo = (product: any): SlotInfo | undefined => {
    const productId = product?.id ?? product?._id;
    const rawId = String(productId ?? "").trim();
    const cleanId = normalizeProductId(productId);
    const keys = [rawId, cleanId, cleanId ? `products/${cleanId}` : ""].filter(Boolean);

    for (const key of keys) {
      if (slotsMap[key]) return slotsMap[key];
    }

    const fullNameKey = normalizeProductName(product?.name);
    const prefixNameKey = normalizeNamePrefix(product?.name);
    if (fullNameKey && slotsNameMap[fullNameKey]) return slotsNameMap[fullNameKey];
    if (prefixNameKey && slotsNameMap[`prefix:${prefixNameKey}`]) {
      return slotsNameMap[`prefix:${prefixNameKey}`];
    }

    return undefined;
  };

  const pickProducts = (stepId: string, limit: number) => {
    const recommendedMatches = productBuckets
      .flatMap((bucket) => bucket.products)
      .filter(
        (product) =>
          matchesRoutineStep(product, stepId) && getSlotInfo(product)?.quantity
      );

    const machineMatches = vendingProducts.filter((product) =>
      matchesRoutineStep(product, stepId)
    );

    const seen = new Set<string>();
    const ranked: any[] = [];

    [...recommendedMatches, ...machineMatches].forEach((product) => {
      const id = normalizeProductId(product?._id || product?.id);
      if (!id || seen.has(id)) return;
      seen.add(id);

      const slotInfo = getSlotInfo(product);
      if (!slotInfo || slotInfo.quantity <= 0) return;

      ranked.push({
        product: mapProductToCardProps(product),
        slotInfo,
        recommended: recommendedProductIds.has(id),
        quantity: slotInfo.quantity,
      });
    });

    ranked.sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      if (a.quantity !== b.quantity) return b.quantity - a.quantity;
      return String(a.product?.name ?? "").localeCompare(String(b.product?.name ?? ""));
    });

    return ranked.slice(0, limit).map((row) => row.product);
  };

  const cleanserProducts = useMemo(() => pickProducts("cleanser", 2), [vendingProducts, productBuckets, slotsMap, slotsNameMap, recommendedProductIds]);
  const serumProducts = useMemo(() => pickProducts("serum", 2), [vendingProducts, productBuckets, slotsMap, slotsNameMap, recommendedProductIds]);
  const daycreamProducts = useMemo(() => pickProducts("daycream", 2), [vendingProducts, productBuckets, slotsMap, slotsNameMap, recommendedProductIds]);
  const sunscreenProducts = useMemo(() => pickProducts("sunscreen", 2), [vendingProducts, productBuckets, slotsMap, slotsNameMap, recommendedProductIds]);
  const underEyeProducts = useMemo(() => pickProducts("undereye", 1), [vendingProducts, productBuckets, slotsMap, slotsNameMap, recommendedProductIds]);
  const nightcreamProducts = useMemo(() => pickProducts("nightcream", 2), [vendingProducts, productBuckets, slotsMap, slotsNameMap, recommendedProductIds]);

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
                      const mapped = mapProductToCardProps(p);
                      const slotInfo = getSlotInfo(mapped);
                      const productQty = slotInfo?.quantity ?? 0;
                      const isAvailable = productQty > 0;

                      return (
                        <ProductCard
                          {...mapped}
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
