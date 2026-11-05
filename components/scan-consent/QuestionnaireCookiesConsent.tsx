"use client";

import { useState } from "react";
import { Box, Checkbox, Typography } from "@mui/material";
import CookiesTermsPopup from "./CookiesTermsPopup";

type Props = {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
};

export default function QuestionnaireCookiesConsent({ accepted, onChange }: Props) {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 3,
          py: 1.25,
          flexShrink: 0,
        }}
      >
        <Checkbox
          checked={accepted}
          onChange={(event) => onChange(event.target.checked)}
          sx={{
            p: 0.5,
            color: "#9ca3af",
            "&.Mui-checked": { color: "#2d5a3d" },
            "& .MuiSvgIcon-root": { fontSize: 36 },
          }}
        />
        <Typography sx={{ fontSize: 22, color: "#1a1a1a", lineHeight: 1.3, flex: 1 }}>
          Please accept cookies to proceed{" "}
          <Box
            component="button"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setTermsOpen(true);
            }}
            sx={{
              m: 0,
              p: 0,
              border: 0,
              bgcolor: "transparent",
              color: "#2d5a3d",
              fontWeight: 700,
              fontSize: "inherit",
              fontFamily: "inherit",
              textDecoration: "underline",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            T&amp;C
          </Box>
        </Typography>
      </Box>
      <CookiesTermsPopup open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}
