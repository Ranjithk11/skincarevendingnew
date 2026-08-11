"use client";

import { useCallback, useRef, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import {
  verifyStaffQr,
  type CashAuthResult,
  type StaffQrVerifyFailure,
  type VerifiedStaff,
} from "@/lib/staff-qr";
import StaffQrScanner from "./StaffQrScanner";
import StaffProfileCard from "./StaffProfileCard";
import CashPasswordAuth from "./CashPasswordAuth";

type Step = "scan" | "verifying" | "invalid" | "profile" | "password";

type CashStaffAuthFlowProps = {
  amount: number;
  onBack: () => void;
  onConfirmed: (result: CashAuthResult) => void;
  preferQr?: boolean;
};

function invalidCopy(code: StaffQrVerifyFailure["code"]): {
  title: string;
  detail: string;
} {
  switch (code) {
    case "inactive":
      return {
        title: "Staff QR is inactive",
        detail: "This staff code has been disabled. Contact admin or try another QR.",
      };
    case "misconfigured":
      return {
        title: "Verification unavailable",
        detail:
          "Staff QR service is not configured yet. Use password login, or try again later.",
      };
    case "network":
      return {
        title: "Connection problem",
        detail: "Could not reach verification service. Check network and try again.",
      };
    case "invalid_hash":
    case "not_found":
    default:
      return {
        title: "Invalid QR code",
        detail: "This QR is not a valid staff code. Please scan again.",
      };
  }
}

/**
 * Cash staff authorization orchestrator.
 * Steps: scan QR → verifying (loader) → profile | invalid (try again)
 * Password login remains an explicit fallback.
 */
export default function CashStaffAuthFlow({
  amount,
  onBack,
  onConfirmed,
  preferQr = true,
}: CashStaffAuthFlowProps) {
  const [step, setStep] = useState<Step>(preferQr ? "scan" : "password");
  const [staff, setStaff] = useState<VerifiedStaff | null>(null);
  const [errorCode, setErrorCode] =
    useState<StaffQrVerifyFailure["code"]>("not_found");
  const [errorMessage, setErrorMessage] = useState("");
  const [scanKey, setScanKey] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const verifyingRef = useRef(false);

  const goScan = useCallback(() => {
    verifyingRef.current = false;
    setStaff(null);
    setErrorMessage("");
    setCameraEnabled(true);
    setStep("scan");
    setScanKey((k) => k + 1);
  }, []);

  /** Stop camera tracks before leaving so Chrome drops "Camera in use". */
  const handleBackToPayments = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setCameraEnabled(false);
    // Allow StaffQrScanner cleanup / track.stop() to finish
    window.setTimeout(() => {
      onBack();
    }, 250);
  }, [leaving, onBack]);

  const handleScan = useCallback(async (rawText: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setErrorMessage("");
    setStep("verifying");

    // Keep loader visible briefly so kiosk users always see feedback.
    const started = Date.now();
    const result = await verifyStaffQr(rawText);
    const elapsed = Date.now() - started;
    if (elapsed < 600) {
      await new Promise((r) => setTimeout(r, 600 - elapsed));
    }

    if (!result.ok) {
      setErrorCode(result.code);
      setErrorMessage(result.message);
      setStep("invalid");
      verifyingRef.current = false;
      return;
    }

    setStaff(result.staff);
    setStep("profile");
    verifyingRef.current = false;
  }, []);

  const handleConfirmQr = useCallback(() => {
    if (!staff) return;
    setConfirming(true);
    onConfirmed({
      agentName: staff.name,
      method: "qr",
      staff,
    });
  }, [onConfirmed, staff]);

  const copy = invalidCopy(errorCode);

  return (
    <Box sx={{ width: "100%", maxWidth: 560, mx: "auto" }}>
      <Box
        sx={{
          bgcolor: "#fff",
          borderRadius: 3,
          border: "1px solid #e5e7eb",
          p: { xs: 3, md: 4 },
          pb: step === "password" ? { xs: 28, md: 30 } : { xs: 3, md: 4 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "#316D52",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              icon={
                step === "password"
                  ? "mdi:account-cash"
                  : step === "invalid"
                    ? "mdi:qrcode-remove"
                    : "mdi:qrcode-scan"
              }
              width={28}
              color="#fff"
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>
              Cash Payment
            </Typography>
            <Typography sx={{ fontSize: 18, color: "#6b7280" }}>
              {step === "password"
                ? "Agent password authorization"
                : step === "verifying"
                  ? "Validating staff QR…"
                  : step === "invalid"
                    ? "QR could not be verified"
                    : "Scan staff QR to authorize"}
            </Typography>
          </Box>
        </Box>

        {/* Always visible — returns to Cash / UPI chooser */}
        <Button
          fullWidth
          onClick={handleBackToPayments}
          disabled={leaving}
          startIcon={<Icon icon="mdi:arrow-left" width={22} />}
          sx={{
            mb: 2,
            textTransform: "none",
            fontSize: 17,
            fontWeight: 700,
            color: "#316D52",
            border: "2px solid #316D52",
            borderRadius: 2,
            py: 1.1,
            bgcolor: "#f0faf5",
            "&:hover": { bgcolor: "#dcfce7", borderColor: "#234a31" },
          }}
        >
          {leaving ? "Releasing camera…" : "Go back to payment options"}
        </Button>

        {step === "scan" ? (
          <>
            {Number.isFinite(amount) && amount > 0 ? (
              <Box
                sx={{
                  mb: 2,
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: "#f0faf5",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Typography sx={{ fontSize: 20, color: "#374151" }}>
                  Amount to collect
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#316D52" }}>
                  Rs. {Math.round(amount)}/-
                </Typography>
              </Box>
            ) : null}

            {cameraEnabled ? (
              <StaffQrScanner
                onScan={handleScan}
                scanKey={scanKey}
                disabled={!cameraEnabled}
              />
            ) : (
              <Box
                sx={{
                  minHeight: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 3,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e5e7eb",
                }}
              >
                <Typography sx={{ color: "#6b7280", fontSize: 17 }}>
                  Turning camera off…
                </Typography>
              </Box>
            )}
          </>
        ) : null}

        {step === "verifying" ? (
          <Box
            sx={{
              py: 8,
              px: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              borderRadius: 3,
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <CircularProgress size={56} thickness={4} sx={{ color: "#316D52" }} />
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              Validating QR…
            </Typography>
            <Typography sx={{ fontSize: 17, color: "#6b7280", textAlign: "center" }}>
              Please wait while we verify the staff code
            </Typography>
          </Box>
        ) : null}

        {step === "invalid" ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: "#fef2f2",
              border: "2px solid #fecaca",
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 1.5,
              }}
            >
              <Icon icon="mdi:close-circle" width={40} color="#dc2626" />
            </Box>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#991b1b" }}>
              {copy.title}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 17, color: "#b91c1c", lineHeight: 1.4 }}>
              {errorMessage || copy.detail}
            </Typography>

            {/* <Button
              fullWidth
              variant="contained"
              onClick={goScan}
              startIcon={<Icon icon="mdi:qrcode-scan" width={22} />}
              sx={{
                mt: 3,
                py: 1.75,
                fontSize: 20,
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2,
                bgcolor: "#316D52",
                "&:hover": { bgcolor: "#234a31" },
              }}
            >
              Try again
            </Button> */}

            {/* <Button
              fullWidth
              onClick={() => setStep("password")}
              sx={{
                mt: 1.25,
                textTransform: "none",
                fontSize: 16,
                fontWeight: 600,
                color: "#6b7280",
              }}
            >
              Use password instead
            </Button> */}
          </Box>
        ) : null}

        {step === "profile" && staff ? (
          <StaffProfileCard
            staff={staff}
            amount={amount}
            confirming={confirming}
            onConfirm={handleConfirmQr}
            onRescan={goScan}
          />
        ) : null}

        {step === "password" ? (
          <CashPasswordAuth
            amount={amount}
            onBack={goScan}
            onConfirmed={onConfirmed}
          />
        ) : null}
      </Box>
    </Box>
  );
}
