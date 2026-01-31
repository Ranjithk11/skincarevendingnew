"use client";

import { ActionButton, FeatureCard, Logo, PageBackground } from "@/components/ui";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function DesktopLandingPage() {
  const router = useRouter();

  const handleStartScan = () => {
    router.push("/questionnaire");
  };

  return (
    <PageBackground>
      <Box
        sx={{
          width: "100%",
          px: { md: 6, lg: 8 },
          pt: { md: 4, lg: 5 },
          pb: { md: 4, lg: 5 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            mb: { md: 4, lg: 5 },
          }}
        >
          <Logo />
          <ActionButton
            variant="outline"
            icon={<Image src="/wending/productlog.svg" alt="Products" width={24} height={24} />}
            onClick={() => router.push("/products")}
          >
            Browse Products
          </ActionButton>
        </Box>

        <Box sx={{ width: "100%", mb: { md: 5, lg: 6 } }}>
          <Typography
            component="h1"
            sx={{
              fontWeight: 700,
              color: "#1a1a1a",
              lineHeight: 1.2,
              mb: 2,
              fontSize: { md: "2.5rem", lg: "3rem" },
            }}
          >
            Ready to transform your skin with AI? Scan Now.
          </Typography>
          <Typography
            sx={{
              color: "#4a4a4a",
              lineHeight: 1.6,
              fontSize: { md: "1.05rem", lg: "1.15rem" },
              mt: 2,
              mb: 3,
              maxWidth: { md: 900, lg: 1000 },
            }}
          >
            Discover personalized skincare recommendations powered by AI technology
          </Typography>

          <ActionButton
            variant="primary"
            fullWidth
            icon={<Image src="/wending/scanlogo.svg" alt="Scan" width={22} height={22} />}
            onClick={handleStartScan}
          >
            Start AI Skin Scan
          </ActionButton>
        </Box>

        <Box sx={{ position: "relative", width: "100%", mb: { md: 5, lg: 6 } }}>
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
              d="M100,100 L100,0 Q70,20 40,50 Q15,75 0,100 L0,100 Z"
              fill="rgba(159, 249, 159, 0.42)"
            />
          </Box>

          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: { md: 460, lg: 520 },
              zIndex: 1,
            }}
          >
            <Image
              src="/wending/img.svg"
              alt="Woman applying skincare"
              fill
              style={{ objectFit: "contain", objectPosition: "bottom center" }}
              priority
              sizes="100vw"
            />
          </Box>
        </Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "stretch",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ flex: "1 1 520px", minWidth: 360 }}>
            <FeatureCard
              label="LEARN MORE"
              title="AI Powered Analysis"
              description="Deep insights into your skin, powered by intelligent diagnostics."
            />
          </Box>

          {/* <Box
            sx={{
              flex: "0 1 340px",
              minWidth: 280,
              bgcolor: "rgba(255,255,255,0.75)",
              borderRadius: 3,
              p: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                color: "#1a1a1a",
                fontSize: { md: "1.1rem", lg: "1.2rem" },
              }}
            >
              Scan the QR to continue
            </Typography>
            <Typography sx={{ color: "#4a4a4a", lineHeight: 1.6 }}>
              Open the link on your phone to view your personalized routine and products.
            </Typography>
            <Box
              sx={{
                alignSelf: "flex-start",
                bgcolor: "#fff",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Image src="/wending/qr.svg" alt="QR" width={160} height={160} />
            </Box>
          </Box> */}
        </Box>
      </Box>
    </PageBackground>
  );
}
