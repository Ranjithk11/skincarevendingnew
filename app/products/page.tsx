"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Box, Typography, Grid, useMediaQuery, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import {
  useGetProductCategoriesQuery,
  useGetAllBrandsQuery
} from "@/redux/api/products";
import { APP_ROUTES } from "@/utils/routes";
import TopLogo from "@/containers/skinanalysis-home/Recommendations/TopLogo";
import ProductCard from "@/containers/skinanalysis-home/Recommendations/ProductCard";
import { useCart } from "@/containers/skinanalysis-home/Recommendations/CartContext";
import CartProduct from "@/containers/skinanalysis-home/Recommendations/cartProduct";

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
    enabledMask: false,
    category: product?.productCategory?.title || product?.category || "",
    compact: false,
    horizontalLayout: true,
    cardSx: { width: "100%" },
  };
};

export default function BrowseProductsPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const showBrandFilters = true;
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [openCart, setOpenCart] = useState(false);
  const { count: cartCount } = useCart();
  const isKiosk = false;

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [slotsMap, setSlotsMap] = useState<Record<string, { slotNumbers: number[]; quantity: number }>>({});

  const normalizeProductId = (id: unknown) => {
    const raw = String(id ?? "").trim();
    if (!raw) return "";
    const numericMatch = raw.match(/(\d{5,})\/?$/);
    if (numericMatch?.[1]) return numericMatch[1];
    return raw.replace(/^products\//, "");
  };
  const { data: categoriesData } = useGetProductCategoriesQuery({});
  const { data: brandsData } = useGetAllBrandsQuery({});

  const categories = categoriesData?.data || [];
  const brands = brandsData?.data || [];

  const isAllBrandName = (name: unknown) => {
    const n = String(name ?? "").trim().toLowerCase();
    return n === "all" || n === "all brands";
  };

  // State to store category images
  const [categoryImages, setCategoryImages] = useState<Record<string, string | undefined>>({});
  const [brandImages, setBrandImages] = useState<Record<string, string | undefined>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [brandImagesLoaded, setBrandImagesLoaded] = useState(false);

  const categoryStripRef = useRef<HTMLDivElement | null>(null);
  const categoryDragRef = useRef<{ dragging: boolean; startX: number; startScrollLeft: number }>(
    { dragging: false, startX: 0, startScrollLeft: 0 }
  );

  // Fetch all slots once on mount
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch("/api/admin/slots");
        if (res.ok) {
          const slotsData = await res.json();
          const map: Record<string, { slotNumbers: number[]; quantity: number }> = {};
          // Handle both array and object formats
          const slotsArray = Array.isArray(slotsData)
            ? slotsData
            : Object.values(slotsData);
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

    decorated.sort((a: any, b: any) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      if (a.quantity !== b.quantity) return b.quantity - a.quantity;
      return String(a.product?.name ?? "").localeCompare(String(b.product?.name ?? ""));
    });

    return decorated;
  }, [products, slotsMap]);

  // Fetch products for selected category
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
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

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to load products: ${res.status}`);
        }

        const json = await res.json();
        if (cancelled) return;

        setProducts(Array.isArray(json) ? json : json?.data?.[0]?.products || []);
      } catch (e) {
        if (!cancelled) {
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, selectedBrand]);

  // Fetch all category images in parallel once categories are loaded
  useEffect(() => {
    if (imagesLoaded || categories.length === 0) return;

    const fetchAllCategoryImages = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN || "";

      // Create fetch promises for all categories (except "all")
      const fetchPromises = categories
        .filter((cat: any) => cat._id !== "all")
        .map(async (cat: any) => {
          try {
            const res = await fetch(
              `${apiUrl}/product/fetch-by-filter?catId=${cat._id}&limit=1&isShopifyAvailable=true&hasBrand=true`,
              { headers: { "x-db-token": dbToken } }
            );
            const data = await res.json();
            const imgUrl = data?.data?.[0]?.products?.[0]?.images?.[0]?.url;
            return { catId: cat._id, imgUrl };
          } catch {
            return { catId: cat._id, imgUrl: undefined };
          }
        });

      // Also fetch for "all" category
      fetchPromises.push(
        fetch(`${apiUrl}/product/fetch-by-filter?limit=1&isShopifyAvailable=true&hasBrand=true`, {
          headers: { "x-db-token": dbToken }
        })
          .then(res => res.json())
          .then(data => ({ catId: "all", imgUrl: data?.data?.[0]?.products?.[0]?.images?.[0]?.url }))
          .catch(() => ({ catId: "all", imgUrl: undefined }))
      );

      // Execute all in parallel
      const results = await Promise.all(fetchPromises);

      // Build images map
      const images: Record<string, string | undefined> = {};
      results.forEach(({ catId, imgUrl }) => {
        if (imgUrl) images[catId] = imgUrl;
      });

      setCategoryImages(images);
      setImagesLoaded(true);
    };

    fetchAllCategoryImages();
  }, [categories, imagesLoaded]);

  // Fetch all brand images in parallel once brands are loaded
  useEffect(() => {
    if (brandImagesLoaded || brands.length === 0) return;

    const fetchAllBrandImages = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN || "";
      if (!apiUrl) return;

      const fetchPromises = brands
        .filter((b: any) => b?._id && b._id !== "all")
        .map(async (b: any) => {
          try {
            const res = await fetch(
              `${apiUrl}/product/fetch-by-filter?brandId=${b._id}&limit=1&isShopifyAvailable=true&hasBrand=true`,
              { headers: { "x-db-token": dbToken } }
            );
            const data = await res.json();
            const imgUrl = data?.data?.[0]?.products?.[0]?.images?.[0]?.url;
            return { brandId: b._id, imgUrl };
          } catch {
            return { brandId: b._id, imgUrl: undefined };
          }
        });

      // Also fetch for "all" brand
      fetchPromises.push(
        fetch(`${apiUrl}/product/fetch-by-filter?limit=1&isShopifyAvailable=true&hasBrand=true`, {
          headers: { "x-db-token": dbToken },
        })
          .then((res) => res.json())
          .then((data) => ({
            brandId: "all",
            imgUrl: data?.data?.[0]?.products?.[0]?.images?.[0]?.url,
          }))
          .catch(() => ({ brandId: "all", imgUrl: undefined }))
      );

      const results = await Promise.all(fetchPromises);
      const images: Record<string, string | undefined> = {};
      results.forEach(({ brandId, imgUrl }) => {
        if (imgUrl) images[brandId] = imgUrl;
      });

      setBrandImages(images);
      setBrandImagesLoaded(true);
    };

    fetchAllBrandImages();
  }, [brands, brandImagesLoaded]);

  const handleGoBack = () => {
    router.push(APP_ROUTES.HOME);
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        bgcolor: "#F9F9F9",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      {/* Top Logo Bar - similar to newUi.tsx TopLogo */}
      <TopLogo
        isKiosk={isKiosk}
        cartCount={cartCount}
        onCartClick={() => setOpenCart(true)}
        onScanAgainClick={() => router.push(APP_ROUTES.HOME)}
      />

      {/* Main Content */}
      <PageBackground>
        <Box
          sx={{
            pt: isDesktop ? 20 : 16,
            px: isDesktop ? 4 : 2,
            pb: 4,
            minHeight: "100vh",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            position: "relative",
          }}
        >
          {/* Title */}
          <Typography
            sx={{
              mt: 3,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              fontWeight: 800,
              fontSize: 32,
              lineHeight: "100%",
              color: "#111827",
            }}
          >
            My Skincare Products
          </Typography>

          <Typography
            sx={{
              mt: 3,
              fontSize: 24,
              color: "#9A9A9A",
              fontWeight: 400,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            WHAT WE RECOMMEND
          </Typography>

          {/* Category + Brand Tabs - circular icons with dynamic images */}
          <Box
            ref={categoryStripRef}
            onPointerDown={(e) => {
              const el = categoryStripRef.current;
              if (!el) return;
              categoryDragRef.current.dragging = true;
              categoryDragRef.current.startX = e.clientX;
              categoryDragRef.current.startScrollLeft = el.scrollLeft;
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const el = categoryStripRef.current;
              if (!el) return;
              if (!categoryDragRef.current.dragging) return;
              const dx = e.clientX - categoryDragRef.current.startX;
              el.scrollLeft = categoryDragRef.current.startScrollLeft - dx;
            }}
            onPointerUp={() => {
              categoryDragRef.current.dragging = false;
            }}
            onPointerCancel={() => {
              categoryDragRef.current.dragging = false;
            }}
            sx={{
              mt: 2,
              mb: 4,
              display: "flex",
              gap: 1,
              overflowX: "auto",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-x",
              overscrollBehaviorX: "contain",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              pb: 2,
              width: "100%",
            }}
          >
            {categories.map((category: any, idx: number) => {
              const active = selectedCategory === category._id;
              const isAllCategory = category?._id === "all";
              const firstImg = categoryImages[category._id];
              return (
                <Box
                  key={category._id}
                  onClick={() => setSelectedCategory(category._id)}
                  sx={{
                    flex: "0 0 auto",
                    cursor: "pointer",
                    textAlign: "center",
                    minWidth: 100,
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
                    {isAllCategory ? (
                      <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#0f766e" }}>
                        All
                      </Typography>
                    ) : firstImg ? (
                      <Box
                        component="img"
                        src={firstImg}
                        alt={category.title || "category"}
                        sx={{ width: "122px", height: "122px", objectFit: "contain" }}
                      />
                    ) : null}
                  </Box>
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontSize: 18,
                      color: "#000",
                      fontWeight: active ? 600 : 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {category.title}
                  </Typography>
                </Box>
              );
            })}

          </Box>
          <Typography sx={{
            fontSize: 24,
            color: "#9A9A9A",
            fontWeight: 400,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}>Brand filter</Typography>

          {/* Brand Filters Row */}
          {showBrandFilters && (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                py: 2,
                px: 1,
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {/* All Brands Option */}
              <Box
                onClick={() => setSelectedBrand("all")}
                sx={{
                  flex: "0 0 auto",
                  cursor: "pointer",
                  textAlign: "center",
                  minWidth: 100,
                }}
              >
                <Box
                  sx={{
                    width: { xs: 58, md: 86 },
                    height: { xs: 58, md: 86 },
                    borderRadius: "50%",
                    mx: "auto",
                    border: selectedBrand === "all" ? "2px solid #0f766e" : "2px solid #e5e7eb",
                    bgcolor: "#ffffff",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#0f766e" }}>All</Typography>
                </Box>
                <Typography
                  sx={{
                    mt: 0.75,
                    fontSize: 18,
                    color: "#000",
                    fontWeight: selectedBrand === "all" ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  All Brands
                </Typography>
              </Box>

              {brands
                .filter((brand: any) => !isAllBrandName(brand?.name))
                .map((brand: any) => {
                  const active = selectedBrand === brand._id;
                  const firstImg = brandImages[brand._id];

                  return (
                    <Box
                      key={brand._id}
                      onClick={() => setSelectedBrand(brand._id)}
                      sx={{
                        flex: "0 0 auto",
                        cursor: "pointer",
                        textAlign: "center",
                        minWidth: 100,
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
                        {firstImg ? (
                          <Box
                            component="img"
                            src={firstImg}
                            alt={brand?.name || "brand"}
                            sx={{ width: "122px", height: "122px", objectFit: "contain" }}
                          />
                        ) : null}
                      </Box>
                      <Typography
                        sx={{
                          mt: 0.75,
                          fontSize: 18,
                          color: "#000",
                          fontWeight: active ? 600 : 400,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {brand.name}
                      </Typography>
                    </Box>
                  );
                })}
            </Box>
          )}

          {/* Products Grid */}
          <Box
            sx={{
              width: "100%",
              mb: 2,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
            }}
          >
            {isLoading ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: 28, color: "#666" }}>
                  Loading products...
                </Typography>
              </Box>
            ) : products.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Box
                  component="img"
                  src="/wending/productlog.svg"
                  alt="No products"
                  sx={{ width: 100, height: 100, opacity: 0.3, mb: 2 }}
                />
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#4b5563", mb: 1 }}>
                  No products found
                </Typography>
                <Typography sx={{ fontSize: 16, color: "#9ca3af" }}>
                  Try selecting a different category
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {sortedProducts.map((row: any, idx: number) => {
                  const product = row?.product;
                  const slotInfo = row?.slotInfo;
                  const productId = product?.id ?? product?._id;
                  // Product must be assigned to a slot to be available from vending machine
                  const productQty = slotInfo?.quantity ?? 0;
                  const isAvailable = slotInfo ? slotInfo.quantity > 0 : false;
                  return (
                    <Grid
                      item
                      xs={6}
                      md={6}
                      key={`${String(productId)}-${(slotInfo?.slotNumbers || []).join("-") || "na"}-${idx}`}
                    >
                      <ProductCard
                        {...mapProductToCardProps(product)}
                        slotNumbers={slotInfo?.slotNumbers ?? null}
                        isAvailable={isAvailable}
                        quantity={productQty}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Box>
      </PageBackground>

      <CartProduct
        open={openCart}
        onClose={() => setOpenCart(false)}
      />
    </Box>
  );
}
