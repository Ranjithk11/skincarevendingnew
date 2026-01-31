"use client";

import { Box, Typography, Modal, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

interface MachineStatusModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  isSuccess: boolean | null;
  successMessage: string;
  errorMessage: string;
  successSubMessage?: string;
  errorSubMessage?: string;
  isLoading?: boolean;
}

export default function MachineStatusModal({
  open,
  onClose,
  title,
  isSuccess,
  successMessage,
  errorMessage,
  successSubMessage = "Connected to machine",
  errorSubMessage = "Failed to connect to the machine",
  isLoading = false,
}: MachineStatusModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: 400,
          bgcolor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          outline: "none",
          border: "3px solid #1976d2",
          position: "relative",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            py: 2,
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 600,
              color: "#333",
            }}
          >
            {title}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 4,
            px: 3,
          }}
        >
          {isLoading ? (
            <>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  border: "4px solid #e0e0e0",
                  borderTopColor: "#1976d2",
                  animation: "spin 1s linear infinite",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
              <Typography
                sx={{
                  mt: 2,
                  fontSize: 16,
                  color: "#666",
                }}
              >
                Sending command...
              </Typography>
            </>
          ) : isSuccess === true ? (
            <>
              <CheckCircleIcon
                sx={{
                  fontSize: 60,
                  color: "#4caf50",
                }}
              />
              <Typography
                sx={{
                  mt: 2,
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#4caf50",
                }}
              >
                {successMessage}
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 14,
                  color: "#666",
                }}
              >
                {successSubMessage}
              </Typography>
            </>
          ) : isSuccess === false ? (
            <>
              <CancelIcon
                sx={{
                  fontSize: 60,
                  color: "#f44336",
                }}
              />
              <Typography
                sx={{
                  mt: 2,
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#f44336",
                }}
              >
                {errorMessage}
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 14,
                  color: "#666",
                }}
              >
                {errorSubMessage}
              </Typography>
            </>
          ) : null}
        </Box>
      </Box>
    </Modal>
  );
}
