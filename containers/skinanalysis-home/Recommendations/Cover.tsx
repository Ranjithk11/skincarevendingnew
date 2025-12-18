import {
  Dialog,
  useMediaQuery,
} from "@mui/material";
import Box from "@mui/material/Box";
import { styled, useTheme } from "@mui/material/styles";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/routes";
import Image from "next/image";
import VendingProducts from "./vendingproducts";
import VendingServices from "./vendingServices";
import DietChart from "./DietChart";
import SkincareRoutine from "./skincareRoutine";
import CoverBottomHalf from "./CoverBottomHalf";
import TopLogo from "./TopLogo";

const StyledCoverWrapper = styled(Box)(({ theme }) => ({
  width: "100%",
  height: "100dvh",
  backgroundColor: "#f8f6f0",
  position: "relative",
  overflow: "hidden",
  "& .user-popup-image": {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    backgroundPosition: "top",
  },
  "& .dialog-info": {
    width: 450,
    padding: 20,
  },
}));

const StyledTopHeader = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 16,
  left: 16,
  right: 16,
  zIndex: 3,
  backgroundColor: theme.palette.common.white,
  borderRadius: 16,
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
}));

const StyledHeroImage = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
  backgroundPosition: "center",
}));

const StyledBottomSheet = styled(Box)(({ theme }) => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  backgroundColor: theme.palette.common.white,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 14,
  boxShadow: "0 -10px 24px rgba(0,0,0,0.10)",
  maxHeight: "62dvh",
  overflowY: "auto",
}));

const StyledPillButton = styled(Box)(({ theme }) => ({
  borderRadius: 999,
  padding: "8px 14px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid #e5e7eb",
  color: "#111827",
  backgroundColor: theme.palette.common.white,
  userSelect: "none",
}));

const StyledTabPill = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  userSelect: "none",
  border: "1px solid #e5e7eb",
}));

const StyledMetricCard = styled(Box)(({ theme }) => ({
  border: "1px solid #f0d89a",
  borderRadius: 12,
  padding: 12,
  backgroundColor: theme.palette.common.white,
  textAlign: "center",
  minHeight: 72,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
}));

interface CoverPageProps {
  useData: any;
  dataFUQR: any;
  publicUserProfile?: any;
  analysisData?: any;
}

const DPI = 96;
const mmToPx = (mm: number) => Math.round((mm * DPI) / 25.4);

const VENDING_DISPLAY_MM = { width: 404, height: 711 };
const VENDING_OUTER_BODY_MM = { width: 461, height: 767 };

const VENDING_DISPLAY_PX = {
  width: mmToPx(VENDING_DISPLAY_MM.width),
  height: mmToPx(VENDING_DISPLAY_MM.height),
};

const VENDING_OUTER_BODY_PX = {
  width: mmToPx(VENDING_OUTER_BODY_MM.width),
  height: mmToPx(VENDING_OUTER_BODY_MM.height),
};

