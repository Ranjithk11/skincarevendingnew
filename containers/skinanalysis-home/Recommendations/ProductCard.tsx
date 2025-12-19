import React, { useState } from "react";
import {
  Card,
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  styled,
  IconButton,
} from "@mui/material";
import { capitalizeWords, shouldForwardProp } from "@/utils/func";
import { Icon } from "@iconify/react";
import Dialog from "@mui/material/Dialog";
import posthog from "posthog-js";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { url } from "inspector";
import { useMediaQuery, useTheme } from "@mui/material";
import BuyNowDialog from "./BuyNowDialog";

interface ProductCardProps {
  ribbenColor?: string;
  _id?: string;
  productBenefits: string;
  name: string;
  productUse: string;
  retailPrice: number;
  matches: any[];
  images: any[];
  enabledMask?: boolean;
  shopifyUrl: string;
  minWidth?: number;
  category?: string;
  discount?: any;
  compact?: boolean;
  cardSx?: any;
  horizontalLayout?: boolean;
}

const StyledProductCard = styled(Card, {
  shouldForwardProp: (prop) =>
    shouldForwardProp<{ enabledMask?: boolean; minWidth?: number }>(
      ["enabledMask", "minWidth"],
      prop
    ),
})<{ enabledMask?: boolean; minWidth?: number }>(
  ({ theme, enabledMask, minWidth }) => ({
    height: "100%",

    ...(minWidth && {
      minWidth: minWidth,
      height: "auto",
      padding: 20,
      marginRight: 15,
    }),
    width: "100%",
    padding: 40,
    [theme.breakpoints.only("xs")]: {
      padding: 10,
    },
    display: "flex",
    flexDirection: "column",
    // alignItems: "center",
    // justifyContent: "center",
    position: "relative",
    "& .cta-dialog-box": {
      width: 370,
      height: 300,
    },
    "& .MuiTypography-subtitle1": {
      fontWeight: 800,
      fontSize: 18,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: "2",
      WebkitBoxOrient: "vertical",
      ...(enabledMask && {
        filter: "blur(1rem)",
      }),
      [theme.breakpoints.only("xs")]: {
        fontSize: 16,
        lineHeight: 1,
        marginBottom: 10,
      },
    },
    "& .MuiTypography-body1": {
      fontWeight: 500,
      fontSize: 16,
      color: theme.palette.text.secondary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: "2",
      WebkitBoxOrient: "vertical",
      ...(enabledMask && {
        filter: "blur(1rem)",
      }),
      [theme.breakpoints.only("xs")]: {
        fontSize: 14,
        lineHeight: 1,
        marginBottom: 10,
      },
    },
    "& .product_image": {
      position: "relative",
      width: "100%",
      padding: 10,
      height: 200,
      marginBottom: 20,
      backgroundRepeat: "no-repeat",
      backgroundSize: "contain",
      backgroundPosition: "center",
      ...(enabledMask && {
        filter: "blur(1rem)",
      }),
      [theme.breakpoints.only("xs")]: {
        height: 150,
      },
    },
    "& .product-masking": {
      position: "absolute",
      width: "100%",
      height: "100%",
      paddingLeft: 30,
      paddingRight: 30,
      top: 0,
      left: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    "& .chip": {
      ...(enabledMask && {
        filter: `blur(1rem)`,
      }),
    },
    "& .MuiButton-root": {
      "& svg": {
        color: theme.palette.common.white,
      },
    },
  })
);

const StyledCtaDialogModel = styled(Box)(({ theme }) => ({
  width: 600,
  height: 300,
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  "& .close-icon-wrapper": {
    position: "absolute",
    top: 0,
    right: 0,
  },
}));
const YellowButton = styled(Button)({
  backgroundColor: "linear-gradient(90deg, #00A76F 0%, #FFDD1B 100%)",
  color: "white",
  borderRadius: "8px",
  padding: "8px 16px",
  "&:hover": {
    backgroundColor: "#E6C418",
  },
});

const ProductCard = ({
  _id,
  name,
  productBenefits,
  productUse,
  matches,
  images,
  retailPrice,
  enabledMask,
  shopifyUrl,
  minWidth,
  category,
  discount,
  compact,
  cardSx,
  horizontalLayout,
}: ProductCardProps) => {
  const { data: session } = useSession();
  const pathName = usePathname();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const showHorizontal = (horizontalLayout || (isDesktop && !compact)) && !minWidth;
  const [openCTA, setOpenCTA] = useState<boolean>(false);
  const [openBuyNow, setOpenBuyNow] = useState<boolean>(false);
  const handleAddToCart = () => {
    window.open(shopifyUrl);
  };

  const handleOpenBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenBuyNow(true);
  };

  const handlePostHogEvent = (eventName: string) => {
    posthog.capture(session?.user.firstName + "_" + eventName, {
      buttonName: "CallToUs",
      location: pathName,
      userId: session?.user?.id,
      userName: session?.user.firstName,
      gender: session?.user.gender,
      phone: session?.user?.mobileNumber,
      userImage: session?.user?.selfyImagePath,
      productName: name,
      productPrice: retailPrice,
      category,
      discount,
    });
  };

  const calculateDiscount = (originalPrice: number, discountAmount: number) => {
    if (isNaN(discountAmount)) {
      return originalPrice;
    } else {
      const discountedPrice =
        originalPrice - originalPrice * (discountAmount / 100);
      return discountedPrice.toFixed(0);
    }
  };

  return (
    <StyledProductCard
      enabledMask={enabledMask}
      minWidth={minWidth}
      onClick={handleAddToCart}
      sx={{
        cursor: "pointer",
        ...(showHorizontal
          ? {
              p: 2,
              borderRadius: 2,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              "& .product_image": {
                width: 120,
                minWidth: 120,
                height: 350,
                marginBottom: 0,
                padding: 8,
                borderRadius: 12,
                backgroundColor: "#fff",
              },
              "& .MuiTypography-subtitle1": {
                textAlign: "left",
                WebkitLineClamp: "2",
              },
              "& .MuiTypography-body1": horizontalLayout
                ? {
                    display: "none",
                  }
                : {
                    textAlign: "left",
                    WebkitLineClamp: "2",
                  },
            }
          : null),
        ...(compact
          ? {
              p: "16px",
              borderRadius: 2,
              minHeight: 300,
              "& .product_image": {
                height: 150,
                marginBottom: 8,
                padding: 8,
              },
              "& .MuiTypography-subtitle1": {
                fontSize: 13,
                WebkitLineClamp: "1",
                textAlign: "center",
              },
              "& .MuiTypography-body1": {
                fontSize: 12,
                WebkitLineClamp: "1",
                textAlign: "center",
              },
            }
          : null),
        ...(!showHorizontal && !compact ? { borderRadius: 2 } : null),
        ...(cardSx || {}),
      }}
    >
      <Box
        component="div"
        className="product_image"
        sx={{
          backgroundImage: `url(${images?.[0]?.url})`,
        }}
      ></Box>
      <Box flexGrow={1} width={showHorizontal ? "auto" : "100%"}>
        <Grid container spacing={compact ? 1 : 2}>
          <Grid item xs={12}>
            <Box mb={1}>
              <Chip
                variant="outlined"
                className="chip"
                style={{ borderRadius: 5 }}
                color="primary"
                size="small"
                label={matches?.[0]?.name?.replace("_", " ")}
              />
            </Box>
            <Typography
              color="primary"
              sx={() => ({
                fontWeight: 700,
              })}
              variant="subtitle1"
            >
              {capitalizeWords(name)}
            </Typography>
            <Typography variant="body1">
              {productUse
                .split(" ")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(" ")}
            </Typography>
            {productBenefits && (
              <Box mt={1}>
                <Typography variant="subtitle1">Benefits</Typography>
                <Typography variant="body1">
                  {productBenefits
                    .split(" ")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )
                    .join(" ")}
                </Typography>
              </Box>
            )}
            <Box mt={1}>
              {calculateDiscount(retailPrice, discount?.value) ===
                retailPrice && (
                <Typography color="primary" variant="subtitle1">
                  INR.{retailPrice}/-
                </Typography>
              )}
              {calculateDiscount(retailPrice, discount?.value) !==
                retailPrice && (
                <Box display="flex" gap={2}>
                  <Typography
                    style={{ textDecoration: "line-through" }}
                    variant="subtitle2"
                  >
                    INR.{retailPrice}/-
                  </Typography>
                  <Typography variant="subtitle1" color="primary">
                    INR.{calculateDiscount(retailPrice, discount?.value)}/-
                  </Typography>
                </Box>
              )}
            </Box>

            {discount?.value && (
              <Box mt={1}>
                <Typography variant="subtitle1">
                  Discount: Flat{" "}
                  <span> {discount?.value ? `${discount.value}%` : " "}</span>
                </Typography>
              </Box>
            )}

            {showHorizontal && !enabledMask && shopifyUrl && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenBuyNow}
                size="small"
                startIcon={<Icon icon="uil:cart" />}
                sx={{
                  marginTop: 1.5,
                  padding: "6px 12px",
                  typography: "body1",
                  whiteSpace: "nowrap",
                  alignSelf: "flex-start",
                }}
              >
                Buy Now
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>
      {!showHorizontal && !enabledMask && shopifyUrl && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenBuyNow}
          size="small"
          startIcon={<Icon icon="uil:cart" />}
          sx={{
            marginTop: 2,
            padding: "6px 12px",
            typography: "body1",
            whiteSpace: "nowrap",
            alignSelf: "stretch",
          }}
        >
          Buy Now
        </Button>
      )}

      <BuyNowDialog
        open={openBuyNow}
        onClose={() => setOpenBuyNow(false)}
        imageUrl={images?.[0]?.url}
        id={_id}
        name={name}
        priceText={`INR.${calculateDiscount(retailPrice, discount?.value)}/-`}
      />

      {!enabledMask && !shopifyUrl && (
        <Button
          variant="contained"
          color="secondary"
          startIcon={<Icon icon="line-md:phone-call-loop" />}
          onClick={() => {
            setOpenCTA(true);
          }}
          size="small"
          sx={{
            marginTop: 2,
            padding: "6px 12px",
            typography: "body1",
            whiteSpace: "nowrap",
          }}
        >
          Call To Order
        </Button>
      )}
      {openCTA && (
        <Dialog open={openCTA}>
          <StyledCtaDialogModel
            style={{ backgroundImage: `url(/images/popupbg.png)` }}
          >
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <img
                src="/logo/logo_gold_white.png"
                alt="Logo"
                style={{
                  width: "250px",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </Box>
            <Box mt={3} sx={{ display: "flex", gap: 2, width: "80%" }}>
              <YellowButton
                onClick={() => window.open("https://leafwater.in/", "_blank")}
              >
                leafwater.in
              </YellowButton>
              <YellowButton href="tel:089770 16605" size="medium">
                Call us at 089770 16605
              </YellowButton>
            </Box>
            <Typography
              color="white"
              paddingTop={3}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center", // Ensures text is centered
              }}
            >
              Tap on the buttons to contact us today to book your appointment!
            </Typography>
            <Box component="div" className="close-icon-wrapper">
              <IconButton
                onClick={() => {
                  setOpenCTA(false);
                }}
              >
                <Icon icon="mdi:close" />
              </IconButton>
            </Box>
          </StyledCtaDialogModel>
        </Dialog>
      )}

      {enabledMask && (
        <Box component="div" className="product-masking">
          <Grid container>
            <Grid item xs={12}>
              <Typography textAlign="center" variant="subtitle2">
                To View more products{" "}
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Icon icon="line-md:phone-call-loop" />}
                onClick={() => {
                  handlePostHogEvent("click_call_to_us_btn");
                  setOpenCTA(true);
                }}
                size="small"
                sx={{
                  marginTop: 2,
                  padding: "6px 12px",
                  typography: "body1",
                  whiteSpace: "nowrap",
                }}
              >
                Call To Us
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
    </StyledProductCard>
  );
};

export default ProductCard;
