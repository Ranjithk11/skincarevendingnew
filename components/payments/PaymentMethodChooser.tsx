"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";

export type PaymentMethod = "cash" | "upi" | "card";

interface PaymentMethodChooserProps {
  amount: number;
  onSelect: (method: PaymentMethod) => void;
}

const cardSx = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  width: "100%",
  p: 2.5,
  borderRadius: 3,
  border: "1px solid #e5e7eb",
  bgcolor: "#fff",
  cursor: "pointer",
  transition: "all 0.15s ease",
  "&:hover": { borderColor: "#316D52", boxShadow: "0 2px 12px rgba(49,109,82,0.12)" },
} as const;

const iconWrap = (bg: string, border?: string) =>
  ({
    width: 56,
    height: 56,
    borderRadius: "50%",
    bgcolor: bg,
    border: border ? `1px solid ${border}` : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }) as const;

export default function PaymentMethodChooser({
  amount,
  onSelect,
}: PaymentMethodChooserProps) {
  return (
    <Box sx={{ width: "100%", maxWidth: 640, mx: "auto" }}>
      <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>
        Choose a payment method
      </Typography>
      <Typography sx={{ fontSize: 20, color: "#6b7280", mb: 3 }}>
        Select your preferred payment option
      </Typography>

      <Box onClick={() => onSelect("cash")} sx={cardSx}>
        <Box sx={iconWrap("#316D52")}>
          <Icon icon="mdi:cash-multiple" width={30} color="#fff" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
            Pay Cash
          </Typography>
          <Typography sx={{ fontSize: 18, color: "#6b7280" }}>
            Pay with cash at the machine
          </Typography>
        </Box>
        <Icon icon="mdi:chevron-right" width={28} color="#316D52" />
      </Box>

      <Box onClick={() => onSelect("upi")} sx={{ ...cardSx, mt: 2 }}>
        <Box sx={iconWrap("#fff", "#e5e7eb")}>
          <Icon icon="mdi:qrcode-scan" width={30} color="#316D52" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
            Pay Via UPI
          </Typography>
          <Typography sx={{ fontSize: 18, color: "#6b7280" }}>
            Scan &amp; pay using any UPI app
          </Typography>
        </Box>
        <Icon icon="mdi:chevron-right" width={28} color="#316D52" />
      </Box>

      <Box onClick={() => onSelect("card")} sx={{ ...cardSx, mt: 2 }}>
        <Box sx={iconWrap("#fff", "#e5e7eb")}>
          <Icon icon="mdi:credit-card-outline" width={30} color="#316D52" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
            Pay Via Card
          </Typography>
          <Typography sx={{ fontSize: 18, color: "#6b7280" }}>
            Enter card details and pay online
          </Typography>
        </Box>
        <Icon icon="mdi:chevron-right" width={28} color="#316D52" />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          mt: 3,
        }}
      >
        <Icon icon="mdi:shield-check" width={20} color="#16a34a" />
        <Typography sx={{ fontSize: 18, color: "#6b7280" }}>
          100% Secure Payment
        </Typography>
      </Box>

      {Number.isFinite(amount) && amount > 0 && (
        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography sx={{ fontSize: 20, color: "#6b7280" }}>To Pay</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#111827" }}>
            Rs. {Math.round(amount)}/-
          </Typography>
        </Box>
      )}
    </Box>
  );
}
