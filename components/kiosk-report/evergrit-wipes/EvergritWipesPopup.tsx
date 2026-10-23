"use client";

import { useEffect } from "react";
import { Box, Stack } from "@mui/material";
import type { ReportProduct } from "@/containers/skinanalysis-home/KioskReport/types";
import { pauseKioskIdle, resumeKioskIdle } from "@/utils/kioskIdleGate";
import { useVoiceMessages } from "@/contexts/VoiceContext";
import { isWipeVendableOnMachine } from "@/lib/evergrit-reset-wipes";
import EvergritWipesAddButton from "./EvergritWipesAddButton";
import EvergritWipesCloseButton from "./EvergritWipesCloseButton";
import EvergritWipesCopy from "./EvergritWipesCopy";
import EvergritWipesLogo from "./EvergritWipesLogo";
import EvergritWipesProductTile from "./EvergritWipesProductTile";
import EvergritWipesUnavailableNote from "./EvergritWipesUnavailableNote";
import { wipeFadeUp, wipeGoldSheen } from "./evergritWipesMotion";
import { EVERGRIT_GOLD } from "./evergritWipesTheme";

type Props = {
  open: boolean;
  products: ReportProduct[];
  selectedIds: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
};

export default function EvergritWipesPopup({
  open,
  products,
  selectedIds,
  onAdd,
  onClose,
}: Props) {
  const { speakMessage } = useVoiceMessages();

  useEffect(() => {
    if (!open) return;
    pauseKioskIdle();
    speakMessage("evergritWipesPromo");
    return () => resumeKioskIdle();
  }, [open, speakMessage]);

  if (!open || products.length === 0) return null;

  return (
    <Box
      onClick={onClose}
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2.5,
        bgcolor: "rgba(16, 24, 20, 0.72)",
      }}
    >
      <Box
        onClick={(event) => event.stopPropagation()}
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          maxHeight: "92%",
          borderRadius: "28px",
          bgcolor: "#FFFEFB",
          border: `1.5px solid ${EVERGRIT_GOLD}`,
          boxShadow: "0 28px 64px rgba(20, 32, 26, 0.4)",
          animation: `${wipeFadeUp} 0.4s ease-out`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            height: 5,
            background:
              "linear-gradient(90deg, #8B6914, #E8D5A3, #C4A35A, #E8D5A3, #8B6914)",
            backgroundSize: "200% 100%",
            animation: `${wipeGoldSheen} 4s linear infinite`,
          }}
        />
        <EvergritWipesCloseButton onClose={onClose} />
        <Stack spacing={1.75} sx={{ px: 3, pt: 2.25, pb: 2.75, overflowY: "auto" }}>
          <EvergritWipesLogo />
          {products.map((product) => (
            <EvergritWipesProductTile key={product.id} product={product} />
          ))}
          <EvergritWipesCopy />
          {products.map((product) => {
            const available = isWipeVendableOnMachine(product);
            return (
              <Box key={product.id}>
                {available ? (
                  <EvergritWipesAddButton
                    available
                    added={selectedIds.includes(product.id)}
                    onAdd={() => onAdd(product.id)}
                  />
                ) : (
                  <>
                    <EvergritWipesAddButton
                      available={false}
                      added={false}
                      onAdd={() => undefined}
                    />
                    <Box sx={{ mt: 1 }}>
                      <EvergritWipesUnavailableNote />
                    </Box>
                  </>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
