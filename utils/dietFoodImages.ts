/** Public URL base for `public/diet resize` (folder name includes a space). */
export const DIET_RESIZE_IMAGE_BASE = "/diet%20resize";

const DEFAULT_DIET_IMAGE = "fruits.jpeg";

/** Filenames under `public/diet resize` — keep in sync when adding images. */
const DIET_RESIZE_FILES = [
  "allfruitssmoothie.jpeg",
  "avocado.jpeg",
  "avocadotoast.jpeg",
  "bakedfish.jpeg",
  "bananas.jpeg",
  "beans.jpeg",
  "blueberries.jpeg",
  "broccolizucchini.jpeg",
  "brown-rice.jpeg",
  "carrots.jpeg",
  "chiaseeds.jpeg",
  "chicken.jpeg",
  "chickpea-curry.jpeg",
  "citrusfruits.jpeg",
  "cucumber.jpeg",
  "curd.jpeg",
  "curdwithturmeric.jpeg",
  "darkchocolate.jpeg",
  "fish2.jpeg",
  "flaxseeds.jpeg",
  "fruits.jpeg",
  "greensalad.jpeg",
  "greensmoothie.jpeg",
  "greentea.jpeg",
  "grillchicken.jpeg",
  "Grilled-Fish.jpeg",
  "Grilled-Paneer.jpeg",
  "leafgreenvegetables.jpeg",
  "legumes.jpeg",
  "lentils.jpeg",
  "mixedvegetables.jpeg",
  "non-starchy-vegetables.jpeg",
  "nuts.jpeg",
  "Oatmeal-with-berries.jpeg",
  "olive-oils-salad-.jpeg",
  "quinoa.jpeg",
  "rotiwithcurry.jpeg",
  "salmonfish.jpeg",
  "smoothie.jpeg",
  "Steam-Broccoli.jpeg",
  "sweetpotato.jpeg",
  "tofu.jpeg",
  "TomatoMushroomSoup.jpeg",
  "walnuts.jpeg",
  "watermelon.jpeg",
  "wholegrains.jpeg",
  "wholewheatbread.jpeg",
] as const;

export function normalizeDietFoodKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function stemFromFilename(filename: string): string {
  return normalizeDietFoodKey(filename.replace(/\.[^.]+$/i, ""));
}

const imageByStem = new Map<string, string>(
  DIET_RESIZE_FILES.map((file) => [stemFromFilename(file), file]),
);

/** Normalized label → normalized image stem (when API wording differs from filename). */
const LABEL_ALIASES: Record<string, string> = {
  smoothies: "smoothie",
  mixednuts: "nuts",
  mixednut: "nuts",
  bakedsalmon: "salmonfish",
  salmon: "salmonfish",
  grilledfish: "grilledfish",
  grilledchicken: "grillchicken",
  wholegrain: "wholegrains",
  mixedveggies: "mixedvegetables",
  mixedveggie: "mixedvegetables",
  mixedvegetable: "mixedvegetables",
  steambroccoli: "steambroccoli",
  oatmealwithberries: "oatmealwithberries",
  oatmealberries: "oatmealwithberries",
  brownrice: "brownrice",
  leafygreens: "leafgreenvegetables",
  greenleafyvegetables: "leafgreenvegetables",
  nonstarchyvegetables: "nonstarchyvegetables",
  avocadotoast: "avocadotoast",
  chickpeacurry: "chickpeacurry",
  oliveoil: "oliveoilssalad",
  salads: "greensalad",
  greentea: "greentea",
  greenleaftea: "greentea",
};

function resolveFilename(label: string): string | undefined {
  const key = normalizeDietFoodKey(label);
  if (!key) return undefined;

  const stemsToTry = [LABEL_ALIASES[key] ?? key, key];

  for (const stem of stemsToTry) {
    const exact = imageByStem.get(stem);
    if (exact) return exact;
  }

  let best: { file: string; score: number } | undefined;
  for (const [stem, file] of Array.from(imageByStem.entries())) {
    if (stem === key || stem.includes(key) || key.includes(stem)) {
      const score = Math.min(stem.length, key.length);
      if (!best || score > best.score) best = { file, score };
    }
  }
  return best?.file;
}

/** Image URL for a diet food label; matches `public/diet resize` filenames by normalized name. */
export function getDietFoodImageUrl(label?: string): string {
  const file = label?.trim() ? resolveFilename(label) : undefined;
  return `${DIET_RESIZE_IMAGE_BASE}/${file ?? DEFAULT_DIET_IMAGE}`;
}
