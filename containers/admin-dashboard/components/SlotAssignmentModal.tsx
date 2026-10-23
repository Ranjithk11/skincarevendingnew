"use client";

import { useState, useEffect, useRef } from "react";
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
  ListSubheader,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Image from "next/image";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  originalPrice?: number;
  retailPrice?: number;
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
  onAssign: (
    slotNumber: number,
    productId: string,
    quantity: number,
    retailPrice: number,
    productDetails?: { name?: string; category?: string; image?: string }
  ) => void;
  onRemove: (slotNumber: number) => void;
  onUpdateQuantity?: (slotNumber: number, quantity: number) => void;
  /** Notifies the parent of the current search text so it can fetch matching
   *  products from the backend (the local list may not contain every product). */
  onSearchChange?: (query: string) => void;
  /** Whether the parent is currently fetching search results. */
  isSearching?: boolean;
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
  onSearchChange,
  isSearching = false,
}: SlotAssignmentModalProps) {
  const KEYBOARD_HEIGHT_PX = 340;
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(5);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [slotPrice, setSlotPrice] = useState<number>(0);
  const [quantityAdjustment, setQuantityAdjustment] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priceDraft, setPriceDraft] = useState<string>("");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardTarget, setKeyboardTarget] = useState<"search" | "price">("search");
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);

  const keyboardContainerRef = useRef<HTMLDivElement>(null);
  const searchInputContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const hasCurrentProduct = !!currentProduct;

  // Normalize text for tolerant matching: lowercase and collapse any run of
  // non-alphanumeric characters (spaces, hyphens, %, &, etc.) to a single space.
  const normalizeText = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // Token-based fuzzy search. Rather than requiring an exact contiguous match,
  // we score each product by how many query words appear in its name and show
  // the best matches. This tolerates punctuation, spacing ("30 ml" vs "30ml"),
  // word order, and a few spelling variants/typos (e.g. "Salicylic" vs the
  // DB's "Salicyclic") that would otherwise hide a product.
  const queryTokens = normalizeText(searchQuery).split(" ").filter(Boolean);
  const filteredProducts = (() => {
    if (queryTokens.length === 0) return products;

    const scored = products
      .map((product) => {
        const name = normalizeText(product.name);
        const matches = queryTokens.reduce(
          (count, token) => (name.includes(token) ? count + 1 : count),
          0
        );
        return { product, matches };
      })
      .filter(({ matches }) => matches > 0);

    // Short queries (1-2 words) must match fully; longer queries only need a
    // strong majority so a single mismatched word doesn't exclude the product.
    const threshold =
      queryTokens.length <= 2
        ? queryTokens.length
        : Math.ceil(queryTokens.length * 0.6);
    const strong = scored.filter(({ matches }) => matches >= threshold);

    return (strong.length > 0 ? strong : scored)
      .sort((a, b) => b.matches - a.matches)
      .map(({ product }) => product);
  })();

  const parsePrice = (value: string | number | undefined) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  useEffect(() => {
    if (open) {
      setSelectedProductId(currentProduct?.id || "");
      // Use current quantity when editing an existing slot (even when it is 0).
      // Only default to 5 for brand-new assignments (no product currently assigned).
      setQuantity(currentProduct ? currentQuantity : 5);
      setQuantityAdjustment(0);
      setSearchQuery("");
      setIsKeyboardOpen(false);
      setKeyboardTarget("search");
      setIsProductMenuOpen(false);
      if (currentProduct) {
        const nextPrice = parsePrice(currentProduct.price);
        setSlotPrice(nextPrice);
        setPriceDraft(nextPrice ? String(nextPrice) : "");
      } else {
        setSlotPrice(0);
        setPriceDraft("");
        setOriginalPrice(0);
      }
    }
  }, [open, currentProduct, currentQuantity]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const catalogPrice =
      selectedProduct.originalPrice ??
      parsePrice(selectedProduct.price);
    setOriginalPrice(catalogPrice);

    if (currentProduct?.id === selectedProductId) {
      const nextPrice = parsePrice(currentProduct.price);
      setSlotPrice(nextPrice);
      setPriceDraft(nextPrice ? String(nextPrice) : "");
      return;
    }

    const nextPrice =
      selectedProduct.retailPrice ??
      selectedProduct.originalPrice ??
      parsePrice(selectedProduct.price);
    setSlotPrice(nextPrice);
    setPriceDraft(nextPrice ? String(nextPrice) : "");
  }, [selectedProductId, selectedProduct, currentProduct]);


  useEffect(() => {
    if (!open) return;
    onSearchChange?.(searchQuery);
  }, [searchQuery, open, onSearchChange]);

  const focusSearchInput = () => {
    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => searchInputRef.current?.focus());
      return;
    }
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const openPriceKeyboard = () => {
    setKeyboardTarget("price");
    setIsKeyboardOpen(true);
    setIsProductMenuOpen(false);
    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => priceInputRef.current?.focus());
      return;
    }
    setTimeout(() => priceInputRef.current?.focus(), 0);
  };

  const applyPriceKey = (key: string) => {
    if (key === "return") {
      setIsKeyboardOpen(false);
      return;
    }
    if (["shift", "arrowleft", "arrowright", "123", "ABC", "space"].includes(key)) {
      return;
    }

    setPriceDraft((prev) => {
      let next = prev;
      if (key === "backspace") {
        next = prev.slice(0, -1);
      } else if (/^[0-9]$/.test(key)) {
        next = `${prev}${key}`;
      } else if (key === "." && !prev.includes(".")) {
        next = prev === "" ? "0." : `${prev}.`;
      } else {
        return prev;
      }

      const parsed = parseFloat(next);
      setSlotPrice(next === "" || Number.isNaN(parsed) ? 0 : parsed);
      return next;
    });
  };

  const handleKeyboardKeyPress = (key: string) => {
    if (keyboardTarget === "price") {
      applyPriceKey(key);
      return;
    }

    setIsProductMenuOpen(true);
    if (key === "backspace") {
      setSearchQuery((prev) => prev.slice(0, -1));
      focusSearchInput();
      return;
    }
    if (key === "space") {
      setSearchQuery((prev) => `${prev} `);
      focusSearchInput();
      return;
    }
    if (key === "return") {
      setIsKeyboardOpen(false);
      focusSearchInput();
      return;
    }
    if (["shift", "arrowleft", "arrowright", "123", "ABC"].includes(key)) {
      return;
    }

    setSearchQuery((prev) => `${prev}${key}`);
    focusSearchInput();
  };

  const clampQuantity = (next: number) => {
    let q = Number.isFinite(next) ? Math.max(0, Math.min(10, Math.trunc(next))) : 0;
    return q;
  };

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
    if (selectedProductId && quantity > 0 && slotPrice >= 0) {
      onAssign(slotNumber, selectedProductId, quantity, slotPrice, {
        name: selectedProduct?.name,
        category: selectedProduct?.category,
        image: selectedProduct?.image,
      });
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
      disableScrollLock
      sx={{
        display: "flex",
        alignItems: isKeyboardOpen ? "flex-start" : "center",
        justifyContent: "center",
        pt: isKeyboardOpen ? 2 : 0,
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0,0,0,0.5)",
        },
      }}
    >
      <>
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            width: { xs: "95%", sm: 500 },
            maxHeight: isKeyboardOpen
              ? `calc(90vh - ${KEYBOARD_HEIGHT_PX}px)`
              : "90vh",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            outline: "none",
            p: 3,
            mb: isKeyboardOpen ? `${KEYBOARD_HEIGHT_PX}px` : 0,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontSize: 32,
                fontWeight: 600,
                fontFamily: "Roboto, sans-serif",
                color: "#22c55e",
              }}
            >
              Assign Product to Slot {slotNumber}
            </Typography>
            <IconButton onClick={onClose} sx={{ p: 0 }}>
              <CloseIcon sx={{ fontSize: 24, color: "#666" }} />
            </IconButton>
          </Box>

          {/* Currently Assigned Product Section */}
          {hasCurrentProduct && (
            <Box
              sx={{
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
                p: 2,
                mb: 3,
                border: "1px solid #e5e5e5",
              }}
            >
              <Typography
                sx={{
                  fontSize: 24,
                  fontWeight: 600,
                  fontFamily: "Roboto, sans-serif",
                  color: "#000",
                  mb: 1.5,
                }}
              >
                Currently Assigned Product
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                {/* {currentProduct?.image && (
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "6px",
                      overflow: "hidden",
                      flexShrink: 0,
                      border: "1px solid #e5e5e5",
                    }}
                  >
                    <Image
                      src={currentProduct.image}
                      alt={currentProduct.name}
                      width={50}
                      height={50}
                      style={{ objectFit: "cover" }}
                    />
                  </Box>
                )} */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 24,
                      fontWeight: 600,
                      fontFamily: "Roboto, sans-serif",
                      color: "#000",
                      textTransform: "uppercase",
                      lineHeight: 1.3,
                    }}
                  >
                    {currentProduct?.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 24,
                      fontFamily: "Roboto, sans-serif",
                      color: "#666",
                    }}
                  >
                    Quantity: {currentQuantity}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 24,
                      fontFamily: "Roboto, sans-serif",
                      color: "#22c55e",
                      fontWeight: 600,
                    }}
                  >
                    Price: {currentProduct?.price}
                  </Typography>
                </Box>
              </Box>

              {/* Update Quantity Controls */}
              {/* <Typography
                sx={{
                  fontSize: 24,
                  fontWeight: 600,
                  fontFamily: "Roboto, sans-serif",
                  color: "#000",
                  mb: 1,
                }}
              >
                Update Quantity
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                {[-10, -5, -1].map((delta) => (
                  <Button
                    key={delta}
                    variant="outlined"
                    onClick={() => handleQuantityButton(delta)}
                    sx={{
                      minWidth: 40,
                      height: 32,
                      borderRadius: "6px",
                      borderColor: "#fca5a5",
                      backgroundColor: "#fef2f2",
                      color: "#dc2626",
                      fontSize: 24,
                      fontWeight: 500,
                      p: 0,
                      "&:hover": {
                        borderColor: "#f87171",
                        backgroundColor: "#fee2e2",
                      },
                    }}
                  >
                    {delta}
                  </Button>
                ))}
                <Box
                  sx={{
                    minWidth: 50,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: 24,
                    fontWeight: 500,
                    backgroundColor: "#fff",
                  }}
                >
                  {quantityAdjustment >= 0 ? quantityAdjustment : quantityAdjustment}
                </Box>
                {[1, 5, 10].map((delta) => (
                  <Button
                    key={delta}
                    variant="outlined"
                    onClick={() => handleQuantityButton(delta)}
                    sx={{
                      minWidth: 40,
                      height: 32,
                      borderRadius: "6px",
                      borderColor: "#86efac",
                      backgroundColor: "#f0fdf4",
                      color: "#16a34a",
                      fontSize: 24,
                      fontWeight: 500,
                      p: 0,
                      "&:hover": {
                        borderColor: "#4ade80",
                        backgroundColor: "#dcfce7",
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
                    minWidth: 60,
                    height: 32,
                    borderRadius: "6px",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    fontSize: 24,
                    fontWeight: 500,
                    textTransform: "none",
                    p: 0,
                    "&:hover": {
                      backgroundColor: "#2563eb",
                    },
                    "&:disabled": {
                      backgroundColor: "#e5e7eb",
                      color: "#9ca3af",
                    },
                  }}
                >
                  Update
                </Button>
              </Box> */}
            </Box>
          )}

          {/* Select Product */}
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: 24,
                fontWeight: 500,
                fontFamily: "Roboto, sans-serif",
                color: "#000",
                mb: 1,
              }}
            >
              Select Product
            </Typography>
            <FormControl fullWidth>
              <Select
                value={selectedProductId}
                open={isProductMenuOpen}
                onOpen={() => setIsProductMenuOpen(true)}
                onClose={() => {
                  if (isKeyboardOpen) return;
                  setIsProductMenuOpen(false);
                }}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setIsKeyboardOpen(false);
                  setIsProductMenuOpen(false);
                  if (typeof document !== "undefined") {
                    const el = document.activeElement;
                    if (el && el instanceof HTMLElement) el.blur();
                  }
                }}
                displayEmpty
                MenuProps={{
                  disableScrollLock: true,
                  disablePortal: true,
                  disableAutoFocusItem: true,
                  disableAutoFocus: true,
                  disableEnforceFocus: true,
                  disableRestoreFocus: true,
                  keepMounted: true,
                  hideBackdrop: true,
                  BackdropProps: {
                    sx: {
                      pointerEvents: "none",
                    },
                  },
                  sx: {
                    zIndex: 4500,
                    pointerEvents: "none",
                  },
                  PaperProps: {
                    sx: {
                      pointerEvents: "auto",
                      maxHeight: 500,
                      overflowY: "auto",
                      WebkitOverflowScrolling: "touch",
                      touchAction: "pan-y",
                    },
                  },
                  MenuListProps: {
                    sx: {
                      WebkitOverflowScrolling: "touch",
                      touchAction: "pan-y",
                    },
                    onKeyDown: (e: any) => {
                      e.stopPropagation();
                    },
                  },
                  autoFocus: false,
                }}
                sx={{
                  height: 48,
                  borderRadius: "8px",
                  fontSize: 24,
                  fontFamily: "Roboto, sans-serif",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#22c55e",
                    borderWidth: 2,
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#16a34a",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#16a34a",
                  },
                }}
              >
                <ListSubheader
                  ref={searchInputContainerRef}
                  component="div"
                  sx={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#fff",
                    zIndex: 1,
                    p: 1,
                    borderBottom: "1px solid #e5e5e5",
                    lineHeight: "unset",
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <TextField
                    inputRef={searchInputRef}
                    placeholder="Search products..."
                    value={searchQuery}
                    onClick={(e) => {
                      e.stopPropagation();
                      setKeyboardTarget("search");
                      setIsProductMenuOpen(true);
                      setIsKeyboardOpen(true);
                    }}
                    onFocus={() => {
                      setKeyboardTarget("search");
                      setIsProductMenuOpen(true);
                      setIsKeyboardOpen(true);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "6px",
                        fontSize: 24,
                      },
                    }}
                  />
                  <Typography sx={{ fontSize: 16, color: "#666", mt: 0.5, textAlign: "right" }}>
                    {isSearching
                      ? "Searching..."
                      : searchQuery
                      ? `${filteredProducts.length} of ${products.length} products`
                      : `Total: ${products.length} products`}
                  </Typography>
                </ListSubheader>
                <MenuItem value="">
                  <Typography sx={{ color: "#666" }}>-- Select a product --</Typography>
                </MenuItem>
                {filteredProducts.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name.toUpperCase()}
                  </MenuItem>
                ))}
                {filteredProducts.length === 0 && searchQuery && (
                  <MenuItem disabled>
                    <Typography sx={{ color: "#999", fontStyle: "italic" }}>
                      No products found for "{searchQuery}"
                    </Typography>
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>

          {/* Selected Product Preview */}
          {selectedProduct && (
            <Box
              sx={{
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
                p: 2,
                mb: 3,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              {selectedProduct.image && (
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: "6px",
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid #e5e5e5",
                  }}
                >
                  <Image
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    width={120}
                    height={120}
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              )}
              <Box>
                <Typography
                  sx={{
                    fontSize: 24,
                    fontWeight: 600,
                    fontFamily: "Roboto, sans-serif",
                    color: "#000",
                    textTransform: "uppercase",
                    lineHeight: 1.3,
                  }}
                >
                  {selectedProduct.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 24,
                    fontFamily: "Roboto, sans-serif",
                    color: "#666",
                    textTransform: "uppercase",
                  }}
                >
                  {selectedProduct.category}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 24,
                    fontWeight: 600,
                    fontFamily: "Roboto, sans-serif",
                    color: "#22c55e",
                  }}
                >
                  {selectedProduct.price}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Price Input */}
          {selectedProduct && (
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: 24,
                  fontWeight: 500,
                  fontFamily: "Roboto, sans-serif",
                  color: "#000",
                  mb: 0.5,
                }}
              >
                Price
              </Typography>
              <Typography
                sx={{
                  fontSize: 20,
                  fontFamily: "Roboto, sans-serif",
                  color: "#9ca3af",
                  mb: 1,
                }}
              >
                Original price: ₹{originalPrice}
              </Typography>
              <TextField
                type="text"
                inputMode="decimal"
                value={priceDraft}
                inputRef={priceInputRef}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, "");
                  const dotCount = (val.match(/\./g) || []).length;
                  const next = dotCount > 1 ? val.slice(0, val.lastIndexOf(".")) : val;
                  setPriceDraft(next);
                  const parsed = parseFloat(next);
                  setSlotPrice(next === "" || Number.isNaN(parsed) ? 0 : parsed);
                }}
                onFocus={openPriceKeyboard}
                onClick={openPriceKeyboard}
                fullWidth
                inputProps={{ inputMode: "decimal", pattern: "[0-9.]*" }}
                placeholder="Enter slot price"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 48,
                    borderRadius: "8px",
                    fontSize: 24,
                    fontFamily: "Roboto, sans-serif",
                    "& fieldset": {
                      borderColor: "#22c55e",
                      borderWidth: 2,
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
          )}

          {/* Quantity Input */}
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: 24,
                fontWeight: 500,
                fontFamily: "Roboto, sans-serif",
                color: "#000",
                mb: 0.5,
              }}
            >
              Quantity{" "}
              <Typography
                component="span"
                sx={{
                  fontSize: 24,
                  color: "#9ca3af",
                  fontWeight: 400,
                }}
              >
                (Max 10 per slot)
              </Typography>
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <IconButton
                onClick={() => setQuantity((prev) => clampQuantity(prev - 1))}
                disabled={false}
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: "8px",
                  border: "2px solid #22c55e",
                  color: "#22c55e",
                  "&:disabled": {
                    borderColor: "#e5e7eb",
                    color: "#9ca3af",
                  },
                }}
              >
                <RemoveIcon />
              </IconButton>

              <TextField
                type="number"
                value={quantity === 0 ? "" : quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setQuantity(0);
                  } else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) {
                      setQuantity(clampQuantity(parsed));
                    }
                  }
                }}
                fullWidth
                inputProps={{ min: 0 }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 48,
                    borderRadius: "8px",
                    fontSize: 24,
                    fontFamily: "Roboto, sans-serif",
                    "& fieldset": {
                      borderColor: "#22c55e",
                      borderWidth: 2,
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

              <IconButton
                onClick={() => setQuantity((prev) => clampQuantity(prev + 1))}
                disabled={false}
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: "8px",
                  border: "2px solid #22c55e",
                  color: "#22c55e",
                  "&:disabled": {
                    borderColor: "#e5e7eb",
                    color: "#9ca3af",
                  },
                }}
              >
                <AddIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={handleRemove}
              sx={{
                flex: 1,
                height: 48,
                borderRadius: "8px",
                backgroundColor: "#ef4444",
                color: "#fff",
                fontSize: 24,
                fontWeight: 500,
                fontFamily: "Roboto, sans-serif",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "#dc2626",
                },
              }}
            >
              Remove
            </Button>
            <Button
              variant="contained"
              onClick={handleAssign}
              disabled={!selectedProductId || quantity <= 0 || slotPrice < 0}
              sx={{
                flex: 1,
                height: 48,
                borderRadius: "8px",
                backgroundColor: "#22c55e",
                color: "#fff",
                fontSize: 24,
                fontWeight: 500,
                fontFamily: "Roboto, sans-serif",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "#16a34a",
                },
                "&:disabled": {
                  backgroundColor: "#e5e7eb",
                  color: "#9ca3af",
                },
              }}
            >
              Assign
            </Button>
          </Box>
        </Box>

        {isKeyboardOpen ? (
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 6000,
              pointerEvents: "none",
            }}
          >
            <Box
              ref={keyboardContainerRef}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}

              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "auto",
              }}
            >
              <VirtualKeyboard
                onKeyPress={handleKeyboardKeyPress}
                layout={keyboardTarget === "price" ? "numeric" : "default"}
                visible={isKeyboardOpen}
                skipApplyToActiveElement
                onClose={() => setIsKeyboardOpen(false)}
              />
            </Box>
          </Box>
        ) : null}
      </>
    </Modal>
  );
}
