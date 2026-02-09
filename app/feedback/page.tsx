"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PageBackground from "@/components/ui/PageBackground";
import { HelpDialog } from "@/components/ui";
import { APP_ROUTES } from "@/utils/routes";
import { useAppDispatch } from "@/redux/store/store";
import { clearCart } from "@/redux/reducers/cartSlice";
import { persistor } from "@/redux/store/store";

export default function FeedbackPage() {
  const theme = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const dispatch = useAppDispatch();

  const autoHomeTimerRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);

  const userId = (session?.user as any)?.id as string | undefined;

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const [checkoutSummary, setCheckoutSummary] = useState<any>(null);
  const [dispenseState, setDispenseState] = useState<
    | { status: "idle" }
    | { status: "running" }
    | { status: "done"; results: any }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const goHome = async () => {
    hasCompletedRef.current = true;
    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current);
      autoHomeTimerRef.current = null;
    }
    try {
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem("kiosk_checkout_summary");
        } catch {
        }
      }
      dispatch(clearCart());
      await persistor.purge();
    } finally {
      router.push(APP_ROUTES.HOME);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.sessionStorage.getItem("kiosk_checkout_summary");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setCheckoutSummary(parsed);
      try {
        window.sessionStorage.removeItem("kiosk_checkout_summary");
      } catch {
      }
    } catch {
    }
    dispatch(clearCart());
    void persistor.purge();
  }, []);

  // Start 60s auto-home timer only after dispense succeeds
  useEffect(() => {
    if (dispenseState.status !== "done") return;
    if (typeof window === "undefined") return;

    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current);
      autoHomeTimerRef.current = null;
    }

    autoHomeTimerRef.current = window.setTimeout(() => {
      if (hasCompletedRef.current) return;
      if (isSubmitting) return;
      void goHome();
    }, 180_000);

    return () => {
      if (autoHomeTimerRef.current !== null) {
        window.clearTimeout(autoHomeTimerRef.current);
        autoHomeTimerRef.current = null;
      }
    };
  }, [dispenseState.status]);

  const checkoutItems = useMemo(() => {
    const items = checkoutSummary?.items;
    return Array.isArray(items) ? items : [];
  }, [checkoutSummary]);

  useEffect(() => {
    const run = async () => {
      if (dispenseState.status !== "idle") return;
      if (!checkoutSummary) return;
      if (checkoutItems.length === 0) return;
      setDispenseState({ status: "running" });

      try {
        const productCodes: string[] = [];
        for (const item of checkoutItems) {
          const quantity = Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
          if (item?.slotId) {
            for (let i = 0; i < quantity; i++) productCodes.push(String(item.slotId));
            continue;
          }

          const productIdRaw = typeof item?.id === "string" ? item.id : "";
          const cleanProductId = productIdRaw.replace(/^products\//, "");
          const name = typeof item?.name === "string" ? item.name : "";
          const encodedName = encodeURIComponent(name);
          const slotsUrl = `/api/admin/products/${cleanProductId || "unknown"}/slots?name=${encodedName}`;

          const slotsResponse = await fetch(slotsUrl);
          const slotsData = await slotsResponse.json();
          const slots = Array.isArray(slotsData?.slots) ? slotsData.slots : [];
          const availableSlots = slots
            .filter((s: any) => Number(s?.quantity) > 0)
            .sort((a: any, b: any) => Number(b?.slot_id) - Number(a?.slot_id));

          const chosen = availableSlots[0] || slots[0];
          if (chosen?.slot_id) {
            for (let i = 0; i < quantity; i++) productCodes.push(String(chosen.slot_id));
          }
        }

        if (productCodes.length === 0) {
          setDispenseState({ status: "error", message: "No slots found for dispensing" });
          return;
        }

        const response = await fetch("/api/stm32/dispense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productCodes }),
        });
        const result = await response.json();
        if (!response.ok || !result?.success) {
          const msg = result?.error?.message || "Dispense failed";
          setDispenseState({ status: "error", message: msg });
          return;
        }

        setDispenseState({ status: "done", results: result?.data?.results });
      } catch (e: any) {
        setDispenseState({ status: "error", message: e?.message || "Dispense failed" });
      }
    };

    void run();
  }, [checkoutItems, checkoutSummary, dispenseState.status]);

  const handleStarClick = (starIndex: number) => {
    setRating(starIndex);
  };

  const handleStarHover = (starIndex: number) => {
    setHoveredRating(starIndex);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleClose = () => {
    hasCompletedRef.current = true;
    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current);
      autoHomeTimerRef.current = null;
    }
    dispatch(clearCart());
    void persistor.purge();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("kiosk_checkout_summary");
      } catch {
      }
    }
    router.push(APP_ROUTES.HOME);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    hasCompletedRef.current = true;
    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current);
      autoHomeTimerRef.current = null;
    }

    setIsSubmitting(true);
    try {
      if (userId) {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            rating,
            notes,
          }),
        });

        const result = await response.json();

        if (result.success || result.status === "success") {
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      } else {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;
  const canSubmit = rating > 0 && !isSubmitting;

  return (
    <PageBackground fitParent>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          px: 3,
          pt: 3,
          
          boxSizing: "border-box",
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 40,
            height: 40,
            bgcolor: "#ffffff",
            border: "1px solid #d1d5db",
            "&:hover": { bgcolor: "#ffffff" },
          }}
        >
          <Icon icon="mdi:help-circle-outline" width={22} />
        </IconButton>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            mt: 2,
            mb: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: "#ffffff",
              px: 2.5,
              py: 1,
              borderRadius: 0,
              width: "min(520px, 100%)",
              height: 80,
              position: "relative",
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={goHome}
              sx={{
                all: "unset",
                cursor: "pointer",
                display: "block",
                width: "100%",
                height: "100%",
                position: "relative",
              }}
            >
              <Image
                src="/wending/goldlog.svg"
                alt="Leaf Water"
                fill
                sizes="520px"
                style={{ objectFit: "contain" }}
                priority
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ width: "min(860px, 100%)", mt: 3 }}>
          <Box
            sx={{
              width: "100%",
              bgcolor: "#1f4d3d",
              borderRadius: 3,
              px: 3,
              py: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            }}
          >
            <Box sx={{ color: "#ffffff", minWidth: 0 }}>
              <Typography sx={{ fontSize: 24, opacity: 0.85, letterSpacing: 0.5, pb: 2 }}>
                LEARN MORE
              </Typography>
              <Typography sx={{ fontSize: 32, fontWeight: 700, mt: 0.5, pb: 2 }}>
                About Leafwater
              </Typography>
              <Typography sx={{ fontSize: 24, opacity: 0.9, mt: 0.5, maxWidth: 520 }}>
                Deep insights into your skin, powered by intelligent diagnostics,
              </Typography>
            </Box>
            <Box sx={{ bgcolor: "#ffffff", borderRadius: 2, p: 1, flexShrink: 0 }}>
              <Image src="/wending/qr.svg" alt="QR" width={74} height={74} />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            width: "min(860px, 100%)",
            mt: 2,
            mb: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {checkoutSummary ? (
            <Box
              sx={{
                width: "100%",
                bgcolor: "#ffffff",
                borderRadius: 3,
                px: 3,
                py: 2,
                border: "1px solid #e5e7eb",
              }}
            >
              <Typography sx={{ alignItems: "center",justifyContent: "center",fontSize: 28, fontWeight: 800, mb:2 , textAlign: "center" }}>
                Order Summary
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                  gap: 1.5,
                  alignItems: "start",
                }}
              >
                <Typography sx={{ fontSize: 24, color: "#374151" }}>
                  Items: {checkoutItems.length}
                </Typography>
                <Typography sx={{ fontSize: 24, color: "#374151" }}>
                  Total: ₹{Number(checkoutSummary?.total || 0).toFixed(2)}
                </Typography>
                <Typography sx={{ fontSize: 24, color: "#374151" }}>
                  Discount: ₹{Number(checkoutSummary?.discount || 0).toFixed(2)}
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>
                  Paid: ₹{Number(checkoutSummary?.payableTotal || 0).toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 800 }}>
                  Dispense Status
                </Typography>
                {dispenseState.status === "idle" || dispenseState.status === "running" ? (
                  <Typography sx={{ fontSize: 24, color: "#374151" }}>
                    Dispensing...
                  </Typography>
                ) : dispenseState.status === "done" ? (
                  <Typography sx={{ fontSize: 20, color: "#166534" }}>
                    Dispensed successfully
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: 20, color: "#b91c1c" }}>
                    {dispenseState.message}
                  </Typography>
                )}
              </Box>
            </Box>
          ) : null}
        </Box>

        <Box
          sx={{
            width: "min(860px, 100%)",
            mt: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 0.5,
            mb: 2,
          }}
        >
          <Typography sx={{ fontWeight: 800, letterSpacing: 3, fontSize: 32, pb: 2, pt: 4 }}>
            THANK YOU!
          </Typography>
          <Typography sx={{ fontSize: 24, color: "#111827" }}>
            Please remember to retrieve your item!
          </Typography>
          <Typography sx={{ fontSize: 24, color: "#111827" }}>
            Have a nice day!
          </Typography>
        </Box>

        <Box
          sx={{
            width: "min(860px, 100%)",
            mt: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: 28, fontWeight: 700, pb: 2 }}>Quick Favour?</Typography>
          <Typography sx={{ fontSize: 24, color: "#374151", mt: 0.5 }}>
            Kindly rate your experience with us so far.
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <IconButton
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => handleStarHover(star)}
                onMouseLeave={handleStarLeave}
                sx={{ p: 1, bgcolor: "transparent" }}
              >
                <Icon
                  icon={star <= displayRating ? "mdi:star" : "mdi:star-outline"}
                  width={60}
                  color={star <= displayRating ? "#f59e0b" : "#cfcfcf"}
                />
              </IconButton>
            ))}
          </Box>

          <Box sx={{ width: "min(520px, 100%)", mt: 2.5 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Tell us more (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "#ffffff",
                  fontSize: 24,
                  "& textarea": {
                    fontSize: 24,
                  },
                  "& textarea::placeholder": {
                    fontSize: 24,
                    opacity: 0.8,
                  },
                  "& fieldset": {
                    borderColor: "#d1d5db",
                  },
                  "&:hover fieldset": {
                    borderColor: "#9ca3af",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#9ca3af",
                  },
                },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
              sx={{
                mt: 2,
                bgcolor: "#1f4d3d",
                color: "#fff",
                py: 1.25,
                borderRadius: "12px",
                fontSize: 24,
                fontWeight: 700,
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#16362c",
                },
                "&:disabled": {
                  bgcolor: "#d1d5db",
                  color: "#ffffff",
                },
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            width: "min(860px, 100%)",
            mt: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center",  mb: 2,flexWrap: "nowrap", gap: 2 }}>
            <Typography sx={{ fontSize: 28, fontWeight: 800 , whiteSpace: "nowrap", }}>Need Help?</Typography>
            <Button
              variant="outlined"
              onClick={() => setHelpDialogOpen(true)}
              sx={{
                borderRadius: 2,
                borderColor: "#2d5a3d",
                color: "#2d5a3d",
                fontSize: 18,
                fontWeight: 600,
                textTransform: "none",
                px: 1,
                py: 1,
                "&:hover": {
                  borderColor: "#1e3d2a",
                  bgcolor: "#f0fdf4",
                },
              }}
            >
              Click Here
            </Button>
          </Box>
          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1px 1fr",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: 24, color: "#374151", pb: 2 }}>WhatsApp us:</Typography>
              <Typography sx={{ fontSize: 24, color: "#111827", fontWeight: 700 }}>
                +91 9179077990
              </Typography>
            </Box>
            <Box
              sx={{
                height: 120,
                bgcolor: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
            <Box
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <Typography sx={{ fontSize: 24, color: "#374151" }}>
                Scan this <br /> QR Code
              </Typography>
              <Box sx={{ bgcolor: "#ffffff", borderRadius: 1, p: 0.75, flexShrink: 0 }}>
                <Image src="/wending/qr.svg" alt="QR" width={92} height={92} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Help Dialog */}
      <HelpDialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </PageBackground>
  );
}
