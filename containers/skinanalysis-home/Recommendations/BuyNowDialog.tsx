import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, IconButton, Typography, useTheme } from "@mui/material";
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
}

const BuyNowDialog = ({ open, onClose, imageUrl, id, name, priceText }: BuyNowDialogProps) => {
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
          height: "485.99996948242233px",
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
          }}
        />

        <Box sx={{ width: "100%", maxWidth: 520 }}>
          <Typography variant="subtitle1" sx={{ textAlign: "center", fontWeight: 800 }}>
            {capitalizeWords(name)}
          </Typography>

          <Typography variant="subtitle1" color="primary" sx={{ textAlign: "center", mt: 2 }}>
            {priceText}
          </Typography>

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

          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(quantity);
              }}
              size="small"
              startIcon={<Icon icon="uil:cart" />}
              sx={{
                padding: "6px 12px",
                typography: "body1",
                whiteSpace: "nowrap",
                minWidth: 140,
              }}
            >
              Add To Cart
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default BuyNowDialog;
