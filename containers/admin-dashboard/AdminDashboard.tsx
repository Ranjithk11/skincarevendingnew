"use client";

import { Box } from "@mui/material";
import {
  DashboardTitle,
  VendingMachineConfig,
  ProductInventoryTable,
} from "./components";
import TopLogo from "@/containers/skinanalysis-home/Recommendations/TopLogo";
import type { VendingSlot as ApiVendingSlot } from "@/redux/api/adminApi";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  category: string;
  retail_price?: number;
  discount?: { value: number };
  amount: number;
}

type SlotsByNumber = Record<number, ApiVendingSlot>;

interface AdminDashboardProps {
  products?: Product[];
  slots?: SlotsByNumber;
  isKiosk?: boolean;
  onCartClick?: () => void;
  onScanAgainClick?: () => void;
  cartCount?: number;
  onDashboardClick?: () => void;
  onHomeMachineClick?: () => void;
  onDispenseClick?: () => void;
  onVoiceClick?: () => void;
  onTestClick?: () => void;
  onHideClick?: () => void;
  onLoadProductsClick?: () => void;
  onSettingsClick?: () => void;
  onSyncClick?: () => void;
  onSlotClick?: (slotNumber: number) => void;
  onProductHideClick?: (productId: string) => void;
  onProductEditClick?: (productId: string) => void;
  selectedSlot?: number | null;
  isSyncing?: boolean;
}

export default function AdminDashboard({
  products: propProducts,
  slots,
  isKiosk = false,
  onCartClick,
  onScanAgainClick,
  cartCount = 0,
  onDashboardClick,
  onHomeMachineClick,
  onDispenseClick,
  onVoiceClick,
  onTestClick,
  onHideClick,
  onLoadProductsClick,
  onSettingsClick,
  onSyncClick,
  onSlotClick,
  onProductHideClick,
  onProductEditClick,
  selectedSlot,
  isSyncing = false,
}: AdminDashboardProps) {
  // Use products from parent prop directly (parent handles fetching & refetching)
  const products = (propProducts || []).map((p: any) => ({
    ...p,
    amount: p.quantity ?? p.amount ?? 0,
    image: p.image_url ?? p.image ?? "",
  }));

  const handleSlotClick = (slotNumber: number) => {
    onSlotClick?.(slotNumber);
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "#f6f6f6",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 185,
          left: -1,
          width: 1081,
          height: 1092,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box
          component="img"
          src="/wending/linesbg.png"
          alt=""
          sx={{
            position: "absolute",
            width: "221.52%",
            height: "93.07%",
            top: "-13.92%",
            left: "-38.35%",
            maxWidth: "none",
            opacity: 0.3,
          }}
        />
      </Box>

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2, md: 2.5 },
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3.25 },
          maxWidth: "1100px",
          mx: "auto",
        }}
      >
        <TopLogo
          isKiosk={isKiosk}
          onCartClick={onCartClick || (() => {})}
          onScanAgainClick={onScanAgainClick || (() => {})}
          cartCount={cartCount}
          firstButtonLabel="Products"
          secondButtonLabel="Logout"
          firstButtonIcon="/wending/productlog.svg"
          secondButtonIcon="/icons/logout.svg"
        />

        <Box sx={{ height: 100 }} />

        <DashboardTitle
          onDashboardClick={onDashboardClick}
          onHomeMachineClick={onHomeMachineClick}
          onDispenseClick={onDispenseClick}
          onVoiceClick={onVoiceClick}
          onTestClick={onTestClick}
          onHideClick={onHideClick}
          onLoadProductsClick={onLoadProductsClick}
          onSettingsClick={onSettingsClick}
        />

        <VendingMachineConfig
          slots={slots}
          onSyncClick={onSyncClick}
          onSlotClick={handleSlotClick}
          selectedSlot={selectedSlot}
          isSyncing={isSyncing}
        />

        <ProductInventoryTable
          products={products}
          onHideClick={onProductHideClick}
          onEditClick={onProductEditClick}
        />
      </Box>
    </Box>
  );
}
