"use client";

import React, { useMemo, useState } from "react";
import { Box, Button, Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import CallIcon from "@mui/icons-material/Call";

type Props = {
  salonServices?: any[];
  cosmeticServices?: any[];
};

const ServiceCard = ({ item }: { item: any }) => {
  const img = item?.images?.[0]?.url;
  return (
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
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 14, md: 16 }, color: "#111827" }}>
            {item?.name}
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              fontSize: { xs: 12, md: 12 },
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

          <Typography sx={{ mt: 1.25, fontWeight: 900, fontSize: { xs: 12, md: 14 }, color: "#111827" }}>
            INR. {item?.price}/-
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          endIcon={<CallIcon sx={{ color: "white" }} />}
          sx={{
            mt: 1.5,
            borderRadius: "8px",
            textTransform: "none",
            py: 0.75,
            alignSelf: "flex-start",
          }}
          onClick={() => {
            window.open("tel:08977016605");
          }}
        >
          Book Now
        </Button>
      </Box>
    </Box>
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
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ fontWeight: 800, fontSize: 35, mt: 4, mb: 2 }}>
        My Skincare Services
      </Typography>
      <Typography sx={{ fontSize: 18, color: "#000" }}>
        WHAT WE RECOMMEND
      </Typography>

      <Box sx={{ mt: 2, display: "flex", gap: 1.5 ,mb:2}}>
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
              src="/images/recommendations.png"
              alt="Salon"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: 20, fontWeight: 700 }}>
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
              src="/images/recommendations.png"
              alt="Cosmetic"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: 20, fontWeight: 700 }}>
            Cosmetic
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt:2}}>
        {active.slice(0, 6).map((item: any) => (
          <Grid item xs={6} md={4} key={item?._id || item?.name}>
            <ServiceCard item={item} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
