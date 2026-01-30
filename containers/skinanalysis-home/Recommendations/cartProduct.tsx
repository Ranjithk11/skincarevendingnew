import React, { useMemo, useState } from "react";
import {
    Box,
    Button,
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
import { useCart } from "./CartContext";
import RazorpayCheckoutButton from "@/components/payments/RazorpayCheckoutButton";

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
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { items, setQuantity } = useCart();
    const [showPriceDetails, setShowPriceDetails] = useState(false);
    const [step, setStep] = useState<"cart" | "checkout" | "payment">("cart");
    const [couponApplied, setCouponApplied] = useState(false);
    const [paymentMode, setPaymentMode] = useState<"test" | "live">("live");

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
        <Dialog
            fullScreen={isMobile}
            open={open}
            onClose={onClose}
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
                        alignItems: "center",
                        gap: 2,
                        height: "180px",
                    }}
                >
                    <IconButton
                        onClick={handleBack}
                        sx={{
                            border: "1px solid rgba(0,0,0,0.12)",
                            width: isMobile ? 64 : 72,
                            height: isMobile ? 80 : 80,
                            borderRadius: "999px",
                        }}
                    >
                        <Icon icon="mdi:arrow-left" width={isMobile ? 30 : 34} height={isMobile ? 30 : 34} />
                    </IconButton>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "flex-start",
                            minWidth: 0,
                        }}
                    >
                        <Box
                            component="img"
                            src="/wending/goldlog.svg"
                            alt="Leaf Water"
                            sx={{ height: isMobile ? 36 : 50, width: "auto", display: "block", mb: 0.25 }}
                        />
                        <Typography
                            sx={{
                                fontFamily:
                                    'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                fontWeight: 510,
                                fontSize: isMobile ? 34 : 46,
                                lineHeight: "100%",
                                letterSpacing: "0%",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {step === "cart" ? `My Cart (${items.length})` : step === "checkout" ? "Checkout" : "Payment"}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
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
                            <Box
                                sx={{
                                    bgcolor: "#316D52",
                                    borderRadius: "24px",
                                    p: 4,
                                    width: "100%",
                                    maxWidth: 450,
                                    textAlign: "center",
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: "#fff",
                                        fontWeight: 700,
                                        fontSize: 32,
                                        mb: 3,
                                        textAlign: "left",
                                    }}
                                >
                                    Payment
                                </Typography>

                                <Box
                                    sx={{
                                        bgcolor: "#fff",
                                        borderRadius: "16px",
                                        p: 4,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 2,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            color: paymentMode === "live" ? "#316D52" : "#f59e0b",
                                            fontWeight: 600,
                                            fontSize: 20,
                                        }}
                                    >
                                        <Icon
                                            icon={paymentMode === "live" ? "mdi:check-circle" : "mdi:alert-circle"}
                                            width={24}
                                        />
                                        <Typography sx={{ fontWeight: 600, fontSize: 20 }}>
                                            {paymentMode === "live" ? "LIVE MODE" : "TEST MODE"}
                                        </Typography>
                                    </Box>

                                    <Button
                                        variant="contained"
                                        onClick={() => setPaymentMode(paymentMode === "live" ? "test" : "live")}
                                        sx={{
                                            bgcolor: paymentMode === "live" ? "#f59e0b" : "#316D52",
                                            color: "#fff",
                                            fontWeight: 700,
                                            fontSize: 18,
                                            borderRadius: "8px",
                                            px: 3,
                                            py: 1,
                                            textTransform: "none",
                                            "&:hover": {
                                                bgcolor: paymentMode === "live" ? "#d97706" : "#234a31",
                                            },
                                        }}
                                    >
                                        <Icon icon="mdi:arrow-left" width={20} style={{ marginRight: 8 }} />
                                        Switch to {paymentMode === "live" ? "TEST" : "LIVE"} Mode
                                    </Button>

                                    <Typography sx={{ color: "#6b7280", fontSize: 16 }}>
                                        {paymentMode === "live"
                                            ? "Click to enable test payments"
                                            : "Click to enable live payments"}
                                    </Typography>

                                    <Divider sx={{ width: "100%", my: 2 }} />

                                    <Typography sx={{ fontSize: 20, color: "#6b7280" }}>
                                        Amount to Pay
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: 40,
                                            fontWeight: 700,
                                            color: "#316D52",
                                        }}
                                    >
                                        ₹{payableTotal.toFixed(2)}
                                    </Typography>

                                    <RazorpayCheckoutButton
                                        amountPaise={amountPaise}
                                        currency="INR"
                                        mode={paymentMode}
                                        receipt={`cart_${Date.now()}`}
                                        onVerified={() => {
                                            if (onCheckout) onCheckout();
                                            setStep("cart");
                                            onClose();
                                        }}
                                        onError={() => {
                                            // keep dialog open so user can retry
                                        }}
                                        label="Pay Now"
                                        buttonProps={{
                                            fullWidth: true,
                                            sx: {
                                                mt: 2,
                                                fontFamily:
                                                    'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                                fontWeight: 700,
                                                fontSize: "24px",
                                                py: 1.5,
                                                borderRadius: "12px",
                                                bgcolor: "#316D52",
                                                color: "white",
                                                "&:hover": { bgcolor: "#234a31" },
                                            },
                                        }}
                                    />

                                    <Typography sx={{ color: "#9ca3af", fontSize: 14, mt: 2 }}>
                                        Secure payment processed by Razorpay
                                    </Typography>
                                </Box>
                            </Box>
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

                            <Box sx={{ mt: 2, bgcolor: "#fff", borderRadius: 2, p: 2, border: "1px solid #e5e7eb" }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, fontSize: 28, pb:2 }}>Apply Coupons</Typography>
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
                            </Box>
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
                                        }}
                                    >
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
                                                        onClick={() => setQuantity(key, Math.max(1, (item.quantity || 1) - 1))}
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
                                                        onClick={() => setQuantity(key, (item.quantity || 1) + 1)}
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

                <Box sx={{ p: 2, bgcolor: "#316D52" }}>
                    {step === "cart" ? (
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={() => {
                                setStep("checkout");
                            }}
                            sx={{
                                mt: 2,
                                mb: 0.75,
                                fontFamily:
                                    'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                fontWeight: 510,
                                fontSize: "24px",
                                lineHeight: "100%",
                                letterSpacing: "0%",
                            }}
                        >
                            Review and Checkout
                        </Button>
                    ) : step === "checkout" ? (
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={() => {
                                setStep("payment");
                            }}
                            sx={{
                                mt: 2,
                                mb: 0.75,
                                fontFamily:
                                    'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                fontWeight: 510,
                                fontSize: "24px",
                                lineHeight: "100%",
                                letterSpacing: "0%",
                                bgcolor: "#2d5a3d",
                                color: "white",
                                "&:hover": { bgcolor: "#234a31" },
                            }}
                        >
                            Proceed to Pay
                        </Button>
                    ) : null}
                </Box>
            </Box>
        </Dialog>
    );
};

export default CartProduct;
