"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import Image from "next/image";

interface TaxInvoiceProps {
  invoiceData: any;
  invoiceExpanded: boolean;
  onToggleExpanded: () => void;
}

export default function TaxInvoice({ invoiceData, invoiceExpanded, onToggleExpanded }: TaxInvoiceProps) {
  return (
    <Box sx={{ width: "min(860px, 100%)", mt: 2 }}>
      <Box sx={{ bgcolor: "#fff", borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {/* Invoice Header — clickable to toggle */}
        <Box
          onClick={onToggleExpanded}
          sx={{ textAlign: "center", py: 1.5, borderBottom: invoiceExpanded ? "1px solid #e5e7eb" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 1, userSelect: "none" }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 24, color: "#9ca3af", letterSpacing: 2 }}>✦ ✦ ✦</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#1a3c34" }}>Tax Invoice</Typography>
            <Typography sx={{ fontSize: 24, color: "#6b7280" }}>LeafWater Invoice</Typography>
          </Box>
          <Icon icon={invoiceExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} width={28} color="#6b7280" style={{ marginRight: 12 }} />
        </Box>

        {/* Collapsible content */}
        {invoiceExpanded && (
          <>
            {/* Invoice Details - 3 columns */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
              {[
                { icon: "/NewFeedback/invoice_document.svg", label: "Invoice No.", value: invoiceData.invoiceNo },
                { icon: "/NewFeedback/calendar.svg", label: "Invoice Date", value: invoiceData.invoiceDate },
                { icon: "/NewFeedback/reference_document.svg", label: "Order Reference", value: invoiceData.orderReference },
              ].map((item, idx) => (
                <Box key={idx} sx={{ p: 2, borderRight: idx < 2 ? "1px solid #e5e7eb" : "none", display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Image src={item.icon} alt="" width={20} height={20} style={{ marginTop: 2, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontSize: 24, color: "#9ca3af" }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#111827", wordBreak: "break-word" }}>{item.value}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* GSTIN / State / Place of Supply - 3 columns */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
              {[
                { icon: "/NewFeedback/gst_document.svg", label: "GSTIN / UIN", value: invoiceData.gstin },
                { icon: "/NewFeedback/government_building.svg", label: "State", value: invoiceData.state },
                { icon: "/NewFeedback/location_pin.svg", label: "Place of Supply", value: invoiceData.placeOfSupply },
              ].map((item, idx) => (
                <Box key={idx} sx={{ p: 2, borderRight: idx < 2 ? "1px solid #e5e7eb" : "none", display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Image src={item.icon} alt="" width={20} height={20} style={{ marginTop: 2, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontSize: 24, color: "#9ca3af" }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#111827" }}>{item.value}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Items Table */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  "& th": { fontSize: 24, fontWeight: 600, color: "#6b7280", textAlign: "left", py: 1, px: 1.5, borderBottom: "2px solid #e5e7eb", bgcolor: "#f9fafb" },
                  "& td": { fontSize: 24, color: "#111827", py: 1, px: 1.5, borderBottom: "1px solid #f3f4f6" },
                }}
              >
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>#</th>
                    <th style={{ width: "35%" }}>Description of Goods</th>
                    <th style={{ width: "15%", textAlign: "center" }}>HSN/SAC</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Qty</th>
                    <th style={{ width: "17%", textAlign: "right" }}>Rate (Incl. of Tax)</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ textAlign: "center" }}>3304</td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>{Number(item.price).toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>

            {/* Subtotals */}
            <Box sx={{ px: 3, pb: 1.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                {[
                  { label: "Subtotal", value: invoiceData.subtotal },
                  { label: "CGST @ 18.00%", value: invoiceData.cgst },
                  { label: "SGST @ 18.00%", value: invoiceData.sgst },
                  { label: "Round Off", value: invoiceData.roundOff },
                ].map((row, idx) => (
                  <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
                    <Typography sx={{ fontSize: 24, color: idx === 0 ? "#111827" : "#6b7280" }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: 24, color: idx === 0 ? "#111827" : "#6b7280" }}>{Number(row.value).toFixed(2)}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Grand Total Box */}
              <Box sx={{ bgcolor: "#1a3c34", borderRadius: 2, px: 3, py: 1.5, textAlign: "center", minWidth: 160 }}>
                <Typography sx={{ fontSize: 24, color: "#a7f3d0" }}>Grand Total</Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#fff", mt: 0.25 }}>
                  ₹{Number(invoiceData.grandTotal).toFixed(2)}
                </Typography>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, bgcolor: "#16a34a", borderRadius: "20px", px: 1.5, py: 0.25, mt: 0.5 }}>
                  <Image src="/NewFeedback/paid_badge.svg" alt="" width={14} height={14} />
                  <Typography sx={{ fontSize: 24, color: "#fff", fontWeight: 600 }}>Paid</Typography>
                </Box>
              </Box>
            </Box>

            {/* Amount in Words + Payment Status */}
            <Box sx={{ px: 3, py: 1.5, borderTop: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Image src="/NewFeedback/lock_icon.svg" alt="" width={16} height={16} style={{ marginTop: 2 }} />
                <Box>
                  <Typography sx={{ fontSize: 24, color: "#9ca3af" }}>Amount in words</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#111827" }}>{invoiceData.amountInWords}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Typography sx={{ fontSize: 24, color: "#9ca3af" }}>Payment Status</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#111827" }}>Paid</Typography>
                  <Image src="/NewFeedback/shield_security.svg" alt="" width={16} height={16} />
                </Box>
              </Box>
            </Box>

            {/* Thank You */}
            <Box sx={{ px: 3, py: 1.5, borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 2 }}>
              <Image src="/NewFeedback/heart_badge.svg" alt="" width={28} height={28} />
              <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#1a3c34" }}>Thank you for choosing LeafWater!</Typography>
                <Typography sx={{ fontSize: 24, color: "#6b7280" }}>Your skincare journey matters to us.</Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
