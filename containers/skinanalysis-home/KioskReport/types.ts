export type ReportProduct = {
  id: string;
  name: string;
  imageUrl: string;
  retailPrice: number;
  payablePrice: number;
  discountValue: number;
  slotId?: number;
  slotNumbers: number[];
  volumeLabel: string;
  category: string;
  /** Travel kits are paid on kiosk but handed over manually by an agent. */
  isTravelKit?: boolean;
};

export type ConcernItem = {
  key: string;
  label: string;
  icon: string;
};

export type ChipTone = {
  bg: string;
  border: string;
  dot: string;
};

export type SkinTypeId = "normal" | "dry" | "oily" | "combination" | "sensitive";

export type HealthRating = {
  rating: string;
  color: string;
  pillBg: string;
};

export type TravelKit = {
  id: string;
  title: string;
  price: number;
  priceRange: string;
  headerBg: string;
  accent: string;
  /** Optional legacy icon id; prefer imageUrl for kit cards. */
  icon?: string;
  imageUrl: string;
};
