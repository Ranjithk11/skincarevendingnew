"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import VirtualKeyboard from "@/components/ui/VirtualKeyboard";

interface CashAgentPaymentProps {
  amount: number;
  onBack: () => void;
  onConfirmed: (agentName: string) => void;
}

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

export default function CashAgentPayment({
  amount,
  onBack,
  onConfirmed,
}: CashAgentPaymentProps) {
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
        /* password inputs may reject selection on some browsers */
      }
    });
  }, []);

  // Open keyboard + focus agent name on mount (kiosk has no physical keyboard).
  useEffect(() => {
    focusField("agent");
  }, [focusField]);

  // Virtual keyboard: navigation + field switching only.
  // Character keys are applied by VirtualKeyboard.applyToActiveElement() on the
  // focused <input>, which fires onChange — same path as a native keyboard.
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
        onConfirmed(agentName.trim());
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
      transition: "border-color 0.15s ease",
    }) as const;

  return (
    <Box sx={{ width: "100%", maxWidth: 560, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <Button
          onClick={onBack}
          startIcon={<Icon icon="mdi:chevron-left" width={24} />}
          sx={{
            color: "#316D52",
            textTransform: "none",
            fontSize: 18,
            fontWeight: 600,
            minWidth: "unset",
            px: 1,
          }}
        >
          Back
        </Button>
      </Box>

      <Box
        sx={{
          bgcolor: "#fff",
          borderRadius: 3,
          border: "1px solid #e5e7eb",
          p: { xs: 3, md: 4 },
          pb: showKeyboard ? { xs: 28, md: 30 } : { xs: 3, md: 4 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "#316D52",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon icon="mdi:account-cash" width={26} color="#fff" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 32, fontWeight: 700, color: "#111827" }}>
              Cash Payment
            </Typography>
            <Typography sx={{ fontSize: 24, color: "#6b7280" }}>
              Agent authorization required
            </Typography>
          </Box>
        </Box>

        {Number.isFinite(amount) && amount > 0 && (
          <Box
            sx={{
              my: 2,
              px: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: "#f0faf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography sx={{ fontSize: 24, color: "#374151" }}>
              Amount to collect
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#316D52" }}>
              Rs. {Math.round(amount)}/-
            </Typography>
          </Box>
        )}

        {/* Agent name */}
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: 24, color: "#374151", mb: 1 }}>Agent Name</Typography>
          <Box
            sx={fieldSx(target === "agent")}
            onClick={() => focusField("agent")}
          >
            <Box
              component="input"
              ref={agentInputRef}
              type="text"
              value={agentName}
              placeholder="Tap to enter agent name"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
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

        {/* Password */}
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 24, color: "#374151", mb: 1 }}>Password</Typography>
          <Box
            sx={fieldSx(target === "password")}
            onClick={() => focusField("password")}
          >
            <Box
              component="input"
              ref={passwordInputRef}
              type="password"
              value={password}
              placeholder="Tap to enter password"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
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

        {error && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
            <Icon icon="mdi:alert-circle" width={20} color="#dc2626" />
            <Typography sx={{ fontSize: 18, color: "#dc2626", fontWeight: 600 }}>
              {error}
            </Typography>
          </Box>
        )}

        <Button
          fullWidth
          variant="contained"
          disabled={submitting}
          onClick={handleConfirm}
          sx={{
            mt: 3,
            py: 2,
            fontSize: 22,
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
      </Box>

      {showKeyboard && (
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
      )}
    </Box>
  );
}
