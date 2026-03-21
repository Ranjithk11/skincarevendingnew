import { Badge, Box, Button, IconButton } from "@mui/material";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { APP_ROUTES } from "@/utils/routes";

interface TopLogoProps {
  isKiosk: boolean;
  onCartClick: () => void;
  onScanAgainClick: () => void;
  cartCount?: number;
  firstButtonLabel?: string;
  secondButtonLabel?: string;
  firstButtonIcon?: string;
  secondButtonIcon?: string;
  mode?: "actions" | "centered";
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
  mode = "actions",
}) => {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push(APP_ROUTES.HOME);
  };

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
        {mode === "centered" ? (
          <>
            <Box sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }} />

            <Box
              onClick={handleLogoClick}
              sx={{
                border: "2px solid #1976d2",
                bgcolor: "#ffffff",
                px: { xs: 1.5, sm: 2.5 },
                py: { xs: 0.5, sm: 1 },
                borderRadius: 0,
                width: { xs: "min(200px, 100%)", sm: "min(520px, 100%)" },
                height: { xs: 40, sm: 64 },
                position: "relative",
                cursor: "pointer",
              }}
            >
              <Image
                src="/wending/goldlog.svg"
                alt="Leaf Water"
                fill
                sizes="520px"
                style={{ objectFit: "contain" }}
                priority
              />
            </Box>

            <IconButton
              sx={{
                minWidth: { xs: 32, sm: 40 },
                width: { xs: 32, sm: 40 },
                height: { xs: 32, sm: 40 },
                p: 0,
                borderRadius: "50%",
                border: "1px solid #d1d5db",
                color: "#111827",
              }}
            >
              <Icon icon="mdi:help-circle-outline" width={22} />
            </IconButton>
          </>
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 1,
                minWidth: { xs: "auto", sm: 310 },
                flex: { xs: 1, sm: "none" },
              }}
            >
              <Box
                onClick={handleLogoClick}
                sx={{ 
                  position: "relative", 
                  width: { xs: 140, sm: 270 }, 
                  height: { xs: 36, sm: 69 }, 
                  cursor: "pointer" 
                }}
              >
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
                width: { xs: "auto", sm: 340 },
                gap: { xs: "6px", sm: "10px" },
                flexWrap: "nowrap",
              }}
            >
              <Button
                variant="outlined"
                size="small"
                sx={{
                  width: { xs: 90, sm: 220 },
                  height: { xs: "36px", sm: "60px" },
                  px: { xs: "6px", sm: "10px" },
                  py: { xs: "8px", sm: "19px" },
                  fontSize: { xs: "12px", sm: "24px" },
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
                      fontSize: { xs: 12, sm: 24 },
                      fontWeight: 500,
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      "& img": {
                        width: { xs: 16, sm: 24 },
                        height: { xs: 16, sm: 24 },
                      },
                    }}
                  >
                    <Image src={firstButtonIcon} width={24} height={24} alt="" />
                  </Box>
                </Badge>
                <Box
                  component="span"
                  sx={{
                    ml: { xs: 0.5, sm: 1 },
                    fontSize: { xs: "12px", sm: "24px" },
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: { xs: "none", sm: "inline" },
                  }}
                >
                  {firstButtonLabel}
                </Box>
              </Button>

              <Button
                variant="outlined"
                size="small"
                sx={{
                  width: { xs: 100, sm: 250 },
                  height: { xs: "36px", sm: "60px" },
                  px: { xs: "6px", sm: "10px" },
                  py: { xs: "8px", sm: "19px" },
                  fontSize: { xs: "12px", sm: "24px" },
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
                <Box 
                  sx={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: { xs: 0.5, sm: 1 },
                    "& img": {
                      width: { xs: 16, sm: 24 },
                      height: { xs: 16, sm: 24 },
                    },
                  }}
                >
                  <Image src={secondButtonIcon} width={24} height={24} alt="" />
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                    {secondButtonLabel}
                  </Box>
                </Box>
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default TopLogo;
