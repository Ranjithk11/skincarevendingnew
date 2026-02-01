"use client";

import { useState, useEffect } from "react";
import { Box, IconButton, Typography, Dialog, Button, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface SlotData {
  slot_id: number;
  quantity: number;
}

interface ViewSlotsModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function ViewSlotsModal({
  open,
  onClose,
  productId,
  productName,
}: ViewSlotsModalProps) {
  const [slotsData, setSlotsData] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      fetchSlots();
    }
  }, [open, productId]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const encodedName = encodeURIComponent(productName);
      // Remove 'products/' prefix if present to avoid duplicate path
      const cleanProductId = productId.replace(/^products\//, '');
      const response = await fetch(`/api/admin/products/${cleanProductId}/slots?name=${encodedName}`);
      const data = await response.json();
      setSlotsData(data.slots || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
      setSlotsData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSlotsData([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          p: 3,
          maxWidth: 500,
          width: "90%",
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: -8,
            right: -8,
            mt:2
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          sx={{ fontWeight: 700, fontSize: 28, mb: 4, pr: 4, color: "#16a34a" ,mt:2}}
        >
          SLOTS FOR {productName?.toUpperCase()}
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : slotsData.length > 0 ? (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                pb: 1,
                borderBottom: "1px solid #e0e0e0",
                mb: 1,
                bgcolor: "#f5f5f5",
                p: 1,
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize:28,color: "#666" }}>
                SLOT
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize:28,color: "#666" }}>
                QUANTITY
              </Typography>
            </Box>
            {slotsData.map((slot) => (
              <Box
                key={slot.slot_id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1,
                  py: 1,
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize:24,color: "#666" }}>{slot.slot_id}</Typography>
                <Typography sx={{ fontWeight: 600, fontSize:24,color: "#666" }}>{slot.quantity}</Typography>
              </Box>
            ))}
          </>
        ) : (
          <Typography sx={{ py: 4, textAlign: "center",fontSize:24, color: "#666" }}>
            No slots assigned to this product
          </Typography>
        )}

        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              bgcolor: "#6b7280",
              "&:hover": { bgcolor: "#4b5563" },
              textTransform: "none",
              px: 4,
              fontSize:24,
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
