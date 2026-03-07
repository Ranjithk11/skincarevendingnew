"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import ProductCard from "./ProductCard";

interface Brand {
  _id: string;
  _key: string;
  name: string;
  label: string;
}

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

  const normalizeBrandKey = (name: unknown) =>
    String(name ?? "").trim().toLowerCase();

  const normalizeProductId = (id: unknown) => {
    const raw = String(id ?? "").trim();
    if (!raw) return "";

    // Common formats:
    // - "products/33945035"
    // - "gid://shopify/Product/33945035"
    // - "33945035"
    const numericMatch = raw.match(/(\d{5,})\/?$/);
    if (numericMatch?.[1]) return numericMatch[1];

    return raw.replace(/^products\//, "");
  };

  const normalizeProductName = (name: unknown) =>
    String(name ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const categories = useMemo(() => {
    const high = data?.recommendedProducts?.highRecommendation;
    if (!Array.isArray(high)) return [];
    return high.filter(Boolean);
  }, [data]);

  const [categoryIndex, setCategoryIndex] = useState(0);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [slotsMap, setSlotsMap] = useState<Record<string, { slotNumber: number; quantity: number }>>({});
  const [slotsNameMap, setSlotsNameMap] = useState<Record<string, { slotNumber: number; quantity: number }>>({});

  useEffect(() => {
    setBrands([]);
    setSelectedBrand(null);
  }, [categories]);

  // Fetch all slots once on mount
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch("/api/admin/slots");
        if (res.ok) {
          const slotsData = await res.json();
          const map: Record<string, { slotNumber: number; quantity: number }> = {};
          const nameMap: Record<string, { slotNumber: number; quantity: number }> = {};
          // Handle both array and object formats
          const slotsArray = Array.isArray(slotsData) 
            ? slotsData 
            : Object.values(slotsData);
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
            }

            const slotNameKey = normalizeProductName(slot?.product_name);
            if (slotNameKey) update(nameMap, slotNameKey);
          });
          setSlotsMap(map);
          setSlotsNameMap(nameMap);
        }
      } catch (err) {
        console.warn("Failed to fetch slots:", err);
      }
    };
    fetchSlots();
  }, []);

  // const brandImageMap = useMemo(() => {
  //   const map = new Map<string, string>();
  //   if (!categories || categories.length === 0) return map;

  //   categories.forEach((cat: any) => {
  //     const prods = cat?.products || [];
  //     prods.forEach((p: any) => {
  //       const brandNameRaw =
  //         p?.brand?.name ??
  //         p?.brand?.label ??
  //         p?.brandName ??
  //         p?.brand_label ??
  //         (typeof p?.brand === "string" ? p.brand : undefined);

  //       const brandKey = normalizeBrandKey(brandNameRaw);
  //       if (!brandKey) return;

  //       const img =
  //         p?.images?.[0]?.url ||
  //         p?.image_url ||
  //         p?.images?.[0] ||
  //         p?.imageUrl ||
  //         "";

  //       if (img && !map.has(brandKey)) {
  //         map.set(brandKey, img);
  //       }
  //     });
  //   });

  //   return map;
  // }, [categories]);

  // const isAllBrandName = (name: unknown) => {
  //   const n = String(name ?? "").trim().toLowerCase();
  //   return n === "all" || n === "all brands";
  // };

  const activeCategory = categories?.[categoryIndex];
  const products = Array.isArray(activeCategory?.products)
    ? activeCategory.products
    : [];

  const visibleProducts = useMemo(() => {
    let filtered = products.filter(Boolean);
    // Filter by brand if selected
    if (selectedBrand) {
      const selectedKey = normalizeBrandKey(selectedBrand);
      filtered = filtered.filter((p: any) => {
        const brandNameRaw =
          p?.brand?.name ??
          p?.brand?.label ??
          p?.brandName ??
          p?.brand_label ??
          (typeof p?.brand === "string" ? p.brand : undefined);
        return normalizeBrandKey(brandNameRaw) === selectedKey;
      });
    }
    return filtered;
  }, [products, selectedBrand]);

  return (
    <PageBackground>
      <Box
        sx={{
          width: "100%",
          mb: 2,
          fontFamily:
            'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 30, mt: 3, mb: 3 }}>
          My Skincare Products
        </Typography>
        <Typography sx={{ fontSize: "24px", letterSpacing: 1, fontWeight: 400, color: "#000", mb: 1 }}>
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

          {/* Vertical divider between category and brand filters */}
          {/* <Box
            aria-hidden
            sx={{
              flex: "0 0 auto",
              width: 4,
              height: 100,
              bgcolor: "#79797aff",
              alignSelf: "center",
              mx: 2,
              borderRadius: 999,
            }}
          /> */}

          {/* Brand filters (same style as categories) */}
          {/* {brands
            .filter((b) => !isAllBrandName(b?.name))
            .slice(0, 8)
            .map((b) => {
              const brandKey = normalizeBrandKey(b.name);
              const img = brandImageMap.get(brandKey);
              const active = normalizeBrandKey(selectedBrand) === brandKey;

              return (
                <Box
                  key={b._key || b._id || b.name}
                  onClick={() => setSelectedBrand(active ? null : b.name)}
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
                      border: active ? "2px solid #0f766e" : "2px solid #e5e7eb",
                      bgcolor: "#ffffff",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {img ? (
                      <Box
                        component="img"
                        src={img}
                        alt={b?.name || "brand"}
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
                      const title = b?.name || "Brand";
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
            })} */}
        </Box>

        <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mt: 1 }}>
          {visibleProducts.length === 0 ? (
            <Grid item xs={12}>
              <Typography sx={{ mt: 1.5, color: "#6b7280" }}>
                No products available for this category.
              </Typography>
            </Grid>
          ) : (
            visibleProducts.map((product: any) => {
              const productId = product?.id ?? product?._id;
              const slotInfo =
                slotsMap[String(productId)] ||
                slotsMap[normalizeProductId(productId)] ||
                slotsNameMap[normalizeProductName(product?.name)];
              // Product must be assigned to a slot to be available from vending machine
              const productQty = slotInfo?.quantity ?? 0;
              const isAvailable = slotInfo ? slotInfo.quantity > 0 : false;
              return (
                <Grid
                  item
                  xs={6}
                  md={4}
                  key={productId}
                  sx={{ display: "flex", justifyContent: "center" }}
                >
                  <ProductCard
                    {...product}
                    category={activeCategory?.productCategory?.title}
                    enabledMask={false}
                    compact={false}
                    horizontalLayout={true}
                    slotNumber={slotInfo?.slotNumber ?? null}
                    isAvailable={isAvailable}
                    quantity={productQty}
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
              );
            })
          )}
        </Grid>
      </Box>
    </PageBackground>
  );
}
