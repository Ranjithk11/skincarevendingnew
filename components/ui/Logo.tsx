"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import ActionButton from "./ActionButton";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  header?: boolean;
  onBrowseProducts?: () => void;
  onSlots?: () => void;
}

/** Scale based on original logo size: 464 x 110 */
const sizeMap = {
  small: { width: 180, height: 50 },
  medium: { width: 260, height: 72 },
  large: { width: 464, height: 110 },
};

export default function Logo({
  size = "medium",
  showText = true,
  header = false,
  onBrowseProducts,
  onSlots,
}: LogoProps) {
  const { width, height } = sizeMap[size];

  const logoMark = (
    <Box
      sx={{
        position: "relative",
        width,
        height,
        flexShrink: 0,
      }}
    >
      <Image
        src="/wending/goldlog.svg"
        alt="Leaf Water Logo"
        fill
        priority
        style={{
          objectFit: "contain",
        }}
      />
    </Box>
  );

  if (!showText) return logoMark;

  if (header) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          mb: { xs: 1.5, sm: 2.5, md: 3 },
        }}
      >
        {logoMark}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <ActionButton
            variant="outline"
            icon={
              <Image
                src="/wending/productlog.svg"
                alt="Products"
                width={35}
                height={35}
              />
            }
            onClick={onBrowseProducts}
          >
            <Typography
              sx={{
                fontWeight: 510,
                fontSize: 24,
                lineHeight: "100%",
              }}
            >
              Browse Products
            </Typography>
          </ActionButton>

          {/* <ActionButton
            variant="outline"
            icon={
              <Image
                src="/wending/dashboard-gauge.svg"
                alt="Slots"
                width={35}
                height={35}
              />
            }
            onClick={onSlots}
          >
            <Typography
              sx={{
                fontWeight: 510,
                fontSize: 24,
                lineHeight: "100%",
              }}
            >
              Slots
            </Typography>
          </ActionButton> */}
        </Box>
      </Box>
    );
  }

  return logoMark;
}
