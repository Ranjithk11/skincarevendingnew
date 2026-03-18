"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  IconButton,
  Typography,
  Dialog,
  Button,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";

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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [activeField, setActiveField] = useState<"name" | "category" | "price" | "quantity">("name");

  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(productName);
      setCat(category);
      setPriceValue(price);
      setQty(quantity);
      setIsKeyboardOpen(false);
      setActiveField("name");
      setTimeout(() => nameRef.current?.focus(), 0);
    }
  }, [open, productName, category, price, quantity]);

  const focusField = (field: typeof activeField) => {
    setActiveField(field);
    setIsKeyboardOpen(true);
    if (field === "name") nameRef.current?.focus();
    if (field === "category") categoryRef.current?.focus();
    if (field === "price") priceRef.current?.focus();
    if (field === "quantity") quantityRef.current?.focus();
  };

  const handleKeyboardKeyPress = (key: string) => {
    const isNumberField = activeField === "price" || activeField === "quantity";

    const getString = () => {
      if (activeField === "name") return name;
      if (activeField === "category") return cat;
      if (activeField === "price") return String(priceValue || "");
      return String(qty || "");
    };

    const setString = (next: string) => {
      if (activeField === "name") return setName(next);
      if (activeField === "category") return setCat(next);
      if (activeField === "price") {
        const cleaned = next.replace(/[^0-9.]/g, "");
        const parsed = cleaned === "" ? 0 : Number.parseFloat(cleaned);
        if (!Number.isNaN(parsed) && parsed >= 0) setPriceValue(parsed);
        if (cleaned === "") setPriceValue(0);
        return;
      }
      const cleaned = next.replace(/[^0-9]/g, "");
      const parsed = cleaned === "" ? 0 : Number.parseInt(cleaned, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) setQty(parsed);
      if (cleaned === "") setQty(0);
    };

    const current = getString();

    if (key === "backspace") {
      setString(current.slice(0, -1));
      return;
    }
    if (key === "space") {
      if (!isNumberField) setString(current + " ");
      return;
    }
    if (key === "return") {
      if (activeField === "name") return focusField("category");
      if (activeField === "category") return focusField("price");
      if (activeField === "price") return focusField("quantity");
      setIsKeyboardOpen(false);
      return;
    }
    if (["shift", "123", "ABC", "arrowleft", "arrowright"].includes(key)) return;

    if (isNumberField) {
      if (!/^[0-9.]$/.test(key)) return;
      if (activeField === "quantity" && key === ".") return;
    }

    setString(current + key);
  };

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
      <Box sx={{ p: 3, pb: isKeyboardOpen ? "360px" : 3 }}>
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
              inputRef={nameRef}
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              onClick={() => focusField("name")}
              onFocus={() => focusField("name")}
              InputProps={{ readOnly: true }}
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
              inputRef={categoryRef}
              fullWidth
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              onClick={() => focusField("category")}
              onFocus={() => focusField("category")}
              InputProps={{ readOnly: true }}
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
              inputRef={priceRef}
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
              onClick={() => focusField("price")}
              onFocus={() => focusField("price")}
              InputProps={{ readOnly: true }}
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
              inputRef={quantityRef}
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
              onClick={() => focusField("quantity")}
              onFocus={() => focusField("quantity")}
              InputProps={{ readOnly: true }}
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

      {isKeyboardOpen ? (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2000,
          }}
        >
          <VirtualKeyboard
            onKeyPress={handleKeyboardKeyPress}
            layout={activeField === "price" || activeField === "quantity" ? "numeric" : "default"}
            visible={isKeyboardOpen}
          />
        </Box>
      ) : null}
    </Dialog>
  );
}
