"use client";

import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import type { VerifiedStaff } from "@/lib/staff-qr";

type StaffProfileCardProps = {
  staff: VerifiedStaff;
  amount?: number;
  confirming?: boolean;
  onConfirm: () => void;
  onRescan: () => void;
};

function Row({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.75 }}>
      <Icon icon={icon} width={22} color="#6b7280" />
      <Typography sx={{ fontSize: 16, color: "#6b7280", minWidth: 72 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Displays verified staff details before confirming a cash sale.
 */
export default function StaffProfileCard({
  staff,
  amount,
  confirming = false,
  onConfirm,
  onRescan,
}: StaffProfileCardProps) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        border: "1px solid #bbf7d0",
        bgcolor: "#f0fdf4",
        p: 2.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: "#316D52",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon icon="mdi:account-check" width={28} color="#fff" />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#15803d", letterSpacing: "0.04em" }}>
            STAFF VERIFIED
          </Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
            {staff.name}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "#fff", borderRadius: 2, px: 2, py: 1, mb: 2 }}>
        <Row icon="mdi:badge-account" label="Role" value={staff.role} />
        <Row icon="mdi:phone" label="Phone" value={staff.phone} />
        <Row icon="mdi:map-marker" label="Branch" value={staff.branch} />
        <Row icon="mdi:shield-key" label="ID" value={staff.hash.slice(0, 12) + "…"} />
      </Box>

      {Number.isFinite(amount) && (amount as number) > 0 ? (
        <Box
          sx={{
            mb: 2,
            px: 2,
            py: 1.25,
            borderRadius: 2,
            bgcolor: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontSize: 20, color: "#374151" }}>Amount to collect</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#316D52" }}>
            Rs. {Math.round(amount as number)}/-
          </Typography>
        </Box>
      ) : null}

      <Button
        fullWidth
        variant="contained"
        disabled={confirming}
        onClick={onConfirm}
        sx={{
          py: 1.75,
          fontSize: 20,
          fontWeight: 700,
          textTransform: "none",
          borderRadius: 2,
          bgcolor: "#316D52",
          "&:hover": { bgcolor: "#234a31" },
        }}
      >
        {confirming ? (
          <CircularProgress size={24} sx={{ color: "#fff" }} />
        ) : (
          "Confirm & Dispense"
        )}
      </Button>

      <Button
        fullWidth
        onClick={onRescan}
        disabled={confirming}
        sx={{
          mt: 1,
          textTransform: "none",
          fontSize:20,
          fontWeight: 700,
         
        }}
      >
        Scan a different QR
      </Button>
    </Box>
  );
}
