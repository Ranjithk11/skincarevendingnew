"use client";

import React, { useMemo, useState } from "react";
import { Box, Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import ProductCard from "./ProductCard";

type Props = {
  data: any;
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
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ fontWeight: 800, fontSize: 30, mt: 2, mb: 2 }}>
        My Skincare Products
      </Typography>
      <Typography sx={{ fontSize: 18, letterSpacing: 1.6, color: "#000",mb:2 }}>
        WHAT WE RECOMMEND
      </Typography>

      <Box
        sx={{
          mt: 2,
          mb :5,
          display: "flex",
          gap: { xs: 0, md: 0 },
          overflowX: { xs: "auto", md: "hidden" },
          flexWrap: { xs: "nowrap", md: "wrap" },
          justifyContent: { md: "space-between" },
          width: "100%",
          pb: 2,
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
                    sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : null}
              </Box>
              <Typography
                sx={{
                  mt: 0.75,
                  fontSize: { xs: 10, md: 12 },
                  color: "#111827",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c?.productCategory?.title || "Category"}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mt: 2 }}>
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
                      maxWidth: "100%",
                      height: "auto",
                    }
                    : {
                      maxWidth: 500,
                      height: 300,
                    }),
                }}
              />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}
