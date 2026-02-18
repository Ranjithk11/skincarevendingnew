"use client";

import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";

interface AnalysisSummaryItem {
  heading: string;
  data: string;
}

interface ReportQRCodeProps {
  reportUrl?: string;
  title?: string;
  subtitle?: string;
  analysisSummary?: AnalysisSummaryItem[];
}

const ReportQRCode: React.FC<ReportQRCodeProps> = ({
  reportUrl,
  title = "View Your Report",
  subtitle = "Scan to view on your phone",
  analysisSummary = [],
}) => {
  // Generate the report URL - use current page URL if not provided
  const qrUrl = useMemo(() => {
    if (reportUrl) return reportUrl;
    if (typeof window !== "undefined") {
      return window.location.href;
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

  if (!qrUrl) return null;

  return (
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

          <Box
            sx={{
              bgcolor: "#ffffff",
              p: 1,
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              mb: 1.5,
            }}
          >
            <QRCodeSVG
              value={qrUrl}
              size={140}
              level="M"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#1f2937"
            />
          </Box>

          <Typography
            sx={{
              fontSize: "24px",
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            {subtitle}
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
  );
};

export default ReportQRCode;
