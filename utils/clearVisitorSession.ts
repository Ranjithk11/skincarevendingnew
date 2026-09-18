import { store } from "@/redux/store/store";
import { clearCart } from "@/redux/reducers/cartSlice";
import { clearSpinWheelSession } from "@/lib/spin-wheel/session";
import { clearBrowseReturn } from "@/lib/kiosk-browse-return";

/**
 * Reset kiosk visitor state on logout / idle redirect.
 * Clears persisted cart + spin-wheel session so the next visitor starts clean.
 */
export function clearVisitorSession(): void {
  clearSpinWheelSession();
  clearBrowseReturn();
  store.dispatch(clearCart());
}
