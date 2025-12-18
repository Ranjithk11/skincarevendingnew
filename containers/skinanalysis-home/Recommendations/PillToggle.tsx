import { Box } from "@mui/material";
import React from "react";

export interface PillToggleOption<T extends string | number> {
  value: T;
  label: string;
}

interface PillToggleProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: PillToggleOption<T>[];
}

const PillToggle = <T extends string | number>({
  value,
  onChange,
  options,
}: PillToggleProps<T>) => {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 0.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
        }}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Box
              key={String(opt.value)}
              onClick={() => onChange(opt.value)}
              sx={{
                width: 230,
                height: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                borderRadius: "68px",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                userSelect: "none",
                fontFamily:
                  '"SF Pro Display", "SF Pro", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
                fontWeight: 400,
                fontSize: "26px",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: active ? "#ffffff" : "#111827",
                background: active
                  ? "linear-gradient(90deg, #1DC9A0 0%, #316D52 100%)"
                  : "#ffffff",
                boxShadow: active ? "0 10px 22px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {opt.label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PillToggle;
