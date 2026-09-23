"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import {
  useGetUploadImageInfoMutation,
  useLazyFetchRecommnedSkinAttributesQuery,
} from "@/redux/api/analysisApi";
import KioskFrame from "./KioskFrame";
import ReportHeader from "./ReportHeader";
import ScanConcernsSection from "./ScanConcernsSection";
import ProfessionalSummarySection from "./ProfessionalSummarySection";
import RecommendedProductsSection from "./RecommendedProductsSection";
import SkinRoutinesSection from "./SkinRoutinesSection";
import TravelKitsBanner from "./TravelKitsBanner";
import TravelKitsSection from "./TravelKitsSection";
import ScanToPaySection from "./ScanToPaySection";
import {
  buildMediapipeProfessionalSummary,
  computeOverallHealth,
  extractProfessionalSummary,
  extractSkinType,
  getReportSource,
  isTravelKitPurchaseAvailable,
  mapConcerns,
  mapMediapipeConcerns,
  kitToReportProduct,
  pickRandomMachineProducts,
  pickRecommendedProducts,
  pickSkinRoutines,
  refreshTravelKitsStaffAvailable,
} from "./utils";
import { TRAVEL_KITS } from "./constants";
import type { ReportProduct, SkinRoutine } from "./types";
import {
  loadMediapipePreview,
  loadMediapipeScanResult,
  type StoredMediapipeScan,
} from "@/lib/mediapipe-scan-session";
import { fetchCatalogProducts } from "@/lib/catalog-products";

