"use client";

import React, { RefObject } from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import Image from "next/image";

interface SendInvoiceEmailProps {
  userEmail: string;
  isEditingEmail: boolean;
  isSendingEmail: boolean;
  emailSent: boolean;
  emailError: string;
  emailFieldRef: RefObject<HTMLDivElement>;
  onEditStart: () => void;
  onEditConfirm: () => void;
  onSendEmail: () => void;
}

export default function SendInvoiceEmail({
  userEmail,
  isEditingEmail,
  isSendingEmail,
  emailSent,
  emailError,
  emailFieldRef,
  onEditStart,
  onEditConfirm,
  onSendEmail,
}: SendInvoiceEmailProps) {
  return (
    <Box sx={{ width: "min(860px, 100%)", mt: 2 }}>
      <Box
        sx={{
          bgcolor: "#fff",
          borderRadius: 3,
          px: 3,
          py: 2.5,
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ position: "relative" }}>
            <Image src="/NewFeedback/sparkle_gold.svg" alt="" width={16} height={16} style={{ position: "absolute", top: -4, left: -4 }} />
            <Image src="/NewFeedback/email_outline.svg" alt="Email" width={40} height={40} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>Send invoice to your email</Typography>
            <Typography sx={{ fontSize: 24, color: "#6b7280" }}>We&apos;ll email your invoice instantly.</Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }} ref={emailFieldRef}>
          {isEditingEmail ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ bgcolor: "#fff", border: "2px solid #1a3c34", borderRadius: "8px", px: 1.5, py: 0.75, minWidth: 220 }}>
                <Typography sx={{ fontSize: 24, color: "#111827", minHeight: 24 }}>
                  {userEmail || " "}
                  <Box component="span" sx={{ borderRight: "2px solid #1a3c34", animation: "blink 1s infinite", ml: 0.25 }}>&nbsp;</Box>
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                onClick={onEditConfirm}
                sx={{ bgcolor: "#1a3c34", color: "#fff", textTransform: "none", fontSize: 24, borderRadius: "8px", "&:hover": { bgcolor: "#16362c" } }}
              >
                Done
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", px: 1.5, py: 0.75 }}>
              <Typography sx={{ fontSize: 24, color: "#374151" }}>{userEmail || "Enter email"}</Typography>
              <IconButton size="small" onClick={onEditStart}>
                <Icon icon="mdi:pencil-outline" width={18} color="#6b7280" />
              </IconButton>
            </Box>
          )}
          <Button
            variant="contained"
            onClick={onSendEmail}
            disabled={isSendingEmail || emailSent || !userEmail.includes("@")}
            startIcon={<Image src="/NewFeedback/send_email_icon.svg" alt="" width={18} height={18} />}
            sx={{
              bgcolor: emailSent ? "#16a34a" : "#1a3c34",
              color: "#fff",
              borderRadius: "10px",
              textTransform: "none",
              fontSize: 24,
              fontWeight: 600,
              px: 2.5,
              py: 1,
              "&:hover": { bgcolor: emailSent ? "#16a34a" : "#16362c" },
              "&:disabled": { bgcolor: emailSent ? "#16a34a" : "#d1d5db", color: "#fff" },
            }}
          >
            {isSendingEmail ? "Sending..." : emailSent ? "Sent!" : "Send to Email"}
          </Button>
        </Box>
      </Box>
      {emailError && (
        <Typography sx={{ fontSize: 24, color: "#dc2626", mt: 0.5, px: 1 }}>{emailError}</Typography>
      )}
    </Box>
  );
}
