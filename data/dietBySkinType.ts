import { DIET_RESIZE_IMAGE_BASE } from "@/utils/dietFoodImages";

export type SkinTypeKey =
  | "SENSITIVE_SKIN"
  | "COMBINATION_SKIN"
  | "OILY_SKIN"
  | "DRY_SKIN"
  | "NORMAL_SKIN";

export type DietFoodTile = {
  label: string;
  imageFile: string;
};

export type DietMealRow = {
  /** Shown on the right (orange or green). */
  heading: string;
  tiles: [DietFoodTile, DietFoodTile, DietFoodTile];
};

export type DietSkinTypePlan = {
  title: string;
  breakfast: DietMealRow;
  lunchFirst: DietMealRow;
  lunchSecond: DietMealRow;
  dinnerFirst: DietMealRow;
  dinnerSecond: DietMealRow;
  supplements: { heading: string; description: string }[];
};

export function dietFoodImageUrl(imageFile: string): string {
  return `${DIET_RESIZE_IMAGE_BASE}/${imageFile}`;
}

const tile = (label: string, imageFile: string): DietFoodTile => ({ label, imageFile });

const row = (heading: string, tiles: [DietFoodTile, DietFoodTile, DietFoodTile]): DietMealRow => ({
  heading,
  tiles,
});

export const ADDITIONAL_SUPPLEMENTS: DietSkinTypePlan["supplements"] = [
  {
    heading: "Rich in Omega-3s",
    description: "Salmon, flaxseeds, walnuts, and chia seeds.",
  },
  {
    heading: "Antioxidant-Rich",
    description: "Berries, green tea, and dark leafy greens.",
  },
  {
    heading: "Hydrating Foods",
    description: "Cucumber, watermelon, and citrus fruits.",
  },
  {
    heading: "Low-Glycaemic Index Foods",
    description: "Whole grains, legumes, and non-starchy vegetables.",
  },
];

const SENSITIVE_SKIN: DietSkinTypePlan = {
  title: "Sensitive Skin Diet",
  breakfast: row("Top oats with berries", [
    tile("Oats with berries", "Oatmeal-with-berries.jpeg"),
    tile("Banana", "bananas.jpeg"),
    tile("Chia seeds", "chiaseeds.jpeg"),
  ]),
  lunchFirst: row("Protein", [
    tile("Grilled fish", "Grilled-Fish.jpeg"),
    tile("Lentils", "lentils.jpeg"),
    tile("Chickpeas", "chickpea-curry.jpeg"),
  ]),
  lunchSecond: row("Carbohydrates", [
    tile("Brown rice", "brown-rice.jpeg"),
    tile("Quinoa", "quinoa.jpeg"),
    tile("Whole-grain bread", "wholewheatbread.jpeg"),
  ]),
  dinnerFirst: row("Protein", [
    tile("Grilled chicken", "grillchicken.jpeg"),
    tile("Tofu", "tofu.jpeg"),
    tile("Paneer", "Grilled-Paneer.jpeg"),
  ]),
  dinnerSecond: row("Vegetables", [
    tile("Steamed broccoli", "Steam-Broccoli.jpeg"),
    tile("Beans", "beans.jpeg"),
    tile("Carrot", "carrots.jpeg"),
  ]),
  supplements: ADDITIONAL_SUPPLEMENTS,
};

const COMBINATION_SKIN: DietSkinTypePlan = {
  title: "Combination Skin Diet",
  breakfast: row("Avocado toast", [
    tile("Whole-grain bread", "wholewheatbread.jpeg"),
    tile("Avocado", "avocado.jpeg"),
    tile("Avocado toast", "avocadotoast.jpeg"),
  ]),
  lunchFirst: row("Protein", [
    tile("Grilled chicken", "grillchicken.jpeg"),
    tile("Salmon", "salmonfish.jpeg"),
    tile("Tofu", "tofu.jpeg"),
  ]),
  lunchSecond: row("Carbohydrates", [
    tile("Quinoa", "quinoa.jpeg"),
    tile("Brown rice", "brown-rice.jpeg"),
    tile("Whole wheat roti", "rotiwithcurry.jpeg"),
  ]),
  dinnerFirst: row("Protein", [
    tile("Baked fish", "bakedfish.jpeg"),
    tile("Grilled paneer", "Grilled-Paneer.jpeg"),
    tile("Chickpea curry", "chickpea-curry.jpeg"),
  ]),
  dinnerSecond: row("Vegetables", [
    tile("Steamed broccoli", "Steam-Broccoli.jpeg"),
    tile("Zucchini", "broccolizucchini.jpeg"),
    tile("Sautéed spinach", "leafgreenvegetables.jpeg"),
  ]),
  supplements: ADDITIONAL_SUPPLEMENTS,
};

