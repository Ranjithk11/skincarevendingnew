import type { TravelKit } from "./types";

export const KIOSK_WIDTH = 720;
export const KIOSK_HEIGHT = 1280;

/** Page / layout tokens (720×1280 CSS-pixel target). */
export const PAGE_PADDING_X = 32;
export const SECTION_GAP = 10;
export const CARD_GAP = 10;
export const RADIUS_LG = "14px";
export const RADIUS_MD = "10px";
export const RADIUS_SM = "7px";

export const REPORT_GREEN = "#2F5D46";
export const REPORT_GREEN_DARK = "#244A38";
export const REPORT_BORDER = "#d7e5da";
export const REPORT_MUTED = "#6B7280";
export const REPORT_LIGHT_GREEN = "#edf6ed";

/** Typography (kiosk report sections — not Scan to Pay). */
export const TITLE_SIZE = 26;
export const HEADING_SIZE = 20;
export const BODY_SIZE = 18;
export const SMALL_SIZE = 16;

/** Kept for ScanToPaySection (do not change that section’s look). */
export const MIN_FONT = 20;
export const TITLE_FONT = 26;
export const HEADING_WEIGHT = 700;

export const LOGO_WIDTH = 250;
export const LOGO_HEIGHT = 66;

/** Section heights / key dimensions. */
export const HEADER_HEIGHT = 100;
export const ANALYSIS_SECTION_HEIGHT = 210;
export const SCAN_PHOTO_WIDTH = 190;
export const SCAN_PHOTO_HEIGHT = 200;
export const HEALTH_BADGE_WIDTH = 325;
export const HEALTH_BADGE_HEIGHT = 48;
export const HEALTH_STATUS_FONT = 22;
export const CONCERN_ICON_SIZE = 45;
export const CONCERN_LABEL_FONT = 12;
export const SUMMARY_MIN_HEIGHT = 78;
export const PRODUCT_CARD_HEIGHT = 180;
export const PRODUCT_IMAGE_WIDTH = 110;
export const PRODUCT_IMAGE_HEIGHT = 120;
export const PRODUCT_CHECKBOX_SIZE = 22;
export const TRAVEL_CARD_HEIGHT = 180;
export const TRAVEL_GRID_GAP = 9;

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
    label: "Dark Circles",
    icon: "mdi:eye-outline",
  },
  {
    keys: ["pigment", "melasma", "dark spot", "dyschromia", "spots"],
    label: "Pigmentation",
    icon: "mdi:dots-hexagon",
  },
  {
    keys: ["uneven", "texture", "tone"],
    label: "Uneven Skin",
    icon: "mdi:dots-grid",
  },
  {
    keys: ["quality", "dull", "radiance", "moisture", "hydration"],
    label: "Skin Quality",
    icon: "mdi:shimmer",
  },
  {
    keys: ["wrinkle", "fine line", "fineline", "aging"],
    label: "Wrinkles",
    icon: "mdi:waves",
  },
];

export const FALLBACK_SUMMARY =
  "Pigmentation and dark circles are primary concerns. Brightening, hydration, and SPF are recommended.";
