import React, { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store/store";
import {
  addToCart,
  setCartItemQuantity,
  removeFromCart,
  clearCart,
  CartItem,
} from "@/redux/reducers/cartSlice";

export type { CartItem };

type CartContextValue = {
  items: CartItem[];
  count: number;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  setQuantity: (key: { id?: string; name: string }, quantity: number) => void;
  removeItem: (key: { id?: string; name: string }) => void;
  clear: () => void;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const useCart = (): CartContextValue => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      dispatch(addToCart(item));
    },
    [dispatch]
  );

  const setQuantity = useCallback(
    (key: { id?: string; name: string }, quantity: number) => {
      dispatch(setCartItemQuantity({ key, quantity }));
    },
    [dispatch]
  );

  const removeItem = useCallback(
    (key: { id?: string; name: string }) => {
      dispatch(removeFromCart(key));
    },
    [dispatch]
  );

  const clear = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const count = useMemo(() => items.reduce((sum, i) => sum + (i.quantity || 0), 0), [items]);

  return {
    items,
    count,
    addItem,
    setQuantity,
    removeItem,
    clear,
  };
};