export default function KioskReportPage() {
  const { data: session } = useSession();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedKitIds, setSelectedKitIds] = useState<string[]>([]);
  const [showTravelKits, setShowTravelKits] = useState(false);
  const [products, setProducts] = useState<ReportProduct[]>([]);
  const [routines, setRoutines] = useState<SkinRoutine[]>([]);
  const [productsReady, setProductsReady] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [mediapipeScan, setMediapipeScan] = useState<StoredMediapipeScan | null>(
    null
  );
  const [mediapipeConcerns, setMediapipeConcerns] = useState<
    ReturnType<typeof mapMediapipeConcerns>
  >([]);
  const [sessionReady, setSessionReady] = useState(false);

  const [fetchRecommnedSkinAttributes, { isLoading, data }] =
    useLazyFetchRecommnedSkinAttributesQuery();
  const [getUploadImageInfo, { data: dataImageInfo }] = useGetUploadImageInfoMutation();
  const [getAnalysedImageInfo, { data: analysedImageInfo }] = useGetUploadImageInfoMutation();

  // Read MediaPipe scan results on client mount (avoid SSR empty + stuck loader).
  useEffect(() => {
    const stored = loadMediapipeScanResult();
    setMediapipeScan(stored);
    setMediapipeConcerns(mapMediapipeConcerns(stored?.concerns));
    setLocalPreview(loadMediapipePreview());
    setSessionReady(true);
  }, []);

  // Skip fetching remote selfies when we already have this scan's preview.
  useEffect(() => {
    if (!session?.user?.id) return;
    // MediaPipe path does not need the old recommendation API — it slows the report.
    if (localPreview || mediapipeConcerns.length > 0) return;
    fetchRecommnedSkinAttributes({ userId: session.user.id as string });
    if (session.user.selfyImage) {
      getUploadImageInfo({
        userId: session.user.id as string,
        fileName: session.user.selfyImage as string,
      });
    }
  }, [
    session,
    fetchRecommnedSkinAttributes,
    getUploadImageInfo,
    localPreview,
    mediapipeConcerns.length,
  ]);

  const reportSource = useMemo(() => getReportSource(data), [data]);

  useEffect(() => {
    if (localPreview) return;
    const userId =
      reportSource?.user?._id ||
      reportSource?.userId ||
      data?.data?.user?._id ||
      data?.user?._id ||
      session?.user?.id;
    const analysedFileName =
      reportSource?.analysedImages?.[0]?.fileName ||
      data?.data?.[0]?.analysedImages?.[0]?.fileName ||
      data?.productRecommendation?.analysedImages?.[0]?.fileName;
    const capturedFileName =
      reportSource?.capturedImages?.[0]?.fileName ||
      data?.data?.[0]?.capturedImages?.[0]?.fileName ||
      session?.user?.selfyImage;

    if (userId && analysedFileName) {
      getAnalysedImageInfo({ userId, fileName: analysedFileName });
    } else if (userId && capturedFileName) {
      getUploadImageInfo({ userId, fileName: capturedFileName });
    }
  }, [reportSource, data, session, getAnalysedImageInfo, getUploadImageInfo, localPreview]);

  // Always load products once session is ready — never hang forever.
  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const useRandomMachine =
          mediapipeConcerns.length > 0 || Boolean(localPreview);

        // MediaPipe report: same catalog source as /products (images live on catalog, not slots).
        if (useRandomMachine) {
          const [slotsRes, catalog] = await Promise.all([
            fetch("/api/admin/slots", { cache: "no-store" }),
            fetchCatalogProducts(),
          ]);
          const slotsData = slotsRes.ok ? await slotsRes.json() : {};
          const seed = [
            mediapipeScan?.analyzedAt || "",
            session?.user?.id || "",
            mediapipeScan?.concerns?.map((c) => c.code).join("-") || "",
          ].join("|");
          const picked = pickRandomMachineProducts(
            catalog,
            slotsData,
            seed || String(Date.now())
          );
          const concernLabels = [
            ...(mediapipeConcerns.map((c) => c.label) || []),
            ...(mediapipeScan?.concerns?.map((c) => c.name || c.code) || []),
          ].filter(Boolean) as string[];
          const nextRoutines = pickSkinRoutines(
            catalog,
            slotsData,
            seed || String(Date.now()),
            concernLabels
          );
          if (cancelled) return;
          setProducts(picked);
          setRoutines(nextRoutines);
          setSelectedIds(picked.map((p) => p.id));
          return;
        }

        const [slotsRes, catalog] = await Promise.all([
          fetch("/api/admin/slots", { cache: "no-store" }),
          fetchCatalogProducts(),
        ]);
        const slotsData = slotsRes.ok ? await slotsRes.json() : {};
        const picked = pickRecommendedProducts(
          data ? getReportSource(data) : null,
          catalog,
          slotsData
        );
        const concernLabels = mapConcerns(reportSource || data).map((c) => c.label);
        const nextRoutines = pickSkinRoutines(
          catalog,
          slotsData,
          String(session?.user?.id || Date.now()),
          concernLabels
        );
        if (cancelled) return;
        setProducts(picked);
        setRoutines(nextRoutines);
        setSelectedIds(picked.map((p) => p.id));
      } catch (err) {
        console.warn("[KioskReport] Failed to load products:", err);
        if (!cancelled) {
          setProducts([]);
          setRoutines([]);
        }
      } finally {
        if (!cancelled) setProductsReady(true);
      }
    };

    void loadProducts();

    // Safety: never leave the spinner spinning if fetch hangs.
    const safety = window.setTimeout(() => {
      if (!cancelled) setProductsReady(true);
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [
    sessionReady,
    data,
    mediapipeConcerns.length,
    localPreview,
    mediapipeScan,
    session?.user?.id,
  ]);

  const health = useMemo(() => computeOverallHealth(reportSource), [reportSource]);
  const concerns = useMemo(() => {
    if (mediapipeConcerns.length > 0) return mediapipeConcerns;
    return mapConcerns(reportSource);
  }, [mediapipeConcerns, reportSource]);
  const skinType = useMemo(() => extractSkinType(reportSource), [reportSource]);
  const summary = useMemo(() => {
    if (mediapipeConcerns.length > 0) {
      return buildMediapipeProfessionalSummary(
        mediapipeScan?.concerns?.length
          ? mediapipeScan.concerns
          : mediapipeConcerns.map((c) => ({ name: c.label, label: c.label }))
      );
    }
    return extractProfessionalSummary(reportSource);
  }, [mediapipeConcerns, mediapipeScan, reportSource]);

  // Prefer this scan's MediaPipe frame. Old API analysed photos (green boxes) must not win.
  const userImageUrl =
    localPreview ||
    analysedImageInfo?.data?.url ||
    dataImageInfo?.data?.url ||
    "";

  const productCatalog = useMemo(() => {
    const byId = new Map<string, ReportProduct>();
    products.forEach((p) => byId.set(p.id, p));
    routines.forEach((r) => {
      r.products.forEach((p) => {
        if (!byId.has(p.id)) byId.set(p.id, p);
      });
    });
    return byId;
  }, [products, routines]);

  const selectedProducts = useMemo(
    () =>
      selectedIds
        .map((id) => productCatalog.get(id))
        .filter((p): p is ReportProduct => Boolean(p)),
    [productCatalog, selectedIds]
  );
  const selectedKits = useMemo(
    () =>
      isTravelKitPurchaseAvailable()
        ? TRAVEL_KITS.filter((kit) => selectedKitIds.includes(kit.id)).map(
            kitToReportProduct
          )
        : [],
    [selectedKitIds]
  );
  const checkoutItems = useMemo(
    () => [...selectedProducts, ...selectedKits],
    [selectedProducts, selectedKits]
  );
  const total = useMemo(
    () => checkoutItems.reduce((sum, p) => sum + (p.payablePrice || 0), 0),
    [checkoutItems]
  );

  // Drop kit selections when outside staff hours or staff toggle is off.
  useEffect(() => {
    const clearIfClosed = async () => {
      await refreshTravelKitsStaffAvailable();
      if (!isTravelKitPurchaseAvailable()) {
        setSelectedKitIds((prev) => (prev.length ? [] : prev));
      }
    };
    void clearIfClosed();
    const id = window.setInterval(() => {
      void clearIfClosed();
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddRoutine = (routine: SkinRoutine) => {
    const ids = routine.products.map((p) => p.id);
    const bothSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => {
      if (bothSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleKitToggle = (id: string) => {
    if (!isTravelKitPurchaseAvailable()) return;
    setSelectedKitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const fromMediapipe = mediapipeConcerns.length > 0 || Boolean(localPreview);
  // Never block forever on missing analysis `data` (e.g. session 500 → no userId → fetch never starts).
  const analysisPending =
    !fromMediapipe && Boolean(session?.user?.id) && isLoading && !data;
  const showLoader = !sessionReady || !productsReady || analysisPending;

  return (
    <KioskFrame>
      {showLoader ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            px: 3,
          }}
        >
          <CircularProgress sx={{ color: "#2F5D46" }} />
          <Typography sx={{ color: "#2F5D46", fontWeight: 700, fontSize: 16 }}>
            Preparing your skincare report…
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
          }}
        >
          <ReportHeader />
          <ScanConcernsSection
            imageUrl={userImageUrl}
            health={health}
            concerns={concerns}
            skinType={skinType}
          />
          <ProfessionalSummarySection summary={summary} />
          <RecommendedProductsSection
            products={products}
            selectedIds={selectedIds}
            onToggle={handleToggle}
          />
          {!showTravelKits ? (
            <SkinRoutinesSection
              routines={routines}
              selectedIds={selectedIds}
              onAddRoutine={handleAddRoutine}
              onToggleProduct={handleToggle}
            />
          ) : null}
          {showTravelKits ? (
            <TravelKitsSection
              selectedIds={selectedKitIds}
              onToggle={handleKitToggle}
              onBack={() => setShowTravelKits(false)}
            />
          ) : (
            <TravelKitsBanner onView={() => setShowTravelKits(true)} />
          )}
          <ScanToPaySection products={checkoutItems} total={total} />
        </Box>
      )}
    </KioskFrame>
  );
}
