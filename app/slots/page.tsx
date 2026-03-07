"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import TopLogo from "@/containers/skinanalysis-home/Recommendations/TopLogo";
import { useCart } from "@/containers/skinanalysis-home/Recommendations/CartContext";
import CartProduct from "@/containers/skinanalysis-home/Recommendations/cartProduct";
import SlotsGrid, { SlotsGridSlot } from "@/components/slots/SlotsGrid";
import SlotAddToCartDialog, { SlotProduct } from "@/components/slots/SlotAddToCartDialog";
import ActionButton from "@/components/ui/ActionButton";
import PageBackground from "@/components/ui/PageBackground";

type VendingSlot = {
  slot_id: number;
  product_id?: string;
  quantity: number;
  product_name?: string;
  category?: string;
  retail_price?: number;
};

const normalizeProductId = (id: unknown) => {
  const raw = String(id ?? "").trim();
  return raw.replace(/^products\//, "");
};

export default function SlotsPage() {
  const router = useRouter();
  const { count: cartCount } = useCart();

  const [openCart, setOpenCart] = useState(false);
  const [slotsData, setSlotsData] = useState<Record<number, VendingSlot>>({});
  const [productsMap, setProductsMap] = useState<Record<string, any>>({});
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

  // Fetch products for mapping slot -> product image/discount/price
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "1000");
        params.set("hasBrand", "true");
        params.set("isShopifyAvailable", "true");

        const res = await fetch(`/api/admin/products?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setProductsMap({});
          return;
        }

        const json = await res.json();
        if (cancelled) return;

        const arr: any[] = Array.isArray(json) ? json : [];
        const map: Record<string, any> = {};
        arr.forEach((p) => {
          const nId = normalizeProductId(p?.id);
          if (!nId) return;
          map[nId] = p;
        });

        setProductsMap(map);
      } catch {
        if (!cancelled) setProductsMap({});
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const selectedProduct: SlotProduct | null = useMemo(() => {
    if (!selectedSlotId) return null;
    const slot = slotsData[selectedSlotId];
    if (!slot?.product_id) return null;

    const nId = normalizeProductId(slot.product_id);
    const product = productsMap[nId];

    const name = product?.name || slot.product_name || "Product";
    const imageUrl = product?.image_url || product?.imageUrl || "";
    const retailPrice = product?.retail_price ?? slot.retail_price;
    const discountValue = product?.discount?.value;

    const priceText = `INR.${Number(retailPrice ?? 0)}/-`;

    return {
      id: product?.id ? String(product.id) : slot.product_id,
      name,
      imageUrl,
      retailPrice: Number(retailPrice ?? 0),
      discountValue: Number.isFinite(Number(discountValue)) ? Number(discountValue) : undefined,
      priceText,
      slotId: selectedSlotId,
      quantityAvailable: slot.quantity,
    };
  }, [productsMap, selectedSlotId, slotsData]);

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
          onScanAgainClick={() => router.push("/")}
          firstButtonLabel="My cart"
          secondButtonLabel="Back"
          secondButtonIcon="/icons/face.png"
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
              fontSize: 24,
              fontWeight: 800,
              color: "#111827",
              mb: 2,
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
              p: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            <SlotsGrid slots={gridSlots} columns={10} onSelect={handleSelect} />

            <Typography sx={{ textAlign: "center", mt: 2, fontSize: 16, color: "#111827" }}>
              {selectedSlotId ? "1 Product selected" : ""}
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
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

        <SlotAddToCartDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          product={selectedProduct}
        />

        <CartProduct open={openCart} onClose={() => setOpenCart(false)} />
      </Box>
    </PageBackground>
  );
}
