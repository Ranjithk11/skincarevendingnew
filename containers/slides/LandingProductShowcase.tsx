"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import { beginKioskJourney, setJourneyBundleId } from "@/lib/kiosk-journey";
import { fetchCatalogProducts, getCatalogProductImageUrl } from "@/lib/catalog-products";
import {
  getProductQuantityFromSlots,
  getProductSlotNumbersFromSlots,
  getSlotRetailPriceForProduct,
  mergeCatalogWithSlotProducts,
  normalizeProductDiscount,
} from "@/lib/product-slot-utils";
import { pickSkinRoutines } from "@/containers/skinanalysis-home/KioskReport/utils";
import type { ReportProduct, SkinRoutine } from "@/containers/skinanalysis-home/KioskReport/types";
import { useCart } from "@/containers/skinanalysis-home/Recommendations/CartContext";
import CartProduct from "@/containers/skinanalysis-home/Recommendations/cartProduct";
import NewProductCard from "@/containers/skinanalysis-home/Recommendations/NewProductCard";
import RoutineInfoDialog from "@/containers/skinanalysis-home/KioskReport/RoutineInfoDialog";
import {
  arrowNudge,
  fadeUp,
  gentleFloat,
  infoGlow,
  PREMIUM_EASE,
  scaleIn,
  shimmerSweep,
  staggerDelay,
  successFlash,
} from "@/containers/skinanalysis-home/KioskReport/animations";

const FOREST = "#2F5D46";
const FOREST_DEEP = "#16352B";
const GOLD = "#D4AF67";
const SALE = "#9B1C1C";
const REPORT_BORDER = "rgba(22, 53, 43, 0.12)";

type DealProduct = {
  id: string;
  name: string;
  displayName: string;
  imageUrl: string;
  retailPrice: number;
  discountPct: number;
  salePrice: number;
  slotId?: number;
  slotNumbers: number[];
};

const PRODUCT_CARD_W = 176;
const PRODUCT_ROW_H = 168;
const PRODUCT_IMG_H = 92;
const BUNDLE_ROW_H = 208;
const PANEL_H = 610;

const TRUST_ITEMS = [
  { icon: "mdi:star-four-points", label: "Dermatologist\nTrusted Brands" },
  { icon: "mdi:diamond-stone", label: "100% Authentic\nProducts" },
  { icon: "mdi:truck-fast-outline", label: "Lower Than\nAmazon & Nykaa" },
  { icon: "mdi:gift-outline", label: "New Deals\nEvery Day" },
] as const;

function saleFrom(retail: number, discountPct: number) {
  if (!Number.isFinite(retail) || retail <= 0) return 0;
  if (!discountPct) return Math.round(retail);
  return Math.round(retail - (retail * discountPct) / 100);
}

