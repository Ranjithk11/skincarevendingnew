"use client";

import { Box, Button, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PhoneInTalkOutlinedIcon from "@mui/icons-material/PhoneInTalkOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";

interface ConsultationConfirmedProps {
  phone?: string;
  preferredTimeLabel?: string;
  onGoHome: () => void;
}

export default function ConsultationConfirmed({
  phone,
  preferredTimeLabel,
  onGoHome,
}: ConsultationConfirmedProps) {
  const phoneDisplay = phone?.trim() || "your registered number";
  const timeDisplay = preferredTimeLabel?.trim();

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        py: 4,
      }}
    >
      <Box
        sx={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          bgcolor: "rgba(16, 185, 129, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 3,
        }}
      >
        <CheckCircleRoundedIcon sx={{ fontSize: 72, color: "#2d5a3d" }} />
      </Box>

      <Typography
        sx={{
          fontWeight: 700,
          fontSize: { xs: 36, md: 44 },
          color: "#111827",
          mb: 1,
        }}
      >
        Thank you!
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 20, md: 24 },
          color: "#4b5563",
          mb: 4,
        }}
      >
        Your consultation is confirmed.
      </Typography>

      <Box
        sx={{
          width: "min(520px, 100%)",
          bgcolor: "#ECFDF5",
          borderRadius: "20px",
          p: 3,
          mb: 4,
          border: "1px solid rgba(45, 90, 61, 0.15)",
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 18,
            color: "#111827",
            mb: 2,
          }}
        >
          Here&apos;s what happens next:
        </Typography>

        {[
          {
            icon: CalendarMonthOutlinedIcon,
            text: timeDisplay ? (
              <>
                Our expert will call you during{" "}
                <Box component="span" sx={{ fontWeight: 700, color: "#2d5a3d" }}>
                  {timeDisplay}
                </Box>
              </>
            ) : (
              <>
                Our expert will call you{" "}
                <Box component="span" sx={{ fontWeight: 700, color: "#2d5a3d" }}>
                  within 1 business day
                </Box>
              </>
            ),
          },
          {
            icon: PhoneInTalkOutlinedIcon,
            text: (
              <>
                We will call you on{" "}
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {phoneDisplay}
                </Box>
              </>
            ),
          },
          {
            icon: NotificationsActiveOutlinedIcon,
            text: "Keep your phone nearby",
          },
        ].map(({ icon: Icon, text }) => (
          <Box
            key={String(text)}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              mb: 2,
              "&:last-child": { mb: 0 },
            }}
          >
            <Icon sx={{ fontSize: 24, color: "#2d5a3d", mt: 0.25, flexShrink: 0 }} />
            <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: "#374151", lineHeight: 1.5 }}>
              {text}
            </Typography>
          </Box>
        ))}
      </Box>

      <Button
        fullWidth
        onClick={onGoHome}
        sx={{
          width: "min(520px, 100%)",
          py: 2.5,
          textTransform: "none",
          fontSize: { xs: 20, md: 24 },
          fontWeight: 600,
          color: "#fff",
          bgcolor: "#2d5a3d",
          borderRadius: "16px",
          "&:hover": { bgcolor: "#234a32" },
        }}
      >
        Go to Home
      </Button>
    </Box>
  );
}
