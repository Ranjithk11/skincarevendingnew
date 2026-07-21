"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Box, Typography, Grid, useMediaQuery, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import TopLogo from "@/containers/skinanalysis-home/Recommendations/TopLogo";
import ProductCard from "@/containers/skinanalysis-home/Recommendations/ProductCard";
import { useCart } from "@/containers/skinanalysis-home/Recommendations/CartContext";
import CartProduct from "@/containers/skinanalysis-home/Recommendations/cartProduct";
import {
  buildSlotsMap,
  getSlotInfoForProduct,
  getSlotDiscountMap,
  mergeCatalogWithSlotProducts,
  normalizeProductDiscount,
  productMatchesBrandFilter,
  productMatchesCategoryFilter,
  type SlotsMap,
} from "@/lib/product-slot-utils";
import {
  fetchCatalogBrands,
  fetchCatalogCategories,
  type CatalogBrand,
  type CatalogCategory,
} from "@/lib/catalog-metadata";

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

const mapProductToCardProps = (product: any, slotDiscountMap?: Record<string, number>) => {
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
    discount: normalizeProductDiscount(product, slotDiscountMap),
    enabledMask: false,
    category: product?.productCategory?.title || product?.category || "",
    compact: false,
    horizontalLayout: true,
    cardSx: { width: "100%", overflow: "visible" },
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
  const [rawSlotsData, setRawSlotsData] = useState<unknown>({});
  const [slotsMap, setSlotsMap] = useState<SlotsMap>({});

  const [categories, setCategories] = useState<CatalogCategory[]>([{ _id: "all", title: "All" }]);
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  // State to store category images
  const [categoryImages, setCategoryImages] = useState<Record<string, string | undefined>>({});
  const [brandImages, setBrandImages] = useState<Record<string, string | undefined>>({});

  const categoryStripRef = useRef<HTMLDivElement | null>(null);
  const categoryDragRef = useRef<{ dragging: boolean; moved: boolean; startX: number; startScrollLeft: number }>(
    { dragging: false, moved: false, startX: 0, startScrollLeft: 0 }
  );

  // Single mount load — one catalog + slots + metadata fetch (no duplicate image APIs).
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);

        const [cats, brs, slotsRes, productsRes] = await Promise.all([
          fetchCatalogCategories(),
          fetchCatalogBrands(),
          fetch("/api/admin/slots", { cache: "no-store" }),
          fetch("/api/admin/products?fetchAll=1", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          }),
        ]);

        if (cancelled) return;

        setCategories(cats);
        setBrands(brs);

        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          if (!cancelled) {
            setRawSlotsData(slotsData);
            setSlotsMap(buildSlotsMap(slotsData));
          }
        }

        if (productsRes.ok) {
          const json = await productsRes.json();
          const list = Array.isArray(json) ? json : json?.data?.[0]?.products || [];
          console.log(`[BrowseProducts] Loaded ${list.length} catalog products`);
          if (!cancelled) setProducts(list);
        } else {
          console.warn("[BrowseProducts] Failed to load catalog:", productsRes.status);
          if (!cancelled) setProducts([]);
        }
      } catch (e) {
        console.warn("[BrowseProducts] Failed to load page data:", e);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBrandName = useMemo(() => {
    if (selectedBrand === "all") return undefined;
    return brands.find((b) => b._id === selectedBrand)?.name;
  }, [selectedBrand, brands]);

  const selectedCategoryTitle = useMemo(() => {
    if (selectedCategory === "all") return undefined;
    return categories.find((c) => c._id === selectedCategory)?.title;
  }, [selectedCategory, categories]);

  const machineProducts = useMemo(
    // Keep the full catalog here; brand/category filters run in sortedProducts
    // so unavailable products still appear for every brand (same as admin inventory).
    () => mergeCatalogWithSlotProducts(products, rawSlotsData),
    [products, rawSlotsData]
  );

  const slotDiscountMap = useMemo(() => getSlotDiscountMap(rawSlotsData), [rawSlotsData]);

  const sortedProducts = useMemo(() => {
    const decorated = machineProducts.map((product: any) => {
      const slotInfo = getSlotInfoForProduct(product, slotsMap);
      // Prefer live slot qty; fall back to catalog/override quantity (same as admin inventory).
      const quantity = Math.max(
        Number(slotInfo?.quantity ?? 0),
        Number(product?.quantity ?? 0)
      );
      return { product, slotInfo, quantity, isAvailable: quantity > 0 };
    });

    return decorated
      .filter(
        (item) =>
          productMatchesCategoryFilter(
            item.product,
            selectedCategory,
            selectedCategoryTitle
          ) &&
          productMatchesBrandFilter(item.product, selectedBrand, selectedBrandName)
      )
      .sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
        if (a.isAvailable && b.isAvailable && a.quantity !== b.quantity) {
          return b.quantity - a.quantity;
        }
        return String(a.product?.name ?? "").localeCompare(String(b.product?.name ?? ""), undefined, {
          sensitivity: "base",
        });
      });
  }, [machineProducts, slotsMap, selectedBrand, selectedBrandName, selectedCategory, selectedCategoryTitle]);

  const isAllBrandName = (name: unknown) => {
    const n = String(name ?? "").trim().toLowerCase();
    return n === "all" || n === "all brands";
  };

  const sortedBrands = useMemo(() => {
    return [...brands]
      .filter((brand: any) => !isAllBrandName(brand?.name))
      .sort((a: any, b: any) =>
        String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
          sensitivity: "base",
        })
      );
  }, [brands]);

  // Fill any missing brand / category icons from the loaded catalog (no extra network).
  useEffect(() => {
    if (products.length === 0) return;

    const productImageUrl = (product: any): string =>
      String(
        product?.images?.[0]?.url ||
          product?.image_url ||
          (typeof product?.images?.[0] === "string" ? product.images[0] : "") ||
          ""
      ).trim();

    if (brands.length > 0) {
      setBrandImages((prev) => {
        const next = { ...prev };
        let changed = false;

        if (!next.all) {
          const first = products.find((p) => productImageUrl(p));
          if (first) {
            next.all = productImageUrl(first);
            changed = true;
          }
        }

        brands.forEach((brand) => {
          if (!brand._id || next[brand._id]) return;
          const match = products.find(
            (p) =>
              productImageUrl(p) &&
              productMatchesBrandFilter(p, brand._id, brand.name)
          );
          if (match) {
            next[brand._id] = productImageUrl(match);
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }

    if (categories.length > 0) {
      setCategoryImages((prev) => {
        const next = { ...prev };
        let changed = false;

        categories.forEach((category) => {
          if (!category._id || category._id === "all" || next[category._id]) return;
          const match = products.find(
            (p) =>
              productImageUrl(p) &&
              productMatchesCategoryFilter(p, category._id, category.title)
          );
          if (match) {
            next[category._id] = productImageUrl(match);
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }
  }, [products, brands, categories]);

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
      />

      {/* Main Content */}
      <PageBackground>
        <Box
          sx={{
            pt: isDesktop ? 20 : 16,
            px: isDesktop ? 4 : 2,
            pb: 8,
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
              categoryDragRef.current.moved = false;
              categoryDragRef.current.startX = e.clientX;
              categoryDragRef.current.startScrollLeft = el.scrollLeft;
              // Note: intentionally NOT calling setPointerCapture here — capturing
              // the pointer retargets the click to this container and prevents the
              // category items' onClick from firing on desktop (mouse).
            }}
            onPointerMove={(e) => {
              const el = categoryStripRef.current;
              if (!el) return;
              if (!categoryDragRef.current.dragging) return;
              const dx = e.clientX - categoryDragRef.current.startX;
              // Only treat it as a drag once the pointer moves past a small
              // threshold, so a normal click still selects the category.
              if (Math.abs(dx) > 5) {
                categoryDragRef.current.moved = true;
                el.scrollLeft = categoryDragRef.current.startScrollLeft - dx;
              }
            }}
            onPointerUp={() => {
              categoryDragRef.current.dragging = false;
            }}
            onPointerCancel={() => {
              categoryDragRef.current.dragging = false;
              categoryDragRef.current.moved = false;
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
                  onClick={() => {
                    // Ignore the click that ends a drag-scroll gesture.
                    if (categoryDragRef.current.moved) {
                      categoryDragRef.current.moved = false;
                      return;
                    }
                    setSelectedCategory(category._id);
                  }}
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

              {sortedBrands.map((brand: any) => {
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
            {!isLoading && products.length > 0 ? (
              <Typography sx={{ fontSize: 16, color: "#6b7280", mb: 1.5 }}>
                Showing {sortedProducts.length} of {products.length} products
                {sortedProducts.some((row) => !row.isAvailable)
                  ? " · Out-of-machine items shown as Unavailable"
                  : ""}
              </Typography>
            ) : null}
            {isLoading ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: 28, color: "#666" }}>
                  Loading all products...
                </Typography>
              </Box>
            ) : sortedProducts.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#4b5563", mb: 1 }}>
                  No products found
                </Typography>
                <Typography sx={{ fontSize: 16, color: "#9ca3af" }}>
                  {products.length === 0
                    ? "Could not load products from the catalog"
                    : "Try a different category or brand filter"}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {sortedProducts.map((row: any, idx: number) => {
                  const product = row?.product;
                  const slotInfo = row?.slotInfo;
                  const productId = product?.id ?? product?._id;
                  const productQty = row?.quantity ?? slotInfo?.quantity ?? 0;
                  const isAvailable = row?.isAvailable ?? productQty > 0;
                  return (
                    <Grid
                      item
                      xs={6}
                      md={6}
                      key={`${String(productId)}-${(slotInfo?.slotNumbers || []).join("-") || "na"}-${idx}`}
                    >
                      <ProductCard
                        {...mapProductToCardProps(product, slotDiscountMap)}
                        slotNumbers={isAvailable ? (slotInfo?.slotNumbers ?? null) : null}
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

      {openCart ? (
        <CartProduct
          open={openCart}
          onClose={() => setOpenCart(false)}
        />
      ) : null}
    </Box>
  );
}