function prettyName(name: string) {
  const cleaned = String(name || "")
    .replace(/\s*[-–|]\s*\d+\s*(ml|gm|g|oz|kg).*$/i, "")
    .replace(/\s+\d+\s*(ml|gm|g)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 5);
  return words
    .map((word) =>
      word.length <= 2
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function toDeal(product: any, slotsData: unknown): DealProduct | null {
  const id = String(product?.id ?? product?._id ?? "");
  if (!id) return null;
  const qty = getProductQuantityFromSlots(id, slotsData);
  if (qty <= 0) return null;
  const imageUrl = getCatalogProductImageUrl(product);
  if (!imageUrl) return null;
  const slotPrice = getSlotRetailPriceForProduct(id, slotsData);
  const catalogPrice = Number(product?.retailPrice ?? product?.retail_price ?? 0);
  const retailPrice =
    Number.isFinite(slotPrice) && (slotPrice as number) >= 50
      ? (slotPrice as number)
      : Number.isFinite(catalogPrice) && catalogPrice >= 50
        ? catalogPrice
        : slotPrice || catalogPrice;
  if (!Number.isFinite(retailPrice) || retailPrice < 50) return null;
  const discountPct = Number(normalizeProductDiscount(product)?.value || 0);
  const slots = getProductSlotNumbersFromSlots(id, slotsData);
  const name = String(product?.name || "Product");
  return {
    id,
    name,
    displayName: prettyName(name) || name,
    imageUrl,
    retailPrice,
    discountPct: Number.isFinite(discountPct) ? discountPct : 0,
    salePrice: saleFrom(retailPrice, discountPct),
    slotId: slots[0],
    slotNumbers: slots,
  };
}

function formatSlotLabel(slotNumbers?: number[], slotId?: number) {
  const ids =
    Array.isArray(slotNumbers) && slotNumbers.length
      ? slotNumbers.filter((n) => Number.isFinite(n))
      : Number.isFinite(slotId)
        ? [slotId as number]
        : [];
  if (!ids.length) return "";
  const shown = ids.slice(0, 2).map((n) => String(n));
  return `Slot ${shown.join(", ")}`;
}

const hideScroll = {
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;

export default function LandingProductShowcase() {
  const router = useRouter();
  const { addItem, count, items } = useCart();
  const [deals, setDeals] = useState<DealProduct[]>([]);
  const [bundles, setBundles] = useState<SkinRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [openCart, setOpenCart] = useState(false);
  const [infoDeal, setInfoDeal] = useState<DealProduct | null>(null);
  const [infoRoutine, setInfoRoutine] = useState<SkinRoutine | null>(null);
  const [infoProduct, setInfoProduct] = useState<ReportProduct | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [slotsRes, catalog] = await Promise.all([
          fetch("/api/admin/slots", { cache: "no-store" }).then((res) =>
            res.ok ? res.json() : {}
          ),
          fetchCatalogProducts().catch(() => []),
        ]);
        if (cancelled) return;
        const merged = mergeCatalogWithSlotProducts(catalog, slotsRes);
        const nextDeals = merged
          .map((product) => toDeal(product, slotsRes))
          .filter((item): item is DealProduct => Boolean(item))
          .sort((a, b) => b.discountPct - a.discountPct || a.salePrice - b.salePrice);
        setDeals(nextDeals);
        setBundles(pickSkinRoutines(catalog, slotsRes, "landing-showcase").slice(0, 3));
      } catch {
        if (!cancelled) {
          setDeals([]);
          setBundles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredDeals = deals.slice(0, 5);
  const moreCount = Math.max(0, deals.length - featuredDeals.length);
  const maxOff = useMemo(
    () => deals.reduce((max, item) => Math.max(max, item.discountPct), 0),
    [deals]
  );

  const viewAllProducts = () => {
    beginKioskJourney("direct", "catalog");
    router.push(APP_ROUTES.PRODUCTS);
  };
  const selectedIds = useMemo(
    () => items.map((item) => String(item.id || "")).filter(Boolean),
    [items]
  );

  const markAdded = (id: string) => {
    setAddedId(id);
    window.setTimeout(() => setAddedId((current) => (current === id ? null : current)), 900);
  };

  const goToCart = () => {
    setInfoDeal(null);
    setInfoRoutine(null);
    setInfoProduct(null);
    setOpenCart(true);
  };

  const addProduct = (deal: DealProduct) => {
    beginKioskJourney("direct", "catalog");
    addItem({
      id: deal.id,
      name: deal.name,
      imageUrl: deal.imageUrl,
      originalPrice: deal.retailPrice,
      discountValue: deal.discountPct || undefined,
      priceText: `INR.${deal.salePrice}/-`,
      slotId: deal.slotId,
      quantity: 1,
    });
    markAdded(deal.id);
    goToCart();
  };

  const addBundle = (routine: SkinRoutine) => {
    beginKioskJourney("direct", "catalog");
    setJourneyBundleId(routine.id);
    routine.products.forEach((product) => {
      addItem({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        originalPrice: product.retailPrice,
        discountValue: product.discountValue || undefined,
        priceText: `INR.${product.payablePrice}/-`,
        slotId: product.slotId,
        quantity: 1,
      });
    });
    markAdded(routine.id);
    goToCart();
  };

  return (
    <>
      <Box
        id="landing-deals"
        sx={{
          position: "absolute",
          left: { xs: 10, sm: 14 },
          right: { xs: 10, sm: 14 },
          bottom: { xs: 52, sm: 64 },
          zIndex: 12,
          height: "auto",
          maxHeight: PANEL_H,
          display: "flex",
          flexDirection: "column",
          gap: 0.85,
          px: 1.25,
          pt: 1.1,
          pb: 0.85,
          borderRadius: "22px",
          overflow: "hidden",
          bgcolor: "rgba(255,251,245,0.88)",
          border: "1px solid rgba(212,175,103,0.5)",
          boxShadow: "0 18px 40px rgba(22,53,43,0.16)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          animation: `${fadeUp} 0.55s ${PREMIUM_EASE} both`,
          pointerEvents: "auto",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: FOREST_DEEP,
                lineHeight: 1,
                position: "relative",
                display: "inline-block",
                pr: 0.5,
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -3,
                  height: 3,
                  borderRadius: 99,
                  backgroundImage:
                    "linear-gradient(90deg, transparent 0%, rgba(212,175,103,0.95) 18%, rgba(212,175,103,0.2) 100%)",
                  backgroundSize: "220% 100%",
                  animation: `${shimmerSweep} 4.4s ease-in-out infinite`,
                },
              }}
            >
              TODAY&apos;S DEALS
            </Typography>
            <Box
              sx={{
                mt: 0.9,
                display: "inline-flex",
                alignItems: "center",
                px: 1.15,
                py: 0.4,
                borderRadius: "999px",
                bgcolor: "rgba(212,175,103,0.18)",
                border: "1px solid rgba(212,175,103,0.5)",
                color: FOREST_DEEP,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
                position: "relative",
                overflow: "hidden",
                animation: `${fadeUp} 0.65s ${PREMIUM_EASE} 0.18s both, ${gentleFloat} 3.6s ease-in-out 0.9s infinite`,
                boxShadow: "0 4px 14px rgba(212,175,103,0.22)",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(110deg, transparent 28%, rgba(255,255,255,0.55) 48%, transparent 68%)",
                  backgroundSize: "220% 100%",
                  animation: `${shimmerSweep} 3.8s ease-in-out 0.5s infinite`,
                  pointerEvents: "none",
                },
              }}
            >
              {maxOff > 0 ? `Up to ${maxOff}% off` : "Products in this machine"}
            </Box>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={goToCart}
            sx={{
              border: "1px solid rgba(212,175,103,0.45)",
              bgcolor: count ? FOREST_DEEP : "rgba(255,255,255,0.8)",
              color: count ? GOLD : FOREST,
              borderRadius: "999px",
              px: 1.2,
              py: 0.45,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Cart {count}
          </Box>
        </Box>

        <Row label="Products" rowHeight={PRODUCT_ROW_H}>
          {loading
            ? [0, 1, 2, 3].map((key) => (
                <SkeletonCard key={key} delay={staggerDelay(key)} wide={PRODUCT_CARD_W} />
              ))
            : featuredDeals.map((deal, index) => (
                <ProductCard
                  key={deal.id}
                  deal={deal}
                  added={addedId === deal.id}
                  delay={staggerDelay(index, 50, 80)}
                  onBuy={() => addProduct(deal)}
                  onInfo={() => setInfoDeal(deal)}
                />
              ))}
          {!loading && deals.length ? (
            <ViewAllProductsCard extraCount={moreCount} delay={staggerDelay(5, 50, 80)} onClick={viewAllProducts} />
          ) : null}
        </Row>

        <Row label="Product bundles" rowHeight={BUNDLE_ROW_H} hug>
          {loading
            ? [0, 1, 2].map((key) => <SkeletonCard key={key} delay={staggerDelay(key)} wide={318} />)
            : bundles.map((routine, index) => (
                <BundleCard
                  key={routine.id}
                  routine={routine}
                  added={addedId === routine.id}
                  delay={staggerDelay(index, 60, 140)}
                  onAdd={() => addBundle(routine)}
                  onInfo={() => setInfoRoutine(routine)}
                />
              ))}
          {!loading && !bundles.length ? (
            <Typography sx={{ fontSize: 12, color: "#6B655C", fontWeight: 600, py: 1.5, px: 0.5 }}>
              Bundles appear when this machine has paired stock.
            </Typography>
          ) : null}
        </Row>

        <TrustBar />
      </Box>

      <RoutineInfoDialog
        open={Boolean(infoRoutine)}
        routine={infoRoutine}
        selectedIds={selectedIds}
        onClose={() => setInfoRoutine(null)}
        onBuyRoutine={(routine) => addBundle(routine)}
        onOpenProduct={(product) => {
          setInfoRoutine(null);
          setInfoProduct(product);
        }}
      />

      <NewProductCard
        open={Boolean(infoDeal || infoProduct)}
        onClose={() => {
          setInfoDeal(null);
          setInfoProduct(null);
        }}
        id={infoDeal?.id || infoProduct?.id}
        name={infoDeal?.name || infoProduct?.name || ""}
        imageUrl={infoDeal?.imageUrl || infoProduct?.imageUrl}
        retailPrice={infoDeal?.retailPrice || infoProduct?.retailPrice || 0}
        discountValue={infoDeal?.discountPct || infoProduct?.discountValue}
        slotId={infoDeal?.slotId || infoProduct?.slotId}
        isAiRecommended
        primaryActionLabel="ADD TO CART"
        onPrimaryAction={() => {
          if (infoDeal) {
            addProduct(infoDeal);
            return;
          }
          if (!infoProduct) return;
          beginKioskJourney("direct", "catalog");
          addItem({
            id: infoProduct.id,
            name: infoProduct.name,
            imageUrl: infoProduct.imageUrl,
            originalPrice: infoProduct.retailPrice,
            discountValue: infoProduct.discountValue || undefined,
            priceText: `INR.${infoProduct.payablePrice}/-`,
            slotId: infoProduct.slotId,
            quantity: 1,
          });
          goToCart();
        }}
      />

      <CartProduct open={openCart} onClose={() => setOpenCart(false)} />
    </>
  );
}

function Row({
  label,
  children,
  rowHeight,
  grow = false,
  hug = false,
}: {
  label: string;
  children: ReactNode;
  rowHeight: number;
  grow?: boolean;
  hug?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: grow ? "1 1 auto" : "0 0 auto",
        minHeight: grow ? rowHeight : undefined,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          mb: 0.55,
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: FOREST,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          ...hideScroll,
          display: "flex",
          alignItems: hug || grow ? "flex-start" : "stretch",
          gap: 1,
          height: hug ? "auto" : grow ? undefined : rowHeight,
          flex: grow ? 1 : undefined,
          minHeight: hug ? undefined : grow ? rowHeight : undefined,
          pr: 1.25,
          pb: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function SkeletonCard({ delay, wide }: { delay: string; wide: number }) {
  return (
    <Box
      sx={{
        minWidth: wide,
        flex: `0 0 ${wide}px`,
        borderRadius: "16px",
        bgcolor: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(212,175,103,0.25)",
        animation: `${scaleIn} 0.5s ${PREMIUM_EASE} ${delay} both`,
      }}
    />
  );
}

function TrustBar() {
  return (
    <Box
      sx={{
        flexShrink: 0,
        mt: 0.15,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",
        gap: 0,
        px: 0.4,
        py: 0.7,
        borderRadius: "16px",
        bgcolor: "rgba(255,255,255,0.94)",
        border: "1px solid rgba(212,175,103,0.42)",
        boxShadow: "0 6px 16px rgba(22,53,43,0.06)",
        position: "relative",
        overflow: "hidden",
        animation: `${fadeUp} 0.6s ${PREMIUM_EASE} 0.28s both`,
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(110deg, transparent 28%, rgba(255,255,255,0.45) 48%, transparent 68%)",
          backgroundSize: "220% 100%",
          animation: `${shimmerSweep} 5s ease-in-out 0.8s infinite`,
          pointerEvents: "none",
        },
      }}
    >
      {TRUST_ITEMS.map((item, index) => (
        <Box
          key={item.label}
          sx={{
            flex: 1,
            minWidth: 0,
            px: 0.5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            textAlign: "center",
            gap: 0.35,
            borderRight:
              index < TRUST_ITEMS.length - 1 ? `1px solid ${REPORT_BORDER}` : "none",
            animation: `${fadeUp} 0.5s ${PREMIUM_EASE} ${staggerDelay(index, 70, 220)} both`,
          }}
        >
          <Box
            sx={{
              color: FOREST,
              display: "grid",
              placeItems: "center",
              animation: `${gentleFloat} 3.4s ease-in-out ${0.5 + index * 0.22}s infinite`,
            }}
          >
            <Icon icon={item.icon} width={18} color={FOREST} />
          </Box>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 700,
              color: FOREST_DEEP,
              lineHeight: 1.2,
              whiteSpace: "pre-line",
              letterSpacing: "0.01em",
            }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function ViewAllProductsCard({
  extraCount,
  delay,
  onClick,
}: {
  extraCount: number;
  delay: string;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        minWidth: PRODUCT_CARD_W,
        flex: `0 0 ${PRODUCT_CARD_W}px`,
        height: "100%",
        scrollSnapAlign: "start",
        borderRadius: "16px",
        border: "1px solid rgba(212,175,103,0.5)",
        bgcolor: FOREST_DEEP,
        color: GOLD,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.7,
        px: 1.2,
        animation: `${fadeUp} 0.45s ${PREMIUM_EASE} ${delay} both`,
        position: "relative",
        overflow: "hidden",
        "&:active": { transform: "scale(0.98)" },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.12) 48%, transparent 66%)",
          backgroundSize: "220% 100%",
          animation: `${shimmerSweep} 4.4s ease-in-out infinite`,
          pointerEvents: "none",
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid rgba(212,175,103,0.55)",
          display: "grid",
          placeItems: "center",
          animation: `${arrowNudge} 1.6s ease-in-out infinite`,
        }}
      >
        <Icon icon="mdi:arrow-right" width={18} />
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1.2 }}>
        View all products
      </Typography>
      {extraCount > 0 ? (
        <Typography sx={{ fontSize: 11, color: "rgba(212,175,103,0.8)", fontWeight: 700 }}>
          +{extraCount} more
        </Typography>
      ) : null}
    </Box>
  );
}

function InfoIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      sx={{
        width: 24,
        height: 24,
        m: 0,
        p: 0,
        border: `1px solid ${REPORT_BORDER}`,
        borderRadius: "50%",
        bgcolor: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        animation: `${infoGlow} 3.6s ease-in-out infinite`,
        flexShrink: 0,
        "&:active": { transform: "scale(0.9)" },
      }}
    >
      <Icon icon="mdi:information-outline" width={14} color={FOREST} />
    </Box>
  );
}

function ProductCard({
  deal,
  added,
  delay,
  onBuy,
  onInfo,
}: {
  deal: DealProduct;
  added: boolean;
  delay: string;
  onBuy: () => void;
  onInfo: () => void;
}) {
  return (
    <Box
      sx={{
        minWidth: PRODUCT_CARD_W,
        flex: `0 0 ${PRODUCT_CARD_W}px`,
        scrollSnapAlign: "start",
        borderRadius: "16px",
        bgcolor: "#fff",
        border: "1px solid rgba(212,175,103,0.38)",
        boxShadow: "0 8px 18px rgba(22,53,43,0.06)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: `${fadeUp} 0.45s ${PREMIUM_EASE} ${delay} both${
          added ? `, ${successFlash} 0.7s ease` : ""
        }`,
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: PRODUCT_IMG_H,
          flexShrink: 0,
          bgcolor: "#F6F1E6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderBottom: `1px solid ${REPORT_BORDER}`,
        }}
      >
        {deal.discountPct > 0 ? (
          <Box
            sx={{
              position: "absolute",
              top: 6,
              left: 6,
              zIndex: 1,
              px: 0.65,
              py: 0.2,
              borderRadius: "999px",
              bgcolor: "#E53935",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {deal.discountPct}% OFF
          </Box>
        ) : null}
        <Box sx={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}>
          <InfoIconButton label={`Product info for ${deal.displayName}`} onClick={onInfo} />
        </Box>
        <Box
          component="img"
          src={deal.imageUrl}
          alt=""
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            display: "block",
            pointerEvents: "none",
          }}
        />
        {formatSlotLabel(deal.slotNumbers, deal.slotId) ? (
          <Box
            sx={{
              position: "absolute",
              left: 6,
              bottom: 6,
              zIndex: 1,
              px: 0.7,
              py: 0.2,
              borderRadius: "6px",
              bgcolor: FOREST_DEEP,
              color: GOLD,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.02em",
              lineHeight: 1.15,
            }}
          >
            {formatSlotLabel(deal.slotNumbers, deal.slotId)}
          </Box>
        ) : null}
      </Box>
      <Box sx={{ px: 0.9, py: 0.65, display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            color: "#1B1A17",
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 28,
          }}
        >
          {deal.displayName}
        </Typography>
        <Box
          sx={{
            mt: "auto",
            pt: 0.35,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.45, minWidth: 0 }}>
            {deal.discountPct > 0 ? (
              <Typography sx={{ fontSize: 11, color: "#B0A89C", textDecoration: "line-through", fontWeight: 600 }}>
                ₹{deal.retailPrice}
              </Typography>
            ) : null}
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: SALE }}>₹{deal.salePrice}</Typography>
          </Box>
          <Box
            component="button"
            type="button"
            aria-label={`Add ${deal.displayName} to cart`}
            onClick={onBuy}
            sx={{
              width: 28,
              height: 28,
              flexShrink: 0,
              border: "none",
              borderRadius: "50%",
              bgcolor: added ? FOREST_DEEP : FOREST,
              color: GOLD,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              "&:active": { transform: "scale(0.94)" },
            }}
          >
            <Icon icon={added ? "mdi:check" : "mdi:plus"} width={16} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function BundleCard({
  routine,
  added,
  delay,
  onAdd,
  onInfo,
}: {
  routine: SkinRoutine;
  added: boolean;
  delay: string;
  onAdd: () => void;
  onInfo: () => void;
}) {
  const [first, second] = routine.products;
  return (
    <Box
      sx={{
        minWidth: 318,
        flex: "0 0 318px",
        alignSelf: "flex-start",
        height: "auto",
        boxSizing: "border-box",
        scrollSnapAlign: "start",
        borderRadius: "16px",
        bgcolor: "#fff",
        border: "1px solid rgba(212,175,103,0.38)",
        boxShadow: "0 8px 18px rgba(22,53,43,0.06)",
        px: 1.15,
        pt: 0.85,
        pb: 1.25,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "visible",
        animation: `${fadeUp} 0.45s ${PREMIUM_EASE} ${delay} both`,
      }}
    >
      <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
        <InfoIconButton label={`Routine info for ${routine.title}`} onClick={onInfo} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pr: 3.5, flexShrink: 0 }}>
        <Icon icon={routine.icon} width={15} color={FOREST} />
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: FOREST_DEEP, whiteSpace: "nowrap" }}>
          {routine.title}
        </Typography>
        <Box
          sx={{
            ml: 0.4,
            px: 0.6,
            py: 0.12,
            borderRadius: "999px",
            bgcolor: "rgba(229,57,53,0.1)",
            color: "#E53935",
            fontSize: 10,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          Save {routine.savePercent}%
        </Box>
      </Box>
      <Typography sx={{ fontSize: 11, color: "#7A7468", fontWeight: 600, mb: 0.6, flexShrink: 0 }}>
        {routine.subtitle}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.7, flexShrink: 0 }}>
        {[first, second].map((product, index) => (
          <Box key={product.id} sx={{ display: "flex", alignItems: "flex-start", gap: 0.7, flex: 1, minWidth: 0 }}>
            {index === 1 ? (
              <Box
                sx={{
                  mt: 2.2,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  bgcolor: "rgba(47,93,70,0.1)",
                  display: "grid",
                  placeItems: "center",
                  color: FOREST,
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                +
              </Box>
            ) : null}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  position: "relative",
                  height: 58,
                  borderRadius: "10px",
                  bgcolor: "#F6F1E6",
                  border: `1px solid ${REPORT_BORDER}`,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                {product.imageUrl ? (
                  <Box
                    component="img"
                    src={product.imageUrl}
                    alt=""
                    sx={{ maxWidth: "82%", maxHeight: 50, objectFit: "contain" }}
                  />
                ) : (
                  <Icon icon="mdi:bottle-tonic-outline" width={22} color="#9CA3AF" />
                )}
                {formatSlotLabel(product.slotNumbers, product.slotId) ? (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 4,
                      bottom: 4,
                      px: 0.5,
                      py: 0.12,
                      borderRadius: "5px",
                      bgcolor: FOREST_DEEP,
                      color: GOLD,
                      fontSize: 9,
                      fontWeight: 800,
                      lineHeight: 1.1,
                    }}
                  >
                    {formatSlotLabel(product.slotNumbers, product.slotId)}
                  </Box>
                ) : null}
              </Box>
              <Typography
                sx={{
                  mt: 0.45,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#1F2937",
                  lineHeight: 1.2,
                  textAlign: "center",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  height: 24,
                }}
              >
                {prettyName(product.name)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          mt: 0.4,
          pt: 0.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 0.7,
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {routine.retailTotal > routine.payableTotal ? (
            <Typography sx={{ fontSize: 11, color: "#B0A89C", textDecoration: "line-through", fontWeight: 600 }}>
              ₹{routine.retailTotal}
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: SALE, lineHeight: 1.1 }}>
            ₹{routine.payableTotal}
          </Typography>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={onAdd}
          sx={{
            border: "none",
            borderRadius: "999px",
            minHeight: 32,
            px: 1.4,
            flexShrink: 0,
            bgcolor: added ? FOREST_DEEP : FOREST,
            color: GOLD,
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            animation: added ? `${successFlash} 0.7s ease` : "none",
            "&:active": { transform: "scale(0.98)" },
          }}
        >
          {added ? "Added" : "Add bundle"}
        </Box>
      </Box>
    </Box>
  );
}
