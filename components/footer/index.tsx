"use client";
import React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import { AiFillInstagram, AiFillYoutube, AiFillFacebook } from "react-icons/ai";

import Typography from "@mui/material/Typography";
import { Divider, IconButton } from "@mui/material";
import { APP_COLORS } from "@/theme/colors/colors";
import { SOCIAL_LINKS } from "@/utils/constants";
import Link from "next/link";

const StyledFooterMainBox = styled(Box)(({ theme }) => ({
  height: "100%",
  backgroundColor: APP_COLORS.DARK_NAVGREEN_BLUE,
  paddingTop: 75,
  paddingBottom: 75,
  "& .logo__title": {
    color: theme.palette.common.white,
    marginBottom: 20,
    fontWeight: 700,
  },
  "& .address": {
    color: theme.palette.common.white,
    marginTop: 10,
    fontSize: 14,
    width: "56%",
    margin: "0px auto",
  },
  "& .menu_heading": {
    color: theme.palette.common.white,
    marginBottom: 20,
  },
}));

const StyledSectionDivider = styled(Divider)(({ theme }) => ({
  width: 300,
  borderColor: theme.palette.grey[800],
  marginTop: 20,
  marginBottom: 10,
}));

const FooterComponent = () => {
  const handleSocialLinkNavigation = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <StyledFooterMainBox>
      <Container maxWidth="lg">
        <Grid
          container
          alignItems="center"
          direction="column"
          justifyContent="center"
        >
          <Grid item>
            <Box mb={3} textAlign="center">
              <img src="/logo/footer_logo.svg" width={150} />
            </Box>
            {/* <Typography
              className="address"
              color=""
              textAlign="center"
              variant="body1"
            >
              SKINSKA PHARMACEUTICA PRIVATE LIMITED
            </Typography> */}
            <Typography
              className="address"
              color=""
              textAlign="center"
              variant="body1"
            >
              {" "}
              SF 201, Second Floor, Road Number 55, Opp. Peddamma gudi Entrance,
              Jubilee Hills, Hyderabad - 500033
              {/* 4RRM+G4 Morya Grand, 501, Andheri West, Mumbai, Maharashtra 400053 */}

            </Typography>
          </Grid>
         <Grid item xs={12}>
          <Box sx={{ margin: 2, color: "white" }}>
            <Grid container spacing={2} justifyContent="center" wrap="wrap">
              {[
                { label: "About Us", href: "/aboutus" },
                { label: "Return & Refund Policy", href: "/return-refund" },
                { label: "Privacy Policy", href: "/privacyPolicy" },
                { label: "Terms & Conditions", href: "/termsAndConditions" },
                { label: "Contact Us", href: "/contactUs" },
                { label: "FAQs Across All Products", href: "/Faqs" },
                {
                  label: "Shipping & Delivery Policy",
                  href: "/shippingAndDelivery",
                },
              ].map((item, idx) => (
                <Grid item key={idx}>
                  <Link href={item.href} passHref>
                    <Typography
                      component="a"
                      sx={{
                        fontSize: "0.95rem",
                        textDecoration: "none",
                        color: "white",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
          <Grid item xs={12}>
            <StyledSectionDivider />
          </Grid>
          <Grid item alignItems="center" justifyContent="center" container>
            <Grid item>
              <IconButton
                onClick={() => {
                  handleSocialLinkNavigation(SOCIAL_LINKS.insta);
                }}
                sx={(theme) => ({ color: theme.palette.common.white })}
              >
                <AiFillInstagram />
              </IconButton>
            </Grid>
            <Grid item>
              <IconButton
                onClick={() => {
                  handleSocialLinkNavigation(SOCIAL_LINKS.youtube);
                }}
                sx={(theme) => ({ color: theme.palette.common.white })}
              >
                <AiFillYoutube />
              </IconButton>
            </Grid>
            <Grid item>
              <IconButton
                onClick={() => {
                  handleSocialLinkNavigation(SOCIAL_LINKS.facebook);
                }}
                sx={(theme) => ({ color: theme.palette.common.white })}
              >
                <AiFillFacebook />
              </IconButton>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </StyledFooterMainBox>
  );
};

export default FooterComponent;
