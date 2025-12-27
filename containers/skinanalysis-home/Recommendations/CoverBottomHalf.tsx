import { Box, Card, Grid, Typography } from "@mui/material";
import React from "react";
import PillToggle from "./PillToggle";

type RecTabKey = "products" | "services" | "diet";

interface CoverBottomHalfProps {
    tab: number;
    setTab: (value: number) => void;
    recTab: RecTabKey;
    setRecTab: (value: RecTabKey) => void;
    overallScore: number;
    metrics: { label: string; value: number }[];
    recTabs: { key: RecTabKey; label: string; imageSrc: string }[];
    reportSource: any;
    VendingProducts: React.ComponentType<{ data: any }>;
    VendingServices: React.ComponentType<{
        salonServices: any[];
        cosmeticServices: any[];
    }>;
    DietChart: React.ComponentType;
    SkincareRoutine: React.ComponentType;
}

const CoverBottomHalf: React.FC<CoverBottomHalfProps> = ({
    tab,
    setTab,
    recTab,
    setRecTab,
    overallScore,
    metrics,
    recTabs,
    reportSource,
    VendingProducts,
    VendingServices,
    DietChart,
    SkincareRoutine,
}) => {
    const keyConcerns = [
        {
            title: "Acne",
            imageSrc: "/wending/acne.svg",
        },
        {
            title: "Open Pores",
            imageSrc: "/wending/open.svg",
        },
        {
            title: "Uneven Skin",
            imageSrc: "/wending/uneven.svg",
        },
    ];

    return (
        <Card
            sx={{
                width: "100%",
                mx: 0,
                height: "100%",
                p: { xs: 2, sm: 3 },
                borderRadius: "24px 24px 0 0",
                boxShadow: 3,
                backgroundColor: "#fff",
                backgroundImage: "url(/wending/linesbg.png)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right top",
                backgroundSize: "contain",
                overflowY: "auto",
            }}
        >
            <PillToggle
                value={tab}
                onChange={setTab}
                options={[
                    { value: 0, label: "Skin Health" },
                    { value: 1, label: "Recommendations" },
                ]}
            />

            <Typography
                sx={{
                    mt: 5,
                    mb: 0.75,
                    fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                    fontWeight: 510,
                    fontSize: "32px",
                    lineHeight: "100%",
                    letterSpacing: "0%",
                }}
            >
                {tab === 0 ? "My Skincare Report" : "Recommendations"}
            </Typography>
            <Typography
                sx={{
                    mt: 2,
                    mb: 2.5,
                    fontSize: { xs: 14, sm: 18 },
                    color: "#000",
                    
                }}
            >
                {tab === 0
                    ? "UNDERSTAND YOUR SKIN AT A GLANCE"
                    : "WHAT WE RECOMMEND"}
            </Typography>

            {tab === 1 && (
                <>
                    <Box
                        sx={{
                            display: "flex",
                            gap: { xs: 1.5, md: 2 },
                            overflowX: { xs: "auto", md: "hidden" },
                            pb: 1,
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
                                            fontSize: { xs: 16, md: 16 },
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
                                            height: { xs: 100, md: 110 },
                                            objectFit: "contain",
                                            borderRadius: 1,
                                        }}
                                    />
                                </Box>
                            );
                        })}
                    </Box>

                    <Box sx={{ mt: 2,mb:8 }}>
                        {recTab === "products" && <VendingProducts data={reportSource} />}
                        {recTab === "services" && (
                            <VendingServices
                                salonServices={reportSource?.recommendedSalonServices || []}
                                cosmeticServices={reportSource?.recommendedCosmeticServices || []}
                            />
                        )}
                        {recTab === "diet" && <DietChart />}
                    </Box>
                </>
            )}

            {tab === 0 && (
                <>

                    <Box
                        sx={{
                            width: "100%",
                            height: { xs: "auto", md: "100%" },
                            borderRadius: { xs: 4, md: 6 },
                            bgcolor: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: { xs: 2.5, md: "78px" },
                            px: { xs: 2, md: 4 },
                            py: { xs: 2.5, md: 0 },
                        }}
                    >
                        <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
                            <Box
                                sx={{
                                    width: { xs: "100%", sm: 260 },
                                    height: { xs: 80, md: 86 },
                                    borderRadius: 2.5,
                                    border: "2px solid #e6c978",
                                    bgcolor: "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                                    fontWeight: 510,
                                    fontSize: { xs: 24, md: 28 },
                                    color: "#111827",
                                }}
                            >
                                Good Enough
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                width: 0.001,
                                alignSelf: "stretch",
                                bgcolor: "#d1d5db",
                                opacity: 1,
                            }}
                        />

                        <Box sx={{ flex: 1, textAlign: "left" }}>
                            <Typography
                                sx={{
                                    fontSize: { xs: 24, md: 32 },
                                    fontWeight: 700,
                                }}
                            >
                                <Box component="span" sx={{ color: "#78f7a4ff" }}>
                                    {overallScore}
                                </Box>{" "}
                                <Box component="span" sx={{ color: "#000", fontWeight: 500 }}>
                                    out of 100
                                </Box>
                            </Typography>

                            <Typography sx={{ fontSize: { xs: 20, md: 28 }, color: "#000" }}>
                                Overall skincare health score
                            </Typography>
                        </Box>
                    </Box>


                    <Box
                        sx={{
                            mt: 2.5,
                            border: "1px solid #f1f1f0ff",
                            borderRadius: 2,
                            p: 2,
                            display: "flex",
                            gap: 2,
                            bgcolor: "#fff",
                        }}
                    >
                        {metrics.map((item) => (
                            <Box
                                key={item.label}
                                sx={{
                                    flex: 1,
                                    border: "1px solid #f0d89a",
                                    borderRadius: 2,
                                    p: 4,
                                    textAlign: "center",
                                    bgcolor: "#ffffff",
                                }}
                            >
                                <Typography sx={{ fontSize: { xs: 20, sm: 28 }, fontWeight: 300 }}>
                                    {item.label}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: { xs: 24, sm: 28 },
                                        fontWeight: 700,
                                        mt: 2,
                                    }}
                                >
                                    {item.value}%
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ mt: 3 }}>
                        <Typography sx={{
                            mt: 2.5,
                            mb: 0.75,
                            fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
                            fontWeight: 510,
                            fontSize: "40px",
                            lineHeight: "100%",
                            letterSpacing: "0%",
                        }}>
                            Key Concerns
                        </Typography>
                        <Typography sx={{
                            mt: 2,
                            mb: 2.5,
                            fontSize: { xs: 18, sm: 24 },
                            color: "#6b7280",
                            letterSpacing: 1.2,
                        }}>
                            Defects picked up by the scan
                        </Typography>

                        <Grid container spacing={{ xs: 2, md: 3 }}>
                            {keyConcerns.map((c) => (
                                <Grid item xs={4} key={c.title}>
                                    <Box
                                        sx={{
                                            width: 250,
                                            height: 250,
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            boxShadow: 1,
                                            bgcolor: "#ffffff",
                                            display: "flex",
                                            flexDirection: "column",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                flex: 1,
                                                width: "85%",
                                                height: "100%",
                                                borderRadius: 2,
                                                bgcolor: "#e5e7eb",
                                                backgroundImage: `url(${c.imageSrc})`,
                                                backgroundRepeat: "no-repeat",
                                                backgroundPosition: "center",
                                                backgroundSize: "cover",
                                                gap: 2,
                                            }}
                                        />
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    <Box sx={{ mt: 3 }}>
                        <SkincareRoutine />
                    </Box>
                </>
            )
            }
        </Card >
    );
};

export default CoverBottomHalf;
