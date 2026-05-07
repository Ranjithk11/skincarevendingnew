"use client";

import { useMemo, useState } from "react";
import { Box, IconButton, InputAdornment, TextField, Typography, Link } from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Close";
import ViewSlotsModal from "./ViewSlotsModal";
import ProductPrice from "@/containers/skinanalysis-home/Recommendations/components/ProductPrice";

interface Product {
  id: string;
  name: string;
  category: string;
  retail_price?: number;
  discount?: { value: number };
  amount: number;
  image?: string;
}

interface ProductInventoryTableProps {
  products: Product[];
  onHideClick?: (productId: string) => void;
  onEditClick?: (productId: string) => void;
}

const defaultProducts: Product[] = [];

export default function ProductInventoryTable({
  products = defaultProducts,
  onHideClick,
  onEditClick,
}: ProductInventoryTableProps) {
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      return name.includes(q) || category.includes(q) || id.includes(q);
    });
  }, [products, searchQuery]);

  const handleViewSlots = (product: Product) => {
    setSelectedProduct(product);
    setSlotsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSlotsModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <>
      {/* View Slots Modal */}
      <ViewSlotsModal
        open={slotsModalOpen}
        onClose={handleCloseModal}
        productId={selectedProduct?.id || ""}
        productName={selectedProduct?.name || ""}
      />
    <Box
      sx={{
        backgroundColor: "#fff",
        borderRadius: "22px",
        boxShadow: "0px 4px 46.4px 0px rgba(0,0,0,0.08)",
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 3 },
        width: "100%",
      }}
    >
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 500,
          fontFamily: "Roboto, sans-serif",
          color: "#000",
          mt: 3,
          mb:4
        }}
      >
        Product Inventory
      </Typography>

      {/* Search bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name, category, or ID..."
          variant="outlined"
          size="medium"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#9a9a9a", fontSize: 26 }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery("")}
                  aria-label="clear search"
                >
                  <ClearIcon sx={{ fontSize: 22, color: "#9a9a9a" }} />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: {
              borderRadius: "12px",
              backgroundColor: "#fafafa",
              fontSize: 18,
              fontFamily: "Roboto, sans-serif",
              "& fieldset": { borderColor: "#e0e0e0" },
              "&:hover fieldset": { borderColor: "#bdbdbd" },
            },
          }}
        />
        {searchQuery && (
          <Typography
            sx={{
              mt: 1,
              fontSize: 14,
              color: "#666",
              fontFamily: "Roboto, sans-serif",
            }}
          >
            Showing {filteredProducts.length} of {products.length} products
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "70px 1fr 100px 100px 100px 100px",
          gap: 2,
          alignItems: "center",
          pb: 2,
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          Image
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          Name
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          Price
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          Slots
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          Qty.
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
            textAlign: "right",
          }}
        >
          Actions
        </Typography>
      </Box>

      {filteredProducts.length === 0 && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: 18,
              color: "#9a9a9a",
              fontFamily: "Roboto, sans-serif",
            }}
          >
            {searchQuery
              ? `No products found matching "${searchQuery}"`
              : "No products available"}
          </Typography>
        </Box>
      )}

      {filteredProducts.map((product, index) => (
        <Box
          key={product.id || index}
          sx={{
            display: "grid",
            gridTemplateColumns: "70px 1fr 100px 100px 100px 100px",
            gap: 2,
            alignItems: "center",
            py: 2,
            borderBottom: index < filteredProducts.length - 1 ? "1px solid #f0f0f0" : "none",
          }}
        >
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#e0e0e0",
                }}
              />
            )}
          </Box>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 400,
              color: "#000",
              fontFamily: "Roboto, sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
            }}
          >
            {product.name}
          </Typography>
          <ProductPrice
            retailPrice={product.retail_price}
            discountValue={product.discount?.value}
            priceText={`INR.${product.retail_price}/-`}
            productId={product.id}
            productName={product.name}
          />
          <Link
            component="button"
            onClick={() => handleViewSlots(product)}
            sx={{
              fontSize: 24,
              fontWeight: 400,
              color: "#1976d2",
              fontFamily: "Roboto, sans-serif",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            View Slots
          </Link>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 400,
              color: "#000",
              fontFamily: "Roboto, sans-serif",
            }}
          >
            {product.amount}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: { xs: 1, md: 2.5 },
            }}
          >
            <IconButton
              onClick={() => onHideClick?.(product.id)}
              sx={{ p: 0.5 }}
            >
              <VisibilityOffOutlinedIcon
                sx={{ fontSize: 24, color: "#323232" }}
              />
            </IconButton>
            <IconButton
              onClick={() => onEditClick?.(product.id)}
              sx={{ p: 0.5 }}
            >
              <EditOutlinedIcon
                sx={{ fontSize: 24, color: "#323232" }}
              />
            </IconButton>
          </Box>
        </Box>
      ))}
    </Box>
    </>
  );
}
