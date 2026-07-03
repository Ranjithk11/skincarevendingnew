"use client";

import { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Typography,
  Dialog,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

interface SlotData {
  slot_id: number;
  quantity: number;
}

interface ViewSlotsModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onUpdated?: () => void;
}

const MAX_QTY_PER_SLOT = 10;

export default function ViewSlotsModal({
  open,
  onClose,
  productId,
  productName,
  onUpdated,
}: ViewSlotsModalProps) {
  const [slotsData, setSlotsData] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [originalQuantity, setOriginalQuantity] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && productId) {
      fetchSlots();
    }
  }, [open, productId, productName]);

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const encodedName = encodeURIComponent(productName);
      const cleanProductId = productId.replace(/^products\//, "");
      const response = await fetch(
        `/api/admin/products/${cleanProductId}/slots?name=${encodedName}`
      );
      const data = await response.json();
      const slots = (data.slots || []).map((slot: SlotData) => ({
        slot_id: Number(slot.slot_id),
        quantity: Number(slot.quantity ?? 0),
      }));
      setSlotsData(slots);
    } catch (err) {
      console.error("Error fetching slots:", err);
      setSlotsData([]);
      setError("Failed to load slot details.");
    } finally {
      setLoading(false);
    }
  };

  const totalQuantity = slotsData.reduce((sum, slot) => sum + (slot.quantity || 0), 0);

  const clampQuantity = (value: number) =>
    Math.max(0, Math.min(MAX_QTY_PER_SLOT, Math.trunc(Number.isFinite(value) ? value : 0)));

  const startEdit = (slot: SlotData) => {
    const current = clampQuantity(Number(slot.quantity ?? 0));
    setEditingSlotId(slot.slot_id);
    setOriginalQuantity(current);
    setEditQuantity(current);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingSlotId(null);
    setOriginalQuantity(0);
    setEditQuantity(0);
    setError(null);
  };

  const saveQuantity = async (slotId: number) => {
    const nextQty = clampQuantity(editQuantity);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: nextQty }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update quantity");
      }

      setSlotsData((prev) =>
        prev.map((slot) =>
          slot.slot_id === slotId ? { ...slot, quantity: nextQty } : slot
        )
      );
      setEditingSlotId(null);
      onUpdated?.();
    } catch (err) {
      console.error("Error updating slot quantity:", err);
      setError(err instanceof Error ? err.message : "Failed to update quantity.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSlotsData([]);
    setEditingSlotId(null);
    setError(null);
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
          maxWidth: 620,
          width: "92%",
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={handleClose}
          sx={{ position: "absolute", top: -8, right: -8, mt: 2 }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          sx={{ fontWeight: 700, fontSize: 26, mb: 1, pr: 4, color: "#16a34a", mt: 2 }}
        >
          SLOTS FOR {productName?.toUpperCase()}
        </Typography>

        {!loading && slotsData.length > 0 && (
          <Typography sx={{ fontSize: 18, color: "#666", mb: 2 }}>
            Total in machine: <strong>{totalQuantity}</strong> units across {slotsData.length}{" "}
            slot{slotsData.length === 1 ? "" : "s"}. Tap the pen to change quantity per slot (max{" "}
            {MAX_QTY_PER_SLOT} each).
          </Typography>
        )}

        {error && (
          <Typography sx={{ fontSize: 16, color: "#dc2626", mb: 2 }}>{error}</Typography>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : slotsData.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {slotsData.map((slot) => {
              const isEditing = editingSlotId === slot.slot_id;
              const hasChange = isEditing && editQuantity !== originalQuantity;

              return (
                <Box
                  key={slot.slot_id}
                  sx={{
                    border: isEditing ? "2px solid #16a34a" : "1px solid #e5e7eb",
                    borderRadius: "12px",
                    p: 2,
                    bgcolor: isEditing ? "#f0fdf4" : "#fff",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 14, color: "#9ca3af", textTransform: "uppercase" }}>
                        Slot
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: 28, color: "#111" }}>
                        {slot.slot_id}
                      </Typography>
                    </Box>

                    {!isEditing ? (
                      <>
                        <Box sx={{ textAlign: "center", flex: 1 }}>
                          <Typography sx={{ fontSize: 14, color: "#9ca3af" }}>Quantity</Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: 28, color: "#111" }}>
                            {slot.quantity}
                          </Typography>
                        </Box>
                        <IconButton
                          onClick={() => startEdit(slot)}
                          aria-label={`Edit quantity for slot ${slot.slot_id}`}
                          sx={{
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            p: 1,
                          }}
                        >
                          <EditOutlinedIcon sx={{ fontSize: 26, color: "#323232" }} />
                        </IconButton>
                      </>
                    ) : null}
                  </Box>

                  {isEditing && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #bbf7d0" }}>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 3,
                          mb: 2,
                          flexWrap: "wrap",
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: 16, color: "#6b7280" }}>
                            Current count
                          </Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: 32, color: "#374151" }}>
                            {originalQuantity}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 16, color: "#16a34a" }}>
                            New count
                          </Typography>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: 32,
                              color: hasChange ? "#16a34a" : "#111",
                            }}
                          >
                            {editQuantity}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography sx={{ fontSize: 16, color: "#6b7280", mb: 1 }}>
                        Adjust quantity (0–{MAX_QTY_PER_SLOT})
                      </Typography>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <IconButton
                          onClick={() => setEditQuantity((q) => clampQuantity(q - 1))}
                          disabled={saving}
                          sx={{
                            width: 48,
                            height: 48,
                            border: "2px solid #16a34a",
                            color: "#16a34a",
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>

                        <TextField
                          type="number"
                          value={editQuantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setEditQuantity(0);
                              return;
                            }
                            const parsed = parseInt(val, 10);
                            if (!Number.isNaN(parsed)) {
                              setEditQuantity(clampQuantity(parsed));
                            }
                          }}
                          inputProps={{ min: 0, max: MAX_QTY_PER_SLOT }}
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": {
                              height: 48,
                              fontSize: 24,
                              fontWeight: 700,
                              "& fieldset": { borderColor: "#16a34a", borderWidth: 2 },
                            },
                            "& input": { textAlign: "center" },
                          }}
                        />

                        <IconButton
                          onClick={() => setEditQuantity((q) => clampQuantity(q + 1))}
                          disabled={saving || editQuantity >= MAX_QTY_PER_SLOT}
                          sx={{
                            width: 48,
                            height: 48,
                            border: "2px solid #16a34a",
                            color: "#16a34a",
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: "flex", gap: 1.5 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => saveQuantity(slot.slot_id)}
                          disabled={saving}
                          sx={{
                            height: 48,
                            bgcolor: "#16a34a",
                            textTransform: "none",
                            fontSize: 18,
                            fontWeight: 600,
                          }}
                        >
                          {saving ? "Saving..." : `Save (${originalQuantity} → ${editQuantity})`}
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={cancelEdit}
                          disabled={saving}
                          sx={{
                            height: 48,
                            textTransform: "none",
                            fontSize: 18,
                            borderColor: "#9ca3af",
                            color: "#374151",
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography sx={{ py: 4, textAlign: "center", fontSize: 24, color: "#666" }}>
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
              fontSize: 20,
              height: 48,
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
