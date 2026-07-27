import { Badge, Box, Button, IconButton } from "@mui/material";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import React from "react";
import { APP_ROUTES } from "@/utils/routes";
import { useSpinWheel } from "@/contexts/SpinWheelContext";
import { clearSpinWheelSession } from "@/lib/spin-wheel/session";
import { buildSpinWheelHref } from "@/lib/spin-wheel/navigation";

interface TopLogoProps {
  isKiosk: boolean;
  onCartClick: () => void;
  /** @deprecated Use onSpinWheelClick */
  onScanAgainClick?: () => void;
  onSpinWheelClick?: () => void;
  cartCount?: number;
  firstButtonLabel?: string;
  secondButtonLabel?: string;
  secondButtonSubLabel?: string;
  firstButtonIcon?: string;
  /** Path (starts with /) or Iconify icon name */
  secondButtonIcon?: string;
  mode?: "actions" | "centered";
  /** When false, skip Spin & Win reward highlight (e.g. button is Use AI scan). */
  highlightActiveReward?: boolean;
  /** Temporary attention pulse on the second action button (e.g. after Collect & continue). */
  pulseSecondButton?: boolean;
}

const ACTION_ICON_SIZE = 24;

const renderSecondButtonIcon = (icon: string, size: number) => {
  if (icon.startsWith("/")) {
    return <Image src={icon} width={size} height={size} alt="" />;
  }
  return <Icon icon={icon} width={size} height={size} />;
};

const baseActionButtonSx = {
  width: "fit-content",
  minWidth: "unset",
  px: 2,
  py: 1.25,
  borderRadius: "64px",
  textTransform: "none" as const,
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 1,
  whiteSpace: "nowrap" as const,
  fontSize:24,
  fontWeight: 500,
  lineHeight: 1.2,
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#d1d5db",
  color: "#111827",
  backgroundColor: "#ffffff",
  "&.MuiButton-root": {
    minWidth: "unset",
  },
};

const actionIconSx = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  lineHeight: 0,
  width: ACTION_ICON_SIZE,
  height: ACTION_ICON_SIZE,
  "& img, & svg": {
    width: ACTION_ICON_SIZE,
    height: ACTION_ICON_SIZE,
  },
};

const TopLogo: React.FC<TopLogoProps> = ({
  isKiosk,
  onCartClick,
  onScanAgainClick,
  onSpinWheelClick,
  cartCount = 0,
  firstButtonLabel = "My cart",
  secondButtonLabel = "Spin & Win",
  secondButtonSubLabel = "Rewards",
  firstButtonIcon = "/icons/cart.svg",
  secondButtonIcon = "mdi:ferris-wheel",
  mode = "actions",
  highlightActiveReward = true,
  pulseSecondButton = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { reward } = useSpinWheel();
  const hasActiveReward =
    highlightActiveReward && Boolean(reward && !reward.redeemed);

  const handleSecondButtonClick =
    onSpinWheelClick ??
    onScanAgainClick ??
    (() => router.push(buildSpinWheelHref(pathname)));

  const handleLogoClick = async () => {
    clearSpinWheelSession();
    try {
      await signOut({ redirect: false });
    } catch {}
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
                width: { xs: "min(200px, 100%)", sm: "min(620px, 100%)" },
                height: 64,
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
                minWidth: 0,
                flex: { xs: 1, sm: "0 1 auto" },
              }}
            >
              <Box
                onClick={handleLogoClick}
                sx={{
                  position: "relative",
                  width: 256,
                  height: 64,
                  flexShrink: 1,
                  cursor: "pointer",
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
                gap: 2,
                flexShrink: 0,
                minWidth: 0,
              }}
            >
              <Button
                variant="outlined"
                size="small"
                sx={baseActionButtonSx}
                onClick={onCartClick}
              >
                <Badge
                  badgeContent={cartCount}
                  color="primary"
                  invisible={!cartCount}
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: 10,
                      fontWeight: 600,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                    },
                  }}
                >
                  <Box component="span" sx={actionIconSx}>
                    <Image
                      src={firstButtonIcon}
                      width={ACTION_ICON_SIZE}
                      height={ACTION_ICON_SIZE}
                      alt=""
                    />
                  </Box>
                </Badge>
                <Box
                  component="span"
                  sx={{
                    fontSize: "inherit",
                    fontWeight: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  {firstButtonLabel}
                </Box>
              </Button>

              <Button
                variant="outlined"
                size="small"
                sx={{
                  ...baseActionButtonSx,
                  position: "relative",
                  "@keyframes topLogoSecondPulse": {
                    "0%, 100%": {
                      transform: "scale(1)",
                      boxShadow: "0 0 0 0 rgba(158, 27, 61, 0.35)",
                    },
                    "50%": {
                      transform: "scale(1.07)",
                      boxShadow: "0 0 0 10px rgba(158, 27, 61, 0)",
                    },
                  },
                  ...((hasActiveReward || pulseSecondButton) && {
                    borderColor: "#9E1B3D",
                    color: "#9E1B3D",
                    fontWeight: 700,
                    backgroundColor: "#fdf2f8",
                  }),
                  ...(pulseSecondButton && {
                    animation: "topLogoSecondPulse 0.9s ease-in-out infinite",
                    zIndex: 2,
                  }),
                }}
                onClick={handleSecondButtonClick}
              >
                {(hasActiveReward || pulseSecondButton) && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 6,
                      right: 8,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#ef4444",
                      boxShadow: "0 0 0 1.5px #ffffff",
                      ...(pulseSecondButton && {
                        "@keyframes topLogoDotBlink": {
                          "0%, 100%": { opacity: 1, transform: "scale(1)" },
                          "50%": { opacity: 0.35, transform: "scale(1.35)" },
                        },
                        animation: "topLogoDotBlink 0.9s ease-in-out infinite",
                      }),
                    }}
                  />
                )}
                <Box sx={actionIconSx}>
                  {renderSecondButtonIcon(secondButtonIcon, ACTION_ICON_SIZE)}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    lineHeight: 1.15,
                    minWidth: 0,
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: "inherit",
                      fontWeight: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {secondButtonLabel}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      fontSize:18,
                      fontWeight: 400,
                      color:
                        hasActiveReward || pulseSecondButton
                          ? "#be185d"
                          : "#6b7280",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {secondButtonSubLabel}
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
