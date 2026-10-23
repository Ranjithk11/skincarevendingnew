"use client";

import { Box, Stack, Typography } from "@mui/material";
import EvergritWipesInfoBlock from "./EvergritWipesInfoBlock";
import { EVERGRIT_FOREST, EVERGRIT_GOLD } from "./evergritWipesTheme";

const PRODUCT_BENEFITS =
  " Helps remove sweat, dirt, outdoor grime and sunscreen residue while providing a refreshing, cooling sensation. Its portable, individually packed wipes offer convenient cleansing without water.";

export default function EvergritWipesCopy() {
  return (
    <Box sx={{ textAlign: "center", px: 0.5 }}>
     
      
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 800,
          color: EVERGRIT_FOREST,
          lineHeight: 1.15,
          mb: 1.5,
        }}
      >
        Evergrit Reset Wipes
      </Typography>
      <Stack spacing={1}>
        <EvergritWipesInfoBlock title="Product Benefits" body={PRODUCT_BENEFITS} />
      </Stack>
    </Box>
  );
}
