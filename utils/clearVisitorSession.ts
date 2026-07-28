import { store } from "@/redux/store/store";
import { clearCart } from "@/redux/reducers/cartSlice";
import { clearSpinWheelSession } from "@/lib/spin-wheel/session";

/**
 * Reset kiosk visitor state on logout / idle redirect.
 * Clears persisted cart + spin-wheel session so the next visitor starts clean.
 */
export function clearVisitorSession(): void {
  clearSpinWheelSession();
  store.dispatch(clearCart());
}
