"use client";
import React from "react";
import { Box, Typography, Container, Stack, Link } from "@mui/material";
import { Email, LocationOn, Phone } from "@mui/icons-material";
import PageBackground from "@/components/ui/PageBackground";

const ContactUs = () => {
  return (
    <PageBackground showGreenCurve>
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography variant="h4" align="center" gutterBottom fontWeight={600}>
          Contact Us
        </Typography>

        <Stack spacing={4} mt={4}>
          {/* Address */}
          <Box display="flex" alignItems="flex-start" gap={2}>
            <LocationOn color="primary" />
            <Typography>
              SF 201, Second Floor, Road Number 55, Opp. Peddamma Gudi Entrance, Jubilee Hills,
              Hyderabad - 500033
              {/* 4RRM+G4 Morya Grand, 501, Andheri West, Mumbai, Maharashtra 400053 */}
            </Typography>
          </Box>

          {/* Phone */}
          <Box display="flex" alignItems="center" gap={2}>
            <Phone color="primary" />
            <Typography
              component="a"
              href="tel:+918977016605"
              sx={{ textDecoration: "none", color: "inherit" }}
            >
              +91 89770 16605
            </Typography>
          </Box>

          {/* Email */}
          <Box display="flex" alignItems="center" gap={2}>
            <Email color="primary" />
            <Typography
              component="a"
              href="mailto:reachleafwater@gmail.com"
              sx={{ textDecoration: "none", color: "inherit" }}
            >
              reachleafwater@gmail.com
            </Typography>
          </Box>
        </Stack>
      </Container>
    </PageBackground>
  );
};

export default ContactUs;
