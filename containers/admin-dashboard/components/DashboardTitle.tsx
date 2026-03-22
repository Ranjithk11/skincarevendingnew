"use client";

import { Box, Typography } from "@mui/material";
import ActionButton from "./ActionButton";
import Image from "next/image";

interface DashboardTitleProps {
  onDashboardClick?: () => void;
  onHomeMachineClick?: () => void;
  onDispenseClick?: () => void;
  onVoiceClick?: () => void;
  onTestClick?: () => void;
  onHideClick?: () => void;
  onLoadProductsClick?: () => void;
  onSettingsClick?: () => void;
}

export default function DashboardTitle({
  onDashboardClick,
  onHomeMachineClick,
  onDispenseClick,
  onVoiceClick,
  onTestClick,
  onHideClick,
  onLoadProductsClick,
  onSettingsClick,
}: DashboardTitleProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        alignItems: "flex-start",
        justifyContent: "center",
        px: "35px",
        py: "28px",
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "11px" }}>
          <Typography
            sx={{
              fontSize: 36,
              fontWeight: 500,
              fontFamily: "Roboto, sans-serif",
              color: "rgba(0,0,0,0.85)",
              lineHeight: "normal",
            }}
          >
            Admin Dashboard
          </Typography>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "Roboto, sans-serif",
              color: "#9a9a9a",
              letterSpacing: "3.2px",
              textTransform: "uppercase",
              lineHeight: "normal",
            }}
          >
            MANAGE AND CONFIGURE AT A GLANCE
          </Typography>
        </Box>

        <ActionButton
          icon={
            <Image
              src="/wending/dashboard-gauge.svg"
              alt="Dashboard"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          }
          label="Dashboard"
          onClick={onDashboardClick}
          width={220}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
        }}
      >
        <ActionButton
          icon={
            <Image
              src="/wending/home.svg"
              alt="Home Machine"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          }
          label="Home Machine"
          onClick={onHomeMachineClick}
        />
        <ActionButton
          icon={
            <Image
              src="/wending/soap-dispenser.svg"
              alt="Dispense"
              width={ 40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          }
          label="Dispense"
          onClick={onDispenseClick}
        />
        <ActionButton
          icon={
            <Image
              src="/wending/voice.svg"
              alt="Voice"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          }
          label="Voice"
          onClick={onVoiceClick}
        />
        <ActionButton
          icon={
            <Image
              src="/wending/test-results.svg"
              alt="Test"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          }
          label="Test"
          onClick={onTestClick}
        />
        <ActionButton
          icon={
            <Image
              src="/wending/blind.svg"
              alt="Hide"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          }
          label="Hide"
          onClick={onHideClick}
        />
          <ActionButton
          icon={
            <Image
              src="/wending/load-cargo.svg"
              alt="Load Products"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          }
          label="Load Products"
          onClick={onLoadProductsClick}
        />
        <ActionButton
          icon={
            <Image
              src="/wending/settings.svg"
              alt="Settings"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          }
          label="Settings"
          onClick={onSettingsClick}
        />
      </Box>

    </Box>
  );
}
