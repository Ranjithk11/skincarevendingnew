export interface PriceComparisonEntry {
  brand: string;
  productName: string;
  leafwaterPrice: number | null;
  amazonPrice: number | null;
  nykaaPrice: number | null;
}

// Data sourced from Google Sheet:
// https://docs.google.com/spreadsheets/d/17fXVFiywu4XM8_aR9Fpz0L_csq1S9ZSivUx8cY_hPmw/edit?gid=2129493116
const priceComparisonData: PriceComparisonEntry[] = [
  { brand: "Plix", productName: "Guava 3% Glycolic Acid Serum", leafwaterPrice: 518, amazonPrice: 549, nykaaPrice: null },
  { brand: "Plix", productName: "Jamun 10% Niacinamide Face Serum", leafwaterPrice: 518, amazonPrice: 485, nykaaPrice: 549 },
  { brand: "Plix", productName: "Pineapple De-Pigmentation Dewy Serum", leafwaterPrice: 518, amazonPrice: 549, nykaaPrice: 449 },
  { brand: "Plix", productName: "Watermelon Hydrogel Under Eye Patches", leafwaterPrice: 675, amazonPrice: 449, nykaaPrice: 750 },
  { brand: "The Face Shop", productName: "Rice Water Bright Vegan Eye Cream", leafwaterPrice: 1421, amazonPrice: 1300, nykaaPrice: null },
  { brand: "The Face Shop", productName: "The Therapy Vegan Sunscreen", leafwaterPrice: 2159, amazonPrice: 1890, nykaaPrice: 1919 },
  { brand: "The Face Shop", productName: "Natural Sun Eco No Shine Hydrating", leafwaterPrice: 1079, amazonPrice: 999, nykaaPrice: 1019 },
  { brand: "The Face Shop", productName: "Ceramide & Rice Lightweight Emulsion", leafwaterPrice: 891, amazonPrice: 841, nykaaPrice: 941 },
  { brand: "The Face Shop", productName: "Collagen & Pomegranate Volume Emulsion", leafwaterPrice: 2025, amazonPrice: 1899, nykaaPrice: 2050 },
  { brand: "The Face Shop", productName: "Alltimate Vegan Mucin Peptide Serum", leafwaterPrice: 1430, amazonPrice: 1300, nykaaPrice: 1589 },
  { brand: "The Face Shop", productName: "White Seed Brightening Serum 50 ml", leafwaterPrice: 2394, amazonPrice: 1743, nykaaPrice: null },
  { brand: "The Face Shop", productName: "Alltimate PDRN Deep Hydration Serum", leafwaterPrice: 1638, amazonPrice: 1638, nykaaPrice: 1547 },
  { brand: "The Face Shop", productName: "White Seed Brightening Toner 250 ml", leafwaterPrice: 2061, amazonPrice: 1832, nykaaPrice: 2290 },
  { brand: "The Face Shop", productName: "Ceramide & Rice Moisturizing Toner", leafwaterPrice: 809, amazonPrice: 760, nykaaPrice: 899 },
  { brand: "The Face Shop", productName: "Tea Tree Pore Clarifying Gel", leafwaterPrice: 899, amazonPrice: 849, nykaaPrice: 999 },
  { brand: "The Face Shop", productName: "Rice Water Bright Cleansing Foam", leafwaterPrice: 809, amazonPrice: 809, nykaaPrice: 854 },
  { brand: "Plum", productName: "Bright Years Under-Eye Recovery Gel 15 ml", leafwaterPrice: 833, amazonPrice: 790, nykaaPrice: null },
  { brand: "Plum", productName: "Cica & Hya-Betaine Vegan Mucin Face Essence", leafwaterPrice: 719, amazonPrice: 719, nykaaPrice: null },
  { brand: "Plum", productName: "Green Tea Pore Cleansing Face Wash", leafwaterPrice: 539, amazonPrice: null, nykaaPrice: null },
  { brand: "Plum", productName: "2% Encapsulated Salicylic Acid Anti-Acne", leafwaterPrice: 539, amazonPrice: 539, nykaaPrice: 539 },
  { brand: "Plum", productName: "15% Vitamin C Serum with Mandarin", leafwaterPrice: 711, amazonPrice: null, nykaaPrice: 600 },
  { brand: "Plum", productName: "10% Niacinamide & Rice Water Brightening Serum", leafwaterPrice: 764, amazonPrice: 764, nykaaPrice: 760 },
  { brand: "Neutrogena", productName: "Visible Repair Regenerating Cream 50 g", leafwaterPrice: 1512, amazonPrice: 1226, nykaaPrice: 1500 },
  { brand: "Neutrogena", productName: "Visible Repair Serum 30 ml", leafwaterPrice: 1512, amazonPrice: 1226, nykaaPrice: 1520 },
  { brand: "Neutrogena", productName: "Visible Repair Eye Cream 15 g", leafwaterPrice: 1418, amazonPrice: 1055, nykaaPrice: 1420 },
  { brand: "Neutrogena", productName: "Ultra Sheer Dry Touch Sunscreen SPF", leafwaterPrice: 702, amazonPrice: 512, nykaaPrice: 650 },
  { brand: "Neutrogena", productName: "Hydro Boost Face Sunscreen SPF 50+", leafwaterPrice: 1170, amazonPrice: 1240, nykaaPrice: 1150 },
  { brand: "Neutrogena", productName: "Hydro Boost Cleanser Water Gel 145 ml", leafwaterPrice: 1040, amazonPrice: 970, nykaaPrice: 1100 },
  { brand: "Neutrogena", productName: "Oil-Free Acne Wash 175 ml", leafwaterPrice: 765, amazonPrice: 663, nykaaPrice: 750 },
  { brand: "Neutrogena", productName: "Hydro Boost Hyaluronic Acid Serum 30 ml", leafwaterPrice: 1184, amazonPrice: 1093, nykaaPrice: 1150 },
  { brand: "CeraVe", productName: "Oil Control Gel Cream Lightweight", leafwaterPrice: 1080, amazonPrice: 1080, nykaaPrice: 1100 },
  { brand: "CeraVe", productName: "PM Facial Moisturizing Lotion", leafwaterPrice: 1170, amazonPrice: 1170, nykaaPrice: 1150 },
  { brand: "CeraVe", productName: "AM Facial Moisturizing Lotion", leafwaterPrice: 1350, amazonPrice: 1215, nykaaPrice: 1350 },
  { brand: "CeraVe", productName: "SA Smoothing Cleanser", leafwaterPrice: 1161, amazonPrice: 1125, nykaaPrice: 1150 },
  { brand: "CeraVe", productName: "Hydrating Cleanser", leafwaterPrice: 657, amazonPrice: 635, nykaaPrice: 297 },
  { brand: "CeraVe", productName: "Blemish Control Cleanser (2% Salicylic)", leafwaterPrice: 1125, amazonPrice: 1125, nykaaPrice: 1100 },
  { brand: "CeraVe", productName: "Moisturizing Lotion for Dry Skin 473 ml", leafwaterPrice: 1575, amazonPrice: 1662, nykaaPrice: 1550 },
  { brand: "Bio Derma", productName: "Brightening Overnight Cream", leafwaterPrice: 2519, amazonPrice: 2799, nykaaPrice: 2500 },
];

