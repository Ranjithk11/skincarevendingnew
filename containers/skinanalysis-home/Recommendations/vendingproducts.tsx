"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import ProductCard from "./ProductCard";
import {
  useGetProductCategoriesQuery,
  useGetAllBrandsQuery,
} from "@/redux/api/products";

type Props = {
  data: any;
};

const mapProductToCardProps = (product: any) => {
  const imageUrl =
    product?.images?.[0]?.url ||
    product?.image_url ||
    product?.images?.[0] ||
    "";

  const retailPrice =
    product?.retailPrice ??
    product?.retail_price ??
    0;

  const productId = product?._id || product?.id;

  return {
    _id: productId,
    name: product?.name,
    productBenefits: product?.productBenefits || product?.description || "",
    productUse: product?.productUse || "",
    retailPrice,
    matches: product?.matches || [],
    images: imageUrl ? [{ url: imageUrl }] : [],
    shopifyUrl: product?.shopifyUrl || product?.shopify_url || "#buy",
    isShopifyAvailable: product?.isShopifyAvailable ?? product?.in_stock ?? true,
    discount: product?.discount || null,
    category: product?.productCategory?.title || product?.category || "",
  };
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

  // Fetch categories and brands from cloud API (same as /products page)
  const { data: categoriesData } = useGetProductCategoriesQuery({});
  const { data: brandsData } = useGetAllBrandsQuery({});

  const cloudCategories = categoriesData?.data || [];
  const cloudBrands = brandsData?.data || [];

  // State for filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");

  // State for products and slots
  const [products, setProducts] = useState<any[]>([]);
  const [slotsMap, setSlotsMap] = useState<Record<string, { slotNumbers: number[]; quantity: number }>>({});
  const [isLoading, setIsLoading] = useState(false);

  // State for category/brand images
  const [categoryImages, setCategoryImages] = useState<Record<string, string | undefined>>({});
  const [brandImages, setBrandImages] = useState<Record<string, string | undefined>>({});

  // State for categories that have available products in vending machine
  const [availableCategoryIds, setAvailableCategoryIds] = useState<Set<string>>(new Set());

  const normalizeProductId = (id: unknown) => {
    const raw = String(id ?? "").trim();
    if (!raw) return "";
    const numericMatch = raw.match(/(\d{5,})\/?$/);
    if (numericMatch?.[1]) return numericMatch[1];
    return raw.replace(/^products\//, "");
  };

  // Fetch slots on mount
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch("/api/admin/slots");
        if (res.ok) {
          const slotsData = await res.json();
          const map: Record<string, { slotNumbers: number[]; quantity: number }> = {};
          const slotsArray = Array.isArray(slotsData) ? slotsData : Object.values(slotsData);

          slotsArray.forEach((slot: any) => {
            if (slot.product_id) {
              const rawId = String(slot.product_id);
              const cleanId = normalizeProductId(rawId);
              const quantity = Number(slot.quantity || 0);

              const update = (key: string) => {
                if (!key) return;
                const slotId = Number(slot.slot_id);
                if (!Number.isFinite(slotId)) return;
                const existing = map[key];
                if (!existing) {
                  map[key] = { slotNumbers: [slotId], quantity };
                  return;
                }
                if (!existing.slotNumbers.includes(slotId)) {
                  existing.slotNumbers = [...existing.slotNumbers, slotId].sort((a, b) => a - b);
                }
                existing.quantity = Number(existing.quantity || 0) + quantity;
              };

              update(rawId);
              if (cleanId && cleanId !== rawId) update(cleanId);
            }
          });
          setSlotsMap(map);
        }
      } catch (err) {
        console.warn("Failed to fetch slots:", err);
      }
    };
    fetchSlots();
  }, []);

  // Check which categories have available products in vending machine
  useEffect(() => {
    if (cloudCategories.length === 0 || Object.keys(slotsMap).length === 0) return;

    let cancelled = false;

    const checkAvailableCategories = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN || "";
      if (!apiUrl) return;

      const availableIds = new Set<string>();
      availableIds.add("all"); // Always show "All" category

      // Check each category for available products
      for (const cat of cloudCategories) {
        if (cat._id === "all") continue;

        try {
          const res = await fetch(
            `${apiUrl}/product/fetch-by-filter?catId=${cat._id}&limit=100&isShopifyAvailable=true&hasBrand=true`,
            { headers: { "x-db-token": dbToken } }
          );
          const data = await res.json();
          const catProducts = data?.data?.[0]?.products || [];

          // Check if any product in this category is available in vending machine
          const hasAvailable = catProducts.some((p: any) => {
            const productId = p?._id || p?.id;
            const slotInfo = slotsMap[String(productId)] || slotsMap[normalizeProductId(productId)];
            return slotInfo && slotInfo.quantity > 0;
          });

          if (hasAvailable) {
            availableIds.add(cat._id);
          }
        } catch (err) {
          // Skip this category on error
        }
      }

      if (!cancelled) {
        setAvailableCategoryIds(availableIds);
      }
    };

    checkAvailableCategories();
    return () => { cancelled = true; };
  }, [cloudCategories, slotsMap]);

  // Fetch products for selected category/brand (same as /products page)
  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "100");
        params.set("hasBrand", "true");
        params.set("isShopifyAvailable", "true");
        if (selectedCategory !== "all") params.set("catId", selectedCategory);
        if (selectedBrand !== "all") params.set("brandId", selectedBrand);

        const res = await fetch(`/api/admin/products?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        setProducts(Array.isArray(json) ? json : json?.data?.[0]?.products || []);
      } catch (e) {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [selectedCategory, selectedBrand]);

  // Fetch category images
  useEffect(() => {
    if (cloudCategories.length === 0) return;

    const fetchCategoryImages = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN || "";

      const fetchPromises = cloudCategories
        .filter((cat: any) => cat._id !== "all")
        .map(async (cat: any) => {
          try {
            const res = await fetch(
              `${apiUrl}/product/fetch-by-filter?catId=${cat._id}&limit=1&isShopifyAvailable=true&hasBrand=true`,
              { headers: { "x-db-token": dbToken } }
            );
            const data = await res.json();
            return { catId: cat._id, imgUrl: data?.data?.[0]?.products?.[0]?.images?.[0]?.url };
          } catch {
            return { catId: cat._id, imgUrl: undefined };
          }
        });

      const results = await Promise.all(fetchPromises);
      const images: Record<string, string | undefined> = {};
      results.forEach(({ catId, imgUrl }) => {
        if (imgUrl) images[catId] = imgUrl;
      });
      setCategoryImages(images);
    };

    fetchCategoryImages();
  }, [cloudCategories]);

  // Fetch brand images
  useEffect(() => {
    if (cloudBrands.length === 0) return;

    const fetchBrandImages = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN || "";
      if (!apiUrl) return;

      const fetchPromises = cloudBrands
        .filter((b: any) => b?._id && b._id !== "all")
        .map(async (b: any) => {
          try {
            const res = await fetch(
              `${apiUrl}/product/fetch-by-filter?brandId=${b._id}&limit=1&isShopifyAvailable=true&hasBrand=true`,
              { headers: { "x-db-token": dbToken } }
            );
            const data = await res.json();
            return { brandId: b._id, imgUrl: data?.data?.[0]?.products?.[0]?.images?.[0]?.url };
          } catch {
            return { brandId: b._id, imgUrl: undefined };
          }
        });

      const results = await Promise.all(fetchPromises);
      const images: Record<string, string | undefined> = {};
      results.forEach(({ brandId, imgUrl }) => {
        if (imgUrl) images[brandId] = imgUrl;
      });
      setBrandImages(images);
    };

    fetchBrandImages();
  }, [cloudBrands]);

  // Sort products - available first, then by quantity
  const sortedProducts = useMemo(() => {
    const getSlotInfo = (p: any) => {
      const productId = p?.id ?? p?._id;
      return slotsMap[String(productId)] || slotsMap[normalizeProductId(productId)];
    };

    const decorated = products.map((product: any) => {
      const slotInfo = getSlotInfo(product);
      const isAvailable = slotInfo ? slotInfo.quantity > 0 : false;
      const quantity = slotInfo?.quantity ?? 0;
      return { product, slotInfo, isAvailable, quantity };
    });

    // Filter to show only available products
    const availableOnly = decorated.filter((item) => item.isAvailable);

    availableOnly.sort((a, b) => {
      if (a.quantity !== b.quantity) return b.quantity - a.quantity;
      return String(a.product?.name ?? "").localeCompare(String(b.product?.name ?? ""));
    });

    return availableOnly;
  }, [products, slotsMap]);

  // Process personalized recommendations from cloud API (data prop)
  // Group by category, show up to 4 products per category (minimum 2 if available)
  const personalizedByCategory = useMemo(() => {
    const high = data?.recommendedProducts?.highRecommendation;
    if (!Array.isArray(high)) return [];

    const categoryGroups: Array<{ categoryTitle: string; products: any[] }> = [];
    const seenIds = new Set<string>();

    high.forEach((cat: any) => {
      const categoryTitle = cat?.productCategory?.title || "";
      const availableProducts: any[] = [];

      if (Array.isArray(cat?.products)) {
        cat.products.forEach((p: any) => {
          const id = p?._id || p?.id || p?._key;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            // Check if available in vending machine
            const slotInfo = slotsMap[String(id)] || slotsMap[normalizeProductId(id)];
            if (slotInfo && slotInfo.quantity > 0) {
              availableProducts.push({
                product: p,
                slotInfo,
                isAvailable: true,
                quantity: slotInfo.quantity,
                category: categoryTitle,
              });
            }
          }
        });
      }

      // Only include category if it has at least 2 products, show up to 4
      if (availableProducts.length >= 2) {
        categoryGroups.push({
          categoryTitle,
          products: availableProducts.slice(0, 4),
        });
      }
    });

    return categoryGroups;
  }, [data, slotsMap]);

  return (
    <PageBackground>
      <Box
        sx={{
          width: "100%",
          mb: 2,
          fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 30, mt: 3, mb: 3 }}>
          My Skincare Products
        </Typography>

        {/* Personalized Recommendations Section - grouped by category */}
        {personalizedByCategory.length > 0 && (
          <>
            {/* <Typography sx={{ fontSize: "24px", letterSpacing: 1, fontWeight: 400, color: "#9A9A9A", mb: 2 }}>
              PERSONALIZED FOR YOU
            </Typography> */}
            {/* {personalizedByCategory.map((catGroup: any, catIdx: number) => (
              <Box key={`cat-${catIdx}`} sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#333", mb: 1.5 }}>
                  {catGroup.categoryTitle}
                // </Typography>
                <Grid container spacing={{ xs: 1.5, md: 2 }}>
                  {catGroup.products.map((row: any, idx: number) => {
                    const product = row?.product;
                    const slotInfo = row?.slotInfo;
                    const mappedProduct = mapProductToCardProps(product);
                    const productQty = slotInfo?.quantity ?? 0;
                    return (
                      <Grid item xs={6} md={3} key={`personalized-${String(mappedProduct._id)}-${idx}`} sx={{ display: "flex", justifyContent: "center" }}>
                        <ProductCard
                          {...mappedProduct}
                          enabledMask={false}
                          compact={false}
                          horizontalLayout={true}
                          slotNumbers={slotInfo?.slotNumbers ?? null}
                          isAvailable={true}
                          quantity={productQty}
                          cardSx={{ width: "100%", ...(isDesktop ? { maxWidth: 700, minHeight: 380 } : { maxWidth: 700, height: 300 }) }}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))} */}
          </>
        )}

        <Typography sx={{ fontSize: "24px", letterSpacing: 1, fontWeight: 400, color: "#9A9A9A", mb: 1 }}>
          WHAT WE RECOMMEND        </Typography>

        {/* Category Filter */}
        <Box
          sx={{
            mt: 2,
            mb: 4,
            display: "flex",
            gap: 1,
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            pb: 2,
            width: "100%",
          }}
        >
          {cloudCategories
            .filter((category: any) => availableCategoryIds.has(category._id))
            .map((category: any) => {
              const active = selectedCategory === category._id;
              const isAllCategory = category?._id === "all";
              const catImage = categoryImages[category._id];
              return (
                <Box
                  key={category._id}
                  onClick={() => setSelectedCategory(category._id)}
                  sx={{ flex: "0 0 auto", cursor: "pointer", textAlign: "center", minWidth: 100 }}
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
                    {isAllCategory ? (
                      <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#0f766e" }}>All</Typography>
                    ) : catImage ? (
                      <Box component="img" src={catImage} alt={category.title || "category"} sx={{ width: "122px", height: "122px", objectFit: "contain" }} />
                    ) : null}
                  </Box>
                  <Typography sx={{ mt: 0.75, fontSize: 18, color: "#000", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>
                    {category.title}
                  </Typography>
                </Box>
              );
            })}
        </Box>

        {/* Brand Filter */}
        {/* <Typography sx={{ fontSize: 24, color: "#9A9A9A", fontWeight: 400, letterSpacing: 1, textTransform: "uppercase" }}>
          BRAND FILTER
        </Typography>
        <Box sx={{ display: "flex", gap: 2, overflowX: "auto", py: 2, "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}>
          <Box onClick={() => setSelectedBrand("all")} sx={{ flex: "0 0 auto", cursor: "pointer", textAlign: "center", minWidth: 80 }}>
            <Box sx={{ width: { xs: 58, md: 86 }, height: { xs: 58, md: 86 }, borderRadius: "50%", mx: "auto", border: selectedBrand === "all" ? "2px solid #0f766e" : "2px solid #e5e7eb", bgcolor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#0f766e" }}>All</Typography>
            </Box>
            <Typography sx={{ mt: 0.75, fontSize: 18, color: "#000", fontWeight: selectedBrand === "all" ? 600 : 400, whiteSpace: "nowrap" }}>All Brands</Typography>
          </Box>
          {cloudBrands.filter((b: any) => b?._id && b._id !== "all").map((brand: any) => {
            const active = selectedBrand === brand._id;
            const brandImg = brandImages[brand._id];
            return (
              <Box key={brand._id} onClick={() => setSelectedBrand(brand._id)} sx={{ flex: "0 0 auto", cursor: "pointer", textAlign: "center", minWidth: 80 }}>
                <Box sx={{ width: { xs: 58, md: 86 }, height: { xs: 58, md: 86 }, borderRadius: "50%", mx: "auto", border: active ? "2px solid #0f766e" : "2px solid #e5e7eb", bgcolor: "#ffffff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {brandImg ? <Box component="img" src={brandImg} alt={brand.name || "brand"} sx={{ width: "122px", height: "122px", objectFit: "contain" }} /> : null}
                </Box>
                <Typography sx={{ mt: 0.75, fontSize: 18, color: "#000", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{brand.name}</Typography>
              </Box>
            );
          })}
        </Box> */}

        {/* Products Grid - show all for "All" category, limit to 4 for others */}
        <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mt: 2 }}>
          {sortedProducts.length === 0 ? (
            <Grid item xs={12}>
              <Typography sx={{ mt: 1.5, color: "#6b7280" }}>
                {isLoading ? "Loading products..." : "No products available in vending machine for this selection."}
              </Typography>
            </Grid>
          ) : (
            (selectedCategory === "all" ? sortedProducts : sortedProducts.slice(0, 4)).map((row: any, idx: number) => {
              const product = row?.product;
              const slotInfo = row?.slotInfo;
              const mappedProduct = mapProductToCardProps(product);
              const productQty = slotInfo?.quantity ?? 0;
              const isAvailable = slotInfo ? slotInfo.quantity > 0 : false;
              return (
                <Grid item xs={6} md={4} key={`product-${String(mappedProduct._id)}-${idx}`} sx={{ display: "flex", justifyContent: "center" }}>
                  <ProductCard
                    {...mappedProduct}
                    enabledMask={false}
                    compact={false}
                    horizontalLayout={true}
                    slotNumbers={slotInfo?.slotNumbers ?? null}
                    isAvailable={isAvailable}
                    quantity={productQty}
                    cardSx={{ width: "100%", ...(isDesktop ? { maxWidth: 700, minHeight: 380 } : { maxWidth: 700, height: 300 }) }}
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