const OILY_SKIN: DietSkinTypePlan = {
  title: "Oily Skin Diet",
  breakfast: row("Option 1", [
    tile("Fruit smoothie", "allfruitssmoothie.jpeg"),
    tile("Green tea", "greentea.jpeg"),
    tile("Nuts", "nuts.jpeg"),
  ]),
  lunchFirst: row("Option 1", [
    tile("Salmon", "salmonfish.jpeg"),
    tile("Broccoli", "Steam-Broccoli.jpeg"),
    tile("Grilled fish", "Grilled-Fish.jpeg"),
  ]),
  lunchSecond: row("Option 2", [
    tile("Whole grain", "wholegrains.jpeg"),
    tile("Mixed vegetables", "mixedvegetables.jpeg"),
    tile("Fruits", "fruits.jpeg"),
  ]),
  dinnerFirst: row("Option 1", [
    tile("Grilled fish", "Grilled-Fish.jpeg"),
    tile("Tofu", "tofu.jpeg"),
    tile("Lean meat", "chicken.jpeg"),
  ]),
  dinnerSecond: row("Option 2", [
    tile("Mixed vegetables", "mixedvegetables.jpeg"),
    tile("Roti with curry", "rotiwithcurry.jpeg"),
    tile("Green salad", "greensalad.jpeg"),
  ]),
  supplements: ADDITIONAL_SUPPLEMENTS,
};

const DRY_SKIN: DietSkinTypePlan = {
  title: "Dry Skin Diet",
  breakfast: row("Option 1", [
    tile("Green tea", "greentea.jpeg"),
    tile("Smoothie", "smoothie.jpeg"),
    tile("Walnuts", "walnuts.jpeg"),
  ]),
  lunchFirst: row("Option 1", [
    tile("Fish", "Grilled-Fish.jpeg"),
    tile("Chicken", "grillchicken.jpeg"),
    tile("Green salad", "greensalad.jpeg"),
  ]),
  lunchSecond: row("Option 2", [
    tile("Sweet potatoes", "sweetpotato.jpeg"),
    tile("Avocado", "avocado.jpeg"),
    tile("Mixed vegetables", "mixedvegetables.jpeg"),
  ]),
  dinnerFirst: row("Option 1", [
    tile("Grilled fish", "Grilled-Fish.jpeg"),
    tile("Tofu", "tofu.jpeg"),
    tile("Lean meat", "chicken.jpeg"),
  ]),
  dinnerSecond: row("Option 2", [
    tile("Roti with curry", "rotiwithcurry.jpeg"),
    tile("Mixed vegetables", "mixedvegetables.jpeg"),
    tile("Green salad", "greensalad.jpeg"),
  ]),
  supplements: ADDITIONAL_SUPPLEMENTS,
};

const NORMAL_SKIN: DietSkinTypePlan = {
  title: "Normal Skin Diet",
  breakfast: row("Option 1", [
    tile("Green tea", "greentea.jpeg"),
    tile("Smoothie", "smoothie.jpeg"),
    tile("Walnuts", "walnuts.jpeg"),
  ]),
  lunchFirst: row("Option 1", [
    tile("Fish", "Grilled-Fish.jpeg"),
    tile("Chicken", "grillchicken.jpeg"),
    tile("Nuts", "nuts.jpeg"),
  ]),
  lunchSecond: row("Option 2", [
    tile("Sweet potatoes", "sweetpotato.jpeg"),
    tile("Avocado", "avocado.jpeg"),
    tile("Mixed vegetables", "mixedvegetables.jpeg"),
  ]),
  dinnerFirst: row("Option 1", [
    tile("Grilled fish", "Grilled-Fish.jpeg"),
    tile("Tofu", "tofu.jpeg"),
    tile("Lean meat", "chicken.jpeg"),
  ]),
  dinnerSecond: row("Option 2", [
    tile("Roti with curry", "rotiwithcurry.jpeg"),
    tile("Mixed vegetables", "mixedvegetables.jpeg"),
    tile("Green salad", "greensalad.jpeg"),
  ]),
  supplements: ADDITIONAL_SUPPLEMENTS,
};

const PLANS: Record<SkinTypeKey, DietSkinTypePlan> = {
  SENSITIVE_SKIN,
  COMBINATION_SKIN,
  OILY_SKIN,
  DRY_SKIN,
  NORMAL_SKIN,
};

/** Map API / session / questionnaire values to a diet plan key. */
export function normalizeSkinTypeKey(skinType?: string | null): SkinTypeKey {
  const raw = (skinType ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!raw) return "NORMAL_SKIN";

  if (raw.includes("sensitive")) return "SENSITIVE_SKIN";
  if (raw.includes("combination")) return "COMBINATION_SKIN";
  if (raw.includes("oily")) return "OILY_SKIN";
  if (raw.includes("dry")) return "DRY_SKIN";
  if (raw.includes("normal")) return "NORMAL_SKIN";

  const upper = raw.toUpperCase();
  if (upper in PLANS) return upper as SkinTypeKey;

  return "NORMAL_SKIN";
}

export function getDietPlanForSkinType(skinType?: string | null): DietSkinTypePlan {
  return PLANS[normalizeSkinTypeKey(skinType)];
}
