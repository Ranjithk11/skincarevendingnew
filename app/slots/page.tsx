"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import TopLogo from "@/containers/skinanalysis-home/Recommendations/TopLogo";
import { useCart } from "@/containers/skinanalysis-home/Recommendations/CartContext";
import CartProduct from "@/containers/skinanalysis-home/Recommendations/cartProduct";
import SlotsGrid, { SlotsGridSlot } from "@/components/slots/SlotsGrid";
import NewProductCard from "@/containers/skinanalysis-home/Recommendations/NewProductCard";
import { SlotProduct } from "@/components/slots/SlotAddToCartDialog";
import ProductPrice from "@/containers/skinanalysis-home/Recommendations/components/ProductPrice";
import ActionButton from "@/components/ui/ActionButton";
import PageBackground from "@/components/ui/PageBackground";
import {
  findProductInMap,
  indexProductsById,
  mergeProductsIntoMap,
  productIdsMatch,
} from "@/lib/product-slot-utils";

type VendingSlot = {
  slot_id: number;
  product_id?: string;
  quantity: number;
  product_name?: string;
  category?: string;
  retail_price?: number;
  discount_value?: number;
  image_url?: string;
};

const parseProductsResponse = (json: unknown): any[] =>
  Array.isArray(json)
    ? json
    : Array.isArray((json as any)?.data)
      ? (json as any).data
      : Array.isArray((json as any)?.data?.[0]?.products)
        ? (json as any).data[0].products
        : [];

const getProductImageUrl = (product: any): string => {
  const candidate =
    product?.image_url ||
    product?.images?.[0]?.url ||
    product?.imageUrl ||
    product?.images?.[0] ||
    "";
  return typeof candidate === "string" ? candidate.trim() : "";
};