const CoverPage: React.FC<CoverPageProps> = ({
  useData,
  dataFUQR,
  publicUserProfile,
  analysisData,
}) => {
  const { data: session } = useSession();
  const theme = useTheme();
  const [showUserInfo, setShowUserInfo] = useState<boolean>(false);
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isKiosk = useMediaQuery(theme.breakpoints.up("md"));
  const [tab, setTab] = useState(0);
  const [recTab, setRecTab] = useState<"products" | "services" | "diet">(
    "products"
  );

  const reportSource =
    analysisData?.data?.[0] ||
    analysisData?.data ||
    analysisData?.productRecommendation ||
    analysisData ||
    null;

  const getIn = (obj: any, path: string) => {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((acc: any, key: string) => {
      if (acc == null) return undefined;
      return acc[key];
    }, obj);
  };

  const asNumber = (v: any, fallback: number) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const cleaned = v.trim().replace(/[^0-9.+-]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  const pickNumber = (paths: string[], fallback: number) => {
    for (const p of paths) {
      const raw = getIn(reportSource, p);
      const parsed = asNumber(raw, NaN as any);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };

  const overallScore = pickNumber(
    [
      "skinHealthScore",
      "overallScore",
      "score",
      "skincareHealthScore",
      "skinHealth.score",
      "skinHealth.overallScore",
      "skinSummary.score",
      "skinSummary.overallScore",
      "analysis.overallScore",
      "analysis.score",
    ],
    85
  );

  const metrics = [
    {
      label: "Moisture",
      value: pickNumber(
        [
          "moisture",
          "moistureScore",
          "skinHealth.moisture",
          "skinHealth.moistureScore",
          "skinSummary.moisture",
          "skinSummary.moistureScore",
        ],
        63
      ),
    },
    {
      label: "Wrinkles",
      value: pickNumber(
        [
          "wrinkles",
          "wrinklesScore",
          "skinHealth.wrinkles",
          "skinHealth.wrinklesScore",
          "skinSummary.wrinkles",
          "skinSummary.wrinklesScore",
        ],
        25
      ),
    },
    {
      label: "Dark Spots",
      value: pickNumber(
        [
          "darkSpots",
          "darkSpotsScore",
          "skinHealth.darkSpots",
          "skinHealth.darkSpotsScore",
          "skinSummary.darkSpots",
          "skinSummary.darkSpotsScore",
        ],
        46
      ),
    },
  ];

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
    {
      title: "Acne",
      // dotColor: "#ef4444",
      imageSrc: "/wending/acne.svg",
    },
    {
      title: "Open Pores",
      // dotColor: "#a855f7",
      imageSrc: "/wending/open.svg",
    },
    {
      title: "Uneven Skin",
      //dotColor: "#f97316",
      imageSrc: "/wending/uneven.svg",
    },
  ];

  return (
    <>
      <Box
        sx={{
          width: "100%",
          minHeight: "100vh",
          bgcolor: "#f8f6f0",
          ...(isKiosk
            ? {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }
            : null),
        }}
      >
        <Box
          sx={
            isKiosk
              ? {
                width: `min(${VENDING_DISPLAY_PX.width}px, 100vw)`,
                height: `min(${VENDING_DISPLAY_PX.height}px, 100vh)`,
                maxWidth: "100vw",
                maxHeight: "100vh",
                position: "relative",
                overflowX: "hidden",
                overflowY: "auto",
                backgroundColor: "#f8f6f0",
                boxShadow: 3,
              }
              : {
                width: "100%",
                minHeight: "100vh",
                position: "relative",
              }
          }
        >
          <TopLogo
            isKiosk={isKiosk}
            onCartClick={() => setShowUserInfo(true)}
            onScanAgainClick={() => router.push(APP_ROUTES.SELFIE)}
          />

          <Box
            sx={{
              pt: isKiosk ? 8 : 0,
              height: "100dvh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                position: "relative",
                flex: "0 0 50%",
                minHeight: "50dvh",
                width: "100%",
                overflow: "hidden",
                bgcolor: "#111827",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  zIndex: 2,
                  width: 140,
                  height: 36,
                }}
              >
                <Image
                  src="/images/leafwater_logo.png"
                  alt="Leaf Water"
                  fill
                  sizes="140px"
                  style={{ objectFit: "contain" }}
                />
              </Box>

              {useData?.data?.url && (
                <Image
                  src={useData?.data?.url}
                  alt="User Image"
                  fill
                  sizes="100vw"
                  style={{ objectFit: "cover" }}
                />
              )}
            </Box>

            <Box sx={{ flex: "0 0 50%", minHeight: "50dvh" }}>
              <CoverBottomHalf
                tab={tab}
                setTab={setTab}
                recTab={recTab}
                setRecTab={setRecTab}
                overallScore={overallScore}
                metrics={metrics}
                recTabs={recTabs}
                reportSource={reportSource}
                VendingProducts={VendingProducts}
                VendingServices={VendingServices}
                DietChart={DietChart}
                SkincareRoutine={SkincareRoutine}
              />
            </Box>
          </Box>

        </Box>


      </Box>
    </>
  );
};

export default CoverPage;
