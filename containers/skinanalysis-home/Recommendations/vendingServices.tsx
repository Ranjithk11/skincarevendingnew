"use client";

import React, { useMemo, useState } from "react";
import { Box, Button, Dialog, Grid, IconButton, Typography, useMediaQuery, useTheme } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CloseIcon from "@mui/icons-material/Close";

type Props = {
  salonServices?: any[];
  cosmeticServices?: any[];
};

const PageBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        minHeight: "100%",
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        mb:2,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <path
          d="M100,0 L100,100 L0,100 Q25,78 45,60 Q70,35 100,0 Z"
          fill="#E9F6E8"
        />
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, width: "100%" }}>{children}</Box>
    </Box>
  );
};

const ServiceCard = ({ item }: { item: any }) => {
  const img = item?.images?.[0]?.url;
  const [openBooking, setOpenBooking] = useState(false);

  const handleBookNow = () => {
    setOpenBooking(true);
  };

  const handleClose = () => {
    setOpenBooking(false);
  };

  const handleCall = () => {
    const phoneNumber = "918977016605";
    const message = encodeURIComponent(`Hi, I would like to book the service: ${item?.name}`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  return (
    <>
      <Box
        sx={{
          width: { xs: "100%", md: 486 },
          height: { xs: "auto", md: 307 },
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          bgcolor: "white",
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          mb:2
        }}
      >
        <Box
          sx={{
            width: { xs: 140, md: 200 },
            minWidth: { xs: 140, md: 200 },
            height: { xs: 220, md: "100%" },
            backgroundColor: "#f3f4f6",
            backgroundImage: img ? `url(${img})` : "none",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Box
          sx={{
            p: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "24px", color: "#111827" }}>
              {item?.name}
            </Typography>
            <Typography
              sx={{
                mt: 0.75,
                fontSize: "18px",
                fontWeight: 400,
                color: "#6b7280",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
            >
              {item?.description || ""}
            </Typography>

            <Typography sx={{ mt: 1.25, fontWeight: 700, fontSize:"24px", color: "#111827" }}>
              INR. {item?.price}/-
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            endIcon={<WhatsAppIcon sx={{ color: "white" }} />}
            sx={{
              mt: 1.5,
              borderRadius: "8px",
              textTransform: "none",
              py: 0.75,
              alignSelf: "flex-start",
            }}
            onClick={handleBookNow}
          >
            Book Now
          </Button>
        </Box>
      </Box>

      {/* Booking Popup Dialog */}
      <Dialog
        open={openBooking}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 3,
            maxWidth: 400,
            width: "90%",
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              bgcolor: "#f3f4f6",
              "&:hover": { bgcolor: "#e5e7eb" },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Typography sx={{ fontWeight: 700, fontSize: 28, mb: 2, pr: 4 }}>
            Book Service
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 3,
              alignItems: "center",
            }}
          >
            {img && (
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  backgroundImage: `url(${img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  flexShrink: 0,
                }}
              />
            )}
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 20 }}>
                {item?.name}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 18, color: "#316D52" }}>
                INR. {item?.price}/-
              </Typography>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 16, color: "#6b7280", mb: 3 }}>
            Message us on WhatsApp to book this service. Our team will assist you with scheduling your appointment.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <WhatsAppIcon sx={{ color: "#316D52", fontSize: 28 }} />
            <Typography sx={{ fontWeight: 600, fontSize: 24, color: "#316D52" }}>
              089 770 16605
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleClose}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                py: 1.5,
                fontSize: 18,
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<WhatsAppIcon />}
              onClick={handleCall}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                py: 1.5,
                fontSize: 18,
              }}
            >
              WhatsApp
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default function VendingServices({ salonServices, cosmeticServices }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [serviceTab, setServiceTab] = useState<"salon" | "cosmetic">("salon");

  const active = useMemo(() => {
    return serviceTab === "salon" ? salonServices || [] : cosmeticServices || [];
  }, [serviceTab, salonServices, cosmeticServices]);

  return (
    <PageBackground>
      <Box sx={{ width: "100%" }}>
        <Typography sx={{ fontWeight: 800, fontSize: 36, mt: 3, mb: 3 }}>
          My Skincare Services
        </Typography>
        <Typography sx={{ fontSize: "24px",fontWeight:400, color: "#000" }}>
          WHAT WE RECOMMEND
        </Typography>

      <Box sx={{ mt: 3, display: "flex", gap: 1.5 ,mb:5}}>
        <Box
          onClick={() => setServiceTab("salon")}
          sx={{
            width: 100,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              mx: "auto",
              border:
                serviceTab === "salon"
                  ? "2px solid #0f766e"
                  : "2px solid #e5e7eb",
              bgcolor: "#ffffff",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              component="img"
              src="/products/salon.svg"
              alt="Salon"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: "24px", fontWeight: 500 }}>
            Salon
          </Typography>
        </Box>

        <Box
          onClick={() => setServiceTab("cosmetic")}
          sx={{
            width: 100,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              mx: "auto",
              border:
                serviceTab === "cosmetic"
                  ? "2px solid #0f766e"
                  : "2px solid #e5e7eb",
              bgcolor: "#ffffff",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              component="img"
              src="/products/cosmotic.svg"
              alt="Cosmetic"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: "24px", fontWeight: 500 }}>
            Cosmetic
          </Typography>
        </Box>
      </Box>

        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt:1}}>
          {active.slice(0, 6).map((item: any) => (
            <Grid item xs={6} md={4} key={item?._id || item?.name}>
              <ServiceCard item={item} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </PageBackground>
  );
}
