"use client";

import React, { useMemo, useState } from "react";
import { Box, Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import ProductCard from "./ProductCard";

type Props = {
  data: any;
};

const PageBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        minHeight: "100%",
        height: "100%",
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

export default function VendingProducts({ data }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const categories = useMemo(() => {
    const high = data?.recommendedProducts?.highRecommendation;
    if (!Array.isArray(high)) return [];
    return high.filter(Boolean);
  }, [data]);

  const [categoryIndex, setCategoryIndex] = useState(0);
  const activeCategory = categories?.[categoryIndex];
  const products = Array.isArray(activeCategory?.products)
    ? activeCategory.products
    : [];

  const visibleProducts = useMemo(() => {
    return products.filter(Boolean);
  }, [products]);

  return (
    <PageBackground>
      <Box
        sx={{
          width: "100%",
          mb:2,
          fontFamily:
            'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 30, mt: 3, mb: 3 }}>
          My Skincare Products
        </Typography>
        <Typography sx={{ fontSize: "24px", letterSpacing: 1,fontWeight:400, color: "#000",mb:1 }}>
          WHAT WE RECOMMEND
        </Typography>

      <Box
        sx={{
          mt: 5,
          mb: 5,
          display: "flex",
          gap: { xs: 0, md: 0 },
          overflowX: { xs: "auto", md: "hidden" },
          flexWrap: { xs: "nowrap", md: "wrap" },
          justifyContent: { md: "space-between" },
          width: "100%",
          pb: 1,
        }}
      >
        {categories.slice(0, 8).map((c: any, idx: number) => {
          const firstImg = c?.products?.[0]?.images?.[0]?.url;
          return (
            <Box
              key={c?.productCategory?._id || idx}
              onClick={() => setCategoryIndex(idx)}
              sx={{
                flex: "0 0 auto",
                width: { xs: 100, md: "calc((100% - 21px) / 8)" },
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <Box
                sx={{
                  width: { xs: 58, md: 86 },
                  height: { xs: 58, md: 86 },
                  borderRadius: "50%",
                  mx: "auto",
                  border:
                    idx === categoryIndex
                      ? "2px solid #0f766e"
                      : "2px solid #e5e7eb",
                  bgcolor: "#ffffff",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  
                }}
              >
                {firstImg ? (
                  <Box
                    component="img"
                    src={firstImg}
                    alt={c?.productCategory?.title || "category"}
                    sx={{ width: "122px", height: "122px", objectFit: "contain" }}
                  />
                ) : null}
              </Box>
              <Typography
                sx={{
                  mt: 0.75,
                  fontSize: "24px",
                  color: "#000",
                  fontWeight: 400,
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  lineHeight: 1.15,
                  fontFamily: "Roboto, system-ui, -apple-system",
                }}
              >
                {(() => {
                  const title = c?.productCategory?.title || "Category";
                  const parts = String(title).trim().split(/\s+/);
                  const first = parts[0] || "";
                  const rest = parts.slice(1).join(" ");

                  return rest ? (
                    <>
                      {first}
                      <br />
                      {rest}
                    </>
                  ) : (
                    first
                  );
                })()}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mt: 1 }}>
        {visibleProducts.length === 0 ? (
          <Grid item xs={12}>
            <Typography sx={{ mt: 1.5, color: "#6b7280" }}>
              No products available for this category.
            </Typography>
          </Grid>
        ) : (
          visibleProducts.map((product: any) => (
            <Grid
              item
              xs={6}
              md={4}
              key={product?._id}
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <ProductCard
                {...product}
                category={activeCategory?.productCategory?.title}
                enabledMask={false}
                compact={false}
                horizontalLayout={true}
                cardSx={{
                  width: "100%",
                  ...(isDesktop
                    ? {
                      maxWidth: 700,
                      minHeight: 380,
                    }
                    : {
                      maxWidth: 700,
                      height: 300,
                    }),
                }}
              />
            </Grid>
          ))
        )}
      </Grid>
      </Box>
    </PageBackground>
  );
}
