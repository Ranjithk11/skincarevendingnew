import {
  buildSlotsMap,
  findProductInMap,
  getSlotDiscountMap,
  getSlotInfoForProduct,
  getSlotRetailPriceForProduct,
  indexProductsById,
  mergeCatalogWithSlotProducts,
  normalizeProductDiscount,
  normalizeProductId,
} from "@/lib/product-slot-utils";
import { getCatalogProductImageUrl } from "@/lib/catalog-products";
import {
  CANONICAL_CONCERNS,
  FALLBACK_SUMMARY,
  TRAVEL_KIT_AVAILABLE_FROM_HOUR_IST,
  TRAVEL_KIT_AVAILABLE_UNTIL_HOUR_IST,
} from "./constants";
import type { ChipTone, ConcernItem, HealthRating, ReportProduct, SkinRoutine, SkinTypeId, TravelKit } from "./types";

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** IST hour 0–23 (Asia/Kolkata). */
export function getIstHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hourRaw = Number(parts.find((p) => p.type === "hour")?.value || "0");
  return hourRaw === 24 ? 0 : hourRaw;
}

/** Cached admin "staff on duty" flag for travel kits (default: available). */
let travelKitsStaffAvailableCache = true;

export function getTravelKitsStaffAvailableCached(): boolean {
  return travelKitsStaffAvailableCache;
}

/** Refresh staff toggle from admin setting. Safe to call often. */
export async function refreshTravelKitsStaffAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/travel-kits", { cache: "no-store" });
    const data = await res.json();
    if (data?.success) {
      travelKitsStaffAvailableCache = data.staffAvailable !== false;
    }
  } catch {
    // Keep last known value on network errors
  }
  return travelKitsStaffAvailableCache;
}

export type TravelKitAvailabilityReason = "ok" | "hours" | "staff";

export function getTravelKitAvailability(now = new Date()): {
  available: boolean;
  reason: TravelKitAvailabilityReason;
} {
  if (!travelKitsStaffAvailableCache) {
    return { available: false, reason: "staff" };
  }
  const hour = getIstHour(now);
  const inHours =
    hour >= TRAVEL_KIT_AVAILABLE_FROM_HOUR_IST &&
    hour < TRAVEL_KIT_AVAILABLE_UNTIL_HOUR_IST;
  if (!inHours) {
    return { available: false, reason: "hours" };
  }
  return { available: true, reason: "ok" };
}

/** Travel kits require staff — IST hours AND admin staff-available toggle. */
export function isTravelKitPurchaseAvailable(now = new Date()): boolean {
  return getTravelKitAvailability(now).available;
}

function isBabyProduct(product: any): boolean {
  const text = normalizeText(
    [
      product?.name,
      product?.productCategory?.title,
      product?.category,
      product?.productUse,
      product?.productBenefits,
      product?.brand?.name,
      product?.productBrand?.name,
    ].join(" ")
  );
  return /\bbaby\b|\binfant\b|\bnewborn\b/.test(text);
}

export function getReportSource(analysisData: any) {
  const candidates = [
    analysisData?.data?.[0],
    analysisData?.data?.productRecommendation,
    analysisData?.productRecommendation,
    analysisData?.data,
    analysisData,
  ];
  // Prefer the object that actually carries recommendedProducts.
  const withRecs = candidates.find(
    (c) =>
      c &&
      typeof c === "object" &&
      !Array.isArray(c) &&
      (c.recommendedProducts?.highRecommendation ||
        c.productRecommendation?.recommendedProducts?.highRecommendation)
  );
  if (withRecs) return withRecs;
  return candidates.find((c) => c && typeof c === "object" && !Array.isArray(c)) || null;
}

