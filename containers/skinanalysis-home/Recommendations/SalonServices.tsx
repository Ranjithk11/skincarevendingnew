import {
  Box,
  Button,
  Container,
  Dialog,
  Grid,
  IconButton,
  Typography,
  styled,
} from "@mui/material";
import { Icon } from "@iconify/react";

import React, { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import CallIcon from "@mui/icons-material/Call";
const StyledSalonServices = styled(Box)(({ theme }) => ({
  paddingBottom: 75,
  paddingTop: 75,
  [theme.breakpoints.between("xs", "sm")]: {
    paddingTop: 20,
  },
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
  backgroundPosition: "top center",
  "& .MuiTypography-h6": {
    fontWeight: 700,
    fontSize: 30,
    [theme.breakpoints.between("xs", "sm")]: {
      fontSize: 25,
    },
  },
  "& .MuiTypography-h5": {
    fontWeight: 600,
  },
  "& .MuiTypography-h3": {
    fontWeight: 800,
  },
  "& span": {
    color: theme.palette.primary.main,
    marginRight: 10,
  },
  "& .salone_card_wrapper": {
    width: "100%",
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.common.white,
    padding: 20,
    borderRadius: 10,
    height: "100%",
    "& .card_image": {
      width: "100%",
      height: 300,
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "top center",
      borderRadius: 10,
      marginBottom: 20,
    },
    "& .MuiTypography-body1": {
      color: theme.palette.text.secondary,
    },
  },
}));

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

interface SalonServicesProps {
  data: any[];
}

const SalonServices = ({ data }: SalonServicesProps) => {
  const [openCTA, setOpenCTA] = useState<boolean>(false);

  return (
    <StyledSalonServices sx={{ backgroundImage: `url(/images/homeBg_1.png)` }}>
      <Container maxWidth="lg">
        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} md={12}>
            <Box mb={4}>
              <Typography gutterBottom textAlign="center" variant="h5">
                Recommended
              </Typography>
              <Grid
                width="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Grid item>
                  <Typography textAlign="center" variant="h6">
                    <span>Salon Services </span>
                  </Typography>
                </Grid>
                {/* <Grid item>
                  <img src="/images/leafwater_logo.png" width={150} />
                </Grid> */}
              </Grid>
            </Box>
          </Grid>
          {data?.map((itm: any) => (
            <Grid xs={12} key={itm?._id} item md={4}>
              <Box component="div" className="salone_card_wrapper">
                <Grid
                  container
                  direction="column"
                  justifyContent="space-between"
                  style={{ height: "100%" }}
                >
                  <Grid item xs>
                    <Box
                      component="div"
                      style={{
                        backgroundImage: itm?.images?.[0]?.url
                          ? `url("${String(itm.images[0].url).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`
                          : "none",
                      }}
                      className="card_image"
                    />
                  </Grid>
                  <Grid item xs>
                    <Typography
                      gutterBottom
                      textAlign="left"
                      color="primary"
                      sx={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}
                      variant="body2"
                    >
                      {itm?.name}
                    </Typography>
                    <Typography
                      gutterBottom
                      variant="body1"
                      textAlign="left"
                      sx={{ marginBottom: 2 }}
                    >
                      {itm?.description || "No description available."}
                    </Typography>
                    <Typography
                      textAlign="center"
                      variant="body2"
                      sx={{ fontWeight: 900, fontSize: 20 }}
                    >
                      INR.{itm?.price}/-
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Box textAlign="center" mt={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setOpenCTA(true)}
                        endIcon={<CallIcon sx={{ color: "white" }} />}
                        sx={{
                          padding: "6px 12px",
                          typography: "body1",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Book Now
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Dialog for "Call Now" */}
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
      </Container>
    </StyledSalonServices>
  );
};

export default SalonServices;