/** Paginate the full catalog once instead of one request per product id. */
async function fetchAllProducts(): Promise<any[]> {
  const PAGE_SIZE = 100;
  const allProducts: any[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= 50; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    const res = await fetch(`/api/admin/products?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) break;

    const json = await res.json();
    const batch = parseProductsResponse(json);
    if (batch.length === 0) break;

    batch.forEach((product) => {
      const id = String(product?.id ?? product?._id ?? "");
      if (!id || seenIds.has(id)) return;
      seenIds.add(id);
      allProducts.push(product);
    });

    if (batch.length < PAGE_SIZE) break;
  }

  return allProducts;
}

export default function SlotsPage() {
  const router = useRouter();
  const { count: cartCount } = useCart();

  const [openCart, setOpenCart] = useState(false);
  const [slotsData, setSlotsData] = useState<Record<number, VendingSlot>>({});
  const [productsMap, setProductsMap] = useState<Record<string, any>>({});
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const discountBackfillStarted = useRef(false);
  const imageBackfillStarted = useRef<Set<number>>(new Set());

  // Backfill a missing slot image only when the user opens that slot.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!addDialogOpen || !selectedSlotId) return;
      const slot = slotsData[selectedSlotId];
      if (!slot?.product_id) return;
      if (typeof slot.image_url === "string" && slot.image_url.trim()) return;
      if (imageBackfillStarted.current.has(selectedSlotId)) return;

      const catalogProduct = findProductInMap(productsMap, slot.product_id);
      const imageFromCatalog = getProductImageUrl(catalogProduct);
      if (imageFromCatalog) {
        setSlotsData((prev) => {
          const cur = prev[selectedSlotId];
          if (!cur || cur.image_url) return prev;
          return {
            ...prev,
            [selectedSlotId]: { ...cur, image_url: imageFromCatalog },
          };
        });
        return;
      }

      imageBackfillStarted.current.add(selectedSlotId);

      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "50");
        params.set("search", String(slot.product_id));

        const res = await fetch(`/api/admin/products?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const match = parseProductsResponse(json).find((p) =>
          productIdsMatch(slot.product_id, p?.id ?? p?._id)
        );
        const image_url = getProductImageUrl(match);
        if (!image_url) return;

        if (match) {
          setProductsMap((prev) => mergeProductsIntoMap(prev, [match]));
        }

        await fetch("/api/admin/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot_id: selectedSlotId,
            product_id: slot.product_id,
            quantity: slot.quantity,
            product_name: slot.product_name,
            category: slot.category,
            retail_price: slot.retail_price,
            image_url,
          }),
        });

        if (cancelled) return;
        setSlotsData((prev) => {
          const cur = prev[selectedSlotId];
          if (!cur) return prev;
          return {
            ...prev,
            [selectedSlotId]: {
              ...cur,
              image_url,
            },
          };
        });
      } catch {
        return;
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [addDialogOpen, selectedSlotId, slotsData, productsMap]);

  // Fetch slot assignments/quantity
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/admin/slots", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const json = res.ok ? await res.json() : {};
        if (cancelled) return;

        const obj = (json && typeof json === "object") ? json : {};
        // API returns Record<number, VendingSlot>
        const next: Record<number, VendingSlot> = {};
        Object.values(obj as any).forEach((slot: any) => {
          if (!slot?.slot_id) return;
          next[Number(slot.slot_id)] = {
            slot_id: Number(slot.slot_id),
            product_id: slot.product_id ? String(slot.product_id) : undefined,
            quantity: Number(slot.quantity ?? 0),
            product_name: slot.product_name,
            category: slot.category,
            retail_price: slot.retail_price !== undefined ? Number(slot.retail_price) : undefined,
            discount_value: slot.discount_value !== undefined ? Number(slot.discount_value) : undefined,
            image_url: slot.image_url ? String(slot.image_url) : undefined,
          };
        });

        setSlotsData(next);
      } catch {
        if (!cancelled) setSlotsData({});
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the full product catalog once (paginated) for id-based enrichment.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const products = await fetchAllProducts();
        if (cancelled) return;
        setProductsMap(indexProductsById(products));
      } catch {
        if (!cancelled) setProductsMap({});
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Backfill discount_value once when slots + catalog are both available.
  useEffect(() => {
    if (discountBackfillStarted.current) return;
    if (Object.keys(productsMap).length === 0 || Object.keys(slotsData).length === 0) return;

    discountBackfillStarted.current = true;
    const updates: Record<number, number> = {};

    Object.values(slotsData).forEach((slot) => {
      if (!slot.product_id) return;
      // Only update if discount_value is missing or 0
      if (slot.discount_value !== undefined && slot.discount_value !== null && slot.discount_value !== 0) return;

      const product = findProductInMap(productsMap, slot.product_id);

      const discountVal = Number((product as any)?.discount?.value) || 0;
      if (discountVal > 0) {
        updates[slot.slot_id] = discountVal;
        fetch("/api/admin/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot_id: slot.slot_id,
            product_id: slot.product_id,
            quantity: slot.quantity,
            product_name: slot.product_name,
            category: slot.category,
            retail_price: slot.retail_price,
            image_url: slot.image_url,
            discount_value: discountVal,
          }),
        }).catch(() => {});
      }
    });

    // Batch update local state once
    if (Object.keys(updates).length > 0) {
      setSlotsData((prev) => {
        const next = { ...prev };
        for (const [slotId, discountVal] of Object.entries(updates)) {
          const id = Number(slotId);
          if (next[id]) next[id] = { ...next[id], discount_value: discountVal };
        }
        return next;
      });
    }
  }, [productsMap, slotsData]);

  const totalSlots = 60;

  const gridSlots: SlotsGridSlot[] = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, i) => {
      const slotId = i + 1;
      const slot = slotsData[slotId];
      const isAvailable = Boolean(slot?.product_id) && (slot?.quantity ?? 0) > 0;
      return {
        slotId,
        isAvailable,
        isSelected: selectedSlotId === slotId,
        quantity: slot?.quantity,
      };
    });
  }, [selectedSlotId, slotsData]);

  const { items } = useCart();

  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => {
      // Extract price from priceText if available
      const priceMatch = item.priceText?.match(/INR\.?(\d+)/);
      const price = priceMatch ? Number(priceMatch[1]) : 0;
      return sum + (price * item.quantity);
    }, 0);
  }, [items]);

  const calculateDiscount = (total: number) => {
    if (!Number.isFinite(total) || total <= 0) return 0;
    return Math.min(120, Math.round(total)); // Max Rs.120 discount
  };

  const discount = useMemo(() => {
    return calculateDiscount(totalValue);
  }, [totalValue]);

  const selectedProduct: SlotProduct | null = useMemo(() => {
    if (!selectedSlotId) return null;
    const slot = slotsData[selectedSlotId];
    if (!slot?.product_id) return null;

    // Catalog lookup is strictly by product_id — never by name.
    const product = findProductInMap(productsMap, slot.product_id);

    // Slot assignment is the source of truth for what the customer sees.
    const name = slot.product_name || product?.name || "Product";
    const imageUrl = slot.image_url || getProductImageUrl(product);
    const retailPrice = slot.retail_price ?? product?.retail_price ?? 0;
    
    const productDiscount = Number(slot.discount_value) || Number(product?.discount?.value) || 0;
    
    // Calculate discounted price for cart display
    const finalPrice = productDiscount > 0
      ? retailPrice - (retailPrice * (productDiscount / 100))
      : retailPrice;
    const priceText = `INR.${Math.round(Number(finalPrice ?? 0))}/-`;

    return {
      id: slot.product_id,
      name,
      imageUrl,
      retailPrice: Number(retailPrice ?? 0),
      discountValue: productDiscount,
      priceText,
      slotId: selectedSlotId,
      quantityAvailable: slot.quantity,
    };
  }, [selectedSlotId, slotsData, productsMap, discount]);

  const handleSelect = (slotId: number) => {
    const slot = slotsData[slotId];
    const isAvailable = Boolean(slot?.product_id) && (slot?.quantity ?? 0) > 0;
    if (!isAvailable) return;
    setSelectedSlotId(slotId);
    setAddDialogOpen(true);
  };

  return (
    <PageBackground>
      <Box
        sx={{
          minHeight: "100vh",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <TopLogo
          isKiosk={false}
          cartCount={cartCount}
          onCartClick={() => setOpenCart(true)}
        />

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            maxWidth: 920,
            mx: "auto",
            pt: 14,
            px: { xs: 2, sm: 3, md: 4 },
            pb: 4,
          }}
        >
          <Typography
            sx={{
              textAlign: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "#111827",
              mb: 5,
            }}
          >
            SELECT PRODUCT SLOT
          </Typography>

          <Box
            sx={{
              backgroundColor: "#ffffff",
              borderRadius: 3,
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
              p: { xs: 3, sm: 2.5, md: 3 },
              minHeight: { xs: "calc(80vh - 200px)", sm: "calc(80vh - 260px)" },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SlotsGrid slots={gridSlots} columns={10} onSelect={handleSelect} />
{/* 
            <Typography sx={{ textAlign: "center", mt: 2, fontSize: 16, color: "#111827" }}>
              {selectedSlotId ? "1 Slot selected" : ""}
            </Typography>

            {selectedProduct && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <ProductPrice
                  retailPrice={selectedProduct.retailPrice}
                  discountValue={selectedProduct.discountValue}
                  priceText={selectedProduct.priceText}
                  productId={selectedProduct.id}
                  productName={selectedProduct.name}
                />
              </Box>
            )} */}

            <Box sx={{ display: "flex", justifyContent: "center", mt: "auto", pt: 2 }}>
              <ActionButton
                variant="primary"
                onClick={() => setOpenCart(true)}
                sx={{ width: "min(520px, 100%)", height: 72, borderRadius: "64px", fontSize: 22 }}
              >
                SHOW CART
              </ActionButton>
            </Box>
          </Box>
        </Box>

        <NewProductCard
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          id={selectedProduct?.id}
          name={selectedProduct?.name || ""}
          imageUrl={selectedProduct?.imageUrl}
          retailPrice={selectedProduct?.retailPrice || 0}
          discountValue={selectedProduct?.discountValue}
          quantity={selectedProduct?.quantityAvailable}
          slotId={selectedProduct?.slotId}
          shopifyUrl={undefined}
        />

        <CartProduct open={openCart} onClose={() => setOpenCart(false)} />
      </Box>
    </PageBackground>
  );
}
