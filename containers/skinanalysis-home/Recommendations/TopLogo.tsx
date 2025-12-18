import { Box, Button } from "@mui/material";
import Image from "next/image";
import React from "react";

interface TopLogoProps {
  isKiosk: boolean;
  onCartClick: () => void;
  onScanAgainClick: () => void;
}

const TopLogo: React.FC<TopLogoProps> = ({
  isKiosk,
  onCartClick,
  onScanAgainClick,
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
          <Box sx={{ position: "relative", width: 291, height: 69 }}>
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
            width: 300,
            gap: "10px",
            flexWrap: "nowrap",
          }}
        >
          <Button
            variant="outlined"
            size="small"
            sx={{
              width: 200,
              height: "60px",
              px: "10px",
              py: "19px",
              borderRadius: "64px",
              textTransform: "none",
              minWidth: 0,
              whiteSpace: "nowrap",
              borderColor: "#d1d5db",
              borderWidth: "1px",
              color: "#111827",
              fontWeight: 600,
              backgroundColor: "#ffffff",
            }}
            onClick={onCartClick}
          >
            <Image src="/icons/cart.svg" width={18} height={18} alt="" />
            &nbsp;My cart
          </Button>

          <Button
            variant="outlined"
            size="small"
            sx={{
              width: 200,
              height: "60px",
              px: "10px",
              py: "19px",
              borderRadius: "64px",
              textTransform: "none",
              minWidth: 0,
              whiteSpace: "nowrap",
              borderColor: "#d1d5db",
              borderWidth: "1px",
              color: "#111827",
              fontWeight: 600,
              backgroundColor: "#ffffff",
            }}
            onClick={onScanAgainClick}
          >
            <Image src="/icons/face.png" width={18} height={18} alt="" />
            &nbsp;Scan again
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TopLogo;
