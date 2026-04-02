    import React, { useMemo, useState, useCallback, useEffect } from "react";
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
    import { toast } from "react-toastify";
    import { useRouter } from "next/navigation";
    import { APP_ROUTES } from "@/utils/routes";
    import { useVoiceMessages } from "@/contexts/VoiceContext";

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
        const [showPriceDetails, setShowPriceDetails] = useState(false);
        const [step, setStep] = useState<"cart" | "checkout" | "payment">("cart");
        const [couponApplied, setCouponApplied] = useState(false);
        const [paymentMode, setPaymentMode] = useState<"test" | "live">("live");
        const [isDispensing, setIsDispensing] = useState(false);

        useEffect(() => {
            router.prefetch(APP_ROUTES.FEEDBACK);
        }, [router]);

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

        const discount = useMemo(() => {
            if (!couponApplied) return 0;
            if (!Number.isFinite(total) || total <= 0) return 0;
            return Math.min(120, Math.round(total));
        }, [couponApplied, total]);

        const payableTotal = useMemo(() => {
            const next = total - discount;
            return Number.isFinite(next) ? Math.max(0, next) : 0;
        }, [total, discount]);

        const amountPaise = useMemo(() => {
            const amount = step === "checkout" ? payableTotal : total;
            return Math.max(0, Math.round(amount * 100));
        }, [payableTotal, step, total]);

        const handleBack = () => {
            if (step === "payment") {
                setStep("checkout");
                return;
            }
            if (step === "checkout") {
                setStep("cart");
                return;
            }
            onClose();
        };

        return (
            <>
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
                                            width:60,
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
                                            console.log("[Payment] onVerified called, items:", items, "payload:", payload);
                                            const itemsToDispense = [...items];

                                            if (typeof window !== "undefined") {
                                                try {
                                                    window.sessionStorage.setItem(
                                                        "kiosk_checkout_summary",
                                                        JSON.stringify({
                                                            items: itemsToDispense,
                                                            total,
                                                            discount,
                                                            payableTotal,
                                                            createdAt: Date.now(),
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

                                                    // Save POSIFLY bill data
                                                    await fetch("/api/posifly/bills", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            orderId: orderData?.order?.id || `order_${Date.now()}`,
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

                                                        <Typography sx={{ fontWeight: 700, fontSize: 24, whiteSpace: "nowrap" }}>
                                                            Rs.{Math.round(Number.isFinite(lineTotal) ? lineTotal : 0)}/-
                                                        </Typography>
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

                                    {/* <Box sx={{ mt: 2, bgcolor: "#fff", borderRadius: 2, p: 2, border: "1px solid #e5e7eb" }}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Box>
                                                <Typography sx={{ fontWeight: 700, fontSize: 28, pb: 2 }}>Apply Coupons</Typography>
                                                <Typography sx={{ fontSize: 24, color: "text.secondary", mt: 0.5 }}>
                                                    Get Rs.{couponApplied ? discount : 120} off on this order with "SAVE120"
                                                </Typography>
                                            </Box>

                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => setCouponApplied((v) => !v)}
                                                sx={{
                                                    textTransform: "uppercase",
                                                    fontWeight: 800,
                                                    fontSize: 24,
                                                    borderRadius: 1,
                                                    minWidth: 0,
                                                    width: "fit-content",
                                                    height: 40,
                                                    px: 4,
                                                    py: 1,
                                                    borderColor: couponApplied ? "#316D52" : "#d1d5db",
                                                    color: couponApplied ? "#316D52" : "#111827",
                                                }}
                                            >
                                                {couponApplied ? "APPLIED" : "APPLY"}
                                            </Button>
                                        </Box>
                                    </Box> */}
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
                                                    <Typography sx={{ mt: 0.5, fontWeight: 800, fontSize: 24, color: "#b91c1c" }}>
                                                        {item.priceText || ""}
                                                    </Typography>

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
                                                                onClick={() => {
                                                                    const newQty = (item.quantity || 1) - 1;
                                                                    if (newQty <= 0) {
                                                                        removeItem(key);
                                                                        speakMessage('removeFromCart');
                                                                    } else {
                                                                        setQuantity(key, newQty);
                                                                    }
                                                                }}
                                                                sx={{ borderRadius: 0, width: 30, height: 30 }}
                                                            >
                                                                <Icon icon="mdi:minus" />
                                                            </IconButton>
                                                            <Box
                                                                component="input"
                                                                value={item.quantity}
                                                                onChange={(e) => {
                                                                    const next = Number(e.target.value);
                                                                    if (Number.isFinite(next)) setQuantity(key, next);
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
                                                                onClick={() => {
                                                                    setQuantity(key, (item.quantity || 1) + 1);
                                                                    speakMessage('addToCart');
                                                                }}
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
                                    {step === "checkout" && couponApplied && discount > 0 ? (
                                        <Typography sx={{ fontSize: 12, color: "text.secondary", textDecoration: "line-through" }}>
                                            Rs.{Math.round(total)}/-
                                        </Typography>
                                    ) : null}
                                    <Typography sx={{ fontWeight: 900, fontSize: 24 }}>
                                        Rs. {Math.round(step === "checkout" ? payableTotal : (Number.isFinite(total) ? total : 0))}/-
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
                </Dialog>
            </>
        );
    };

    export default CartProduct;
