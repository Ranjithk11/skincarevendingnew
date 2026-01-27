
"use client";

import { Box, Grid, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useGetUploadImageInfoMutation } from "@/redux/api/analysisApi";
import { APP_ROUTES } from "@/utils/routes";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import CartProduct from "./cartProduct";
import { CartProvider, useCart } from "./CartContext";
import TopLogo from "./TopLogo";
import VendingProducts from "./vendingproducts";
import VendingServices from "./vendingServices";
import DietChart from "./DietChart";
import SkincareRoutine from "./skincareRoutine";

type RecTabKey = "products" | "services" | "diet";

interface NewUiProps {
    useData: any;
    dataFUQR: any;
    publicUserProfile?: any;
    analysisData?: any;
}

const NewUiPage: React.FC<NewUiProps> = ({
    useData,
    dataFUQR,
    publicUserProfile,
    analysisData,
}) => {
    return (
        <CartProvider>
            <NewUiInner
                useData={useData}
                dataFUQR={dataFUQR}
                publicUserProfile={publicUserProfile}
                analysisData={analysisData}
            />
        </CartProvider>
    );
};

const NewUiInner: React.FC<NewUiProps> = ({ analysisData }) => {
    const theme = useTheme();
    const router = useRouter();
    const isKiosk = useMediaQuery(theme.breakpoints.up("md"));
    const isWide = useMediaQuery(theme.breakpoints.up("sm"));
    const { count: cartCount } = useCart();
    const [openCart, setOpenCart] = useState(false);
    const [postConcernTab, setPostConcernTab] = useState<"routine" | "recommendations">(
        "routine"
    );
    const [recTab, setRecTab] = useState<RecTabKey>("products");

    const [
        getUploadImageInfo,
        { data: dataImageInfo },
    ] = useGetUploadImageInfoMutation();

    useEffect(() => {
        const userId =
            analysisData?.data?.[0]?.userId ||
            analysisData?.data?.userId ||
            analysisData?.productRecommendation?.userId;

        const fileName =
            analysisData?.data?.[0]?.analysedImages?.[0]?.fileName ||
            analysisData?.data?.analysedImages?.[0]?.fileName ||
            analysisData?.productRecommendation?.analysedImages?.[0]?.fileName;

        if (!userId || !fileName) return;

        getUploadImageInfo({
            userId,
            fileName,
        });
    }, [analysisData, getUploadImageInfo]);

    const userImageUrl = dataImageInfo?.data?.url;

    const reportSource =
        analysisData?.data?.[0] ||
        analysisData?.data ||
        analysisData?.productRecommendation ||
        analysisData ||
        null;

    const overallSkinHealthScore = reportSource?.skinHealthScore?.overall;
    const overallSkinHealthRating = reportSource?.skinHealthScore?.rating;

    const skinMetrics = reportSource?.skinMetrics;
    const skinMetricCards = [
        { label: "Moisture", key: "moisture" as const },
        { label: "Wrinkles", key: "wrinkles" as const },
        { label: "Dark Spots", key: "darkSpots" as const },
    ].map((m) => {
        const score = skinMetrics?.[m.key]?.score;
        return {
            label: m.label,
            value: typeof score === "number" ? `${score}%` : "--",
        };
    });

    const recTabs = [
        {
            key: "products" as const,
            label: "Products",
            imageSrc: "/products/product.svg",
        },
        {
            key: "services" as const,
            label: "Services",
            imageSrc: "/products/service.svg",
        },
        {
            key: "diet" as const,
            label: "Diet",
            imageSrc: "/products/diet.svg",
        },
    ];

    const keyConcerns = [
        { title: "Acne", imageSrc: "/wending/acne.svg" },
        { title: "Open Pores", imageSrc: "/wending/open.svg" },
        { title: "Uneven Skin", imageSrc: "/wending/uneven.svg" },
    ];

    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100vh",
                bgcolor: "#F9F9F9",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <TopLogo
                isKiosk={isKiosk}
                cartCount={cartCount}
                onCartClick={() => setOpenCart(true)}
                onScanAgainClick={() => router.push(APP_ROUTES.SELFIE)}
            />

            <CartProduct open={openCart} onClose={() => setOpenCart(false)} />

            <Box
                sx={{
                    pt: isKiosk ? 20 : 16,
                    px: isKiosk ? 4 : 2,
                    pb: 4,
                    minHeight: "100vh",
                    bgcolor: "#F9F9F9",
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    position: "relative",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 160,
                        height: 520,
                        backgroundImage: "url(/wending/linesbg.png)",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: "1200px auto",
                        pointerEvents: "none",
                        zIndex: 0,
                    }}
                />

                <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Typography
                        sx={{
                            mt: 3,
                            fontFamily:
                                'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                            fontWeight: 510,
                            fontSize: { xs: "28px", md: "32px" },
                            lineHeight: "100%",
                            color: "#111827",
                        }}
                    >
                        My Skincare Report
                    </Typography>

                    <Typography
                        sx={{
                            mt: 2,

                            fontSize: { xs: "24px", md: "24px" },
                            color: "#9A9A9A",
                            fontWeight: 400,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                        }}
                    >
                        Understand your skin at a glance
                    </Typography>

                    <Box
                        sx={{
                            width: "100%",
                            display: "flex",
                            flexDirection: isWide ? "row" : "column",
                            alignItems: isWide ? "flex-start" : "stretch",
                            justifyContent: isWide ? "space-between" : "flex-start",
                            gap: isWide ? 2 : 2,
                            pt: 5
                        }}
                    >
                        <Box
                            sx={{
                                width: isWide ? "20%" : "100%",
                                minWidth: isWide ? 200 : undefined,
                                maxWidth: isWide ? 200 : undefined,
                                height: 280,
                                borderRadius: "26px",
                                overflow: "hidden",
                                bgcolor: "#e5e7eb",
                                flexShrink: 0,
                            }}
                        >
                            {userImageUrl ? (
                                <Box
                                    component="img"
                                    src={userImageUrl}
                                    alt="User"
                                    sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: "block",
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        width: "100%",
                                        height: "100%",
                                    }}
                                />
                            )}
                        </Box>

                        <Box
                            sx={{
                                width: isWide ? "80%" : "100%",
                                minWidth: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: isWide ? "flex-start" : "stretch",
                            }}
                        >
                            <Box
                                sx={{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: { xs: 2, md: "31px" },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 180,
                                        height: 86,
                                        borderRadius: "999px",
                                        border: "2px solid #e6c978",
                                        bgcolor: "#ffffff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontFamily:
                                            'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                        fontWeight: 510,
                                        fontSize: "24px",
                                        color: "#111827",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    {overallSkinHealthRating || "--"}
                                </Box>

                                <Box sx={{ flex: 1, textAlign: "left" }}>
                                    <Typography sx={{ fontSize: "24px", fontWeight: 700 }}>
                                        <Box component="span" sx={{ color: "#2ac78fff" }}>
                                            {typeof overallSkinHealthScore === "number"
                                                ? overallSkinHealthScore
                                                : "--"}
                                        </Box>{" "}
                                        <Box component="span" sx={{ color: "#000", fontWeight: 500 }}>
                                            out of 100
                                        </Box>
                                    </Typography>
                                    <Typography sx={{ fontSize: "24px", color: "#000", fontWeight: 300 }}>
                                        Overall skincare health score
                                    </Typography>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    mt: 3,
                                    width: "100%",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "18px",
                                    p: 2,
                                    display: "flex",
                                    flexDirection: { xs: "column", sm: "row" },
                                    gap: 2,
                                    bgcolor: "#ffffff",
                                    boxSizing: "border-box",
                                }}
                            >
                                {skinMetricCards.map((m) => (
                                    <Box
                                        key={m.label}
                                        sx={{
                                            flex: 1,
                                            border: "2px solid #f0d89a",
                                            borderRadius: "12px",
                                            p: 3,
                                            textAlign: "center",
                                            bgcolor: "#ffffff",
                                            minHeight: { xs: 90, sm: 110 },
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography sx={{ fontSize: "24px", fontWeight: 300 }}>
                                            {m.label}
                                        </Typography>
                                        <Typography sx={{ fontSize: "24px", fontWeight: 700, mt: 2 }}>
                                            {m.value}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ mt: 5 }}>
                        <Typography
                            sx={{
                                mt: 2.5,
                                mb: 0.75,
                                fontFamily:
                                    'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                fontWeight: 510,
                                fontSize: { xs: "32px", md: "40px" },
                                lineHeight: "100%",
                                letterSpacing: "0%",
                                color: "#111827",
                            }}
                        >
                            Key Concerns
                        </Typography>
                        <Typography
                            sx={{
                                mt: 2,
                                mb: 3,
                                fontSize:"24px",
                                color: "#6b7280",
                                letterSpacing: 1,
                            }}
                        >
                            Defects picked up by the scan
                        </Typography>

                        <Grid container spacing={{ xs: 2, md: 3 }}>
                            {keyConcerns.map((c) => (
                                <Grid item xs={12} sm={4} key={c.title}>
                                    <Box
                                        sx={{
                                            width: "100%",
                                            height: 250,
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            boxShadow: 1,
                                            bgcolor: "#ffffff",
                                            display: "flex",
                                            flexDirection: "column",
                                            position: "relative",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                inset: 0,
                                                backgroundImage: `url(${c.imageSrc})`,
                                                backgroundRepeat: "no-repeat",
                                                backgroundPosition: "center",
                                                backgroundSize: "cover",
                                            }}
                                        />
                                        {/* <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      p: 2,
                      bgcolor: "rgba(0,0,0,0.55)",
                    }}
                  >
                    <Typography sx={{ fontSize: "24px", color: "#fff", fontWeight: 500 }}>
                      {c.title}
                    </Typography>
                  </Box> */}
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>

                        <Box
                            sx={{
                                mt: 6,
                                display: "flex",
                                justifyContent: "left",
                                gap: 2,
                            }}
                        >
                            <Box
                                onClick={() => setPostConcernTab("routine")}
                                sx={{
                                    width: 200,
                                    height: 60,
                                    borderRadius: "999px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    userSelect: "none",
                                    fontFamily:
                                        'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                    fontWeight: 600,
                                    fontSize: "24px",
                                    color:
                                        postConcernTab === "routine" ? "#ffffff" : "#111827",
                                    background:
                                        postConcernTab === "routine"
                                            ? "linear-gradient(90deg, #1DC9A0 0%, #316D52 100%)"
                                            : "#ffffff",
                                    border:
                                        postConcernTab === "routine"
                                            ? "1px solid transparent"
                                            : "1px solid #d1d5db",
                                    boxShadow:
                                        postConcernTab === "routine"
                                            ? "0 10px 22px rgba(0,0,0,0.12)"
                                            : "none",
                                }}
                            >
                                Routine
                            </Box>

                            <Box
                                onClick={() => setPostConcernTab("recommendations")}
                                sx={{
                                    width: 240,
                                    height: 60,
                                    borderRadius: "999px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    userSelect: "none",
                                    fontFamily:
                                        'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                    fontWeight: 500,
                                    fontSize: "24px",
                                    color:
                                        postConcernTab === "recommendations"
                                            ? "#ffffff"
                                            : "#111827",
                                    background:
                                        postConcernTab === "recommendations"
                                            ? "linear-gradient(90deg, #1DC9A0 0%, #316D52 100%)"
                                            : "#ffffff",
                                    border:
                                        postConcernTab === "recommendations"
                                            ? "1px solid transparent"
                                            : "1px solid #d1d5db",
                                    boxShadow:
                                        postConcernTab === "recommendations"
                                            ? "0 10px 22px rgba(0,0,0,0.12)"
                                            : "none",
                                }}
                            >
                                Recommendations
                            </Box>
                        </Box>

                        {postConcernTab === "routine" && (
                            <Box sx={{ mt: 5 }}>
                                <SkincareRoutine />
                            </Box>
                        )}

                        {postConcernTab === "recommendations" && (
                            <Box sx={{ mt: 5 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: { xs: 1.5, md: 2 },
                                        overflowX: { xs: "auto", md: "hidden" },
                                        pb: 2,
                                        width: { md: "100%" },
                                    }}
                                >
                                    {recTabs.map((t) => {
                                        const active = recTab === t.key;
                                        return (
                                            <Box
                                                key={t.key}
                                                onClick={() => setRecTab(t.key)}
                                                sx={{
                                                    flex: "0 0 auto",
                                                    width: { xs: 210, md: 292 },
                                                    height: { xs: 96, md: 130 },
                                                    borderRadius: "13px",
                                                    px: { xs: 2, md: 2 },
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    cursor: "pointer",
                                                    bgcolor: active ? "#2d5a3d" : "#2f5f52",
                                                    border: active
                                                        ? "5px solid #DDC379"
                                                        : "5px solid transparent",
                                                    boxSizing: "border-box",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontSize: "24px",
                                                        fontWeight: 600,
                                                        color: "white",
                                                    }}
                                                >
                                                    {t.label}
                                                </Typography>
                                                <Box
                                                    component="img"
                                                    src={t.imageSrc}
                                                    alt={t.label}
                                                    sx={{
                                                        width: { xs: 100, md: 110 },
                                                        height: { xs: 100, md: 100 },
                                                        objectFit: "contain",
                                                        borderRadius: 1,
                                                    }}
                                                />
                                            </Box>
                                        );
                                    })}
                                </Box>

                                <Box sx={{ mt: 2, mb: 8 }}>
                                    {recTab === "products" && (
                                        <VendingProducts data={reportSource} />
                                    )}
                                    {recTab === "services" && (
                                        <VendingServices
                                            salonServices={reportSource?.recommendedSalonServices}
                                            cosmeticServices={reportSource?.recommendedCosmeticServices}
                                        />
                                    )}
                                    {recTab === "diet" && (
                                        <DietChart dietPlan={reportSource?.dietPlan} />
                                    )}
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default NewUiPage;
