"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Modal,
  Button,
  Select,
  MenuItem,
  TextField,
  IconButton,
  FormControl,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  amount: number;
  image?: string;
}

interface SlotAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  slotNumber: number;
  products: Product[];
  currentProduct?: Product | null;
  currentQuantity?: number;
  onAssign: (slotNumber: number, productId: string, quantity: number) => void;
  onRemove: (slotNumber: number) => void;
  onUpdateQuantity?: (slotNumber: number, quantity: number) => void;
}

export default function SlotAssignmentModal({
  open,
  onClose,
  slotNumber,
  products,
  currentProduct,
  currentQuantity = 0,
  onAssign,
  onRemove,
  onUpdateQuantity,
}: SlotAssignmentModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(10);
  const [quantityAdjustment, setQuantityAdjustment] = useState<number>(0);

  const hasCurrentProduct = !!currentProduct;

  useEffect(() => {
    if (open) {
      setSelectedProductId(currentProduct?.id || "");
      setQuantity(currentQuantity || 10);
      setQuantityAdjustment(0);
    }
  }, [open, currentProduct, currentQuantity]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleQuantityButton = (delta: number) => {
    setQuantityAdjustment((prev) => prev + delta);
  };

  const handleUpdateQuantity = () => {
    if (onUpdateQuantity && quantityAdjustment !== 0) {
      const newQuantity = Math.max(0, currentQuantity + quantityAdjustment);
      onUpdateQuantity(slotNumber, newQuantity);
      setQuantityAdjustment(0);
    }
  };

  const handleAssign = () => {
    if (selectedProductId && quantity > 0) {
      onAssign(slotNumber, selectedProductId, quantity);
      onClose();
    }
  };

  const handleRemove = () => {
    onRemove(slotNumber);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0,0,0,0.85)",
        },
      }}
    >
      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: "24px",
          width: 733,
          maxHeight: "90vh",
          overflow: "auto",
          outline: "none",
          p: "47px 45px",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: hasCurrentProduct ? 4 : 6,
          }}
        >
          <Typography
            sx={{
              fontSize: 32,
              fontWeight: 400,
              fontFamily: "Roboto, sans-serif",
              color: "#000",
            }}
          >
            Assign Product to Slot {slotNumber}
          </Typography>
          <IconButton onClick={onClose} sx={{ p: 0 }}>
            <CloseIcon sx={{ fontSize: 30, color: "#000" }} />
          </IconButton>
        </Box>

        {/* Currently Assigned Product Section */}
        {hasCurrentProduct && (
          <Box
            sx={{
              backgroundColor: "#f9f9f9",
              borderRadius: "12px",
              p: 3,
              mb: 4,
            }}
          >
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 500,
                fontFamily: "Roboto, sans-serif",
                color: "#000",
                mb: 2,
              }}
            >
              Currently Assigned Product
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              {currentProduct?.image && (
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "8px",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={currentProduct.image}
                    alt={currentProduct.name}
                    width={60}
                    height={60}
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              )}
              <Box>
                <Typography
                  sx={{
                    fontSize: 18,
                    fontWeight: 500,
                    fontFamily: "Roboto, sans-serif",
                    color: "#000",
                    textTransform: "uppercase",
                  }}
                >
                  {currentProduct?.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 14,
                    fontFamily: "Roboto, sans-serif",
                    color: "#666",
                  }}
                >
                  Quantity: {currentQuantity}
                </Typography>
              </Box>
            </Box>

            {/* Update Quantity Controls */}
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 500,
                fontFamily: "Roboto, sans-serif",
                color: "#000",
                mb: 1.5,
              }}
            >
              Update Quantity
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {[-10, -5, -1].map((delta) => (
                <Button
                  key={delta}
                  variant="outlined"
                  onClick={() => handleQuantityButton(delta)}
                  sx={{
                    minWidth: 50,
                    height: 40,
                    borderRadius: "8px",
                    borderColor: "#ff6b6b",
                    color: "#ff6b6b",
                    fontSize: 16,
                    fontWeight: 500,
                    "&:hover": {
                      borderColor: "#ff4545",
                      backgroundColor: "rgba(255,69,69,0.1)",
                    },
                  }}
                >
                  {delta}
                </Button>
              ))}
              <Box
                sx={{
                  minWidth: 60,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(0,0,0,0.2)",
                  borderRadius: "8px",
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {quantityAdjustment >= 0 ? `+${quantityAdjustment}` : quantityAdjustment}
              </Box>
              {[1, 5, 10].map((delta) => (
                <Button
                  key={delta}
                  variant="outlined"
                  onClick={() => handleQuantityButton(delta)}
                  sx={{
                    minWidth: 50,
                    height: 40,
                    borderRadius: "8px",
                    borderColor: "#39cf4a",
                    color: "#39cf4a",
                    fontSize: 16,
                    fontWeight: 500,
                    "&:hover": {
                      borderColor: "#2db33d",
                      backgroundColor: "rgba(57,207,74,0.1)",
                    },
                  }}
                >
                  +{delta}
                </Button>
              ))}
              <Button
                variant="contained"
                onClick={handleUpdateQuantity}
                disabled={quantityAdjustment === 0}
                sx={{
                  minWidth: 80,
                  height: 40,
                  borderRadius: "8px",
                  backgroundColor: "#356A5A",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#2a5548",
                  },
                  "&:disabled": {
                    backgroundColor: "#ccc",
                    color: "#999",
                  },
                }}
              >
                Update
              </Button>
            </Box>
          </Box>
        )}

        {/* Select Product */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "Roboto, sans-serif",
              color: "#000",
              mb: 2,
            }}
          >
            Select Product
          </Typography>
          <FormControl fullWidth>
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              displayEmpty
              sx={{
                height: 73,
                borderRadius: "12px",
                fontSize: 20,
                fontFamily: "Roboto, sans-serif",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0,0,0,0.2)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0,0,0,0.4)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#356A5A",
                },
              }}
            >
              <MenuItem value="" disabled>
                <Typography sx={{ color: "#999" }}>Select a product</Typography>
              </MenuItem>
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Selected Product Preview */}
        {selectedProduct && (
          <Box
            sx={{
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "12px",
              p: 2,
              mb: 4,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {selectedProduct.image && (
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "8px",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  width={80}
                  height={80}
                  style={{ objectFit: "cover" }}
                />
              </Box>
            )}
            <Box>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "Roboto, sans-serif",
                  color: "#000",
                  textTransform: "uppercase",
                }}
              >
                {selectedProduct.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  fontFamily: "Roboto, sans-serif",
                  color: "#666",
                  textTransform: "uppercase",
                }}
              >
                {selectedProduct.category}
              </Typography>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 500,
                  fontFamily: "Roboto, sans-serif",
                  color: "#39cf4a",
                }}
              >
                {selectedProduct.price}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Quantity Input */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "Roboto, sans-serif",
              color: "#000",
              mb: 0.5,
            }}
          >
            Quantity{" "}
            <Typography
              component="span"
              sx={{
                fontSize: 20,
                color: "#9a9a9a",
              }}
            >
              (Must be less than or equal to product stock)
            </Typography>
          </Typography>
          <TextField
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
            fullWidth
            sx={{
              mt: 2,
              "& .MuiOutlinedInput-root": {
                height: 73,
                borderRadius: "12px",
                fontSize: 20,
                fontFamily: "Roboto, sans-serif",
                "& fieldset": {
                  borderColor: "rgba(0,0,0,0.2)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(0,0,0,0.4)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#356A5A",
                },
              },
            }}
          />
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            variant="contained"
            onClick={handleRemove}
            sx={{
              width: 139,
              height: 73,
              borderRadius: "12px",
              backgroundColor: "#ff4545",
              color: "#fff",
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "Roboto, sans-serif",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#e03e3e",
              },
            }}
          >
            Remove
          </Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={!selectedProductId || quantity <= 0}
            sx={{
              width: 139,
              height: 73,
              borderRadius: "12px",
              backgroundColor: "#39cf4a",
              color: "#fff",
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "Roboto, sans-serif",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#2db33d",
              },
              "&:disabled": {
                backgroundColor: "#ccc",
                color: "#999",
              },
            }}
          >
            Assign
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
