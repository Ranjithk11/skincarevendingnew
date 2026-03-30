"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Dialog, IconButton, Typography, useTheme } from "@mui/material";
import { Icon } from "@iconify/react";
import { useCart } from "@/containers/skinanalysis-home/Recommendations/CartContext";
import { SuccessOverlay, QuantitySelector, AddToCartButton, ProductPrice } from "@/containers/skinanalysis-home/Recommendations/components";
import { useVoiceMessages } from "@/contexts/VoiceContext";

export type SlotProduct = {
  id?: string;
  name: string;
  imageUrl?: string;
  retailPrice?: number;
  discountValue?: number;
  priceText: string;
  slotId: number;
  quantityAvailable?: number;
};

interface SlotAddToCartDialogProps {
  open: boolean;
  onClose: () => void;
  product: SlotProduct | null;
}

export default function SlotAddToCartDialog({ open, onClose, product }: SlotAddToCartDialogProps) {
  const theme = useTheme();
  const { addItem } = useCart();
  const { speakMessage } = useVoiceMessages();

  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setShowSuccess(false);
      setIsAdding(false);
    }
  }, [open]);

  const maxQty = useMemo(() => {
    const q = product?.quantityAvailable;
    if (typeof q !== "number" || !Number.isFinite(q)) return undefined;
    return Math.max(1, Math.floor(q));
  }, [product?.quantityAvailable]);

  const handleAdd = () => {
    if (!product) return;

    setIsAdding(true);
    addItem({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      priceText: product.priceText,
      originalPrice: product.retailPrice,
      discountValue: product.discountValue,
      quantity,
      slotId: product.slotId,
    });

    speakMessage("addToCart");
    setShowSuccess(true);

    window.setTimeout(() => {
      setIsAdding(false);
      onClose();
    }, 1200);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "min(820px, 92vw)",
          borderRadius: "16px",
          border: "1px solid rgba(0,0,0,0.12)",
          overflow: "hidden",
          [theme.breakpoints.down("sm")]: {
            width: "92vw",
          },
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          backgroundColor: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
          <Icon icon="mdi:close" />
        </IconButton>

        <SuccessOverlay
          show={showSuccess}
          title="Added to Cart!"
          subtitle={product ? `${quantity} × ${product.name}` : undefined}
        />

        <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#111827", mt: 1 }}>
          {product ? `Slot ${product.slotId}` : ""}
        </Typography>

        {(() => {
          const src =
            typeof product?.imageUrl === "string" && product.imageUrl.trim()
              ? product.imageUrl
              : "/wending/productlog.svg";

          return (
        <Box
          component="img"
          src={src}
          alt={product?.name || "Product"}
          sx={{
            width: 140,
            height: 200,
            objectFit: "contain",
            mt: 2,
            opacity: showSuccess ? 0.3 : 1,
            transition: "opacity 0.3s ease",
          }}
        />
          );
        })()}

        <Box sx={{ width: "100%", maxWidth: 520 }}>
          <Typography sx={{ textAlign: "left", fontWeight: 800, fontSize: 20 }}>
            {product?.name || ""}
          </Typography>

          <Box sx={{ mt: 1 }}>
            <ProductPrice
              retailPrice={product?.retailPrice}
              discountValue={product?.discountValue}
              priceText={product?.priceText || ""}
              productId={product?.id}
              productName={product?.name}
            />
          </Box>

          <Box sx={{ mt: 1.5 }}>
            <QuantitySelector quantity={quantity} onChange={setQuantity} min={1} max={maxQty} />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 0.5 }}>
            <AddToCartButton onClick={handleAdd} isLoading={isAdding} fullWidth disabled={!product} />
          </Box>

          {typeof product?.quantityAvailable === "number" ? (
            <Typography sx={{ textAlign: "center", mt: 1, color: "#6b7280", fontSize: 14 }}>
              {product.quantityAvailable} available in Slot
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Dialog>
  );
}
