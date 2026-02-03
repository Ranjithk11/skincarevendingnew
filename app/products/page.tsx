"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Box, Typography, Grid, useMediaQuery, useTheme, Chip } from "@mui/material";
import { useRouter } from "next/navigation";
import { 
  useLazyGetFilteredProductsQuery, 
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

const mapProductToCardProps = (product: any) => ({
  _id: product._id,
  name: product.name,
  productBenefits: product.productBenefits || "",
  productUse: product.productUse || "",
  retailPrice: product.retailPrice,
  matches: product.matches || [],
  images: product.images || [],
  shopifyUrl: product.shopifyUrl || "#buy",
  isShopifyAvailable: product.isShopifyAvailable,
  discount: product.discount || null,
  enabledMask: false,
  category: product.productCategory?.title || "",
  compact: false,
  horizontalLayout: true,
  cardSx: { width: "100%" },
});

export default function BrowseProductsPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [openCart, setOpenCart] = useState(false);
  const { count: cartCount } = useCart();
  const isKiosk = false;

  const [getFilteredProducts, { data, isLoading }] = useLazyGetFilteredProductsQuery();
  const { data: categoriesData } = useGetProductCategoriesQuery({});
  const { data: brandsData } = useGetAllBrandsQuery({});

  const categories = categoriesData?.data || [];
  const brands = brandsData?.data || [];

  // State to store category images
  const [categoryImages, setCategoryImages] = useState<Record<string, string | undefined>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const categoryStripRef = useRef<HTMLDivElement | null>(null);
  const categoryDragRef = useRef<{ dragging: boolean; startX: number; startScrollLeft: number }>(
    { dragging: false, startX: 0, startScrollLeft: 0 }
  );

  // Fetch products for selected category
  useEffect(() => {
    getFilteredProducts({
      page: 1,
      limit: 100,
      hasBrand: true,
      isShopifyAvailable: true,
      ...(selectedCategory !== "all" && { catId: selectedCategory }),
      ...(selectedBrand !== "all" && { brandId: selectedBrand }),
    });
  }, [selectedCategory, selectedBrand]);

  const products = data?.data?.[0]?.products || [];

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
        onScanAgainClick={() => router.push(APP_ROUTES.SELFIE)}
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

          {/* Brands Filter */}
          {/* <Box
            sx={{
              mt: 3,
              mb: 2,
              display: "flex",
              gap: 1,
              overflowX: "auto",
              pb: 1,
              width: "100%",
            }}
          >
            <Chip
              label="All Brands"
              onClick={() => setSelectedBrand("all")}
              color={selectedBrand === "all" ? "primary" : "default"}
              variant={selectedBrand === "all" ? "filled" : "outlined"}
              sx={{ fontWeight: selectedBrand === "all" ? 600 : 400 }}
            />
            {brands.map((brand: any) => (
              <Chip
                key={brand._id}
                label={brand.name}
                onClick={() => setSelectedBrand(brand._id)}
                color={selectedBrand === brand._id ? "primary" : "default"}
                variant={selectedBrand === brand._id ? "filled" : "outlined"}
                sx={{ fontWeight: selectedBrand === brand._id ? 600 : 400 }}
              />
            ))}
          </Box> */}

          {/* Category Tabs - circular icons with dynamic images */}
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
              // Get first product image for this category from state
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
                    {firstImg ? (
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
                {products.map((product: any) => (
                  <Grid
                    item
                    xs={6}
                    md={6}
                    key={product._id}
                  >
                    <ProductCard
                      {...mapProductToCardProps(product)}
                    />
                  </Grid>
                ))}
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
