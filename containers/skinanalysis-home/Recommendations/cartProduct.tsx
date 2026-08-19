import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
    Box,
    Button,
    CircularProgress,
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
import { APP_ROUTES } from "@/utils/routes";
import { useVoiceMessages } from "@/contexts/VoiceContext";
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
import { parsePrice } from "./cart/parsePrice";
import ThubCouponSection from "./cart/ThubCouponSection";
import SpinWheelRewardSection from "./cart/SpinWheelRewardSection";
import CheckoutOrderReview from "./cart/CheckoutOrderReview";
import CartToPayFooter from "./cart/CartToPayFooter";

type CartProductProps = {
    open: boolean;
    onClose: () => void;
    onCheckout?: () => void;
};

const CartProduct: React.FC<CartProductProps> = ({ open, onClose, onCheckout }) => {
    const theme = useTheme();
    const router = useRouter();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { items, setQuantity, removeItem, clear } = useCart();
    const { speakMessage } = useVoiceMessages();
    const [showPriceDetails, setShowPriceDetails] = useState(false);
    const [step, setStep] = useState<"cart" | "checkout" | "payment">("cart");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponMessage, setCouponMessage] = useState("");
    /** T Hub Exclusive Extra 5% — independent of spin-wheel rewards. */
    const [thubCouponApplied, setThubCouponApplied] = useState(false);
    const { reward: spinReward, validateForCart, markRewardRedeemed } = useSpinWheel();
    const [paymentMode, setPaymentMode] = useState<"test" | "live">("live");
    const [isDispensing, setIsDispensing] = useState(false);
    const [machineLocation, setMachineLocation] = useState<string>("LeafWater Vending Machine");
    const [machineName, setMachineName] = useState<string>("Vending Machine");
    const [machineId, setMachineId] = useState<string>("");
    const [stockByProduct, setStockByProduct] = useState<Record<string, number>>({});
    const [limitNotice, setLimitNotice] = useState({ open: false, message: "" });
    const paymentRecordedRef = useRef<string | null>(null);

    const cartItemKey = (item: CartItem) => item.id || item.name;

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
        if (!open) {
            setThubCouponApplied(false);
            return;
        }
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

    const spinDiscount = useMemo(() => {
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

    // T-Hub default 5% — no minimum order value (MOV applies to spin-wheel only).
    const thubDiscount = useMemo(() => {
      if (!thubCouponApplied) return 0;
      if (!Number.isFinite(total) || total <= 0) return 0;
      return Math.round(total * 0.05);
    }, [thubCouponApplied, total]);

    /**
     * Checkout offer: EITHER T-Hub 5% OR a spin-wheel cart offer — never both.
     * Neither is applied until the user clicks Apply.
     */
    const discount = useMemo(() => {
      if (spinDiscount > 0) return Math.min(Math.max(0, total), spinDiscount);
      if (thubDiscount > 0) return Math.min(Math.max(0, total), thubDiscount);
      return 0;
    }, [total, spinDiscount, thubDiscount]);

    // Keep spin validation message in sync; never auto-apply spin or T-Hub (user must click Apply).
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
        }
    }, [open, step, spinReward, total, validateForCart]);

    // If user applies a spin cart discount, clear T-Hub (mutual exclusivity).
    useEffect(() => {
        if (spinDiscount > 0 && thubCouponApplied) {
            setThubCouponApplied(false);
        }
    }, [spinDiscount, thubCouponApplied]);

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
            return;
        }

        const validation = validateForCart(total);
        setCouponMessage(validation.message);

        if (!validation.canApply) {
            toast.info(validation.message);
            setCouponApplied(false);
            return;
        }

        // Mutual exclusivity: spin-wheel offer replaces T-Hub 5%.
        setThubCouponApplied(false);
        setCouponApplied(true);
        toast.success(
          `${validation.message} T Hub 5% was removed — only one offer can be used.`
        );
    }, [spinReward, total, validateForCart]);

    const handleRemoveSpinCoupon = useCallback(() => {
        setCouponApplied(false);
        setCouponMessage("");
    }, []);

    const handleApplyThubCoupon = useCallback(() => {
        // Mutual exclusivity: T-Hub 5% replaces any applied spin-wheel cart discount.
        setCouponApplied(false);
        setThubCouponApplied(true);
        toast.success("T Hub Extra 5% discount applied. Spin-wheel offer was removed.");
    }, []);

    const handleRemoveThubCoupon = useCallback(() => {
        setThubCouponApplied(false);
    }, []);

    const handleToggleThubCoupon = useCallback(() => {
        if (thubCouponApplied) {
            setThubCouponApplied(false);
            return;
        }
        handleApplyThubCoupon();
    }, [thubCouponApplied, handleApplyThubCoupon]);

    const payableTotal = useMemo(() => {
        const next = total - discount;
        return Number.isFinite(next) ? Math.max(0, next) : 0;
    }, [total, discount]);

    const amountPaise = useMemo(() => {
        const amount = discount > 0 ? payableTotal : total;
        return Math.max(0, Math.round(amount * 100));
    }, [payableTotal, total, discount]);

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
        async (auth: { agentName: string; method?: "qr" | "password"; staff?: { hash?: string; role?: string; branch?: string; phone?: string } } | string) => {
            const agentName = typeof auth === "string" ? auth : auth.agentName;
            const staffAuthMethod = typeof auth === "string" ? "password" : auth.method;
            const staff = typeof auth === "string" ? undefined : auth.staff;

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
                staffAuthMethod,
                staffHash: staff?.hash,
                staffRole: staff?.role,
                staffBranch: staff?.branch,
                staffPhone: staff?.phone,
                machineId,
                machineName,
                machineLocation,
            };

            if (spinDiscount > 0 && spinReward && !spinReward.redeemed) {
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
        [items, payableTotal, total, discount, spinDiscount, machineId, machineName, machineLocation, router, spinReward, markRewardRedeemed]
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
                                        amount={discount > 0 ? payableTotal : total}
                                        onSelect={(m) => {
                                            setPaymentMethod(m);
                                            speakMessage("payment");
                                        }}
                                    />
                                ) : paymentMethod === "cash" ? (
                                    <CashAgentPayment
                                        amount={discount > 0 ? payableTotal : total}
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

                                        if (spinDiscount > 0 && spinReward && !spinReward.redeemed) {
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
                                <CheckoutOrderReview items={items} total={total} />
{/* 
                                <ThubCouponSection
                                  applied={thubCouponApplied}
                                  discountAmount={thubDiscount}
                                  disabled={spinDiscount > 0}
                                  onToggle={handleToggleThubCoupon}
                                  onRemove={handleRemoveThubCoupon}
                                /> */}

                                <SpinWheelRewardSection
                                  spinReward={spinReward}
                                  spinValidation={spinValidation}
                                  couponApplied={couponApplied}
                                  couponMessage={couponMessage}
                                  spinDiscount={spinDiscount}
                                  isNextPurchaseOnly={isNextPurchaseOnly}
                                  isDeferredOnly={isDeferredOnly}
                                  onApply={handleApplySpinCoupon}
                                  onRemove={handleRemoveSpinCoupon}
                                />
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
                    <CartToPayFooter
                      items={items}
                      total={total}
                      payableTotal={payableTotal}
                      discount={discount}
                      showPriceDetails={showPriceDetails}
                      onToggleDetails={() => setShowPriceDetails((v) => !v)}
                    />

                    {/* Bottom action buttons hidden - moved to top header */}
                </Box>
            </Dialog>
        </>
    );
};

export default CartProduct;
