"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import TopLogo from "@/containers/skinanalysis-home/Recommendations/TopLogo";
import ProductCard from "@/containers/skinanalysis-home/Recommendations/ProductCard";
import { useCart } from "@/containers/skinanalysis-home/Recommendations/CartContext";
import CartProduct from "@/containers/skinanalysis-home/Recommendations/cartProduct";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";
import {
  getProductQuantityFromSlots,
  getProductSlotNumbersFromSlots,
  getSlotDiscountMap,
  mergeCatalogWithSlotProducts,
  normalizeProductDiscount,
  productMatchesBrandFilter,
  productMatchesCategoryFilter,
} from "@/lib/product-slot-utils";
import {
  fetchCatalogBrands,
  fetchCatalogCategories,
  fetchCategoryImages,
  type CatalogBrand,
  type CatalogCategory,
} from "@/lib/catalog-metadata";

/**
 * Catalog fetch via Leafwater fetch-by-filter (same as admin).
 * IMPORTANT: upstream products usually omit productCategory — category/brand
 * membership must be filtered with catId / brandId on the API, not client-side.
 * `lite=1` skips per-product SQLite slot overrides (browse uses /api/admin/slots instead).
 */
async function fetchCatalogProducts(filters?: {
  catId?: string;
  brandId?: string;
}): Promise<any[]> {
  const params = new URLSearchParams({
    fetchAll: "1",
    limit: "100",
    lite: "1",
  });
  if (filters?.catId && filters.catId !== "all") {
    params.set("catId", filters.catId);
  }
  if (filters?.brandId && filters.brandId !== "all") {
    params.set("brandId", filters.brandId);
  }

  const res = await fetch(`/api/admin/products?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: ${res.status}`);
  }

  const json = await res.json();
  const batch = Array.isArray(json) ? json : json?.data?.[0]?.products || [];
  if (!Array.isArray(batch)) return [];

  const seenIds = new Set<string>();
  const allProducts: any[] = [];
  batch.forEach((product: any) => {
    const id = String(product?.id ?? product?._id ?? "");
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    allProducts.push(product);
  });
  return allProducts;
}
const PageBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        minHeight: "100%",
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
        aria-hidden
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "70%",
          height: "55%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <path
          d="M100,0 L100,100 L0,100 Q25,78 45,60 Q70,35 100,0 Z"
          fill="#E9F6E8"
        />
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, width: "100%", bgcolor: "transparent" }}>
        {children}
      </Box>
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
    cardSx: { width: "100%", overflow: "hidden" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastTypedKeyRef = useRef<{ key: string; ts: number } | null>(null);
  const { count: cartCount } = useCart();
  const isKiosk = false;

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  /** Distinguishes "API failed" from "filters returned zero products". */
  const [catalogLoadError, setCatalogLoadError] = useState(false);
  const [rawSlotsData, setRawSlotsData] = useState<unknown>({});

  const [categories, setCategories] = useState<CatalogCategory[]>([{ _id: "all", title: "All" }]);
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  // State to store category images
  const [categoryImages, setCategoryImages] = useState<Record<string, string | undefined>>({});
  const [brandImages, setBrandImages] = useState<Record<string, string | undefined>>({});

  const categoryStripRef = useRef<HTMLDivElement | null>(null);
  const categoryDragRef = useRef<{ dragging: boolean; moved: boolean; startX: number; startScrollLeft: number }>(
    { dragging: false, moved: false, startX: 0, startScrollLeft: 0 }
  );
  const productFetchRequestIdRef = useRef(0);

  // Load categories, brands, slots, and category icons once.
  useEffect(() => {
    let cancelled = false;

    const loadMeta = async () => {
      try {
        const [cats, brs, slotsRes] = await Promise.all([
          fetchCatalogCategories(),
          fetchCatalogBrands(),
          fetch("/api/admin/slots", { cache: "no-store" }),
        ]);

        if (cancelled) return;

        setCategories(cats);
        setBrands(brs);

        if (slotsRes.ok) {
          const slotsPayload = await slotsRes.json();
          if (!cancelled) setRawSlotsData(slotsPayload);
        }

        const catImgs = await fetchCategoryImages();
        if (!cancelled && catImgs && typeof catImgs === "object") {
          setCategoryImages(catImgs);
        }
      } catch (e) {
        console.warn("[BrowseProducts] Failed to load catalog metadata:", e);
      }
    };

    void loadMeta();
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

  const activeCatalogFilters = useMemo(
    () => ({
      brandId: selectedBrand,
      brandName: selectedBrandName,
      categoryId: selectedCategory,
      categoryTitle: selectedCategoryTitle,
    }),
    [selectedBrand, selectedBrandName, selectedCategory, selectedCategoryTitle]
  );

  // Refetch only when the selected filter ids change (not when label metadata arrives).
  useEffect(() => {
    let cancelled = false;
    const requestId = ++productFetchRequestIdRef.current;
    const catId = selectedCategory;
    const brandId = selectedBrand;

    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setCatalogLoadError(false);
        setProducts([]);

        const catalog = await fetchCatalogProducts({ catId, brandId });
        if (cancelled || requestId !== productFetchRequestIdRef.current) return;

        const categoryMeta =
          catId !== "all"
            ? {
                _id: catId,
                title:
                  categories.find((c) => c._id === catId)?.title || catId,
              }
            : null;
        const brandMeta =
          brandId !== "all"
            ? {
                _id: brandId,
                name: brands.find((b) => b._id === brandId)?.name || brandId,
              }
            : null;

        const stamped = catalog.map((product) => {
          let next = product;
          if (categoryMeta) {
            next = {
              ...next,
              category: next?.category || categoryMeta.title,
              productCategory: next?.productCategory || categoryMeta,
            };
          }
          if (brandMeta) {
            next = {
              ...next,
              brandId: next?.brandId || brandMeta._id,
              brand: next?.brand || brandMeta,
              productBrand: next?.productBrand || brandMeta,
            };
          }
          return next;
        });

        console.log(
          `[BrowseProducts] Loaded ${stamped.length} products (cat=${catId}, brand=${brandId})`
        );
        setProducts(stamped);
        setCatalogLoadError(false);
      } catch (e) {
        console.warn("[BrowseProducts] Failed to load products:", e);
        if (!cancelled && requestId === productFetchRequestIdRef.current) {
          setProducts([]);
          setCatalogLoadError(true);
        }
      } finally {
        if (!cancelled && requestId === productFetchRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();
    return () => {
      cancelled = true;
    };
    // categories/brands are read for stamping labels only; do not refetch when they hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedBrand]);

  const selectCategory = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const selectBrand = useCallback((brandId: string) => {
    setSelectedBrand(brandId);
  }, []);

  const machineProducts = useMemo(
    () =>
      mergeCatalogWithSlotProducts(products, rawSlotsData, {
        catalogFilters: activeCatalogFilters,
      }),
    [products, rawSlotsData, activeCatalogFilters]
  );

  const slotDiscountMap = useMemo(
    () => getSlotDiscountMap(rawSlotsData),
    [rawSlotsData]
  );

  const sortedProducts = useMemo(() => {
    const decorated = machineProducts
      .filter(
        (product: any) =>
          productMatchesCategoryFilter(
            product,
            selectedCategory,
            selectedCategoryTitle
          ) &&
          productMatchesBrandFilter(product, selectedBrand, selectedBrandName)
      )
      .map((product: any) => {
        const productId = product?.id ?? product?._id;
        const quantity = getProductQuantityFromSlots(productId, rawSlotsData);
        const slotNumbers = getProductSlotNumbersFromSlots(productId, rawSlotsData);
        return {
          product,
          slotInfo:
            slotNumbers.length > 0
              ? { slotNumbers, quantity }
              : undefined,
          quantity,
          isAvailable: quantity > 0,
        };
      });

    return decorated.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      if (a.isAvailable && b.isAvailable && a.quantity !== b.quantity) {
        return b.quantity - a.quantity;
      }
      return String(a.product?.name ?? "").localeCompare(
        String(b.product?.name ?? ""),
        undefined,
        { sensitivity: "base" }
      );
    });
  }, [
    machineProducts,
    rawSlotsData,
    selectedBrand,
    selectedBrandName,
    selectedCategory,
    selectedCategoryTitle,
  ]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedProducts;

    const tokens = q.split(/\s+/).filter(Boolean);
    return sortedProducts.filter(({ product }) => {
      const haystack = [
        product?.name,
        product?.brand?.name,
        product?.productBrand?.name,
        product?.category,
        product?.productCategory?.title,
        product?.id,
        product?._id,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return tokens.every((token) => haystack.includes(token));
    });
  }, [sortedProducts, searchQuery]);

  const focusSearchInput = useCallback(() => {
    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => searchInputRef.current?.focus());
      return;
    }
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const closeSearchKeyboard = useCallback(() => {
    setIsKeyboardOpen(false);
    searchInputRef.current?.blur();
  }, []);

  const handleKeyboardKeyPress = useCallback(
    (key: string) => {
      if (key === "shift" || key === "123" || key === "ABC") return;
      if (key === "return") {
        closeSearchKeyboard();
        return;
      }
      if (key === "arrowleft" || key === "arrowright") return;
      if (key === "backspace") {
        setSearchQuery((prev) => prev.slice(0, -1));
        lastTypedKeyRef.current = null;
        return;
      }
      if (key === "space") {
        setSearchQuery((prev) => `${prev} `);
        lastTypedKeyRef.current = { key: "space", ts: Date.now() };
        return;
      }
      if (key.length !== 1) return;

      // Light guard only — VirtualKeyboard already coalesces ghost double-fires.
      const now = Date.now();
      const last = lastTypedKeyRef.current;
      if (last && last.key === key && now - last.ts < 120) return;
      lastTypedKeyRef.current = { key, ts: now };

      setSearchQuery((prev) => `${prev}${key}`);
    },
    [closeSearchKeyboard]
  );

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

  // Fill brand / category icons from the loaded catalog (no extra image APIs).
  useEffect(() => {
    if (products.length === 0) return;

    const productImageUrl = (product: any): string =>
      String(
        product?.images?.[0]?.url ||
          product?.image_url ||
          (typeof product?.images?.[0] === "string" ? product.images[0] : "") ||
          ""
      ).trim();

    const normalizeKey = (value: unknown) =>
      String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");

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
      // Index first product image by category id + normalized title for reliable lookup.
      const imageByKey = new Map<string, string>();
      products.forEach((product) => {
        const img = productImageUrl(product);
        if (!img) return;
        const cat = product?.productCategory;
        const id = String(cat?._id ?? cat?.id ?? product?.categoryId ?? "").trim();
        const title = String(cat?.title ?? cat?.name ?? product?.category ?? "").trim();
        if (id && !imageByKey.has(id)) imageByKey.set(id, img);
        const titleKey = normalizeKey(title);
        if (titleKey && !imageByKey.has(titleKey)) imageByKey.set(titleKey, img);
      });

      setCategoryImages((prev) => {
        const next = { ...prev };
        let changed = false;

        categories.forEach((category) => {
          if (!category._id || category._id === "all" || next[category._id]) return;

          const fromIndex =
            imageByKey.get(category._id) ||
            imageByKey.get(normalizeKey(category.title));

          if (fromIndex) {
            next[category._id] = fromIndex;
            changed = true;
            return;
          }

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
                    selectCategory(category._id);
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
                onClick={() => selectBrand("all")}
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
                      onClick={() => selectBrand(brand._id)}
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

          {/* Products Grid — opaque panel so empty/loading never shows clipped ghost cards under the green bg */}
          <Box
            key={`results-${selectedCategory}-${selectedBrand}-${searchQuery}`}
            sx={{
              width: "100%",
              mb: 2,
              pb: isKeyboardOpen ? "340px" : 0,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              position: "relative",
              zIndex: 2,
              bgcolor: "#ffffff",
              borderRadius: 2,
              overflow: "hidden",
              isolation: "isolate",
              minHeight: 280,
            }}
          >
            <TextField
              fullWidth
              inputRef={searchInputRef}
              value={searchQuery}
              placeholder="Search products by name, brand, or category..."
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsKeyboardOpen(true)}
              onClick={() => {
                setIsKeyboardOpen(true);
                focusSearchInput();
              }}
              inputProps={{
                // Prefer on-screen keyboard on kiosk touch; physical keyboard still works.
                inputMode: "text",
                autoComplete: "off",
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon icon="mdi:magnify" width={26} color="#6b7280" />
                  </InputAdornment>
                ),
                endAdornment:
                  searchQuery || isKeyboardOpen ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Clear search and close keyboard"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSearchQuery("");
                          closeSearchKeyboard();
                        }}
                        edge="end"
                        size="small"
                      >
                        <Icon icon="mdi:close" width={22} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
              }}
              sx={{
                mb: 2,
                bgcolor: "#fff",
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  minHeight: 56,
                  fontSize: 20,
                  bgcolor: "#fff",
                },
              }}
            />
            {isLoading ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 10,
                  px: 2,
                  bgcolor: "#ffffff",
                  width: "100%",
                  minHeight: 240,
                }}
              >
                <Typography sx={{ fontSize: 28, color: "#666" }}>
                  Loading products...
                </Typography>
              </Box>
            ) : filteredProducts.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 10,
                  px: 2,
                  bgcolor: "#ffffff",
                  width: "100%",
                  minHeight: 240,
                }}
              >
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#4b5563", mb: 1 }}>
                  No products found
                </Typography>
                <Typography sx={{ fontSize: 16, color: "#9ca3af" }}>
                  {catalogLoadError
                    ? "Could not load products from the catalog"
                    : searchQuery.trim()
                      ? `No matches for "${searchQuery.trim()}"`
                      : selectedCategory !== "all" && selectedBrand !== "all"
                        ? `No ${selectedBrandName || "brand"} products in ${selectedCategoryTitle || "this category"}`
                        : selectedCategory !== "all" || selectedBrand !== "all"
                          ? "Try a different category or brand filter"
                          : "No products available right now"}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ overflow: "hidden" }}>
                {filteredProducts.map((row: any, idx: number) => {
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
                      sx={{
                        opacity: isAvailable ? 1 : 0.72,
                        filter: isAvailable ? "none" : "grayscale(0.35)",
                        overflow: "hidden",
                      }}
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

      {isKeyboardOpen ? (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1400,
          }}
        >
          <VirtualKeyboard
            onKeyPress={handleKeyboardKeyPress}
            layout="default"
            visible={isKeyboardOpen}
            skipApplyToActiveElement
            onClose={closeSearchKeyboard}
          />
        </Box>
      ) : null}

      {openCart ? (
        <CartProduct
          open={openCart}
          onClose={() => setOpenCart(false)}
        />
      ) : null}
    </Box>
  );
}
