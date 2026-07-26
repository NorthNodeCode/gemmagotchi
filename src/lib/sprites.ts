/**
 * Sprite-sheet geometry for the Cozy Farm + Cozy People pixel art packs.
 *
 * Animal sheets are a 4-column x 5-row grid of same-size cells. The cell size
 * differs per species (documented in the pack's info.txt) so each entry below
 * carries its own. Rows are facing directions; columns are animation frames:
 *
 *   row 0  facing the viewer      <- what the pet screen uses
 *   row 1  facing away
 *   row 2  facing left
 *   row 3  facing right
 *   row 4  head-down / grazing    <- reads as eating or sleeping
 *
 * Avatar walk sheets are 256x128: 8 frames across, 4 direction rows, 32px cells.
 * Column 0 of each row is the standing pose.
 */

export interface SpeciesSpec {
  id: PetSpecies;
  label: string;
  /** Cell size in the adult sheet. */
  adultCell: number;
  /** Cell size in the baby sheet (the artist drew babies smaller). */
  babyCell: number;
  babyFile: string;
  adultFile: string;
}

export type PetSpecies = "chicken" | "bunny" | "pig" | "sheep" | "goat" | "cow";

/** Cell sizes come from assets/pixelArtAnimals/info.txt — do not guess these. */
export const SPECIES: Record<PetSpecies, SpeciesSpec> = {
  chicken: {
    id: "chicken",
    label: "Chicken",
    babyCell: 16,
    adultCell: 16,
    babyFile: "/pixelart/animals/chicken_baby.png",
    adultFile: "/pixelart/animals/chicken.png",
  },
  bunny: {
    id: "bunny",
    label: "Bunny",
    babyCell: 16,
    adultCell: 17,
    babyFile: "/pixelart/animals/bunny_baby.png",
    adultFile: "/pixelart/animals/bunny.png",
  },
  pig: {
    id: "pig",
    label: "Pig",
    babyCell: 16,
    adultCell: 20,
    babyFile: "/pixelart/animals/pig_baby.png",
    adultFile: "/pixelart/animals/pig.png",
  },
  sheep: {
    id: "sheep",
    label: "Sheep",
    babyCell: 16,
    adultCell: 17,
    babyFile: "/pixelart/animals/sheep_baby.png",
    adultFile: "/pixelart/animals/sheep.png",
  },
  goat: {
    id: "goat",
    label: "Goat",
    babyCell: 16,
    adultCell: 19,
    babyFile: "/pixelart/animals/goat_baby.png",
    adultFile: "/pixelart/animals/goat.png",
  },
  cow: {
    id: "cow",
    label: "Cow",
    babyCell: 21,
    adultCell: 24,
    babyFile: "/pixelart/animals/cow_baby.png",
    adultFile: "/pixelart/animals/cow.png",
  },
};

export const SPECIES_LIST = Object.values(SPECIES);

export const ANIMAL_COLS = 4;
export const ANIMAL_ROWS = 5;

export const FACING_VIEWER = 0;
export const FACING_AWAY = 1;
export const FACING_LEFT = 2;
export const FACING_RIGHT = 3;
export const GRAZING = 4;

// ---------------------------------------------------------------------------
// Items sheet — 10 columns x 12 rows of 16px cells.
// Index order is documented in assets/pixelArtAnimals/item list.txt.
// ---------------------------------------------------------------------------

export const ITEM_CELL = 16;
export const ITEM_COLS = 10;
export const ITEMS_SHEET = "/pixelart/ui/items.png";

/** Item index -> [col, row] in items.png. */
export function itemCell(index: number): { col: number; row: number } {
  return { col: index % ITEM_COLS, row: Math.floor(index / ITEM_COLS) };
}

/** Named items we actually use, by their index in the pack's item list. */
export const ITEM = {
  carrot: 0,
  tomato: 1,
  strawberry: 2,
  pumpkin: 3,
  corn: 4,
  potato: 5,
  watermelon: 6,
  lettuce: 8,
  wheat: 9,
  apple: 10,
  cherry: 12,
  orange: 14,
  pear: 17,
  peach: 18,
  cheese: 23,
  whiteEgg: 30,
  brownEgg: 32,
  greenEgg: 34,
  blueEgg: 36,
  hay: 45,
  raspberry: 46,
  wildBerries: 47,
  diamond: 50,
  ruby: 51,
  emerald: 52,
} as const;

/** Each species hatches from a differently coloured egg. */
export const EGG_FOR_SPECIES: Record<PetSpecies, number> = {
  chicken: ITEM.whiteEgg,
  bunny: ITEM.brownEgg,
  pig: ITEM.whiteEgg,
  sheep: ITEM.whiteEgg,
  goat: ITEM.brownEgg,
  cow: ITEM.brownEgg,
};

// ---------------------------------------------------------------------------
// Avatars — 256x128 walk sheets, 32px cells, 8 frames x 4 direction rows.
// ---------------------------------------------------------------------------

export const AVATAR_CELL = 32;
export const AVATAR_COUNT = 8;
export const avatarFile = (n: number) => `/pixelart/avatars/char${n}.png`;

// ---------------------------------------------------------------------------
// Food the learner can buy and feed to the pet.
// ---------------------------------------------------------------------------

export interface FoodItem {
  id: string;
  label: string;
  item: number;
  cost: number;
  health: number;
}

export const FOODS: FoodItem[] = [
  { id: "hay", label: "Hay", item: ITEM.hay, cost: 8, health: 10 },
  { id: "carrot", label: "Carrot", item: ITEM.carrot, cost: 12, health: 16 },
  { id: "apple", label: "Apple", item: ITEM.apple, cost: 16, health: 22 },
  { id: "berries", label: "Wild berries", item: ITEM.wildBerries, cost: 22, health: 30 },
  { id: "cheese", label: "Cheese", item: ITEM.cheese, cost: 30, health: 40 },
];
