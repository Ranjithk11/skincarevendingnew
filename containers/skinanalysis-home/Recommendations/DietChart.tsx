"use client";

import { Box, Card, Container, Divider, Grid, Typography, styled } from "@mui/material";

const PageBackground = styled(Box)(() => ({
  width: "100%",
  minHeight: "100vh",
  paddingTop: 16,
  paddingBottom: 24,
  backgroundImage: "url('/wending/linesbg.svg')",
  backgroundRepeat: "no-repeat",
  backgroundSize: "700px auto",
  backgroundPosition: "top -60px right -180px",
}));

const SectionCard = styled(Card)(() => ({
  width: "80%",
  padding: 16,
  borderRadius: 24,
  border: "1px solid #e5e7eb",
  boxShadow: "none",
  marginBottom: 16,
}));

const Tile = ({ image, label }: { image: string; label: string }) => (
  <Box
    sx={{
      position: "relative",
      width: 180,
      height: 220,
      borderRadius: "8px",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
    }}
  >
    <Box
      component="img"
      src={image}
      alt={label}
      sx={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 70,
        display: "flex",
        alignItems: "flex-end",
        px: 2,
        pb: 2,
        backgroundColor: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
      }}
    >
      <Typography fontSize={20} fontWeight={800} color="#fff" sx={{ lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  </Box>
);

interface DietPlanItem {
  title: string;
  items: string[];
  image: string;
}

interface DietChartProps {
  data?: {
    breakfast: DietPlanItem;
    lunch: DietPlanItem;
    dinner: DietPlanItem;
    snacks: DietPlanItem;
  };
}

const DEFAULT_DIET_DATA: NonNullable<DietChartProps["data"]> = {
  breakfast: { title: "Breakfast", items: [], image: "" },
  lunch: { title: "Lunch", items: [], image: "" },
  dinner: { title: "Dinner", items: [], image: "" },
  snacks: { title: "Snacks", items: [], image: "" },
};

export default function DietChart({ data }: DietChartProps) {
  const resolvedData = data ?? DEFAULT_DIET_DATA;
  return (
    <PageBackground>
      <Container maxWidth={false} sx={{ px: 2 }}>
        {/* HEADER */}
        <Typography sx={{
          mt: 2.5,
          mb: 0.75,
          fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
          fontWeight: 510,
          fontSize: "32px",
          lineHeight: "100%",
          letterSpacing: "0%",
        }}>
          My Diet
        </Typography>
        <Typography
          sx={{
            mt: 2,
            mb: 2.5,
            fontSize: { xs: 18, sm: 24 },
            color: "#6b7280",
            letterSpacing: 1.2,
          }}
        >
          WHAT WE RECOMMEND
        </Typography>

        {/* BREAKFAST */}
        <SectionCard sx={{ width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <Box display="flex" alignItems="center" mb={0.5}>
            <Typography sx={{
              mb: 0.75,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              fontWeight: 700,
              fontSize: "20px",
              lineHeight: "100%",
              letterSpacing: "0%",
            }}>Breakfast</Typography>
            <Box sx={{ flex: 1 }} />
            <Typography fontSize={14} fontWeight={800} color="#f97316">
              Option 1
            </Typography>
          </Box>

          <Typography fontSize={14} color="#000" mb={1.5}>
            Any fresh smoothie, green tea or some nuts
          </Typography>

          <Grid container spacing={1.25} sx={{ pr: "28px" }}>
            <Grid item xs={4}>
              <Tile image="/diet/smoothies.jpg" label="Smoothie" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/greenTea.jpg" label="Green tea" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixednut.jpg" label="Mixed nuts" />
            </Grid>
          </Grid>
        </SectionCard>

        {/* LUNCH OPTION 1 */}
        <SectionCard sx={{ width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <Box display="flex" alignItems="center" mb={0.5}>
            <Typography sx={{
              mb: 0.75,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              fontWeight: 700,
              fontSize: "20px",
              lineHeight: "100%",
              letterSpacing: "0%",
            }} >Lunch</Typography>
            <Box flex={1} />
            <Typography fontSize={11} fontWeight={800} color="#f97316">
              Option 1
            </Typography>
          </Box>

          <Typography fontSize={14} color="#000" mb={1.5}>
            Salmon, Broccoli / Grilled fish or chicken
          </Typography>

          <Grid container spacing={1.25} sx={{ pr: "28px" }}>
            <Grid item xs={4}>
              <Tile image="/diet/bakedSalmon.jpg" label="Baked salmon" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/fish.jpg" label="Grilled fish" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/grilledChicken.png" label="Grilled chicken" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />

          <Box display="flex" alignItems="center" mb={0.5}>
            <Typography sx={{
              mb: 0.75,
              fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
              fontWeight: 700,
              fontSize: "20px",
              lineHeight: "100%",
              letterSpacing: "0%",
            }}>Lunch</Typography>
            <Box flex={1} />
            <Typography fontSize={11} fontWeight={800} color="#22c55e">
              Option 2 (vegetarian)
            </Typography>
          </Box>

          <Typography fontSize={14} color="#000" mb={1.5}>
            Whole grain, mixed vegetables, fruits and nuts
          </Typography>

          <Grid container spacing={1.25} sx={{ pr: "28px" }}>
            <Grid item xs={4}>
              <Tile image="/diet/grain.jpg" label="Whole grain" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixedVeggis.jpg" label="Mixed Veggies" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixednut.jpg" label="Mixed nuts" />
            </Grid>
          </Grid>
        </SectionCard>




        {/* DINNER OPTION 1 */}
        <SectionCard sx={{ mt: 3, width: { xs: "100%", md: 977 }, height: { xs: "auto", md: 475 } }}>
          <Box display="flex" alignItems="center" mb={0.5}>
            <Typography fontWeight={900}>Dinner</Typography>
            <Box flex={1} />
            <Typography fontSize={11} fontWeight={800} color="#f97316">
              Option 1
            </Typography>
          </Box>

          <Typography fontSize={12} color="#374151" mb={1.5}>
            Salmon, Broccoli / Grilled fish or chicken
          </Typography>

          <Grid container spacing={1.25} sx={{ pr: "28px" }}>
            <Grid item xs={4}>
              <Tile image="/diet/bakedSalmon.jpg" label="Baked salmon" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/fish.jpg" label="Grilled fish" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/grilledChicken.png" label="Grilled chicken" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2, borderColor: "#e5e7eb" }} />

          <Box display="flex" alignItems="center" mb={0.5}>
            <Typography fontWeight={900}>Dinner</Typography>
            <Box flex={1} />
            <Typography fontSize={11} fontWeight={800} color="#22c55e">
              Option 2 (vegetarian)
            </Typography>
          </Box>

          <Typography fontSize={12} color="#374151" mb={1.5}>
            Whole grain, mixed vegetables, fruits and nuts
          </Typography>

          <Grid container spacing={1.25} sx={{ pr: "28px" }}>
            <Grid item xs={4}>
              <Tile image="/diet/grain.jpg" label="Whole grain" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixedVeggis.jpg" label="Mixed Veggies" />
            </Grid>
            <Grid item xs={4}>
              <Tile image="/diet/mixednut.jpg" label="Mixed nuts" />
            </Grid>
          </Grid>
        </SectionCard>

      </Container>
    </PageBackground>
  );
}
