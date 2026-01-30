import { Badge, Box, Button } from "@mui/material";
import Image from "next/image";
import React from "react";

interface TopLogoProps {
  isKiosk: boolean;
  onCartClick: () => void;
  onScanAgainClick: () => void;
  cartCount?: number;
  firstButtonLabel?: string;
  secondButtonLabel?: string;
  firstButtonIcon?: string;
  secondButtonIcon?: string;
}

const TopLogo: React.FC<TopLogoProps> = ({
  isKiosk,
  onCartClick,
  onScanAgainClick,
  cartCount = 0,
  firstButtonLabel = "My cart",
  secondButtonLabel = "Scan again",
  firstButtonIcon = "/icons/cart.svg",
  secondButtonIcon = "/icons/face.png",
}) => {
  return (
    <Box
      sx={{
        position: isKiosk ? "absolute" : "fixed",
        top: 10,
        left: 12,
        right: 12,
        zIndex: 10,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          bgcolor: "#ffffff",
          borderRadius: 2,
          boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 1,
            minWidth: 310,
          }}
        >
          <Box sx={{ position: "relative", width: 270, height: 69 }}>
            <Image
              src="/wending/goldlog.svg"
              alt=""
              fill
              sizes="280px"
              style={{ objectFit: "contain" }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: 340,
            gap: "10px",
            flexWrap: "nowrap",
          }}
        >
          <Button
            variant="outlined"
            size="small"
            sx={{
              width: 220,
              height: "60px",
              px: "10px",
              py: "19px",
              fontSize: "24px",
              borderRadius: "64px",
              textTransform: "none",
              minWidth: 0,
              whiteSpace: "nowrap",
              borderColor: "#d1d5db",
              borderWidth: "1px",
              color: "#111827",
              fontWeight: 500,
              backgroundColor: "#ffffff",
            }}
            onClick={onCartClick}
          >
            <Badge
              badgeContent={cartCount}
              color="primary"
              invisible={!cartCount}
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: 24,
                  fontWeight: 500,
                },
              }}
            >
              <Image src={firstButtonIcon} width={24} height={24} alt="" />
            </Badge>
            <Box
              component="span"
              sx={{
                ml: 1,
                fontSize: "24px",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {firstButtonLabel}
            </Box>
          </Button>

          <Button
            variant="outlined"
            size="small"
            sx={{
              width: 250,
              height: "60px",
              px: "10px",
              py: "19px",
              fontSize:"24px",
              borderRadius: "64px",
              textTransform: "none",
              minWidth: 0,
              whiteSpace: "nowrap",
              borderColor: "#d1d5db",
              borderWidth: "1px",
              color: "#111827",
              fontWeight: 500,
              backgroundColor: "#ffffff",
            }}
            onClick={onScanAgainClick}
          >
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <Image src={secondButtonIcon} width={24} height={24} alt="" />
              <span>{secondButtonLabel}</span>
            </Box>
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TopLogo;
