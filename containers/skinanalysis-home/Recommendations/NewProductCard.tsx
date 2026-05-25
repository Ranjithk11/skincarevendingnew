"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Dialog, IconButton, Typography, Button, useMediaQuery, useTheme } from "@mui/material";
import { Icon } from "@iconify/react";
import { capitalizeWords } from "@/utils/func";
import { useCart } from "./CartContext";
import { SuccessOverlay } from "./components";
import { useVoiceMessages } from "@/contexts/VoiceContext";

interface NewProductCardProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string;
  id?: string;
  name: string;
  retailPrice: number;
  discountValue?: number;
  matchLabel?: string;
  productUse?: string;
  productBenefits?: string;
  skinConcerns?: string[];
  isAiRecommended?: boolean;
  skinType?: string;
  quantity?: number;
  shopifyUrl?: string;
}

const NewProductCard = ({
  open,
  onClose,
  imageUrl,
  id,
  name,
  retailPrice,
  discountValue,
  matchLabel,
  productUse,
  productBenefits,
  skinConcerns,
  isAiRecommended = true,
  skinType,
  quantity,
  shopifyUrl,
}: NewProductCardProps) => {
  const { addItem } = useCart();
  const { speakMessage } = useVoiceMessages();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [priceComparison, setPriceComparison] = useState<{
    amazonPrice: number | null;
    nykaaPrice: number | null;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setShowSuccess(false);
      setIsAdding(false);
      // Fetch price comparison from Google Sheet via API
      setPriceComparison(null);
      fetch(`/api/price-comparison?product=${encodeURIComponent(name)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.match) {
            setPriceComparison({
              amazonPrice: data.match.amazonPrice,
              nykaaPrice: data.match.nykaaPrice,
            });
          }
        })
        .catch(() => {});
    }
  }, [open, name]);

  const discountedPrice = useMemo(() => {
    if (!discountValue || isNaN(discountValue)) return retailPrice;
    return Math.round(retailPrice - retailPrice * (discountValue / 100));
  }, [retailPrice, discountValue]);

  const savings = retailPrice - discountedPrice;
  const savingsPercent = retailPrice > 0 ? Math.round((savings / retailPrice) * 100) : 0;

  const beautyPodPrice = discountedPrice;

  const handleAddToCart = () => {
    // On mobile, redirect to Shopify instead of local cart
    if (isMobile && shopifyUrl) {
      window.open(shopifyUrl, "_blank");
      onClose();
      return;
    }

    setIsAdding(true);
    addItem({
      id,
      name,
      imageUrl,
      priceText: `INR.${discountedPrice}/-`,
      originalPrice: retailPrice,
      discountValue,
      quantity: 1,
    });
    speakMessage("addToCart");
    setShowSuccess(true);
    setTimeout(() => {
      setIsAdding(false);
      onClose();
    }, 1200);
  };

  const concerns = skinConcerns?.length
    ? skinConcerns
    : matchLabel
      ? [matchLabel]
      : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          width: isMobile ? "100%" : "75%",
          maxWidth: isMobile ? "100%" : 700,
          borderRadius: isMobile ? 0 : "16px",
          overflow: "hidden",
          maxHeight: isMobile ? "100vh" : "90vh",
          m: isMobile ? 0 : undefined,
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          bgcolor: "#fff",
          overflowY: "auto",
          pb: 2,
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8, zIndex: 10, bgcolor: "#f3f4f6", "&:hover": { bgcolor: "#e5e7eb" } }}
        >
          <Icon icon="mdi:close" width={22} />
        </IconButton>

        {/* Success Overlay */}
        <SuccessOverlay
          show={showSuccess}
          title="Added to Cart!"
          subtitle={`1 × ${capitalizeWords(name)}`}
        />

        {/* Top Section: Image + Product Info */}
        <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 1.5 : 2.5, p: isMobile ? 2 : 3, pb: 1.5, alignItems: isMobile ? "center" : "flex-start" }}>
          {/* Product Image */}
          <Box
            component="img"
            src={imageUrl}
            alt={name}
            sx={{
              width: isMobile ? 100 : 140,
              height: isMobile ? 130 : 180,
              objectFit: "contain",
              flexShrink: 0,
              opacity: showSuccess ? 0.3 : 1,
              transition: "opacity 0.3s ease",
            }}
          />

          {/* Product Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* AI Recommended Badge */}
            {isAiRecommended && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  bgcolor: "#fef9e7",
                  border: "1px solid #f5d442",
                  borderRadius: "20px",
                  px: 1.5,
                  py: 0.4,
                  mb: 1,
                }}
              >
                <Icon icon="mdi:star" width={isMobile ? 14 : 16} color="#f5a623" />
                <Typography sx={{ fontSize: isMobile ? 12 : 20, fontWeight: 600, color: "#b8860b" }}>
                  AI RECOMMENDED
                </Typography>
              </Box>
            )}

            {/* Product Name */}
            <Typography
              sx={{
                fontSize: isMobile ? 16 : 28,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.2,
                mb: 0.5,
                textAlign: isMobile ? "center" : "left",
              }}
            >
              {capitalizeWords(name)}
            </Typography>

            {/* Product Description */}
            {productUse && (
              <Typography
                sx={{
                  fontSize: isMobile ? 13 : 22,
                  color: "#6b7280",
                  lineHeight: 1.3,
                  mb: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  textAlign: isMobile ? "center" : "left",
                }}
              >
                {productUse
                  .split(" ")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(" ")}
              </Typography>
            )}

            {/* Suitable for skin type */}
            {skinType && (
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, border: "1px solid #d1d5db", borderRadius: "20px", px: 1.5, py: 0.4, justifyContent: isMobile ? "center" : "flex-start" }}>
                <Icon icon="mdi:check-circle" width={isMobile ? 14 : 18} color="#16a34a" />
                <Typography sx={{ fontSize: isMobile ? 12 : 20, color: "#374151" }}>
                  Suitable for {skinType} skin
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Price + Comparison Section */}
        <Box sx={{ mx: isMobile ? 1.5 : 3, mb: 2, border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row" }}>
            {/* BeautyPOD Price */}
            <Box sx={{ flex: 1, p: isMobile ? 1.5 : 2, borderRight: isMobile ? "none" : "1px solid #e5e7eb", borderBottom: isMobile ? "1px solid #e5e7eb" : "none" }}>
              <Typography sx={{ fontSize: isMobile ? 14 : 20, fontWeight: 700, color: "#1a3c34", mb: 0.5 }}>
                BeautyPOD Price
              </Typography>
              <Typography sx={{ fontSize: isMobile ? 32 : 48, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                ₹{beautyPodPrice}
              </Typography>
              {savings > 0 && (
                <>
                  <Typography sx={{ fontSize: isMobile ? 13 : 20, color: "#9ca3af", mt: 0.5 }}>
                    MRP <span style={{ textDecoration: "line-through" }}>₹{retailPrice}</span>
                  </Typography>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      bgcolor: "#ecfdf5",
                      border: "1px solid #86efac",
                      borderRadius: "20px",
                      px: 1.5,
                      py: 0.3,
                      mt: 0.75,
                    }}
                  >
                    <Icon icon="mdi:tag" width={isMobile ? 14 : 18} color="#16a34a" />
                    <Typography sx={{ fontSize: isMobile ? 12 : 20, fontWeight: 600, color: "#16a34a" }}>
                      You Save ₹{savings} Discount({savingsPercent}%)
                    </Typography>
                  </Box>
                </>
              )}
            </Box>

            {/* Price Comparison */}
            <Box sx={{ flex: 1, p: isMobile ? 1.5 : 2 }}>
              <Typography sx={{ fontSize: isMobile ? 13 : 18, fontWeight: 700, color: "#6b7280", letterSpacing: 0.5, mb: 1.5 }}>
                PRICE COMPARISON
              </Typography>

              {/* BeautyPOD Row */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, pb: 1, borderBottom: "1px solid #f3f4f6" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#1a3c34", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon icon="mdi:check" width={16} color="#fff" />
                  </Box>
                  <Typography sx={{ fontSize: isMobile ? 14 : 22, fontWeight: 600, color: "#1a3c34" }}>
                    BeautyPOD 
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: isMobile ? 14 : 22, fontWeight: 700, color: "#111827" }}>
                  ₹{beautyPodPrice}
                </Typography>
              </Box>

              {/* Amazon Row - only show if Amazon price > our price */}
              {priceComparison?.amazonPrice && priceComparison.amazonPrice > beautyPodPrice && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, pb: 1, borderBottom: "1px solid #f3f4f6" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#111827", fontFamily: "serif", lineHeight: 1 }}>
                      a
                    </Typography>
                    <Typography sx={{ fontSize: isMobile ? 14 : 22, color: "#374151" }}>
                      Amazon
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: isMobile ? 14 : 22, fontWeight: 600, color: "#374151" }}>
                    ₹{priceComparison.amazonPrice}
                  </Typography>
                </Box>
              )}

              {/* Nykaa Row - only show if Nykaa price > our price */}
              {priceComparison?.nykaaPrice && priceComparison.nykaaPrice > beautyPodPrice && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#e91e63", fontStyle: "italic", lineHeight: 1 }}>
                      nykaa
                    </Typography>
                    <Typography sx={{ fontSize: isMobile ? 14 : 22, color: "#374151" }}>
                      Nykaa
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: isMobile ? 14 : 22, fontWeight: 600, color: "#374151" }}>
                    ₹{priceComparison.nykaaPrice}
                  </Typography>
                </Box>
              )}

              <Typography sx={{ fontSize: isMobile ? 11 : 16, color: "#9ca3af", fontStyle: "italic", mt: 0.5 }}>
                Prices may vary by platform
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Recommended for your skin concerns */}
        {concerns.length > 0 && (
          <Box
            sx={{
              mx: isMobile ? 1.5 : 3,
              mb: 2,
              bgcolor: "#f0fdf4",
              borderRadius: "12px",
              p: isMobile ? 1.5 : 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: isMobile ? 36 : 48,
                height: isMobile ? 36 : 48,
                borderRadius: "50%",
                bgcolor: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon icon="mdi:leaf" width={isMobile ? 20 : 26} color="#16a34a" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: isMobile ? 13 : 22, fontWeight: 700, color: "#16a34a" }}>
                Recommended for your skin concerns
              </Typography>
              <Typography sx={{ fontSize: isMobile ? 12 : 20, color: "#4b5563" }}>
                {concerns.join(" · ")}
              </Typography>
            </Box>
          </Box>
        )}

        {/* WHY BUY FROM BEAUTYPOD */}
        <Box sx={{ mx: isMobile ? 1.5 : 3, mb: 2, border: "1px solid #e5e7eb", borderRadius: "12px", p: isMobile ? 1.5 : 2 }}>
          <Typography sx={{ fontSize: isMobile ? 14 : 24, fontWeight: 700, color: "#1a3c34", letterSpacing: 0.5, mb: 1.5 }}>
            WHY <span style={{ color: "#16a34a" }}>BUY</span> FROM <span style={{ color: "#e54810" }}>BEAUTYPOD</span>?
          </Typography>
          <Box sx={{ display: "flex", flexWrap: isMobile ? "wrap" : "nowrap", justifyContent: isMobile ? "center" : "space-between", gap: isMobile ? 1 : 0 }}>
            {[
              { icon: "mdi:clock-fast", label: "Instant\nProduct Pickup" },
              { icon: "mdi:brain", label: "AI-Recommended\nfor Your Skin" },
              { icon: "mdi:truck-remove", label: "No Delivery\nWait" },
              { icon: "mdi:shield-check", label: "Genuine\nSkincare" },
              { icon: "mdi:star-check", label: "Expert-Curated\nRoutine" },
            ].map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  flex: isMobile ? "0 0 30%" : 1,
                  borderRight: isMobile ? "none" : (idx < 4 ? "1px solid #e5e7eb" : "none"),
                  px: 0.5,
                }}
              >
                <Icon icon={item.icon} width={isMobile ? 24 : 32} color="#1a3c34" />
                <Typography sx={{ fontSize: isMobile ? 11 : 16, color: "#374151", mt: 0.5, whiteSpace: "pre-line", lineHeight: 1.2 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Stock indicator */}
        {typeof quantity === "number" && quantity > 0 && quantity <= 5 && (
          <Box
            sx={{
              mx: isMobile ? 1.5 : 3,
              mb: 1.5,
              bgcolor: "#fff7ed",
              borderRadius: "10px",
              py: 1.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
            }}
          >
            <Icon icon="mdi:fire" width={isMobile ? 18 : 22} color="#ea580c" />
            <Typography sx={{ fontSize: isMobile ? 14 : 22, fontWeight: 600, color: "#ea580c" }}>
              Only {quantity} left in this machine!
            </Typography>
          </Box>
        )}

        {/* ADD TO CART Button */}
        <Box sx={{ mx: isMobile ? 1.5 : 3, mb: 1 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleAddToCart}
            disabled={isAdding}
            startIcon={
              <Box
                component="img"
                src="/icons/buy.svg"
                alt=""
                sx={{ width: 24, height: 24, objectFit: "contain", filter: "brightness(0) invert(1)" }}
              />
            }
            sx={{
              bgcolor: "#1a3c34",
              color: "#fff",
              borderRadius: "12px",
              py: isMobile ? 1 : 1.5,
              fontSize: isMobile ? 16 : 26,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
              "&:hover": { bgcolor: "#16362c" },
              "&:disabled": { bgcolor: "#9ca3af", color: "#fff" },
            }}
          >
            {isAdding ? "Adding..." : isMobile && shopifyUrl ? `BUY ON SHOPIFY – ₹${beautyPodPrice}` : `ADD TO CART – ₹${beautyPodPrice}`}
          </Button>
        </Box>

        {/* Secure payment */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mb: 1 }}>
          <Icon icon="mdi:lock" width={isMobile ? 14 : 16} color="#9ca3af" />
          <Typography sx={{ fontSize: isMobile ? 12 : 18, color: "#9ca3af" }}>
            100% Secure Payment
          </Typography>
        </Box>

        {/* Product Benefits - Expandable */}
        {productBenefits && (
          <Box sx={{ mx: isMobile ? 1.5 : 3, mt: 1, borderTop: "1px solid #e5e7eb", pt: 2 }}>
            <Typography sx={{ fontSize: isMobile ? 16 : 24, fontWeight: 700, color: "#111827", mb: 0.5 }}>
              {capitalizeWords(name.split(" ").slice(-2).join(" "))}
            </Typography>
            <Typography sx={{ fontSize: isMobile ? 13 : 20, color: "#6b7280", lineHeight: 1.4 }}>
              {productBenefits
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(" ")}
            </Typography>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default NewProductCard;
