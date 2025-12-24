import React, { useEffect, useState } from "react";
import { Box, Button, Chip, Dialog, IconButton, Typography, useTheme } from "@mui/material";
import { Icon } from "@iconify/react";
import { capitalizeWords } from "@/utils/func";
import { useCart } from "./CartContext";

interface BuyNowDialogProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string;
  id?: string;
  name: string;
  priceText: string;
  matchLabel?: string;
  productUse?: string;
  productBenefits?: string;
  retailPrice?: number;
  discountValue?: number;
}

const calculateDiscount = (originalPrice?: number, discountAmount?: number) => {
  if (!Number.isFinite(originalPrice as number)) return undefined;
  if (!Number.isFinite(discountAmount as number)) return originalPrice;
  const discountedPrice =
    (originalPrice as number) - (originalPrice as number) * ((discountAmount as number) / 100);
  return Number(discountedPrice.toFixed(0));
};

const BuyNowDialog = ({
  open,
  onClose,
  imageUrl,
  id,
  name,
  priceText,
  matchLabel,
  productUse,
  productBenefits,
  retailPrice,
  discountValue,
}: BuyNowDialogProps) => {
  const theme = useTheme();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (open) {
      setQuantity(1);
    }
  }, [open]);

  const handleAddToCart = (qty: number) => {
    addItem({
      id,
      name,
      imageUrl,
      priceText,
      quantity: qty,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "70%",
          height: "550px",
          borderRadius: "13px",
          border: "1px solid rgba(0,0,0,0.12)",
          opacity: 1,
          overflow: "hidden",
          [theme.breakpoints.down("sm")]: {
            width: "92vw",
            height: "auto",
          },
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          padding:2,
          backgroundColor: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 8, right: 8 }}>
          <Icon icon="mdi:close" />
        </IconButton>

        <Box
          component="img"
          src={imageUrl}
          alt={name}
          sx={{
            width: 140,
            height: 250,
            objectFit: "contain",
            mt:4,
            
          }}
        />

        <Box sx={{ width: "100%", maxWidth: 520 }}>
          {matchLabel ? (
            <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
              <Chip
                variant="outlined"
                color="primary"
                size="small"
                label={matchLabel}
                sx={{ borderRadius: 1 }}
              />
            </Box>
          ) : null}

          <Typography variant="subtitle1" sx={{ textAlign: "left", fontWeight: 800 }}>
            {capitalizeWords(name)}
          </Typography>

          {productUse ? (
            <Typography
              variant="body2"
              sx={{
                textAlign: "left",
                mt: 0.75,
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {productUse
                .split(" ")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(" ")}
            </Typography>
          ) : null}

          {productBenefits ? (
            <Box sx={{ mt: 1.25 }}>
              <Typography variant="subtitle1" sx={{ textAlign: "left", fontWeight: 800 }}>
                Benefits
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  textAlign: "left",
                  color: "text.secondary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {productBenefits
                  .split(" ")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() +
                      word.slice(1).toLowerCase()
                  )
                  .join(" ")}
              </Typography>
            </Box>
          ) : null}

          <Box sx={{ mt: 2, textAlign: "left" }}>
            {Number.isFinite(retailPrice as number) &&
            Number.isFinite(discountValue as number) &&
            calculateDiscount(retailPrice, discountValue) !== retailPrice ? (
              <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 1.5, alignItems: "baseline" }}>
                <Typography sx={{ textDecoration: "line-through" }} variant="subtitle2">
                  INR.{retailPrice}/-
                </Typography>
                <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800 }}>
                  INR.{calculateDiscount(retailPrice, discountValue)}/-
                </Typography>
              </Box>
            ) : (
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, textAlign: "left" }}>
                {priceText}
              </Typography>
            )}

            {discountValue ? (
              <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary", textAlign: "left" }}>
                Discount: Flat {discountValue}%
              </Typography>
            ) : null}
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              mt: 1.5,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              sx={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 1,
              }}
            >
              <Icon icon="mdi:minus" />
            </IconButton>

            <Box
              component="input"
              value={quantity}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next) && next >= 1) {
                  setQuantity(next);
                }
              }}
              inputMode="numeric"
              style={{
                width: 60,
                height: 32,
                textAlign: "center",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 6,
                outline: "none",
                fontSize: 14,
              }}
            />

            <IconButton
              size="small"
              onClick={() => setQuantity((q) => q + 1)}
              sx={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 1,
              }}
            >
              <Icon icon="mdi:plus" />
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 2, mb: 2, gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(quantity);
              }}
              size="small"
             
              sx={{
                padding: "12px 12px",
                typography: "body1",
                whiteSpace: "nowrap",
                minWidth: 140,
              }}
            >
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                <Box component="span">Add To Cart</Box>
                <Box
                  component="img"
                  src="/icons/buy.svg"
                  alt="Buy"
                  sx={{ width: 18, height: 18, objectFit: "contain", display: "block" }}
                />
              </Box>
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default BuyNowDialog;
