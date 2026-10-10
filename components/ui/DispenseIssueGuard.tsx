"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Box, Button, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { Icon } from "@iconify/react";
import { pauseKioskIdle, resumeKioskIdle } from "@/utils/kioskIdleGate";
import { useVoiceMessages } from "@/contexts/VoiceContext";

const WEBSITE_URL = "https://leafwater.in";
const POLL_MS = 15_000;
const FOREST = "#2F5D46";
const GOLD = "#C4A35A";

const fadeUp = keyframes`
  from { transform: translateY(18px) scale(0.98); }
  to { transform: translateY(0) scale(1); }
`;

const goldSheen = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`;

type DispenseIssueContextValue = {
  issueEnabled: boolean;
  /** Returns false if buying is blocked (and opens the notice). */
  guardBuy: () => boolean;
};

const DispenseIssueContext = createContext<DispenseIssueContextValue>({
  issueEnabled: false,
  guardBuy: () => true,
});

export function useDispenseIssue(): DispenseIssueContextValue {
  return useContext(DispenseIssueContext);
}

export default function DispenseIssueGuard({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [issueEnabled, setIssueEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const { speakMessage } = useVoiceMessages();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dispense-issue", { cache: "no-store" });
      const json = await res.json();
      setIssueEnabled(Boolean(json?.issueEnabled));
    } catch {
      // Keep last known state.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const guardBuy = useCallback(() => {
    if (!issueEnabled) return true;
    setOpen(true);
    return false;
  }, [issueEnabled]);

  useEffect(() => {
    if (!issueEnabled) setOpen(false);
  }, [issueEnabled]);

  useEffect(() => {
    if (!open) return;
    pauseKioskIdle();
    speakMessage("dispenseIssue");
    return () => resumeKioskIdle();
  }, [open, speakMessage]);

  const value = useMemo(
    () => ({ issueEnabled, guardBuy }),
    [issueEnabled, guardBuy]
  );

  const notice =
    open && typeof document !== "undefined"
      ? createPortal(
          <Box
            onClick={() => setOpen(false)}
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 2,
              backgroundColor: "rgba(16, 24, 20, 0.86)",
            }}
          >
            <Box
              onClick={(event) => event.stopPropagation()}
              sx={{
                width: "min(560px, 92vw)",
                maxHeight: "88vh",
                overflow: "hidden",
                borderRadius: "28px",
                backgroundColor: "#FFFFFF",
                backgroundImage: "none",
                opacity: 1,
                border: `1.5px solid ${GOLD}`,
                boxShadow: "0 28px 64px rgba(20, 32, 26, 0.45)",
                animation: `${fadeUp} 0.4s ease-out`,
                textAlign: "center",
              }}
            >
        <Box
          sx={{
            height: 5,
            background:
              "linear-gradient(90deg, #8B6914, #E8D5A3, #C4A35A, #E8D5A3, #8B6914)",
            backgroundSize: "200% 100%",
            animation: `${goldSheen} 4s linear infinite`,
          }}
        />

        <Box sx={{ px: 3.25, pt: 2.75, pb: 2.75, bgcolor: "#FFFFFF" }}>
          <Box
            component="img"
            src="/wending/goldlog.svg"
            alt="Leaf Water"
            sx={{
              height: 52,
              width: "auto",
              maxWidth: 240,
              objectFit: "contain",
              mx: "auto",
              display: "block",
              mb: 1,
            }}
          />

          <Box
            sx={{
              width: 72,
              height: 2,
              mx: "auto",
              mb: 2.25,
              borderRadius: 2,
              background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            }}
          />

          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: GOLD,
              mb: 1,
            }}
          >
            Temporarily unavailable
          </Typography>

          <Typography
            sx={{
              fontSize: 26,
              fontWeight: 800,
              color: FOREST,
              lineHeight: 1.25,
              mb: 1.25,
            }}
          >
            There is an issue with dispensing
          </Typography>

          <Typography sx={{ fontSize: 18, color: "#5c5346", lineHeight: 1.45, mb: 2.25 }}>
            This machine cannot complete your purchase right now.
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              textAlign: "left",
              px: 2,
              py: 1.75,
              mb: 2,
              borderRadius: "16px",
              bgcolor: "#fff",
              border: "1px solid rgba(196, 163, 90, 0.45)",
              boxShadow: "0 8px 20px rgba(196, 163, 90, 0.12)",
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: "50%",
                bgcolor: "rgba(47, 93, 70, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: FOREST,
              }}
            >
              <Icon icon="mdi:map-marker-radius" width={26} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: FOREST, lineHeight: 1.3 }}>
                We have another machine at Gate 11
              </Typography>
              <Typography sx={{ fontSize: 17, color: "#5c5346", mt: 0.4, lineHeight: 1.4 }}>
                Kindly go and buy there.
              </Typography>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 16, color: "#7a7166", mb: 2.5 }}>
            You can also shop at{" "}
            <Box component="span" sx={{ color: FOREST, fontWeight: 700 }}>
              {WEBSITE_URL.replace(/^https:\/\//, "")}
            </Box>
          </Typography>

          <Button
            fullWidth
            variant="contained"
            onClick={() => setOpen(false)}
            sx={{
              textTransform: "none",
              fontSize: 22,
              fontWeight: 700,
              py: 1.5,
              borderRadius: "14px",
              bgcolor: FOREST,
              boxShadow: "0 8px 18px rgba(47, 93, 70, 0.28)",
              "&:hover": { bgcolor: "#244A38" },
            }}
          >
            OK
          </Button>
        </Box>
            </Box>
          </Box>,
          document.body
        )
      : null;

  return (
    <DispenseIssueContext.Provider value={value}>
      {children}
      {notice}
    </DispenseIssueContext.Provider>
  );
}
