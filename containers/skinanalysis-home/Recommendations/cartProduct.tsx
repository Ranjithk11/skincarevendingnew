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
import Image from "next/image";
import { Icon } from "@iconify/react";
import { capitalizeWords } from "@/utils/func";
import { useCart } from "./CartContext";

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
    const [step, setStep] = useState<"cart" | "checkout">("cart");
    const [couponApplied, setCouponApplied] = useState(false);

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

    const handleBack = () => {
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
            PaperProps={{
                sx: {
                    width: "100%",
                    maxWidth: "100%",
                    height: "100%",
                    borderRadius: isMobile ? 0 : 3,
                    overflow: "hidden",
                    bgcolor: "#f8f6f0",
                },
            }}
        >
            <Box sx={{ display: "flex", flexDirection: "column", height: "150%" }}>
                <Box
                    sx={{
                        px: 2,
                        py: 1.5,
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        height: "80px",
                    }}
                >
                    <IconButton onClick={handleBack} size="small" sx={{ border: "1px solid rgba(0,0,0,0.12)" }}>
                        <Icon icon="mdi:arrow-left" />
                    </IconButton>
                    <Typography sx={{
                        mt: 2,
                        mb: 0.75,
                        fontFamily: '"SF Pro Display", "SF Pro", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
                        fontWeight: 510,
                        fontSize: "40px",
                        lineHeight: "100%",
                        letterSpacing: "0%",
                    }}>
                        {step === "cart" ? `My Cart (${items.length})` : "Checkout"}
                    </Typography>
                </Box>

                <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
                    {step === "checkout" ? (
                        <>
                            <Box sx={{ bgcolor: "#fff", borderRadius: 2, p: 2, border: "1px solid #e5e7eb" }}>
                                <Typography sx={{ fontWeight: 700, fontSize: 24, mb: 2 }}>
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
                                                        <Image
                                                            src={it.imageUrl}
                                                            alt={it.name}
                                                            fill
                                                            sizes="50px"
                                                            style={{ objectFit: "contain" }}
                                                        />
                                                    ) : null}
                                                </Box>

                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 500,
                                                            fontSize: 16,
                                                            lineHeight: 1.2,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {capitalizeWords(it.name)} &nbsp; x{it.quantity || 1}
                                                    </Typography>
                                                </Box>

                                                <Typography sx={{ fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                                                    Rs.{Math.round(Number.isFinite(lineTotal) ? lineTotal : 0)}/-
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>

                                <Divider sx={{ my: 1.5 }} />

                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 12 }}>Total</Typography>
                                    <Typography sx={{ fontWeight: 700, fontSize: 12 }}>Rs.{Math.round(total)}/-</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 2, bgcolor: "#fff", borderRadius: 2, p: 2, border: "1px solid #e5e7eb" }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Apply Coupons</Typography>
                                        <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
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
                                            fontSize: 14,
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
                                            minHeight: isMobile ? 0 : 350,
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
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    fill
                                                    sizes="92px"
                                                    style={{ objectFit: "contain" }}
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
                                                    fontSize: isMobile ? 12 : 16,
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
                                            <Typography sx={{ mt: 0.5, fontWeight: 800, fontSize: 16, color: "#b91c1c" }}>
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
                                                            fontSize: 12,
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
                                fontFamily: '"SF Pro Display", "SF Pro", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
                                fontWeight: 510,
                                fontSize: "24px",
                                lineHeight: "100%",
                            }}>Your Cart total</Typography>
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
                                                    fontSize: 14,
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
                                        <Typography sx={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
                                            Rs. {Math.round(Number.isFinite(lineTotal) ? lineTotal : 0)}/-
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Collapse>
                </Box>

                <Box sx={{ p: 2, bgcolor: "#316D52" }}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => {
                            if (step === "cart") {
                                setStep("checkout");
                                return;
                            }
                            if (onCheckout) {
                                onCheckout();
                                return;
                            }
                            onClose();
                        }}
                        sx={{
                            mt: 2,
                            mb: 0.75,
                            fontFamily: '"SF Pro Display", "SF Pro", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
                            fontWeight: 510,
                            fontSize: "24px",
                            lineHeight: "100%",
                            letterSpacing: "0%",
                        }}
                    >
                        {step === "cart" ? "Review and Checkout" : "Proceed to Pay"}
                    </Button>
                </Box>
            </Box>
        </Dialog>
    );
};

export default CartProduct;
