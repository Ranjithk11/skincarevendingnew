import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Collapse,
    Dialog,
    Divider,
    IconButton,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { capitalizeWords } from "@/utils/func";
import { useCart, CartItem } from "./CartContext";
import UpiQrPayment from "@/components/payments/UpiQrPayment";
import PaymentMethodChooser, { type PaymentMethod } from "@/components/payments/PaymentMethodChooser";
import CashAgentPayment from "@/components/payments/CashAgentPayment";
import { ProductPrice } from "./components";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import CloseIcon from "@mui/icons-material/Close";
import { APP_ROUTES } from "@/utils/routes";
import { useVoiceMessages } from "@/contexts/VoiceContext";
import { useSession } from "next-auth/react";
import PaymentReporter from "@/components/reporters/PaymentReporter";
import {
  getWalkInDisplayName,
  getWebhookUserId,
  mergeMachineContext,
} from "@/lib/machineContext";
import {
    clampCartQuantity,
    fetchMachineStockForProduct,
    getCartQuantityLimitMessage,
} from "@/utils/cartQuantityLimits";
import { useSpinWheel } from "@/contexts/SpinWheelContext";
import {
  isDeferredSpinReward,
  isNextPurchaseSpinReward,
} from "@/lib/spin-wheel/rewards";
import {
  buildSpinWheelWebhookPayload,
  type SpinWheelWebhookPayload,
} from "@/lib/spin-wheel/webhook";
import SpinWheelNextPurchasePopup from "@/components/spin-wheel/SpinWheelNextPurchasePopup";

type CartProductProps = {
    open: boolean;
    onClose: () => void;
    onCheckout?: () => void;
};

const parsePrice = (priceText?: string): number => {
    if (!priceText) return 0;
    const normalized = String(priceText).replace(/,/g, " ");
    const match = normalized.match(/(\d+(?:\.\d+)?)/);
    if (!match) return 0;
    const num = Number(match[1]);
    return Number.isFinite(num) ? num : 0;
};

