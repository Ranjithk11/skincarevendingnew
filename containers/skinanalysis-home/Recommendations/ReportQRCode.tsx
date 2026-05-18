"use client";

import React, { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import BlurredQROverlay from "@/components/BlurredQROverlay";
import MobileOtpDialog from "@/components/MobileOtpDialog";

interface AnalysisSummaryItem {
  heading: string;
  data: string;
}

interface ReportQRCodeProps {
  reportUrl?: string;
  title?: string;
  subtitle?: string;
  analysisSummary?: AnalysisSummaryItem[];
  userId?: string;
}

// Production base URL for QR codes - should be set in environment
const PRODUCTION_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skincarevendingnew.vercel.app";

const ReportQRCode: React.FC<ReportQRCodeProps> = ({
  reportUrl,
  title = "View Your Report",
  subtitle = "Scan to view on your phone",
  analysisSummary = [],
  userId,
}) => {
  const [qrRevealed, setQrRevealed] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  // Generate the report URL - prefer passed reportUrl, fallback to production URL with current path
  const qrUrl = useMemo(() => {
    // If a specific report URL is provided, use it directly
    if (reportUrl) return reportUrl;
    
    // Fallback: construct URL using production base + current path
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      return `${PRODUCTION_BASE_URL}${currentPath}`;
    }
    return "";
  }, [reportUrl]);

  // Extract specific sections
  const skinOverview = analysisSummary.find(
    (item) => item.heading.toUpperCase() === "SKIN OVERVIEW"
  );
  const professionalSummary = analysisSummary.find(
    (item) => item.heading.toUpperCase() === "PROFESSIONAL SUMMARY"
  );

  const handleTapToView = () => {
    setOtpDialogOpen(true);
  };

  const handleOtpVerified = (_phoneNumber: string) => {
    setOtpDialogOpen(false);
    setQrRevealed(true);
  };

  if (!qrUrl) return null;

  return (
    <>
      <MobileOtpDialog
        open={otpDialogOpen}
        onClose={() => setOtpDialogOpen(false)}
        onVerified={handleOtpVerified}
        userId={userId}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          width: "100%",
          border: "2px solid #f0d89a",
          borderRadius: "22px",
          p: 3,
          bgcolor: "#fffbf0",
        }}
      >
        {/* Top Row: QR Code (Left) + Skin Overview (Right) */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 1,
            width: "100%",
          }}
        >
          {/* QR Code Card - Left */}
          <Box
            sx={{
              bgcolor: "#f0fdf4",
              borderRadius: "18px",
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #bbf7d0",
              minWidth: 220,
              maxWidth: 220,
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: "28px",
                fontWeight: 600,
                color: "#166534",
                mb: 1.5,
                textAlign: "center",
              }}
            >
              {title}
            </Typography>

            <BlurredQROverlay
              qrUrl={qrUrl}
              isRevealed={qrRevealed}
              onTapToView={handleTapToView}
              size={140}
            />

            <Typography
              sx={{
                fontSize: "24px",
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              {qrRevealed ? subtitle : "Verify mobile to view"}
            </Typography>
          </Box>

        {/* Skin Overview Card - Right */}
        {skinOverview && (
          <Box
            sx={{
              flex: 1,
              bgcolor: "#ffffff",
              borderRadius: "18px",
              p: 3,
              border: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              sx={{
                fontSize: "28px",
                fontWeight: 600,
                color: "#2d5a3d",
                mb: 1.5,
                textTransform: "capitalize",
              }}
            >
              {skinOverview.heading.toLowerCase().replace(/_/g, " ")}
            </Typography>
            <Typography
              sx={{
                fontSize: "24px",
                color: "#4b5563",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {skinOverview.data.replace(/^- /gm, "• ")}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bottom Row: Professional Summary - Full Width */}
      {professionalSummary && (
        <Box
          sx={{
            width: "100%",
            bgcolor: "#ffffff",
            borderRadius: "18px",
            p: 3,
            border: "1px solid #e5e7eb",
          }}
        >
          <Typography
            sx={{
              fontSize: "28px",
              fontWeight: 600,
              color: "#2d5a3d",
              mb: 1.5,
              textTransform: "capitalize",
            }}
          >
            {professionalSummary.heading.toLowerCase().replace(/_/g, " ")}
          </Typography>
          <Typography
            sx={{
              fontSize: "24px",
              color: "#4b5563",
              lineHeight: 1.6,
              whiteSpace: "pre-line",
            }}
          >
            {professionalSummary.data.replace(/^- /gm, "• ")}
          </Typography>
        </Box>
      )}
    </Box>
    </>
  );
};

export default ReportQRCode;
