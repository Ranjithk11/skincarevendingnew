"use client";

import { Button } from "@mui/material";
import { EVERGRIT_FOREST, EVERGRIT_FOREST_DARK } from "./evergritWipesTheme";

type Props = {
  added: boolean;
  available: boolean;
  onAdd: () => void;
};

export default function EvergritWipesAddButton({ added, available, onAdd }: Props) {
  return (
    <Button
      fullWidth
      variant="contained"
      disabled={!available}
      onClick={onAdd}
      sx={{
        textTransform: "none",
        fontSize: 20,
        fontWeight: 700,
        minHeight: 58,
        borderRadius: "14px",
        bgcolor: added ? "#1F7A4D" : EVERGRIT_FOREST,
        boxShadow: available ? "0 8px 18px rgba(47, 93, 70, 0.24)" : "none",
        "&:hover": { bgcolor: added ? "#1F7A4D" : EVERGRIT_FOREST_DARK },
        "&.Mui-disabled": {
          bgcolor: "#d7d2c8",
          color: "#8a8174",
        },
      }}
    >
      {!available
        ? "Not available on this machine"
        : added
          ? "Added to your picks"
          : "Add to my picks"}
    </Button>
  );
}