/**
 * Fuzzy-match a product name against the price comparison data.
 * Returns the best match or null if no reasonable match is found.
 */
export function findPriceComparison(productName: string): PriceComparisonEntry | null {
  if (!productName) return null;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const input = normalize(productName);

  // 1. Try exact match
  const exact = priceComparisonData.find(
    (e) => normalize(e.productName) === input || normalize(`${e.brand} ${e.productName}`) === input
  );
  if (exact) return exact;

  // 2. Try includes match (input contains entry name or vice versa)
  const includes = priceComparisonData.find(
    (e) => {
      const name = normalize(e.productName);
      const fullName = normalize(`${e.brand} ${e.productName}`);
      return input.includes(name) || name.includes(input) || input.includes(fullName) || fullName.includes(input);
    }
  );
  if (includes) return includes;

  // 3. Word overlap scoring
  const inputWords = input.split(" ").filter((w) => w.length > 2);
  let bestMatch: PriceComparisonEntry | null = null;
  let bestScore = 0;

  for (const entry of priceComparisonData) {
    const entryName = normalize(`${entry.brand} ${entry.productName}`);
    const entryWords = entryName.split(" ").filter((w) => w.length > 2);
    const overlap = inputWords.filter((w) => entryWords.includes(w)).length;
    const score = overlap / Math.max(inputWords.length, entryWords.length);
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

export default priceComparisonData;