export function computeOverallHealth(reportSource: any): HealthRating {
  const skinMetrics = reportSource?.skinMetrics;
  const fallback = String(reportSource?.skinHealthScore?.rating || "NEEDS CARE").toUpperCase();

  const toRating = (avgReversed: number): HealthRating => {
    if (avgReversed >= 80) return { rating: "GOOD", color: "#16A34A", pillBg: "#E8F5E9" };
    if (avgReversed >= 40) return { rating: "MODERATE", color: "#F59E0B", pillBg: "#FFF7ED" };
    return { rating: "NEEDS CARE", color: "#E53935", pillBg: "#FCE4EC" };
  };

  if (!skinMetrics) {
    if (fallback.includes("GOOD") || fallback.includes("OPTIMAL")) {
      return { rating: "GOOD", color: "#16A34A", pillBg: "#E8F5E9" };
    }
    if (fallback.includes("MODERATE")) {
      return { rating: "MODERATE", color: "#F59E0B", pillBg: "#FFF7ED" };
    }
    return { rating: "NEEDS CARE", color: "#E53935", pillBg: "#FCE4EC" };
  }

  const entries = Array.isArray(skinMetrics)
    ? skinMetrics.map((m: any) => m?.score).filter((s: any) => typeof s === "number")
    : Object.values(skinMetrics)
        .map((v: any) => v?.score ?? v)
        .filter((s: any) => typeof s === "number");

  if (entries.length === 0) {
    return { rating: fallback || "NEEDS CARE", color: "#E53935", pillBg: "#FCE4EC" };
  }

  const avgReversed =
    entries.reduce((sum: number, s: number) => sum + (100 - s), 0) / entries.length;
  return toRating(avgReversed);
}

