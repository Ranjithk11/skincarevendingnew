"use client";

import { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Typography,
  Dialog,
  Button,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface EditProductModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  category: string;
  price: number;
  quantity: number;
  onSave: (data: {
    productId: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
  }) => void;
}

export default function EditProductModal({
  open,
  onClose,
  productId,
  productName,
  category,
  price,
  quantity,
  onSave,
}: EditProductModalProps) {
  const [name, setName] = useState(productName);
  const [cat, setCat] = useState(category);
  const [priceValue, setPriceValue] = useState(price);
  const [qty, setQty] = useState(quantity);

  useEffect(() => {
    if (open) {
      setName(productName);
      setCat(category);
      setPriceValue(price);
      setQty(quantity);
    }
  }, [open, productName, category, price, quantity]);

  const handleSave = () => {
    onSave({
      productId,
      name,
      category: cat,
      price: priceValue,
      quantity: qty,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          bgcolor: "#e8f5e9",
          maxWidth: 800,
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 28,
              color: "#16a34a",
              whiteSpace: "nowrap",
            }}
          >
            Edit Product
          </Typography>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              bgcolor: "#374151",
              "&:hover": { bgcolor: "#1f2937" },
              textTransform: "none",
              borderRadius: "6px",
              px: 1,
              py: 0.5,
              fontSize: 24,
              minWidth: "unset",
              width: "fit-content",
            }}
          >
            Back to Dashboard
          </Button>
        </Box>

        {/* Form */}
        <Box
          sx={{
            bgcolor: "#fff",
            borderRadius: "16px",
            p: 3,
          }}
        >
          {/* Product Name */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ mb: 1, fontWeight: 500,fontSize: 24, color: "#374151" }}>
              Product Name
            </Typography>
            <TextField
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  "& fieldset": {
                    borderColor: "#16a34a",
                  },
                  "&:hover fieldset": {
                    borderColor: "#16a34a",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#16a34a",
                  },
                },
              }}
            />
          </Box>

          {/* Category */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ mb: 1, fontWeight: 500,fontSize: 24, color: "#374151" }}>
              Category
            </Typography>
            <TextField
              fullWidth
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  "& fieldset": {
                    borderColor: "#e0e0e0",
                  },
                },
              }}
            />
          </Box>

          {/* Price */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ mb: 1, fontWeight: 500,fontSize: 24, color: "#374151" }}>
              Price (₹)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={priceValue === 0 ? "" : priceValue}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setPriceValue(0);
                } else {
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed) && parsed >= 0) {
                    setPriceValue(parsed);
                  }
                }
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  "& fieldset": {
                    borderColor: "#e0e0e0",
                  },
                },
              }}
            />
          </Box>

          {/* Quantity */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ mb: 1, fontWeight: 500,fontSize: 24, color: "#374151" }}>
              Quantity
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={qty === 0 ? "" : qty}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setQty(0);
                } else {
                  const parsed = parseInt(val, 10);
                  if (!isNaN(parsed) && parsed >= 0) {
                    setQty(parsed);
                  }
                }
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  "& fieldset": {
                    borderColor: "#e0e0e0",
                  },
                },
              }}
            />
          </Box>

          {/* Save Button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleSave}
              sx={{
                bgcolor: "#16a34a",
                "&:hover": { bgcolor: "#15803d" },
                textTransform: "none",
                borderRadius: "8px",
                px: 4,
                py: 1,
                fontSize:24,
              }}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