const CartProduct: React.FC<CartProductProps> = ({ open, onClose, onCheckout }) => {
    const theme = useTheme();
    const router = useRouter();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { items, setQuantity, removeItem, clear } = useCart();
    const { speakMessage } = useVoiceMessages();
    const { data: session } = useSession();
    const [showPriceDetails, setShowPriceDetails] = useState(false);
    const [step, setStep] = useState<"cart" | "checkout" | "payment">("cart");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponMessage, setCouponMessage] = useState("");
    const [nextPurchaseClaimOpen, setNextPurchaseClaimOpen] = useState(false);
    const [nextPurchaseClaimed, setNextPurchaseClaimed] = useState(false);
    const { reward: spinReward, validateForCart, markRewardRedeemed } = useSpinWheel();

    const claimSessionUser = useMemo(
      () => ({
        userId: session?.user?.id ? String(session.user.id) : undefined,
        name: (session?.user as { name?: string } | undefined)?.name || "",
        email: (session?.user as { email?: string } | undefined)?.email || "",
        phone:
          (session?.user as { mobileNumber?: string; phoneNumber?: string; phone?: string } | undefined)
            ?.mobileNumber ||
          (session?.user as { phoneNumber?: string } | undefined)?.phoneNumber ||
          (session?.user as { phone?: string } | undefined)?.phone ||
          "",
      }),
      [session]
    );
    const [paymentMode, setPaymentMode] = useState<"test" | "live">("live");
    const [isDispensing, setIsDispensing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentPayload, setPaymentPayload] = useState<any>(null);
    const [spinWheelWebhookData, setSpinWheelWebhookData] =
        useState<SpinWheelWebhookPayload | null>(null);
    const [machineLocation, setMachineLocation] = useState<string>("LeafWater Vending Machine");
    const [machineName, setMachineName] = useState<string>("Vending Machine");
    const [machineId, setMachineId] = useState<string>("");
    const [stockByProduct, setStockByProduct] = useState<Record<string, number>>({});
    const [limitNotice, setLimitNotice] = useState({ open: false, message: "" });
    const paymentRecordedRef = useRef<string | null>(null);

    const cartItemKey = (item: CartItem) => item.id || item.name;

    const machineContext = useMemo(
        () =>
            mergeMachineContext({
                machineId,
                machineName,
                machineLocation,
            }),
        [machineId, machineName, machineLocation]
    );

    const webhookUser = useMemo(
        () => ({
            userId: getWebhookUserId(session, machineContext),
            name: getWalkInDisplayName(session, machineContext),
            email: (session?.user as any)?.email || "",
            phone:
                (session?.user as any)?.mobileNumber ||
                (session?.user as any)?.phoneNumber ||
                (session?.user as any)?.phone ||
                "",
        }),
        [session, machineContext]
    );

    // Fetch machine location and name from database
    useEffect(() => {
        const fetchMachineSettings = async () => {
            try {
                const response = await fetch("/api/admin/machine-name");
                const data = await response.json();
                if (data.success) {
                    if (data.machineLocation) setMachineLocation(data.machineLocation);
                    if (data.machineName) setMachineName(data.machineName);
                    if (data.machineId) setMachineId(data.machineId);
                }
            } catch (error) {
                console.error("[CartProduct] Failed to fetch machine settings:", error);
            }
        };
        fetchMachineSettings();
    }, []);

    useEffect(() => {
        router.prefetch(APP_ROUTES.FEEDBACK);
    }, [router]);

    useEffect(() => {
        if (!open || items.length === 0) {
            setStockByProduct({});
            return;
        }

        let cancelled = false;

        (async () => {
            const nextStock: Record<string, number> = {};
            await Promise.all(
                items.map(async (item) => {
                    const key = cartItemKey(item);
                    nextStock[key] = await fetchMachineStockForProduct(item.id, item.name);
                })
            );

            if (cancelled) return;

            setStockByProduct(nextStock);

            items.forEach((item) => {
                const key = { id: item.id, name: item.name };
                const machineStock = nextStock[cartItemKey(item)];
                const { quantity, wasLimited, maxAllowed } = clampCartQuantity(
                    item.quantity || 1,
                    machineStock
                );
                if (wasLimited && quantity !== (item.quantity || 1)) {
                    setQuantity(key, quantity);
                    setLimitNotice({
                        open: true,
                        message: getCartQuantityLimitMessage(maxAllowed, machineStock),
                    });
                }
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [open, items, setQuantity]);

    const applyQuantityChange = useCallback(
        (item: CartItem, requestedQty: number) => {
            const key = { id: item.id, name: item.name };
            const stockKey = cartItemKey(item);
            const machineStock =
                stockKey in stockByProduct ? stockByProduct[stockKey] : null;
            const { quantity: nextQty, wasLimited, maxAllowed } = clampCartQuantity(
                requestedQty,
                machineStock
            );

            if (nextQty <= 0) {
                removeItem(key);
                speakMessage("removeFromCart");
                return;
            }

            if (wasLimited) {
                const message = getCartQuantityLimitMessage(maxAllowed, machineStock);
                setLimitNotice({ open: true, message });
                toast.info(message);
            } else if (nextQty > (item.quantity || 1)) {
                speakMessage("addToCart");
            }

            setQuantity(key, nextQty);
        },
        [stockByProduct, setQuantity, removeItem, speakMessage]
    );

    useEffect(() => {
        if (!open) return;
        if (step === "checkout") {
            speakMessage("checkoutTapCart");
            return;
        }
        if (step === "payment") {
            speakMessage("paymentContinue");
        }
    }, [open, step, speakMessage]);

    // Function to dispense products via STM32
    const dispenseProducts = useCallback(async (cartItems: CartItem[]) => {
        console.log("[Dispense] Starting dispense for items:", cartItems);
        setIsDispensing(true);
        toast.info("Dispensing products...");

        try {
            const productCodes: string[] = [];

            for (const item of cartItems) {
                const productId = item.id?.replace(/^products\//, '') || "";
                const quantity = item.quantity || 1;
                const encodedName = encodeURIComponent(item.name);

                console.log("[Dispense] Processing product:", item.name, "id:", productId, "quantity:", quantity, "slotId:", item.slotId);

                // If slotId is set and quantity is 1, use it directly (user selected specific slot)
                // This preserves the original behavior for single-item purchases from /slots page
                if (item.slotId && quantity === 1) {
                    productCodes.push(item.slotId.toString());
                    continue;
                }

                // For quantity > 1 or no slotId, fetch slots from API to distribute across multiple slots
                const cleanProductId = productId || "unknown";
                const slotsUrl = `/api/admin/products/${cleanProductId}/slots?name=${encodedName}`;

                try {
                    const slotsResponse = await fetch(slotsUrl);
                    const slotsData = await slotsResponse.json();
                    console.log("[Dispense] Slots response for", item.name, ":", slotsData);

                    if (slotsData.slots && slotsData.slots.length > 0) {
                        // Use slots with quantity > 0, sorted by slot_id descending
                        let availableSlots = slotsData.slots
                            .filter((s: any) => s.quantity > 0)
                            .sort((a: any, b: any) => b.slot_id - a.slot_id);

                        // If item has slotId, prioritize that slot first
                        if (item.slotId) {
                            const preferredSlotId = Number(item.slotId);
                            availableSlots = [
                                ...availableSlots.filter((s: any) => Number(s.slot_id) === preferredSlotId),
                                ...availableSlots.filter((s: any) => Number(s.slot_id) !== preferredSlotId),
                            ];
                        }

                        if (availableSlots.length > 0) {
                            // Distribute quantity across available slots
                            let remaining = quantity;
                            for (const slot of availableSlots) {
                                const toDispense = Math.min(remaining, slot.quantity);
                                for (let i = 0; i < toDispense; i++) {
                                    productCodes.push(slot.slot_id.toString());
                                }
                                remaining -= toDispense;
                                if (remaining <= 0) break;
                            }
                        } else {
                            console.warn("[Dispense] No slots with quantity > 0 for:", item.name);
                        }
                    } else {
                        console.warn("[Dispense] No slots found for product:", item.name);
                    }
                } catch (err) {
                    console.error("[Dispense] Error fetching slots for", item.name, ":", err);
                }
            }

            console.log("[Dispense] Product codes to dispense:", productCodes);

            if (productCodes.length === 0) {
                console.warn("[Dispense] No slots found, but continuing to show feedback");
                // Don't block feedback if no slots - this might be a demo/test
                return true;
            }

            // Call STM32 dispense API
            console.log("[Dispense] Calling /api/stm32/dispense with:", productCodes);
            const dispenseResponse = await fetch("/api/stm32/dispense", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productCodes }),
            });

            const dispenseResult = await dispenseResponse.json();
            console.log("[Dispense] Dispense result:", dispenseResult);

            if (dispenseResult.success) {
                toast.success("Products dispensed successfully!");
                return { success: true, dispenseFailed: false };
            } else {
                console.error("[Dispense] Dispense failed:", dispenseResult.error?.message);
                // Product didn't fall into tray - show refund message
                return { success: true, dispenseFailed: true };
            }

        } catch (error) {
            console.error("[Dispense] Error:", error);
            // Return with dispenseFailed flag for error cases
            return { success: true, dispenseFailed: true };
        } finally {
            setIsDispensing(false);
        }
    }, []);

    const total = useMemo(() => {
        const sum = items.reduce((acc, it) => acc + parsePrice(it.priceText) * (it.quantity || 0), 0);
        return Number.isFinite(sum) ? sum : 0;
    }, [items]);

    const spinValidation = useMemo(() => validateForCart(total), [validateForCart, total]);

    const isNextPurchaseOnly = isNextPurchaseSpinReward(spinReward);
    const isDeferredOnly = isDeferredSpinReward(spinReward);

    const discount = useMemo(() => {
      if (!couponApplied) return 0;
      // Hard block: next-visit / birthday rewards never reduce payable total.
      if (isDeferredOnly || isNextPurchaseOnly) return 0;
      if (!spinValidation.canApply) return 0;
      if (spinValidation.reason === "next_purchase_only" || spinValidation.reason === "birthday_only") {
        return 0;
      }
      return Math.max(0, Number(spinValidation.discount) || 0);
    }, [
      couponApplied,
      isDeferredOnly,
      isNextPurchaseOnly,
      spinValidation.canApply,
      spinValidation.discount,
      spinValidation.reason,
    ]);

    useEffect(() => {
        if (!open || step !== "checkout") return;
        if (!spinReward || spinReward.redeemed) {
            setCouponApplied(false);
            setCouponMessage("");
            return;
        }

        const validation = validateForCart(total);
        setCouponMessage(validation.message);

        if (
          isDeferredSpinReward(spinReward) ||
          isNextPurchaseSpinReward(spinReward) ||
          !validation.canApply ||
          validation.reason === "next_purchase_only" ||
          validation.reason === "birthday_only"
        ) {
            setCouponApplied(false);
            return;
        }

        setCouponApplied(true);
    }, [open, step, spinReward, total, validateForCart]);

    // Open claim popup on checkout when ₹100 next-purchase reward is unclaimed.
    useEffect(() => {
      if (!open || step !== "checkout") return;
      if (!isNextPurchaseSpinReward(spinReward) || spinReward?.redeemed || nextPurchaseClaimed) {
        return;
      }
      setNextPurchaseClaimOpen(true);
    }, [open, step, spinReward, nextPurchaseClaimed]);

    const handleApplySpinCoupon = useCallback(() => {
        if (!spinReward) {
            toast.info("Spin the wheel first to win a reward.");
            return;
        }

        if (isDeferredSpinReward(spinReward) || isNextPurchaseSpinReward(spinReward)) {
            const validation = validateForCart(total);
            setCouponMessage(validation.message);
            setCouponApplied(false);
            toast.info(validation.message);
            if (isNextPurchaseSpinReward(spinReward) && !nextPurchaseClaimed) {
              setNextPurchaseClaimOpen(true);
            }
            return;
        }

        const validation = validateForCart(total);
        setCouponMessage(validation.message);

        if (!validation.canApply) {
            toast.info(validation.message);
            setCouponApplied(false);
            return;
        }

        setCouponApplied(true);
        toast.success(validation.message);
    }, [spinReward, total, validateForCart, nextPurchaseClaimed]);

    const handleRemoveSpinCoupon = useCallback(() => {
        setCouponApplied(false);
        setCouponMessage("");
    }, []);

    const payableTotal = useMemo(() => {
        // Extra guard: deferred rewards can never reduce pay amount.
        if (isDeferredOnly || isNextPurchaseOnly) {
          return Number.isFinite(total) ? Math.max(0, total) : 0;
        }
        const next = total - discount;
        return Number.isFinite(next) ? Math.max(0, next) : 0;
    }, [total, discount, isDeferredOnly, isNextPurchaseOnly]);

    const amountPaise = useMemo(() => {
        const canDiscount = couponApplied && !isDeferredOnly && !isNextPurchaseOnly && discount > 0;
        const amount = canDiscount ? payableTotal : total;
        return Math.max(0, Math.round(amount * 100));
    }, [payableTotal, couponApplied, total, isDeferredOnly, isNextPurchaseOnly, discount]);

    const captureSpinWheelWebhookData = useCallback(
        (appliedAt = Date.now()) =>
            buildSpinWheelWebhookPayload({
                reward: spinReward,
                couponApplied: couponApplied && !isDeferredOnly && !isNextPurchaseOnly && discount > 0,
                discountAmount: isDeferredOnly || isNextPurchaseOnly ? 0 : discount,
                cartTotal: total,
                payableTotal,
                appliedAt,
            }),
        [
          spinReward,
          couponApplied,
          discount,
          total,
          payableTotal,
          isDeferredOnly,
          isNextPurchaseOnly,
        ]
    );

    const handleBack = () => {
        if (step === "payment") {
            // If a method is chosen, step back to the method chooser first.
            if (paymentMethod) {
                setPaymentMethod(null);
                return;
            }
            setStep("checkout");
            return;
        }
        if (step === "checkout") {
            setStep("cart");
            return;
        }
        onClose();
    };

    // Cash payment: agent already validated in CashAgentPayment. Record the sale
    // and hand off to the feedback page which performs the dispense (same path as
    // UPI). The agent name + amount + method="cash" travel in the checkout summary
    // so the dispense-success webhook can include them.
    const handleCashConfirmed = useCallback(
        async (agentName: string) => {
            const txnId = `CASH-${Date.now()}`;
            if (paymentRecordedRef.current === txnId) return;

            if (typeof window !== "undefined") {
                const storageKey = `kiosk_order_recorded::${txnId}`;
                if (window.sessionStorage.getItem(storageKey)) return;
                window.sessionStorage.setItem(storageKey, "1");
            }
            paymentRecordedRef.current = txnId;

            const itemsToDispense = [...items];
            const amount = payableTotal;

            const cashPayment = {
                orderId: txnId,
                paymentId: txnId,
                amount,
                currency: "INR",
                status: "paid",
                method: "cash",
                agentName,
                machineId,
                machineName,
                machineLocation,
            };

            setPaymentSuccess(true);
            setPaymentPayload(cashPayment);
            setSpinWheelWebhookData(captureSpinWheelWebhookData());

            if (couponApplied && spinReward && !spinReward.redeemed) {
                markRewardRedeemed();
            }

            if (typeof window !== "undefined") {
                try {
                    window.sessionStorage.setItem(
                        "kiosk_checkout_summary",
                        JSON.stringify({
                            items: itemsToDispense,
                            total,
                            discount,
                            payableTotal,
                            couponApplied,
                            spinWheelReward: spinReward,
                            createdAt: Date.now(),
                            payment: cashPayment,
                        })
                    );
                } catch {
                }
            }

            router.push(APP_ROUTES.FEEDBACK);

            void (async () => {
                try {
                    const orderItems = itemsToDispense.map((item) => ({
                        productId: item.id || "",
                        productName: item.name,
                        quantity: item.quantity || 1,
                        price: parsePrice(item.priceText),
                        slotId: item.slotId,
                    }));

                    const orderResponse = await fetch("/api/admin/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            items: orderItems,
                            totalAmount: amount,
                            paymentId: txnId,
                            razorpayOrderId: txnId,
                            paymentMode: "cash",
                        }),
                    });
                    const orderData = await orderResponse.json();

                    await fetch("/api/admin/transactions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            transactionId: txnId,
                            amount,
                            paymentId: txnId,
                            status: "completed",
                        }),
                    }).catch((err) => console.warn("[CashPayment] Failed to record transaction:", err));

                    await fetch("/api/posifly/bills", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            orderId: orderData?.order?.id || txnId,
                            items: orderItems,
                            totalAmount: amount,
                            discountAmount: discount,
                            paymentId: txnId,
                            razorpayOrderId: txnId,
                            paymentMode: "cash",
                        }),
                    }).catch((err) => console.warn("[CashPayment] Failed to save POSIFLY bill:", err));
                } catch (err) {
                    console.error("[CashPayment] Failed to record order:", err);
                }
            })();
        },
        [items, payableTotal, total, discount, machineId, machineName, machineLocation, router, couponApplied, spinReward, markRewardRedeemed, captureSpinWheelWebhookData]
    );

    return (
        <>
            <Dialog
                open={limitNotice.open}
                onClose={() => setLimitNotice({ open: false, message: "" })}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        p: 2,
                        width: "min(420px, 92vw)",
                    },
                }}
            >
                <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#111827", pr: 4 }}>
                    Quantity limit
                </Typography>
                <Typography sx={{ fontSize: 18, color: "#4b5563", mt: 1.5, lineHeight: 1.5 }}>
                    {limitNotice.message}
                </Typography>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setLimitNotice({ open: false, message: "" })}
                    sx={{
                        mt: 2.5,
                        bgcolor: "#2d5a3d",
                        textTransform: "none",
                        fontSize: 18,
                        fontWeight: 600,
                        "&:hover": { bgcolor: "#1e3d2a" },
                    }}
                >
                    OK
                </Button>
            </Dialog>

            <Dialog
                fullScreen={isMobile}
                open={open}
                onClose={undefined}
                fullWidth
                maxWidth={false}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : "100vw",
                        maxWidth: "100vw",
                        height: isMobile ? "100%" : "100dvh",
                        maxHeight: "100dvh",
                        m: 0,
                        borderRadius: isMobile ? 0 : 0,
                        overflow: "hidden",
                        bgcolor: "#f8f6f0",
                    },
                }}
            >
                <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            bgcolor: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                        }}
                    >
                        {/* Top row: Back button, Logo, and Action button */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <IconButton
                                    onClick={handleBack}
                                    sx={{
                                        border: "1px solid rgba(0,0,0,0.12)",
                                        width: 60,
                                        height: 60,
                                        borderRadius: "999px",
                                    }}
                                >
                                    <Icon icon="mdi:arrow-left" width={isMobile ? 24 : 28} height={isMobile ? 24 : 28} />
                                </IconButton>
                                <Box
                                    component="img"
                                    src="/wending/goldlog.svg"
                                    alt="Leaf Water"
                                    sx={{ height: isMobile ? 70 : 70, width: "auto", display: "block" }}
                                />
                            </Box>

                        </Box>
                        {/* Title row with buttons side by side */}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                            <Typography
                                sx={{
                                    fontFamily:
                                        'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                    fontWeight: 510,
                                    fontSize: isMobile ? 28 : 36,
                                    lineHeight: "100%",
                                    letterSpacing: "0%",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    textAlign: "left",
                                    pb: 2
                                }}
                            >
                                {step === "cart" ? `My Cart (${items.length})` : step === "checkout" ? "Checkout" : "Payment"}
                            </Typography>
                            {step === "cart" && (
                                <Button
                                    variant="contained"
                                    onClick={() => {
                                        setStep("checkout");
                                        speakMessage('checkout');
                                    }}
                                    sx={{
                                        fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                        fontWeight: 600,
                                        fontSize: 24,
                                        px: 8,
                                        py: 4,
                                        minWidth: "unset",
                                        width: "auto",
                                        borderRadius: "8px",
                                        bgcolor: "#316D52",
                                        "&:hover": { bgcolor: "#234a31" },
                                    }}
                                >
                                    Checkout
                                </Button>
                            )}
                            {step === "checkout" && (
                                <Button
                                    variant="contained"
                                    onClick={() => {
                                        setPaymentMethod(null);
                                        setStep("payment");
                                        speakMessage('payment');
                                    }}
                                    sx={{
                                        fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                        fontWeight: 600,
                                        fontSize: 24,
                                        px: 8,
                                        py: 4,
                                        minWidth: "unset",
                                        width: "auto",
                                        borderRadius: "8px",
                                        bgcolor: "#316D52",
                                        "&:hover": { bgcolor: "#234a31" },
                                    }}
                                >
                                    Pay Now
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2, pb: 0 }}>
                        {step === "payment" ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minHeight: "100%",
                                    py: 4,
                                }}
                            >
                                {paymentMethod === null ? (
                                    <PaymentMethodChooser
                                        amount={
                                          couponApplied && !isDeferredOnly && !isNextPurchaseOnly && discount > 0
                                            ? payableTotal
                                            : total
                                        }
                                        onSelect={(m) => {
                                            setPaymentMethod(m);
                                            speakMessage("payment");
                                        }}
                                    />
                                ) : paymentMethod === "cash" ? (
                                    <CashAgentPayment
                                        amount={
                                          couponApplied && !isDeferredOnly && !isNextPurchaseOnly && discount > 0
                                            ? payableTotal
                                            : total
                                        }
                                        onBack={() => setPaymentMethod(null)}
                                        onConfirmed={handleCashConfirmed}
                                    />
                                ) : (
                                <UpiQrPayment
                                    amountPaise={amountPaise}
                                    currency="INR"
                                    mode={paymentMode}
                                    receipt={`cart_${Date.now()}`}
                                    autoTrigger
                                    onProcessingStart={() => {
                                        speakMessage("paymentProcessing");
                                    }}
                                    onVerified={async (payload) => {
                                        const dedupeKey =
                                            payload?.paymentId ||
                                            payload?.qrCodeId ||
                                            payload?.orderId ||
                                            "";
                                        if (!dedupeKey) return;

                                        // Claim synchronously before any await (prevents double record).
                                        if (paymentRecordedRef.current) {
                                            console.log("[Payment] Duplicate onVerified ignored:", dedupeKey);
                                            return;
                                        }
                                        paymentRecordedRef.current = dedupeKey;

                                        if (typeof window !== "undefined") {
                                            const storageKey = `kiosk_order_recorded::${dedupeKey}`;
                                            if (window.sessionStorage.getItem(storageKey)) {
                                                console.log("[Payment] Duplicate onVerified ignored (session):", dedupeKey);
                                                return;
                                            }
                                            window.sessionStorage.setItem(storageKey, "1");
                                        }

                                        console.log("[Payment] onVerified called, items:", items, "payload:", payload);
                                        const itemsToDispense = [...items];

                                        // Trigger payment webhook
                                        setPaymentSuccess(true);
                                        setSpinWheelWebhookData(captureSpinWheelWebhookData());
                                        setPaymentPayload({
                                            orderId: payload?.orderId,
                                            paymentId: payload?.paymentId,
                                            qrCodeId: payload?.qrCodeId,
                                            amount: payableTotal,
                                            currency: "INR",
                                            status: "paid",
                                            method: paymentMode,
                                        });

                                        if (couponApplied && spinReward && !spinReward.redeemed) {
                                            markRewardRedeemed();
                                        }

                                        if (typeof window !== "undefined") {
                                            try {
                                                window.sessionStorage.setItem(
                                                    "kiosk_checkout_summary",
                                                    JSON.stringify({
                                                        items: itemsToDispense,
                                                        total,
                                                        discount,
                                                        payableTotal,
                                                        couponApplied,
                                                        spinWheelReward: spinReward,
                                                        createdAt: Date.now(),
                                                        payment: {
                                                            orderId: payload?.orderId,
                                                            paymentId: payload?.paymentId,
                                                            qrCodeId: payload?.qrCodeId,
                                                            amount: payableTotal,
                                                            currency: "INR",
                                                            status: "paid",
                                                            method: paymentMode,
                                                            machineId,
                                                            machineName,
                                                            machineLocation,
                                                        },
                                                    })
                                                );
                                            } catch {
                                            }
                                        }

                                        router.push(APP_ROUTES.FEEDBACK);

                                        // Record the sale/order and transaction
                                        void (async () => {
                                            try {
                                                const orderItems = itemsToDispense.map(item => ({
                                                    productId: item.id || "",
                                                    productName: item.name,
                                                    quantity: item.quantity || 1,
                                                    price: parsePrice(item.priceText),
                                                    slotId: item.slotId,
                                                }));

                                                const orderResponse = await fetch("/api/admin/orders", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        items: orderItems,
                                                        totalAmount: payableTotal,
                                                        paymentId: payload?.paymentId,
                                                        qrCodeId: payload?.qrCodeId,
                                                        razorpayOrderId: payload?.orderId,
                                                        paymentMode,
                                                    }),
                                                });
                                                const orderData = await orderResponse.json();
                                                console.log("[Payment] Order recorded:", orderData);

                                                // Also record transaction
                                                await fetch("/api/admin/transactions", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        transactionId: payload?.paymentId || `txn_${Date.now()}`,
                                                        amount: payableTotal,
                                                        paymentId: payload?.paymentId,
                                                        status: "completed",
                                                    }),
                                                }).catch(err => console.warn("[Payment] Failed to record transaction:", err));

                                                // Stable bill identity: always prefer paymentId (never Date.now()).
                                                const stableOrderId =
                                                    orderData?.order?.id ||
                                                    payload?.paymentId ||
                                                    payload?.orderId ||
                                                    dedupeKey;

                                                // Save POSIFLY bill data
                                                await fetch("/api/posifly/bills", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        orderId: stableOrderId,
                                                        items: orderItems,
                                                        totalAmount: payableTotal,
                                                        discountAmount: discount,
                                                        paymentId: payload?.paymentId,
                                                        razorpayOrderId: payload?.orderId,
                                                        paymentMode,
                                                    }),
                                                }).catch(err => console.warn("[Payment] Failed to save POSIFLY bill:", err));
                                            } catch (err) {
                                                console.error("[Payment] Failed to record order:", err);
                                            }
                                        })();
                                    }}
                                    onError={() => {
                                        setStep("checkout");
                                    }}
                                    label="Pay with UPI"
                                />
                                )}
                            </Box>
                        ) : step === "checkout" ? (
                            <>
                                <Box sx={{ bgcolor: "#fff", borderRadius: 2, p: 2, border: "1px solid #e5e7eb" }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 28, mb: 2 }}>
                                        Review your order
                                    </Typography>

                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                                        {items.map((it, idx) => {
                                            const lineTotal = parsePrice(it.priceText) * (it.quantity || 0);
                                            return (
                                                <Box key={`${it.id || it.name}-${idx}-checkout`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Box
                                                        sx={{
                                                            width: 80,
                                                            height: 80,
                                                            borderRadius: 1,
                                                            bgcolor: "#f3f4f6",
                                                            overflow: "hidden",
                                                            position: "relative",
                                                            flex: "0 0 auto",
                                                        }}
                                                    >
                                                        {it.imageUrl ? (
                                                            <Box
                                                                component="img"
                                                                src={it.imageUrl}
                                                                alt={it.name}
                                                                sx={{
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    objectFit: "contain",
                                                                    display: "block",
                                                                }}
                                                            />
                                                        ) : null}
                                                    </Box>

                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            sx={{
                                                                fontWeight: 500,
                                                                fontSize: 24,
                                                                lineHeight: 1.2,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {capitalizeWords(it.name)} &nbsp; x{it.quantity || 1}
                                                        </Typography>
                                                    </Box>

                                                    <ProductPrice
                                                        retailPrice={it.originalPrice}
                                                        discountValue={it.discountValue}
                                                        priceText={it.priceText || ""}
                                                        productId={it.id}
                                                        productName={it.name}
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </Box>

                                    <Divider sx={{ my: 1.5 }} />

                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: 24 }}>Total</Typography>
                                        <Typography sx={{ fontWeight: 700, fontSize: 24 }}>Rs.{Math.round(total)}/-</Typography>
                                    </Box>
                                </Box>

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
                                                        onClick={handleApplySpinCoupon}
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
                                                {isNextPurchaseOnly &&
                                                !spinReward.redeemed &&
                                                !nextPurchaseClaimed ? (
                                                    <Button
                                                        variant="contained"
                                                        disableElevation
                                                        onClick={() => setNextPurchaseClaimOpen(true)}
                                                        sx={{
                                                            textTransform: "none",
                                                            fontWeight: 600,
                                                            fontSize: 18,
                                                            borderRadius: "0 6px 6px 0",
                                                            minWidth: 120,
                                                            bgcolor: "#006c49",
                                                            "&:hover": { bgcolor: "#005236" },
                                                        }}
                                                    >
                                                        Claim
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
                                {couponApplied && discount > 0 && !isDeferredOnly && !isNextPurchaseOnly ? (
                                    <Box sx={{ mt: 1.5, display: "flex", alignItems: "flex-start", gap: 1, bgcolor: "#fdf2f8", borderRadius: 2, p: 1.5, border: "1px solid #fbcfe8" }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: 20, color: "#9E1B3D" }}>
                                                Reward applied successfully!
                                            </Typography>
                                            <Typography sx={{ fontSize: 18, color: "#7A4757", mt: 0.3 }}>
                                                {couponMessage || `You save Rs.${Math.round(discount)}/- on this order.`}
                                            </Typography>
                                        </Box>
                                        <IconButton size="small" onClick={handleRemoveSpinCoupon} sx={{ color: "#6b7280", p: 0.3 }}>
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
                                    <Box sx={{ mt: 1.5, bgcolor: "#fff7ed", borderRadius: 2, p: 1.5, border: "1px solid #fed7aa" }}>
                                        <Typography sx={{ fontSize: 18, color: "#9a3412" }}>
                                            {spinValidation.message ||
                                              (isNextPurchaseOnly
                                                ? "₹100 OFF is for your next purchase only and will not be applied to this order."
                                                : couponMessage)}
                                        </Typography>
                                    </Box>
                                ) : null}
                            </>
                        ) : items.length === 0 ? (
                            <Box sx={{ py: 2, textAlign: "center" }}>
                                <Typography sx={{ fontWeight: 700, mb: 1 }}>Your cart is empty</Typography>
                                <Typography color="text.secondary">Add products to see them here.</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {items.map((item, idx) => {
                                    const key = { id: item.id, name: item.name };
                                    return (
                                        <Box
                                            key={`${item.id || item.name}-${idx}`}
                                            sx={{
                                                bgcolor: "#fff",
                                                borderRadius: 2,
                                                display: "flex",
                                                gap: isMobile ? 1.5 : "10px",
                                                alignItems: "center",
                                                width: isMobile ? "100%" : 1080,
                                                maxWidth: "100%",
                                                minHeight: isMobile ? 0 : 220,
                                                position: "relative",
                                            }}
                                        >
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    removeItem(key);
                                                    speakMessage('removeFromCart');
                                                }}
                                                sx={{
                                                    position: "absolute",
                                                    top: 8,
                                                    right: 8,
                                                    bgcolor: "#f3f4f6",
                                                    "&:hover": { bgcolor: "#e5e7eb" },
                                                    zIndex: 1,
                                                }}
                                            >
                                                <Icon icon="mdi:close" width={20} />
                                            </IconButton>
                                            <Box
                                                sx={{
                                                    width: isMobile ? 80 : 250,
                                                    height: isMobile ? 80 : 250,
                                                    borderRadius: isMobile ? 2 : "15px",
                                                    bgcolor: "#f3f4f6",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    overflow: "hidden",
                                                    position: "relative",
                                                    flex: "0 0 auto",
                                                }}
                                            >
                                                {item.imageUrl ? (
                                                    <Box
                                                        component="img"
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        sx={{
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "contain",
                                                            display: "block",
                                                        }}
                                                    />
                                                ) : null}
                                            </Box>

                                            <Box
                                                sx={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    justifyContent: isMobile ? "flex-start" : "center",
                                                    gap: isMobile ? 0 : 1,
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: 24,
                                                        lineHeight: 1.2,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                    }}
                                                >
                                                    {capitalizeWords(item.name)}
                                                </Typography>
                                                <Box sx={{ mt: 0.5 }}>
                                                    <ProductPrice
                                                        retailPrice={item.originalPrice}
                                                        discountValue={item.discountValue}
                                                        priceText={item.priceText || ""}
                                                        productId={item.id}
                                                        productName={item.name}
                                                    />
                                                </Box>

                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
                                                    <Box
                                                        sx={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            border: "1px solid rgba(0,0,0,0.15)",
                                                            borderRadius: 1,
                                                            overflow: "hidden",
                                                            height: 30,
                                                        }}
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                applyQuantityChange(
                                                                    item,
                                                                    (item.quantity || 1) - 1
                                                                )
                                                            }
                                                            sx={{ borderRadius: 0, width: 30, height: 30 }}
                                                        >
                                                            <Icon icon="mdi:minus" />
                                                        </IconButton>
                                                        <Box
                                                            component="input"
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const next = Number(e.target.value);
                                                                if (Number.isFinite(next)) {
                                                                    applyQuantityChange(item, next);
                                                                }
                                                            }}
                                                            inputMode="numeric"
                                                            style={{
                                                                width: 40,
                                                                height: 30,
                                                                border: 0,
                                                                outline: "none",
                                                                textAlign: "center",
                                                                fontSize: 24,
                                                                fontWeight: 700,
                                                            }}
                                                        />
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                applyQuantityChange(
                                                                    item,
                                                                    (item.quantity || 1) + 1
                                                                )
                                                            }
                                                            sx={{ borderRadius: 0, width: 30, height: 30 }}
                                                        >
                                                            <Icon icon="mdi:plus" />
                                                        </IconButton>
                                                    </Box>

                                                </Box>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>

                    <Divider />
                    <Box sx={{ px: 2, py: 1.5, bgcolor: "#fff" }}>
                        <Typography sx={{ fontSize: 24, color: "text.secondary" }}>TO PAY</Typography>
                        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mt: 0.5 }}>
                            <Box>
                                <Typography sx={{
                                    mt: 2,
                                    mb: 0.75,
                                    fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                    fontWeight: 510,
                                    fontSize: "24px",
                                    lineHeight: "100%",
                                    letterSpacing: "0%",
                                }}>
                                    Your Cart total
                                </Typography>
                                <Typography
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setShowPriceDetails((v) => !v)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") setShowPriceDetails((v) => !v);
                                    }}
                                    sx={{
                                        fontSize: 24,
                                        color: "text.secondary",
                                        textDecoration: "underline",
                                        cursor: "pointer",
                                        userSelect: "none",
                                    }}
                                >
                                    Tap to view details
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                                {couponApplied && discount > 0 && !isDeferredOnly && !isNextPurchaseOnly ? (
                                    <Typography sx={{ fontSize: 12, color: "text.secondary", textDecoration: "line-through" }}>
                                        Rs.{Math.round(total)}/-
                                    </Typography>
                                ) : null}
                                <Typography sx={{ fontWeight: 900, fontSize: 24 }}>
                                    Rs.{" "}
                                    {Math.round(
                                      couponApplied && !isDeferredOnly && !isNextPurchaseOnly && discount > 0
                                        ? payableTotal
                                        : Number.isFinite(total)
                                          ? total
                                          : 0
                                    )}
                                    /-
                                </Typography>
                            </Box>
                        </Box>

                        <Collapse in={showPriceDetails} timeout="auto" unmountOnExit>
                            <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #e5e7eb" }}>
                                {items.map((it, idx) => {
                                    const lineTotal = parsePrice(it.priceText) * (it.quantity || 0);
                                    return (
                                        <Box
                                            key={`${it.id || it.name}-${idx}-line`}
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                py: 1,
                                            }}
                                        >
                                            <Box sx={{ minWidth: 0, pr: 2 }}>
                                                <Typography
                                                    sx={{
                                                        fontWeight: 700,
                                                        fontSize: 24,
                                                        lineHeight: 1.2,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                    }}
                                                >
                                                    {capitalizeWords(it.name)}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontWeight: 700, fontSize: 24, whiteSpace: "nowrap" }}>
                                                Rs. {Math.round(Number.isFinite(lineTotal) ? lineTotal : 0)}/-
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Collapse>
                    </Box>

                    {/* Bottom action buttons hidden - moved to top header */}
                </Box>

                {/* Payment webhook reporter */}
                <PaymentReporter
                    active={paymentSuccess}
                    user={webhookUser}
                    products={items.map((item) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        slotId: item.slotId,
                        retailPrice: parsePrice(item.priceText),
                        amount: parsePrice(item.priceText) * (item.quantity || 0),
                    }))}
                    transaction={paymentPayload}
                    selectedSlots={items.map((item) => item.slotId).filter((slot): slot is number => slot !== undefined).map(String)}
                    machineLocation={machineContext.machineLocation}
                    machineName={machineContext.machineName}
                    spinWheel={spinWheelWebhookData}
                />
            </Dialog>

            <SpinWheelNextPurchasePopup
              open={nextPurchaseClaimOpen}
              onClose={() => setNextPurchaseClaimOpen(false)}
              onClaimed={() => setNextPurchaseClaimed(true)}
              user={claimSessionUser}
              reward={spinReward}
            />
        </>
    );
};

export default CartProduct;
