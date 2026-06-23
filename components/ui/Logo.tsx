"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useSession } from "next-auth/react";
import ActionButton from "./ActionButton";
import FreeConsultation from "@/containers/skinanalysis-home/Recommendations/freeConsultation";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  header?: boolean;
  onFreeConsultation?: () => void;
  onBrowseProducts?: () => void;
  onSlots?: () => void;
}

/** Scale based on original logo size: 464 x 110 */
const sizeMap = {
  small: { width: 180, height: 50 },
  medium: { width: 270, height: 80 },
  large: { width: 464, height: 110 },
};

export default function Logo({
  size = "medium",
  showText = true,
  header = false,
  onFreeConsultation,
  onBrowseProducts,
  onSlots,
}: LogoProps) {
  const { data: session } = useSession();
  const [consultationOpen, setConsultationOpen] = useState(false);
  const { width, height } = sizeMap[size];

  const handleFreeConsultationClick = () => {
    onFreeConsultation?.();
    setConsultationOpen(true);
  };

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

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <ActionButton
            variant="outline"
            onClick={handleFreeConsultationClick}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 24,
                lineHeight: "100%",
              }}
            >
              Free Consultation
            </Typography>
          </ActionButton>
          <ActionButton
            variant="outline"
            icon={
              <Image
                src="/wending/productlog.svg"
                alt="Products"
                width={30}
                height={30}
              />
            }
            onClick={onBrowseProducts}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 24,
                lineHeight: "100%",
              }}
            >
              Browse Products
            </Typography>
          </ActionButton>

          <ActionButton
            variant="outline"
            // icon={
            //   <Image
            //     src="/wending/dashboard-gauge.svg"
            //     alt="Slots"
            //     width={ 30}
            //     height={ 30}
            //   />
            // }
            onClick={onSlots}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 24,
                lineHeight: "100%",
              }}
            >
              Slots
            </Typography>
          </ActionButton>
        </Box>

        <FreeConsultation
          open={consultationOpen}
          onClose={() => setConsultationOpen(false)}
          user={{
            userId: (session?.user as any)?.id,
            name: (session?.user as any)?.name,
            email: (session?.user as any)?.email,
            phone:
              (session?.user as any)?.mobileNumber ||
              (session?.user as any)?.phoneNumber ||
              (session?.user as any)?.phone,
          }}
        />
      </Box>
    );
  }

  return logoMark;
}
