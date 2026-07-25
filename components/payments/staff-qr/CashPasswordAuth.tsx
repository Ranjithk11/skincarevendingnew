"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";
import type { CashAuthResult } from "@/lib/staff-qr";

type CashPasswordAuthProps = {
  amount?: number;
  onBack?: () => void;
  onConfirmed: (result: CashAuthResult) => void;
};

type Field = "agent" | "password";

const inputSx = {
  flex: 1,
  border: "none",
  outline: "none",
  bgcolor: "transparent",
  fontSize: 22,
  fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  color: "#111827",
  minWidth: 0,
  p: 0,
  "&::placeholder": { color: "#9ca3af", opacity: 1 },
} as const;

/**
 * Legacy / fallback cash auth: agent name + shared password.
 * Kept separate so QR auth can evolve without entangling this UI.
 */
export default function CashPasswordAuth({
  amount,
  onBack,
  onConfirmed,
}: CashPasswordAuthProps) {
  const agentInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [agentName, setAgentName] = useState("");
  const [password, setPassword] = useState("");
  const [target, setTarget] = useState<Field>("agent");
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const focusField = useCallback((field: Field) => {
    setTarget(field);
    setShowKeyboard(true);
    setError("");
    const el = field === "agent" ? agentInputRef.current : passwordInputRef.current;
    requestAnimationFrame(() => {
      el?.focus();
      const len = el?.value.length ?? 0;
      try {
        el?.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    focusField("agent");
  }, [focusField]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === "return") {
        if (target === "agent") {
          focusField("password");
        } else {
          setShowKeyboard(false);
          passwordInputRef.current?.blur();
        }
        return;
      }
      if (key === "arrowleft" || key === "arrowright") {
        const el = target === "agent" ? agentInputRef.current : passwordInputRef.current;
        if (!el) return;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const next =
          key === "arrowleft"
            ? Math.max(0, start - 1)
            : Math.min(el.value.length, end + 1);
        try {
          el.setSelectionRange(next, next);
        } catch {
          /* ignore */
        }
      }
    },
    [target, focusField]
  );

  const handleConfirm = async () => {
    setError("");
    if (!agentName.trim()) {
      setError("Please enter the agent name");
      focusField("agent");
      return;
    }
    if (!password) {
      setError("Please enter the password");
      focusField("password");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/agent/verify-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: agentName.trim(), password }),
      });
      const data = await res.json();
      if (data?.success) {
        setShowKeyboard(false);
        agentInputRef.current?.blur();
        passwordInputRef.current?.blur();
        onConfirmed({
          agentName: agentName.trim(),
          method: "password",
        });
      } else {
        setError(data?.message || "Invalid agent credentials");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldSx = (active: boolean) =>
    ({
      width: "100%",
      minHeight: 64,
      px: 2,
      display: "flex",
      alignItems: "center",
      gap: 1,
      borderRadius: 2,
      border: `2px solid ${active ? "#316D52" : "#e5e7eb"}`,
      bgcolor: "#fff",
      cursor: "text",
    }) as const;

  return (
    <Box sx={{ width: "100%" }}>
      {onBack ? (
        <Button
          onClick={onBack}
          startIcon={<Icon icon="mdi:qrcode-scan" width={22} />}
          sx={{
            mb: 1.5,
            color: "#316D52",
            textTransform: "none",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Back to QR scan
        </Button>
      ) : null}

      {Number.isFinite(amount) && (amount as number) > 0 ? (
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
          <Typography sx={{ fontSize: 20, color: "#374151" }}>Amount to collect</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#316D52" }}>
            Rs. {Math.round(amount as number)}/-
          </Typography>
        </Box>
      ) : null}

      <Box sx={{ mt: 1 }}>
        <Typography sx={{ fontSize: 20, color: "#374151", mb: 1 }}>Agent Name</Typography>
        <Box sx={fieldSx(target === "agent")} onClick={() => focusField("agent")}>
          <Box
            component="input"
            ref={agentInputRef}
            type="text"
            value={agentName}
            placeholder="Tap to enter agent name"
            autoComplete="off"
            onChange={(e) => setAgentName(e.target.value)}
            onFocus={() => {
              setTarget("agent");
              setShowKeyboard(true);
              setError("");
            }}
            sx={inputSx}
          />
          <Icon icon="mdi:account" width={22} color="#9ca3af" />
        </Box>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: 20, color: "#374151", mb: 1 }}>Password</Typography>
        <Box sx={fieldSx(target === "password")} onClick={() => focusField("password")}>
          <Box
            component="input"
            ref={passwordInputRef}
            type="password"
            value={password}
            placeholder="Tap to enter password"
            autoComplete="off"
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => {
              setTarget("password");
              setShowKeyboard(true);
              setError("");
            }}
            sx={inputSx}
          />
          <Icon icon="mdi:lock" width={22} color="#9ca3af" />
        </Box>
      </Box>

      {error ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
          <Icon icon="mdi:alert-circle" width={20} color="#dc2626" />
          <Typography sx={{ fontSize: 18, color: "#dc2626", fontWeight: 600 }}>
            {error}
          </Typography>
        </Box>
      ) : null}

      <Button
        fullWidth
        variant="contained"
        disabled={submitting}
        onClick={handleConfirm}
        sx={{
          mt: 3,
          py: 2,
          fontSize: 20,
          fontWeight: 700,
          textTransform: "none",
          borderRadius: 2,
          bgcolor: "#316D52",
          "&:hover": { bgcolor: "#234a31" },
        }}
      >
        {submitting ? (
          <CircularProgress size={26} sx={{ color: "#fff" }} />
        ) : (
          "Confirm & Dispense"
        )}
      </Button>

      {showKeyboard ? (
        <Box
          onClick={() => {
            setShowKeyboard(false);
            agentInputRef.current?.blur();
            passwordInputRef.current?.blur();
          }}
          sx={{ position: "fixed", inset: 0, zIndex: 1400 }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
          >
            <VirtualKeyboard onKeyPress={handleKeyPress} layout="default" visible={showKeyboard} />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
