"use client";

import { Box, IconButton, Typography } from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  amount: number;
}

interface ProductInventoryTableProps {
  products: Product[];
  onHideClick?: (productId: string) => void;
  onEditClick?: (productId: string) => void;
}

const defaultProducts: Product[] = [
  { id: "111", name: "pilgrim red vine night gel creme", category: "Night Cream", price: "Rs.650", amount: 0 },
  { id: "111", name: "pilgrim red vine night gel creme", category: "Night Cream", price: "Rs.650", amount: 0 },
  { id: "111", name: "pilgrim red vine night gel creme", category: "Night Cream", price: "Rs.650", amount: 0 },
  { id: "111", name: "pilgrim red vine night gel creme", category: "Night Cream", price: "Rs.650", amount: 0 },
  { id: "111", name: "pilgrim red vine night gel creme", category: "Night Cream", price: "Rs.650", amount: 0 },
  { id: "111", name: "pilgrim red vine night gel creme", category: "Night Cream", price: "Rs.650", amount: 0 },
  { id: "111", name: "pilgrim red vine night gel creme", category: "Night Cream", price: "Rs.650", amount: 0 },
];

export default function ProductInventoryTable({
  products = defaultProducts,
  onHideClick,
  onEditClick,
}: ProductInventoryTableProps) {
  return (
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
          fontSize: 24,
          fontWeight: 500,
          fontFamily: "Roboto, sans-serif",
          color: "#000",
          mb: 3,
        }}
      >
        Product Inventory
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "50px 1fr 120px 80px 60px 100px",
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
          ID
        </Typography>
        <Typography
          sx={{
            fontSize:24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          NAME
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          CATEGORY
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          PRICE
        </Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 500,
            color: "#9a9a9a",
            textTransform: "uppercase",
          }}
        >
          AMNT.
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
          ACTIONS
        </Typography>
      </Box>

      {products.map((product, index) => (
        <Box
          key={index}
          sx={{
            display: "grid",
            gridTemplateColumns: "50px 60px 120px 80px 60px 100px",
            gap: 2,
            alignItems: "center",
            py: 2,
            borderBottom: index < products.length - 1 ? "1px solid #f0f0f0" : "none",
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 100,
              color: "#000",
              fontFamily: "Roboto, sans-serif",
            }}
          >
            {product.id}
          </Typography>
          <Typography
            sx={{
              fontSize:14,
              fontWeight: 50,
              color: "#000",
              fontFamily: "Roboto, sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.name}
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 100,
              color: "#000",
              fontFamily: "Roboto, sans-serif",
            }}
          >
            {product.category}
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 100,
              color: "#000",
              fontFamily: "Roboto, sans-serif",
            }}
          >
            {product.price}
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 100,
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
  );
}
