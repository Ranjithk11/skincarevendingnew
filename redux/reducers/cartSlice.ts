"use client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CartItem = {
  id?: string;
  name: string;
  imageUrl?: string;
  priceText?: string;
  originalPrice?: number;
  discountValue?: number;
  quantity: number;
  slotId?: number;
};

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Omit<CartItem, "quantity"> & { quantity?: number }>) => {
      const item = action.payload;
      const qty = item.quantity ?? 1;
      const index = state.items.findIndex((p) => (item.id ? p.id === item.id : p.name === item.name));
      
      if (index === -1) {
        state.items.push({ ...item, quantity: qty });
      } else {
        state.items[index].quantity += qty;
      }
    },
    setCartItemQuantity: (state, action: PayloadAction<{ key: { id?: string; name: string }; quantity: number }>) => {
      const { key, quantity } = action.payload;
      const nextQty = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
      const index = state.items.findIndex((p) => (key.id ? p.id === key.id : p.name === key.name));
      
      if (index === -1) return;
      
      if (nextQty <= 0) {
        state.items.splice(index, 1);
      } else {
        state.items[index].quantity = nextQty;
      }
    },
    removeFromCart: (state, action: PayloadAction<{ id?: string; name: string }>) => {
      const key = action.payload;
      state.items = state.items.filter((p) => (key.id ? p.id !== key.id : p.name !== key.name));
    },
    clearCart: (state) => {
      state.items = [];
    },
  },
});

export const { addToCart, setCartItemQuantity, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
