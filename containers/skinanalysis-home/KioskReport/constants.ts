import type { TravelKit } from "./types";

export const KIOSK_WIDTH = 720;
export const KIOSK_HEIGHT = 1280;

export const REPORT_GREEN = "#2F5D46";
export const REPORT_GREEN_DARK = "#244A38";
export const REPORT_BORDER = "#D9D9D9";
export const REPORT_MUTED = "#6B7280";
export const MIN_FONT = 20;
export const TITLE_FONT = 26;
export const HEADING_WEIGHT = 800;
export const LOGO_WIDTH = 470;
export const LOGO_HEIGHT = 75;

export const TRAVEL_KITS: TravelKit[] = [
  {
    id: "travel-ready",
    title: "Travel Ready",
    price: 699,
    priceRange: "₹699 - ₹899",
    headerBg: "#C8E6C9",
    accent: "#2E7D32",
    imageUrl: "/kiosk-report/travel-kits/travel-ready.png",
  },
  {
    id: "hydration",
    title: "Hydration",
    price: 999,
    priceRange: "₹999 - ₹1,199",
    headerBg: "#BBDEFB",
    accent: "#1565C0",
    imageUrl: "/kiosk-report/travel-kits/hydration.png",
  },
  {
    id: "sun",
    title: "Sun Care",
    price: 699,
    priceRange: "₹699 - ₹999",
    headerBg: "#FFE0B2",
    accent: "#EF6C00",
    imageUrl: "/kiosk-report/travel-kits/sun.png",
  },
  {
    id: "simple",
    title: "Simple Care",
    price: 899,
    priceRange: "₹899 - ₹1,199",
    headerBg: "#E1BEE7",
    accent: "#7B1FA2",
    imageUrl: "/kiosk-report/travel-kits/simple.png",
  },
];

export const CANONICAL_CONCERNS: Array<{
  keys: string[];
  label: string;
  icon: string;
}> = [
  { keys: ["acne", "pimple", "breakout"], label: "Acne", icon: "mdi:circle-double" },
  {
    keys: ["dark circle", "dark_circle", "darkcircles", "under eye", "undereye"],
    label: "Dark circles",
    icon: "mdi:eye-outline",
  },
  {
    keys: ["pigment", "melasma", "dark spot", "dyschromia", "spots"],
    label: "Pigmentation",
    icon: "mdi:dots-hexagon",
  },
  {
    keys: ["uneven", "texture", "tone"],
    label: "Uneven skin",
    icon: "mdi:dots-grid",
  },
  {
    keys: ["quality", "dull", "radiance", "moisture", "hydration"],
    label: "Moisture",
    icon: "mdi:shimmer",
  },
  {
    keys: ["open pore", "pores"],
    label: "Open pores",
    icon: "mdi:circle-multiple-outline",
  },
  {
    keys: ["wrinkle", "fine line", "fineline", "aging"],
    label: "Wrinkles",
    icon: "mdi:waves",
  },
];

export const FALLBACK_SUMMARY =
  "Primary concerns are pigmentation and dark circles. A routine with brightening actives, hydration, and sun protection is recommended.";
