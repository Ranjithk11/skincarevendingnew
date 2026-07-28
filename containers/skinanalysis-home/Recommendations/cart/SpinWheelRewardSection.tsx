"use client";

import { Box, Button, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type {
  SpinWheelDiscountResult,
  SpinWheelReward,
} from "@/lib/spin-wheel/rewards";

type SpinWheelRewardSectionProps = {
  spinReward: SpinWheelReward | null;
  spinValidation: SpinWheelDiscountResult;
  couponApplied: boolean;
  couponMessage: string;
  spinDiscount: number;
  isNextPurchaseOnly: boolean;
  isDeferredOnly: boolean;
  onApply: () => void;
  onRemove: () => void;
};

export default function SpinWheelRewardSection({
  spinReward,
  spinValidation,
  couponApplied,
  couponMessage,
  spinDiscount,
  isNextPurchaseOnly,
  isDeferredOnly,
  onApply,
  onRemove,
}: SpinWheelRewardSectionProps) {
  return (
    <>
      <Box sx={{ mt: 2, bgcolor: "#fff", borderRadius: 2, p: 2, border: "2px solid #9E1B3D" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 24, color: "#9E1B3D" }}>
            Spin Wheel Reward
          </Typography>
        </Box>
        {spinReward ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", minHeight: 48 }}>
              <Box
                sx={{
                  flex: "1 1 auto",
                  border: "1px solid #d1d5db",
                  borderRadius: couponApplied ? "6px 0 0 6px" : "6px",
                  borderRight: couponApplied ? "none" : "1px solid #d1d5db",
                  px: 2,
                  py: 1.25,
                  bgcolor: "#fff",
                }}
              >
                <Typography sx={{ fontSize: 18, color: "#333", fontWeight: 700 }}>
                  {spinReward.code}
                </Typography>
                <Typography sx={{ fontSize: 16, color: "#6b7280", mt: 0.5 }}>
                  {spinReward.title}
                  {spinReward.redeemed ? " (used)" : ""}
                </Typography>
              </Box>
              {!couponApplied &&
              !spinReward.redeemed &&
              spinValidation.canApply &&
              !isNextPurchaseOnly &&
              !isDeferredOnly ? (
                <Button
                  variant="contained"
                  disableElevation
                  onClick={onApply}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: 18,
                    borderRadius: "0 6px 6px 0",
                    minWidth: 100,
                    bgcolor: "#9E1B3D",
                    "&:hover": { bgcolor: "#7C1230" },
                  }}
                >
                  Apply
                </Button>
              ) : null}
            </Box>
            {couponMessage ? (
              <Typography sx={{ fontSize: 16, color: "#6b7280", mt: 1 }}>
                {couponMessage}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography sx={{ fontSize: 18, color: "#6b7280" }}>
            Spin the wheel on the home screen to win a reward before checkout.
          </Typography>
        )}
      </Box>

      {couponApplied && spinDiscount > 0 ? (
        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            bgcolor: "#fdf2f8",
            borderRadius: 2,
            p: 1.5,
            border: "1px solid #fbcfe8",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: "#9E1B3D" }}>
              Reward applied successfully!
            </Typography>
            <Typography sx={{ fontSize: 18, color: "#7A4757", mt: 0.3 }}>
              {couponMessage || `You save Rs.${Math.round(spinDiscount)}/- on this order.`}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onRemove} sx={{ color: "#6b7280", p: 0.3 }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      ) : null}

      {spinReward &&
      !spinReward.redeemed &&
      (isNextPurchaseOnly ||
        isDeferredOnly ||
        spinValidation.reason === "min_order_not_met" ||
        spinValidation.reason === "next_purchase_only" ||
        spinValidation.reason === "birthday_only") ? (
        <Box
          sx={{
            mt: 1.5,
            bgcolor: "#fff7ed",
            borderRadius: 2,
            p: 1.5,
            border: "1px solid #fed7aa",
          }}
        >
          <Typography sx={{ fontSize: 18, color: "#9a3412" }}>
            {spinValidation.message ||
              (isNextPurchaseOnly
                ? "₹100 OFF is for your next purchase only and will not be applied to this order."
                : couponMessage)}
          </Typography>
        </Box>
      ) : null}
    </>
  );
}
