import React, { useEffect, useState } from "react";
import { Box, Chip, Dialog, IconButton, Typography, useTheme } from "@mui/material";
import { Icon } from "@iconify/react";
import { capitalizeWords } from "@/utils/func";
import { useCart } from "./CartContext";
import { SuccessOverlay, QuantitySelector, AddToCartButton, ProductPrice } from "./components";
import { useVoiceMessages } from "@/contexts/VoiceContext";

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
  const { speakMessage } = useVoiceMessages();
  const [quantity, setQuantity] = useState<number>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setShowSuccess(false);
      setIsAdding(false);
    }
  }, [open]);

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem({
      id,
      name,
      imageUrl,
      priceText,
      originalPrice: retailPrice,
      discountValue: discountValue,
      quantity,
    });

    speakMessage("addToCart");
    
    setShowSuccess(true);
    
    setTimeout(() => {
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
          width: "75%",
          height: "750px",
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
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
          <Icon icon="mdi:close" />
        </IconButton>

        {/* Success Animation Overlay */}
        <SuccessOverlay
          show={showSuccess}
          title="Added to Cart!"
          subtitle={`${quantity} × ${capitalizeWords(name)}`}
        />

        <Box
          component="img"
          src={imageUrl}
          alt={name}
          sx={{
            width: 140,
            height: 200,
            objectFit: "contain",
            mt: 10,
            opacity: showSuccess ? 0.3 : 1,
            transition: "opacity 0.3s ease",
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
                fontSize:24,
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
                  fontSize:24,
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

          <Box sx={{ mt: 2 }}>
            <ProductPrice
              retailPrice={retailPrice}
              discountValue={discountValue}
              priceText={priceText}
            />
          </Box>

          <Box sx={{ mt: 1.5 }}>
            <QuantitySelector
              quantity={quantity}
              onChange={setQuantity}
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 2 }}>
            <AddToCartButton
              onClick={handleAddToCart}
              isLoading={isAdding}
              fullWidth
            />
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default BuyNowDialog;