function toConcernLabel(raw: string) {
  const token = normalizeText(raw);
  const canonical = CANONICAL_CONCERNS.find((c) =>
    c.keys.some((k) => token.includes(k) || k.includes(token))
  );
  if (canonical) return canonical.label;

  return raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function iconForLabel(label: string): string {
  const token = normalizeText(label);
  const match = CANONICAL_CONCERNS.find((c) =>
    c.keys.some((k) => token.includes(k) || k.includes(token))
  );
  return match?.icon || "mdi:circle-outline";
}

/** Prefer MediaPipe scan concerns when present (from AI Face Scan session). */
export function mapMediapipeConcerns(
  stored: Array<{ code: string; name: string; value: number }> | null | undefined
): ConcernItem[] {
  if (!stored?.length) return [];
  const items: ConcernItem[] = [];
  const seen = new Set<string>();
  for (const s of stored) {
    const label = toConcernLabel(s.name || s.code);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    items.push({
      key: label,
      label,
      icon: iconForLabel(label),
    });
  }
  // Match live scan panel: up to 5 top visual signals.
  return items.slice(0, 5);
}

export function mapConcerns(reportSource: any): ConcernItem[] {
  const fromApi = Array.isArray(reportSource?.keyConcerns) ? reportSource.keyConcerns : [];
  const metrics = reportSource?.skinMetrics;
  const attributes = Array.isArray(reportSource?.detectedAttributes)
    ? reportSource.detectedAttributes
    : [];

  const items: ConcernItem[] = [];
  const seen = new Set<string>();

  const push = (rawLabel: string) => {
    const label = toConcernLabel(rawLabel);
    if (!label || seen.has(label)) return;
    seen.add(label);
    items.push({
      key: label,
      label,
      icon: iconForLabel(label),
    });
  };

  fromApi.forEach((item: any) => {
    if (item?.name) push(String(item.name));
  });

  if (Array.isArray(metrics)) {
    metrics.forEach((m: any) => {
      if (m?.label) push(String(m.label));
      else if (m?.key) push(String(m.key));
    });
  } else if (metrics && typeof metrics === "object") {
    Object.keys(metrics).forEach((key) => push(key));
  }

  attributes.forEach((attr: any) => {
    if (typeof attr === "string") push(attr);
    else if (attr?.name) push(String(attr.name));
    else if (attr?.attribute) push(String(attr.attribute));
  });

  if (items.length === 0) {
    return CANONICAL_CONCERNS.map((c) => ({
      key: c.label,
      label: c.label,
      icon: c.icon,
    }));
  }

  return items.slice(0, 6);
}

export function extractSkinType(reportSource: any): SkinTypeId {
  const raw = normalizeText(
    reportSource?.skinType ||
      reportSource?.skin_type ||
      reportSource?.user?.skinType ||
      reportSource?.productRecommendation?.skinType ||
      ""
  );
  if (raw.includes("oily")) return "oily";
  if (raw.includes("dry")) return "dry";
  if (raw.includes("combin")) return "combination";
  if (raw.includes("sensit")) return "sensitive";
  return "normal";
}

const SKIN_TYPE_TONES: Record<SkinTypeId, ChipTone[]> = {
  oily: [
    { bg: "#E7F3F8", border: "#B9D6E4", dot: "#1565C0" },
    { bg: "#E8EEF6", border: "#C2CEDF", dot: "#3D5A80" },
    { bg: "#E6F4F1", border: "#B8DDD4", dot: "#0D7377" },
    { bg: "#EEF2F7", border: "#C9D3E0", dot: "#455A64" },
    { bg: "#E3F2FD", border: "#BBDEFB", dot: "#0277BD" },
    { bg: "#E0F2F1", border: "#B2DFDB", dot: "#00695C" },
  ],
  dry: [
    { bg: "#F8EFE4", border: "#E4D0B5", dot: "#8B6914" },
    { bg: "#F6EBEA", border: "#E3C9C6", dot: "#9B4A43" },
    { bg: "#F3EEE8", border: "#E0D4C6", dot: "#6D4C41" },
    { bg: "#F4F1E4", border: "#E2D9B8", dot: "#7A6A2A" },
    { bg: "#FBE9E7", border: "#FFCCBC", dot: "#D84315" },
    { bg: "#FFF3E0", border: "#FFE0B2", dot: "#EF6C00" },
  ],
  combination: [
    { bg: "#E8F3EC", border: "#C5DCCE", dot: "#2F5D46" },
    { bg: "#F3EEE8", border: "#E0D4C6", dot: "#8B6914" },
    { bg: "#EAF0F6", border: "#C9D7E4", dot: "#3D5A80" },
    { bg: "#F6EBEA", border: "#E3C9C6", dot: "#9B4A43" },
    { bg: "#E6F4F1", border: "#B8DDD4", dot: "#0D7377" },
    { bg: "#F4F1E4", border: "#E2D9B8", dot: "#7A6A2A" },
  ],
  sensitive: [
    { bg: "#FDECEC", border: "#F0C4C4", dot: "#C62828" },
    { bg: "#FCE4EC", border: "#F8BBD0", dot: "#AD1457" },
    { bg: "#F3E5F5", border: "#E1BEE7", dot: "#7B1FA2" },
    { bg: "#F6EBEA", border: "#E3C9C6", dot: "#9B4A43" },
    { bg: "#EEEAF6", border: "#D4CCE4", dot: "#5C4B8A" },
    { bg: "#FFF0F3", border: "#F8C9D4", dot: "#B71C1C" },
  ],
  normal: [
    { bg: "#E8F3EC", border: "#C5DCCE", dot: "#2F5D46" },
    { bg: "#E6F4F1", border: "#B8DDD4", dot: "#2E7D32" },
    { bg: "#F3EEE8", border: "#E0D4C6", dot: "#6D4C41" },
    { bg: "#EAF0F6", border: "#C9D7E4", dot: "#3D5A80" },
    { bg: "#F4F1E4", border: "#E2D9B8", dot: "#7A6A2A" },
    { bg: "#EEEAF6", border: "#D4CCE4", dot: "#5C4B8A" },
  ],
};

const CONCERN_TONE_INDEX: Array<{ keys: string[]; index: number }> = [
  { keys: ["acne", "pimple", "breakout"], index: 3 },
  { keys: ["pigment", "melasma", "dark spot", "dyschromia", "spots"], index: 1 },
  { keys: ["dark circle", "undereye", "under eye"], index: 5 },
  { keys: ["uneven", "texture", "tone"], index: 2 },
  { keys: ["moisture", "hydrat", "dull", "quality", "radiance"], index: 0 },
  { keys: ["pore"], index: 4 },
  { keys: ["wrinkle", "fine line", "aging"], index: 4 },
];

export function getConcernChipTone(label: string, skinType: SkinTypeId): ChipTone {
  const token = normalizeText(label);
  const match = CONCERN_TONE_INDEX.find((row) =>
    row.keys.some((key) => token.includes(key))
  );
  const palette = SKIN_TYPE_TONES[skinType] || SKIN_TYPE_TONES.normal;
  return palette[match?.index ?? 0];
}

/** Keep professional summary to ~2 on-screen lines (656px @ 12px). */
function shortenSummary(text: string, maxSentences = 2, maxChars = 160): string {
  const clean = String(text || "")
    .replace(/^-+\s*/gm, "")
    .replace(/>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return FALLBACK_SUMMARY;

  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  let out = sentences.slice(0, maxSentences).join(" ");

  if (out.length > maxChars) {
    out = out.slice(0, maxChars).replace(/\s+\S*$/, "").trim();
    if (out && !/[.!?]$/.test(out)) out += ".";
  }

  return out || FALLBACK_SUMMARY;
}

function summaryItemText(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  const raw = item.data ?? item.text ?? item.summary ?? "";
  if (Array.isArray(raw)) return raw.filter(Boolean).join(" ");
  return String(raw);
}

function getAnalysisSummaryList(reportSource: any): any[] {
  const lists = [
    reportSource?.analysisAiSummary,
    reportSource?.productRecommendation?.analysisAiSummary,
    reportSource?.data?.[0]?.analysisAiSummary,
    reportSource?.data?.analysisAiSummary,
  ];
  for (const list of lists) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

export function extractProfessionalSummary(reportSource: any): string {
  const summary = getAnalysisSummaryList(reportSource);

  const professional = summary.find((item: any) =>
    String(item?.heading || "")
      .toUpperCase()
      .includes("PROFESSIONAL SUMMARY")
  );
  const professionalText = summaryItemText(professional);
  if (professionalText) {
    return shortenSummary(professionalText.replace(/^- /gm, "").replace(/>/g, "").trim());
  }

  const overview = summary.find((item: any) =>
    String(item?.heading || "")
      .toUpperCase()
      .includes("SKIN OVERVIEW")
  );
  const overviewText = summaryItemText(overview);
  if (overviewText) {
    return shortenSummary(overviewText.replace(/^- /gm, "").replace(/>/g, "").trim());
  }

  const joined = summary.map(summaryItemText).filter(Boolean).join(" ");
  return shortenSummary(joined || FALLBACK_SUMMARY);
}

/** Map MediaPipe concern labels → short care guidance for dynamic summaries. */
const MEDIAPIPE_CARE_HINTS: Array<{ keys: string[]; tip: string }> = [
  {
    keys: ["acne", "pimple", "breakout", "comedone"],
    tip: "clarifying, non-comedogenic care",
  },
  {
    keys: ["rash", "sensitive", "irritat"],
    tip: "soothing barrier support",
  },
  {
    keys: ["pore"],
    tip: "gentle refining and oil balance",
  },
  {
    keys: ["pigment", "melasma", "dark spot", "uneven", "spot", "patch", "tone"],
    tip: "brightening actives with daily SPF",
  },
  {
    keys: ["wrinkle", "fine line", "aging"],
    tip: "hydration and firming support",
  },
  {
    keys: ["dark circle", "eye bag", "undereye", "under eye"],
    tip: "targeted under-eye care",
  },
  {
    keys: ["dark lip"],
    tip: "nourishing lip care",
  },
  {
    keys: ["mole", "skin tag", "skin bag"],
    tip: "gentle maintenance and SPF",
  },
];

function careTipsForLabels(labels: string[]): string[] {
  const tips: string[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    const token = normalizeText(label);
    const match = MEDIAPIPE_CARE_HINTS.find((row) =>
      row.keys.some((k) => token.includes(k))
    );
    if (!match || seen.has(match.tip)) continue;
    seen.add(match.tip);
    tips.push(match.tip);
  }
  if (!tips.some((t) => /spf/i.test(t))) tips.push("daily SPF");
  return tips.slice(0, 3);
}

function formatConcernList(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * Build a professional summary from MediaPipe scan concerns.
 * Wording changes with which concerns (and severity) were detected.
 */
export function buildMediapipeProfessionalSummary(
  concerns: Array<{ code?: string; name?: string; label?: string; value?: number }> | null | undefined
): string {
  if (!concerns?.length) return FALLBACK_SUMMARY;

  const sorted = [...concerns]
    .map((c) => ({
      label: toConcernLabel(c.label || c.name || c.code || ""),
      value: typeof c.value === "number" ? c.value : 0,
    }))
    .filter((c) => c.label)
    .sort((a, b) => b.value - a.value);

  if (!sorted.length) return FALLBACK_SUMMARY;

  const labels = sorted.map((c) => c.label);
  const primary = labels.slice(0, Math.min(3, labels.length));
  const secondary = labels.slice(3, 5);
  const tips = careTipsForLabels(labels);
  const tipText = tips.length
    ? tips.length === 1
      ? tips[0]
      : `${tips.slice(0, -1).join(", ")} and ${tips[tips.length - 1]}`
    : "targeted care and daily SPF";

  const highSeverity = sorted.filter((c) => c.value >= 4).length;
  const focusPhrase =
    highSeverity >= 2
      ? "show elevated signals for"
      : highSeverity === 1
        ? "highlight"
        : "indicate";

  let first = `Your AI face scan ${focusPhrase} ${formatConcernList(primary)}.`;
  if (secondary.length) {
    first = `Your AI face scan ${focusPhrase} ${formatConcernList(primary)}, with ${formatConcernList(secondary)} also noted.`;
  }

  const second =
    tips.length >= 2
      ? `Prioritise ${tipText} for best results.`
      : `We recommend ${tipText}.`;

  return shortenSummary(`${first} ${second}`, 2, 175);
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Random in-stock products from this machine (excl. baby).
 * Seeded so the same scan stays stable on refresh, but each scan/user differs.
 * Prefers variety across categories when possible.
 */
export function pickRandomMachineProducts(
  catalogProducts: any[],
  slotsData: unknown,
  seed = String(Date.now())
): ReportProduct[] {
  const slotsMap = buildSlotsMap(slotsData);
  const machineProducts = mergeCatalogWithSlotProducts(catalogProducts, slotsData);
  const rand = mulberry32(hashSeed(seed));
  const shuffled = shuffleWithRng(
    machineProducts.filter((p) => !isBabyProduct(p)),
    rand
  );

  const picked: ReportProduct[] = [];
  const seenIds = new Set<string>();
  const seenCategories = new Set<string>();

  for (const product of shuffled) {
    if (picked.length >= 3) break;
    const mapped = toReportProduct(product, slotsMap, slotsData);
    if (!mapped || seenIds.has(mapped.id)) continue;

    const categoryKey = productCategoryKey(product, mapped.category);
    if (categoryKey && seenCategories.has(categoryKey)) continue;

    seenIds.add(mapped.id);
    if (categoryKey) seenCategories.add(categoryKey);
    picked.push(mapped);
  }

  // If category diversity left us short, fill with any remaining in-stock.
  if (picked.length < 3) {
    for (const product of shuffled) {
      if (picked.length >= 3) break;
      const mapped = toReportProduct(product, slotsMap, slotsData);
      if (!mapped || seenIds.has(mapped.id)) continue;
      seenIds.add(mapped.id);
      picked.push(mapped);
    }
  }

  return picked.slice(0, 3);
}

/** Preferred product names for curated routines (match against machine stock). */
const MORNING_ROUTINE_PREFS = [
  "Foxtale Let It Glow Super Glow Face Wash",
  "Minimalist Vitamin C 10% Serum",
  "The Derma Co 5% Vitamin C Oil-Free Daily Face Moisturizer",
  "The Derma Co 5% Vitamin C Moisturizer",
  "Foxtale Golden Hour Glow Sunscreen SPF 50",
];

const NIGHT_ROUTINE_PREFS = [
  "Foxtale Let It Glow Super Glow Face Wash",
  "The Derma Co 2% Kojic Acid Face Serum",
  "Foxtale Eyes On You Brightening Under Eye Cream",
  "Foxtale In The Limelight Super Glow Moisturizer",
];

const PIGMENTATION_PREFS = [
  "The Derma Co 2% Kojic Acid Face Serum",
  "Pilgrim 2% Kojic Acid Serum",
  "Minimalist Vitamin C 10% Serum",
  "Minimalist Vitamin C 16% Serum",
  "The Derma Co 5% Niacinamide + Alpha Arbutin",
  "The Derma Co 5% Niacinamide",
];

const UNEVEN_TONE_PREFS = [
  "Minimalist Vitamin C 16% Serum",
  "Pilgrim 15% Vitamin C Face Serum",
  "Cetaphil Bright Healthy Radiance Perfecting Serum",
  "The Derma Co 5% Vitamin C Moisturizer",
  "Pilgrim 2% Kojic Acid Serum",
];

const DARK_CIRCLE_PREFS = [
  "Foxtale Eyes On You Brightening Under Eye Cream",
  "Pilgrim Squalane Roll-On Under Eye Serum",
  "Pilgrim Squalance Roll-On Under Eye Serum",
  "Pilgrim Retinol Under Eye Cream",
];

const ROUTINE_TEMPLATES: Array<{
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  icon: string;
  prefs: string[];
}> = [
  {
    id: "morning-glow",
    title: "Morning Glow",
    subtitle: "Cleanse + Brighten",
    tagline: "AM glow essentials.",
    icon: "mdi:white-balance-sunny",
    prefs: MORNING_ROUTINE_PREFS,
  },
  {
    id: "night-repair",
    title: "Night Repair",
    subtitle: "Treat + Nourish",
    tagline: "Overnight recovery care.",
    icon: "mdi:moon-waning-crescent",
    prefs: NIGHT_ROUTINE_PREFS,
  },
  {
    id: "dark-circle-care",
    title: "Dark Circle Care",
    subtitle: "Brighten + Refresh",
    tagline: "Target tired under-eyes.",
    icon: "mdi:eye-outline",
    prefs: DARK_CIRCLE_PREFS,
  },
];

const NAME_STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "for",
  "face",
  "skin",
  "daily",
  "super",
  "ml",
  "pa",
  "spf",
  "oil",
  "free",
]);

/** Score how well a machine product name matches a preferred label. */
function scorePreferredName(productName: string, preferred: string): number {
  const a = normalizeText(productName);
  const b = normalizeText(preferred);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 95;

  const tokens = b
    .split(" ")
    .map((t) => t.replace(/[^a-z0-9%+]/g, ""))
    .filter((t) => t.length > 1 && !NAME_STOP_WORDS.has(t));
  if (!tokens.length) return 0;

  const hits = tokens.filter((t) => a.includes(t)).length;
  return Math.round((hits / tokens.length) * 90);
}

function extractProductImageUrl(product: any): string {
  return normalizeImageUrl(getCatalogProductImageUrl(product));
}

/** Make Drive/share links and protocol-relative URLs usable in <img src>. */
function normalizeImageUrl(url: string): string {
  if (!url) return "";
  let next = url.trim();
  if (next.startsWith("//")) next = `https:${next}`;

  // Google Drive "view" links are not direct images — convert to uc export.
  const driveView = next.match(
    /drive\.google\.com\/file\/d\/([^/]+)\/(?:view|preview)/i
  );
  if (driveView?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveView[1]}`;
  }
  const driveOpen = next.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (driveOpen?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`;
  }

  if (/^https?:\/\//i.test(next) || next.startsWith("/")) return next;
  return "";
}

function extractBrandKey(product: any, productName = ""): string {
  const fromField = normalizeText(
    product?.brand?.name ||
      product?.productBrand?.name ||
      product?.brand_name ||
      (typeof product?.brand === "string" ? product.brand : "") ||
      ""
  );
  if (fromField) {
    if (fromField.includes("derma co")) return "the derma co";
    return fromField;
  }

  const name = normalizeText(productName || product?.name || "");
  const known = [
    "the derma co",
    "derma co",
    "foxtale",
    "minimalist",
    "pilgrim",
    "cetaphil",
    "sebamed",
    "dot and key",
    "dot & key",
    "plum",
    "neutrogena",
    "ceraVe",
    "cerave",
    "la shield",
    "fixderma",
  ];
  for (const brand of known) {
    if (name.includes(normalizeText(brand))) {
      if (brand.includes("derma co")) return "the derma co";
      if (brand.includes("dot")) return "dot and key";
      return normalizeText(brand);
    }
  }

  const first = name.split(" ").find((t) => t.length > 2) || "";
  return first;
}

type StockItem = {
  product: ReportProduct;
  brand: string;
  raw: any;
};

function findPreferredInStock(
  stock: StockItem[],
  preferredNames: string[],
  usedIds: Set<string>,
  usedBrands: Set<string>
): ReportProduct | null {
  for (const pref of preferredNames) {
    let best: StockItem | null = null;
    let bestScore = 0;
    for (const item of stock) {
      if (usedIds.has(item.product.id)) continue;
      if (item.brand && usedBrands.has(item.brand)) continue;
      const score = scorePreferredName(item.product.name, pref);
      // Prefer items that have images when scores are close.
      const imageBonus = item.product.imageUrl ? 2 : 0;
      const total = score + imageBonus;
      if (total > bestScore) {
        bestScore = total;
        best = item;
      }
    }
    if (best && bestScore >= 55) return best.product;
  }
  return null;
}

function pickAnyInStock(
  stock: StockItem[],
  usedIds: Set<string>,
  usedBrands: Set<string>,
  rand: () => number
): ReportProduct | null {
  const available = stock.filter(
    (item) =>
      !usedIds.has(item.product.id) &&
      (!item.brand || !usedBrands.has(item.brand))
  );
  if (!available.length) return null;

  // Prefer products with images.
  const withImage = available.filter((item) => Boolean(item.product.imageUrl));
  const pool = withImage.length ? withImage : available;
  const idx = Math.floor(rand() * pool.length);
  return pool[Math.min(idx, pool.length - 1)].product;
}

function concernPrefList(concernLabels: string[]): {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  icon: string;
  prefs: string[];
} {
  const joined = normalizeText(concernLabels.join(" "));
  if (
    /pigment|melasma|dark spot|dyschromia|kojic|niacinamide|arbutin/.test(joined)
  ) {
    return {
      id: "pigment-care",
      title: "Pigment Care",
      subtitle: "Brighten + Fade",
      tagline: "Target dark spots.",
      icon: "mdi:dots-hexagon",
      prefs: PIGMENTATION_PREFS,
    };
  }
  if (/uneven|tone|radiance|dull|vitamin c/.test(joined)) {
    return {
      id: "tone-even",
      title: "Even Tone",
      subtitle: "Glow + Balance",
      tagline: "Smoother, brighter tone.",
      icon: "mdi:dots-grid",
      prefs: UNEVEN_TONE_PREFS,
    };
  }
  return {
    id: "dark-circle-care",
    title: "Dark Circle Care",
    subtitle: "Brighten + Refresh",
    tagline: "Target tired under-eyes.",
    icon: "mdi:eye-outline",
    prefs: DARK_CIRCLE_PREFS,
  };
}

/**
 * Build up to 3 skin routines (2 products each) from curated preferences.
 * Never repeats the same product or brand across routines.
 * Prefers in-stock curated matches; otherwise fills from other machine stock.
 */
export function pickSkinRoutines(
  catalogProducts: any[],
  slotsData: unknown,
  seed = String(Date.now()),
  concernLabels: string[] = []
): SkinRoutine[] {
  const slotsMap = buildSlotsMap(slotsData);
  const machineProducts = mergeCatalogWithSlotProducts(catalogProducts, slotsData);
  const rand = mulberry32(hashSeed(`routines|${seed}`));

  const stock: StockItem[] = [];
  const seenStock = new Set<string>();
  for (const product of machineProducts) {
    if (isBabyProduct(product)) continue;
    const mapped = toReportProduct(product, slotsMap, slotsData);
    if (!mapped || seenStock.has(mapped.id)) continue;
    seenStock.add(mapped.id);
    stock.push({
      product: mapped,
      brand: extractBrandKey(product, mapped.name),
      raw: product,
    });
  }

  if (stock.length < 2) return [];

  const brandOf = (id: string) =>
    stock.find((s) => s.product.id === id)?.brand || "";

  const templates = [
    ROUTINE_TEMPLATES[0],
    ROUTINE_TEMPLATES[1],
    concernPrefList(concernLabels),
  ];

  const routines: SkinRoutine[] = [];
  const usedIds = new Set<string>();
  const usedBrands = new Set<string>();

  for (const tpl of templates) {
    const pair: ReportProduct[] = [];

    for (let slot = 0; slot < 2; slot++) {
      const preferred = findPreferredInStock(
        stock,
        tpl.prefs,
        usedIds,
        usedBrands
      );
      const chosen =
        preferred || pickAnyInStock(stock, usedIds, usedBrands, rand);
      if (!chosen) break;
      usedIds.add(chosen.id);
      const brand = brandOf(chosen.id);
      if (brand) usedBrands.add(brand);
      pair.push(chosen);
    }

    if (pair.length < 2) continue;

    const [a, b] = pair;
    const retailTotal = a.retailPrice + b.retailPrice;
    const payableTotal = a.payablePrice + b.payablePrice;
    const savePercent =
      retailTotal > 0
        ? Math.max(0, Math.round(((retailTotal - payableTotal) / retailTotal) * 100))
        : 0;

    routines.push({
      id: tpl.id,
      title: tpl.title,
      subtitle: tpl.subtitle,
      tagline: tpl.tagline,
      icon: tpl.icon,
      products: [a, b],
      retailTotal,
      payableTotal,
      savePercent: savePercent > 0 ? savePercent : 10,
    });
  }

  return routines;
}

function extractVolume(product: any): string {
  const fields = [
    product?.size,
    product?.volume,
    product?.netContent,
    product?.packSize,
    product?.quantityText,
    product?.name,
    product?.productUse,
  ];
  for (const field of fields) {
    const match = String(field || "").match(/(\d+(?:\.\d+)?)\s?(ml|g|gm|kg)/i);
    if (match) {
      const unit = match[2].toLowerCase() === "gm" ? "g" : match[2].toLowerCase();
      return `${match[1]} ${unit}`;
    }
  }
  return "";
}

function payablePrice(retailPrice: number, discountValue: number): number {
  if (!discountValue || discountValue <= 0) return Math.round(retailPrice);
  return Math.round(retailPrice - retailPrice * (discountValue / 100));
}

export function formatSlotBadge(slotNumbers: number[]): string {
  const first = slotNumbers[0];
  if (!Number.isFinite(first)) return "";
  const n = String(first).padStart(2, "0");
  return `Slot ${Number(first)}`;
}

function toReportProduct(product: any, slotsMap: ReturnType<typeof buildSlotsMap>, slotsData: unknown): ReportProduct | null {
  if (isBabyProduct(product)) return null;
  const id = normalizeProductId(product?._id || product?.id || product?._key);
  if (!id) return null;
  const slotInfo = getSlotInfoForProduct(product, slotsMap);
  if (!slotInfo || slotInfo.quantity <= 0) return null;

  const slotPrice = getSlotRetailPriceForProduct(product?._id || product?.id, slotsData);
  const retailPrice = Number(
    slotPrice ?? product?.retailPrice ?? product?.retail_price ?? 0
  );
  const discount = normalizeProductDiscount(product, getSlotDiscountMap(slotsData));
  const discountValue = Number(discount?.value ?? 0);
  const imageUrl = extractProductImageUrl(product);

  return {
    id,
    name: product?.name || "Product",
    imageUrl,
    retailPrice,
    payablePrice: payablePrice(retailPrice, discountValue),
    discountValue,
    slotId: slotInfo.slotNumbers[0],
    slotNumbers: slotInfo.slotNumbers,
    volumeLabel: extractVolume(product),
    category: product?.productCategory?.title || product?.category || "",
  };
}

function productCategoryKey(product: any, bucketCategory?: string): string {
  return normalizeText(
    bucketCategory ||
      product?.productCategory?.title ||
      product?.category ||
      ""
  );
}

/** Read highRecommendation from common scan payload shapes. */
function getHighRecommendationBuckets(reportSource: any): any[] {
  const candidates = [
    reportSource?.recommendedProducts?.highRecommendation,
    reportSource?.productRecommendation?.recommendedProducts?.highRecommendation,
    reportSource?.data?.recommendedProducts?.highRecommendation,
    reportSource?.data?.productRecommendation?.recommendedProducts
      ?.highRecommendation,
  ];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

/**
 * One in-stock product per category from this user's recommendedProducts.highRecommendation.
 * Resolves API products to machine catalog/slots. Excludes baby. Max 3.
 */
export function pickRecommendedProducts(
  reportSource: any,
  catalogProducts: any[],
  slotsData: unknown
): ReportProduct[] {
  const slotsMap = buildSlotsMap(slotsData);
  const machineProducts = mergeCatalogWithSlotProducts(catalogProducts, slotsData);
  const catalogById = indexProductsById(machineProducts);
  const high = getHighRecommendationBuckets(reportSource);

  const picked: ReportProduct[] = [];
  const seenIds = new Set<string>();
  const seenCategories = new Set<string>();

  const resolveForMachine = (apiProduct: any) => {
    const id = apiProduct?._id ?? apiProduct?.id ?? apiProduct?._key;
    return findProductInMap(catalogById, id) || apiProduct;
  };

  const tryAdd = (apiProduct: any, bucketCategory?: string) => {
    if (picked.length >= 3) return false;
    if (isBabyProduct(apiProduct)) return false;

    const product = resolveForMachine(apiProduct);
    if (isBabyProduct(product)) return false;

    const mapped = toReportProduct(product, slotsMap, slotsData);
    if (!mapped) return false;
    if (seenIds.has(mapped.id)) return false;

    const categoryKey = productCategoryKey(
      product,
      bucketCategory || mapped.category
    );
    if (!categoryKey || seenCategories.has(categoryKey)) return false;

    seenIds.add(mapped.id);
    seenCategories.add(categoryKey);
    picked.push(
      bucketCategory && !mapped.category
        ? { ...mapped, category: bucketCategory }
        : mapped
    );
    return true;
  };

  // 1) API recommendedProducts.highRecommendation — one product per category.
  for (const bucket of high) {
    if (picked.length >= 3) break;
    const bucketCategory = String(bucket?.productCategory?.title || "").trim();
    if (bucketCategory && seenCategories.has(normalizeText(bucketCategory))) {
      continue;
    }
    const products = Array.isArray(bucket?.products) ? bucket.products : [];
    for (const product of products) {
      if (tryAdd(product, bucketCategory)) break;
    }
  }

  // 2) Fallback: other in-stock products from unused categories only.
  if (picked.length < 3) {
    for (const product of machineProducts) {
      if (picked.length >= 3) break;
      tryAdd(product);
    }
  }

  return picked.slice(0, 3);
}

export function kitToReportProduct(kit: TravelKit): ReportProduct {
  return {
    id: kit.id,
    name: `${kit.title} Kit`,
    imageUrl: kit.imageUrl,
    retailPrice: kit.price,
    payablePrice: kit.price,
    discountValue: 0,
    slotNumbers: [],
    volumeLabel: "Kit",
    category: "Travel Kit",
    isTravelKit: true,
  };
}
