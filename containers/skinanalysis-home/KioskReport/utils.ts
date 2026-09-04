import {
  buildSlotsMap,
  getSlotDiscountMap,
  getSlotInfoForProduct,
  getSlotRetailPriceForProduct,
  mergeCatalogWithSlotProducts,
  normalizeProductDiscount,
  normalizeProductId,
} from "@/lib/product-slot-utils";
import { CANONICAL_CONCERNS, FALLBACK_SUMMARY } from "./constants";
import type { ChipTone, ConcernItem, HealthRating, ReportProduct, SkinTypeId, TravelKit } from "./types";

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type StepId = "cleanser" | "daycream" | "sunscreen" | "serum";

const STEP_MATCHERS: Record<
  StepId,
  { positives: string[]; negatives: string[]; categoryHints: string[] }
> = {
  cleanser: {
    positives: ["face wash", "facewash", "cleanser", "cleansing water", "micellar"],
    negatives: [
      "serum",
      "sunscreen",
      "sunblock",
      "moistur",
      "night cream",
      "eye cream",
      "toner",
      "mask",
      "baby",
      "infant",
    ],
    categoryHints: ["face wash", "cleanser"],
  },
  daycream: {
    positives: [
      "day cream",
      "moisturizer",
      "moisturiser",
      "moisturiz",
      "moisturis",
      "hydration",
      "hydrating",
    ],
    negatives: [
      "cleanser",
      "face wash",
      "serum",
      "sunscreen",
      "sunblock",
      "night cream",
      "eye cream",
      "mask",
      "toner",
      "baby",
      "infant",
    ],
    categoryHints: ["day cream", "moistur"],
  },
  sunscreen: {
    positives: ["sunscreen", "sun screen", "sunblock", "spf", "sun lotion", "sun gel"],
    negatives: ["cleanser", "face wash", "serum", "moistur", "night cream", "eye cream", "baby", "infant"],
    categoryHints: ["sunscreen"],
  },
  serum: {
    positives: ["face serum", "serum"],
    negatives: ["cleanser", "face wash", "sunscreen", "moistur", "night cream", "mask", "baby", "infant"],
    categoryHints: ["face serum", "serum"],
  },
};

function getProductText(product: any): string {
  return normalizeText(
    [
      product?.name,
      product?.productUse,
      product?.productCategory?.title,
      product?.category,
      product?.productBenefits,
    ].join(" ")
  );
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

function matchesStep(product: any, stepId: StepId): boolean {
  const matcher = STEP_MATCHERS[stepId];
  const text = getProductText(product);
  const category = normalizeText(product?.productCategory?.title || product?.category);
  const positive =
    matcher.positives.some((term) => text.includes(term)) ||
    matcher.categoryHints.some((term) => category.includes(term));
  if (!positive) return false;
  if (matcher.negatives.some((term) => text.includes(term))) return false;
  return true;
}

export function getReportSource(analysisData: any) {
  return (
    analysisData?.data?.[0] ||
    analysisData?.data?.productRecommendation ||
    analysisData?.productRecommendation ||
    analysisData?.data ||
    analysisData ||
    null
  );
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

function shortenSummary(text: string, maxSentences = 2, maxChars = 220): string {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return FALLBACK_SUMMARY;
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  let out = sentences.slice(0, maxSentences).join(" ");
  if (out.length > maxChars) {
    out = out.slice(0, maxChars).replace(/\s+\S*$/, "").trim() + ".";
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
  const id = normalizeProductId(product?._id || product?.id);
  if (!id) return null;
  const slotInfo = getSlotInfoForProduct(product, slotsMap);
  if (!slotInfo || slotInfo.quantity <= 0) return null;

  const slotPrice = getSlotRetailPriceForProduct(product?._id || product?.id, slotsData);
  const retailPrice = Number(
    slotPrice ?? product?.retailPrice ?? product?.retail_price ?? 0
  );
  const discount = normalizeProductDiscount(product, getSlotDiscountMap(slotsData));
  const discountValue = Number(discount?.value ?? 0);
  const imageUrl =
    product?.images?.[0]?.url ||
    product?.image_url ||
    (typeof product?.images?.[0] === "string" ? product.images[0] : "") ||
    "";

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

function flattenRecommended(reportSource: any): any[] {
  const high = reportSource?.recommendedProducts?.highRecommendation;
  if (!Array.isArray(high)) return [];
  return high.flatMap((bucket: any) =>
    Array.isArray(bucket?.products) ? bucket.products : []
  );
}

export function pickRecommendedProducts(
  reportSource: any,
  catalogProducts: any[],
  slotsData: unknown
): ReportProduct[] {
  const slotsMap = buildSlotsMap(slotsData);
  const machineProducts = mergeCatalogWithSlotProducts(catalogProducts, slotsData);
  const recommended = flattenRecommended(reportSource);
  const recommendedIds = new Set(
    recommended.map((p) => normalizeProductId(p?._id || p?.id)).filter(Boolean)
  );

  const steps: StepId[] = ["cleanser", "daycream", "sunscreen"];
  const picked: ReportProduct[] = [];
  const seen = new Set<string>();

  const rankAndPick = (candidates: any[]) => {
    const ranked = candidates
      .map((product) => {
        const mapped = toReportProduct(product, slotsMap, slotsData);
        if (!mapped) return null;
        return {
          mapped,
          recommended: recommendedIds.has(mapped.id),
          quantity: getSlotInfoForProduct(product, slotsMap)?.quantity ?? 0,
        };
      })
      .filter(Boolean) as Array<{ mapped: ReportProduct; recommended: boolean; quantity: number }>;

    ranked.sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      if (a.quantity !== b.quantity) return b.quantity - a.quantity;
      return a.mapped.name.localeCompare(b.mapped.name);
    });

    for (const row of ranked) {
      if (seen.has(row.mapped.id)) continue;
      seen.add(row.mapped.id);
      picked.push(row.mapped);
      return;
    }
  };

  steps.forEach((step) => {
    if (picked.length >= 3) return;
    const recMatches = recommended.filter((p) => !isBabyProduct(p) && matchesStep(p, step));
    const machineMatches = machineProducts.filter((p) => !isBabyProduct(p) && matchesStep(p, step));
    rankAndPick([...recMatches, ...machineMatches]);
  });

  if (picked.length < 3) {
    machineProducts.forEach((product) => {
      if (picked.length >= 3) return;
      const mapped = toReportProduct(product, slotsMap, slotsData);
      if (!mapped || seen.has(mapped.id)) return;
      seen.add(mapped.id);
      picked.push(mapped);
    });
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
