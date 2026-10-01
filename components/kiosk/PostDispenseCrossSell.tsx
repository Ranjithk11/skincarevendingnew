"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Dialog, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import { setJourneySource } from "@/lib/kiosk-journey";

type SlotRow = {
  slot_id?: number;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  retail_price?: number;
  category?: string;
  image_url?: string;
};

type CheckoutItem = {
  id?: string;
  name?: string;
  category?: string;
};

type Props = {
  open: boolean;
  checkoutItems: CheckoutItem[];
  onSkip: () => void;
};

function isSpfProduct(name = "", category = ""): boolean {
  const hay = `${name} ${category}`.toLowerCase();
  return /spf|sunscreen|sun screen|sun-screen|sun protect/.test(hay);
}

export default function PostDispenseCrossSell({
  open,
  checkoutItems,
  onSkip,
}: Props) {
  const router = useRouter();
  const [candidate, setCandidate] = useState<SlotRow | null>(null);

  const alreadyBoughtSpf = useMemo(
    () =>
      checkoutItems.some((item) =>
        isSpfProduct(String(item?.name || ""), String(item?.category || ""))
      ),
    [checkoutItems]
  );

  useEffect(() => {
    if (!open || alreadyBoughtSpf) return;
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/admin/slots", { cache: "no-store" });
        const json = res.ok ? await res.json() : {};
        const rows = Object.values(json || {}) as SlotRow[];
        const boughtIds = new Set(
          checkoutItems.map((item) => String(item?.id || "")).filter(Boolean)
        );
        const match = rows.find((row) => {
          const qty = Number(row.quantity ?? 0);
          if (!row.product_id || qty <= 0) return false;
          if (boughtIds.has(String(row.product_id))) return false;
          return isSpfProduct(row.product_name || "", row.category || "");
        });
        if (!cancelled) setCandidate(match || null);
      } catch {
        if (!cancelled) setCandidate(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [alreadyBoughtSpf, checkoutItems, open]);

  if (!open || alreadyBoughtSpf || !candidate) return null;

  const price = Number(candidate.retail_price || 0);

  return (
    <Dialog
      open
      onClose={onSkip}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 520 } }}
    >
      <Box sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 24, color: "#14532d" }}>
          Complete your routine
        </Typography>
        <Typography sx={{ fontSize: 16, color: "#4b5563", mt: 0.5, mb: 2 }}>
          Add SPF now while you are here.
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            p: 1.5,
            border: "1px solid #d1fae5",
            borderRadius: 2,
            bgcolor: "#f0fdf4",
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1.5,
              bgcolor: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon icon="mdi:white-balance-sunny" width={28} color="#2F5D46" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>
              {candidate.product_name || "Sunscreen"}
            </Typography>
            <Typography sx={{ fontSize: 15, color: "#166534", mt: 0.25 }}>
              {price > 0 ? `Add SPF for ₹${Math.round(price)} now?` : "Add SPF now?"}
              {candidate.slot_id ? ` · Slot ${candidate.slot_id}` : ""}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={onSkip}
            sx={{ textTransform: "none", flex: 1, minHeight: 48, fontSize: 18, color: "#4b5563" }}
          >
            No thanks
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => {
              setJourneySource("post_dispense_crosssell");
              router.push(APP_ROUTES.SLOTS);
            }}
            sx={{
              textTransform: "none",
              flex: 1.3,
              minHeight: 48,
              fontWeight: 800,
              fontSize: 18,
              bgcolor: "#2F5D46",
              "&:hover": { bgcolor: "#244a38" },
            }}
          >
            Buy this next
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
