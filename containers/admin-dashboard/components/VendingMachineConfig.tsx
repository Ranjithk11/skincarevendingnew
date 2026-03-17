"use client";

import { Box, Button, IconButton, Typography } from "@mui/material";
import Image from "next/image";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ProductSlot from "./ProductSlot";
import type { VendingSlot } from "@/redux/api/adminApi";

interface VendingMachineConfigProps {
  slots?: Record<number, VendingSlot>;
  onSyncClick?: () => void;
  onInfoClick?: () => void;
  onSlotClick?: (slotNumber: number) => void;
  selectedSlot?: number | null;
  isSyncing?: boolean;
  totalSlots?: number;
  columns?: number;
}

export default function VendingMachineConfig({
  slots: slotsData,
  onSyncClick,
  onInfoClick,
  onSlotClick,
  selectedSlot,
  isSyncing = false,
  totalSlots = 60,
  columns = 10,
}: VendingMachineConfigProps) {
  const slotNumbers = Array.from({ length: totalSlots }, (_, i) => i + 1);
  const rows = Math.ceil(totalSlots / columns);

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        borderRadius: "22px",
        boxShadow: "0px 4px 46.4px 0px rgba(0,0,0,0.08)",
        px: 4,
        py: 3,
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 36,
              fontWeight: 500,
              fontFamily: "Roboto, sans-serif",
              color: "rgba(0,0,0,0.85)",
              lineHeight: "normal",
            }}
          >
            Vending Machine Configuration
          </Typography>
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 400,
              fontFamily: "Roboto, sans-serif",
              color: "#9a9a9a",
              letterSpacing: "3.2px",
              textTransform: "uppercase",
              mt: "11px",
              lineHeight: "normal",
            }}
          >
            CONFIGURE PRODUCTS
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: "23px" }}>
          <Button
            variant="outlined"
            onClick={onSyncClick}
            fullWidth={false}
            startIcon={
              <Image
                src="/wending/dashboard-gauge.svg"
                alt="Sync"
                width={30}
                height={30}
                style={{ objectFit: "contain" }}
              />
            }
            sx={{
              borderRadius: "68px",
              border: "1px solid rgba(0,0,0,0.35)",
              backgroundColor: "#fff",
              color: "#323232",
              width: 149,
              height: 82,
              px: "31px",
              py: "24px",
              textTransform: "none",
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "Roboto, sans-serif",
              gap: "10px",
              "&:hover": {
                backgroundColor: "#f5f5f5",
                border: "1px solid rgba(0,0,0,0.35)",
              },
            }}
          >
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
          <IconButton
            onClick={onInfoClick}
            sx={{
              border: "1px solid rgba(0,0,0,0.35)",
              borderRadius: "68px",
              width: 85,
              height: 82,
              backgroundColor: "#fff",
              "&:hover": {
                backgroundColor: "#f5f5f5",
              },
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 32, color: "#323232" }} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 1,
          width: "100%",
        }}
      >
        {slotNumbers.map((slotNumber: number) => {
          const slotData = slotsData?.[slotNumber];
          const productName = slotData?.product_name 
            ? (slotData.product_name.length > 10 
                ? slotData.product_name.substring(0, 8) + ".." 
                : slotData.product_name)
            : "";
          return (
            <ProductSlot
              key={slotNumber}
              slotNumber={slotNumber}
              productName={productName}
              quantity={slotData?.quantity}
              onClick={() => onSlotClick?.(slotNumber)}
              isSelected={selectedSlot === slotNumber}
            />
          );
        })}
      </Box>
    </Box>
  );
}
