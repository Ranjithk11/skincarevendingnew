"use client";

import { Box, Button, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type ThubCouponSectionProps = {
  applied: boolean;
  discountAmount: number;
  /** When a spin-wheel cart offer is active, T-Hub cannot also apply. */
  disabled?: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

/** T Hub Exclusive — Extra 5% checkout coupon (restored UI). */
export default function ThubCouponSection({
  applied,
  discountAmount,
  disabled = false,
  onToggle,
  onRemove,
}: ThubCouponSectionProps) {
  return (
    <>
      <Box sx={{ mt: 2, bgcolor: "#fff", borderRadius: 2, p: 2, border: "2px solid #316D52" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Box sx={{ color: "#316D52", display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
            </svg>
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: 28, color: "#316D52" }}>
            Coupon Code
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", height: 48 }}>
          <Box
            sx={{
              flex: "1 1 auto",
              border: "1px solid #d1d5db",
              borderRadius: "6px 0 0 6px",
              borderRight: "none",
              px: 2,
              height: "100%",
              display: "flex",
              alignItems: "center",
              bgcolor: "#fff",
              overflow: "hidden",
            }}
          >
            <Typography sx={{ fontSize: 20, color: "#333", whiteSpace: "nowrap" }}>
              T Hub Exclusive Prevailing Discount +{" "}
              <span style={{ color: "#316D52", fontWeight: 700 }}>Extra 5% Discount</span>
            </Typography>
          </Box>
          <Button
            variant="contained"
            disableElevation
            disabled={disabled}
            onClick={onToggle}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 20,
              borderRadius: "0 6px 6px 0",
              width: 100,
              minWidth: 100,
              height: "100%",
              flexShrink: 0,
              bgcolor: applied ? "#164a32" : "#1e6343",
              color: "#fff",
              "&:hover": { bgcolor: "#164a32" },
              "&.Mui-disabled": { bgcolor: "#9ca3af", color: "#fff" },
            }}
          >
            {applied ? "Applied" : "Apply"}
          </Button>
        </Box>
        {disabled ? (
          <Typography sx={{ fontSize: 16, color: "#9a3412", mt: 1.25 }}>
            Spin-wheel offer is applied — only one offer can be used. Remove it to use T Hub 5%.
          </Typography>
        ) : null}
      </Box>

      {applied ? (
        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            bgcolor: "#f0fdf4",
            borderRadius: 2,
            p: 1.5,
            border: "1px solid #bbf7d0",
          }}
        >
          <Box sx={{ color: "#316D52", display: "flex", alignItems: "center", mt: 0.2 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: "#166534" }}>
              Coupon applied successfully!
            </Typography>
            <Typography sx={{ fontSize: 18, color: "#166534", mt: 0.3 }}>
              You will get 5% off on this order
              {discountAmount > 0 ? ` (Rs.${Math.round(discountAmount)}/-).` : "."}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onRemove} sx={{ color: "#6b7280", p: 0.3 }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      ) : null}
    </>
  );
}
