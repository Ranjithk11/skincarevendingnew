import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type CartItem = {
  id?: string;
  name: string;
  imageUrl?: string;
  priceText?: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  setQuantity: (key: { id?: string; name: string }, quantity: number) => void;
  removeItem: (key: { id?: string; name: string }) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    const qty = item.quantity ?? 1;
    setItems((prev) => {
      const index = prev.findIndex((p) => (item.id ? p.id === item.id : p.name === item.name));
      if (index === -1) {
        return [...prev, { ...item, quantity: qty }];
      }
      const next = [...prev];
      next[index] = { ...next[index], quantity: next[index].quantity + qty };
      return next;
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const setQuantity = useCallback((key: { id?: string; name: string }, quantity: number) => {
    const nextQty = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
    setItems((prev) => {
      const index = prev.findIndex((p) => (key.id ? p.id === key.id : p.name === key.name));
      if (index === -1) return prev;

      if (nextQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      const next = [...prev];
      next[index] = { ...next[index], quantity: nextQty };
      return next;
    });
  }, []);

  const removeItem = useCallback((key: { id?: string; name: string }) => {
    setItems((prev) => prev.filter((p) => (key.id ? p.id !== key.id : p.name !== key.name)));
  }, []);

  const count = useMemo(() => items.reduce((sum, i) => sum + (i.quantity || 0), 0), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, count, addItem, setQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      items: [] as CartItem[],
      count: 0,
      addItem: () => {},
      setQuantity: () => {},
      removeItem: () => {},
      clear: () => {},
    };
  }
  return ctx;
};
