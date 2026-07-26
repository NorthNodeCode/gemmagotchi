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
 *   row 4  curled up, eyes shut   <- sleeping (verified on /dev/sprites for
 *                                    all six species; frames barely differ,
 *                                    so animating it reads as breathing)
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
  /**
   * Row that reads as asleep for this species. Row 4 is head-down for most of
   * the pack, but not every animal was drawn the same way, so this is an
   * explicit per-species value verified on /dev/sprites rather than assumed.
   */
  sleepRow?: number;
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
export const SLEEPING = 4;

/** Sleep pose row for a species — row 4 everywhere, overridable per species. */
export const sleepRowFor = (species: PetSpecies) => SPECIES[species]?.sleepRow ?? SLEEPING;

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

/** Named items, by their true cell index in items.png (verified visually). */
export const ITEM = {
  carrot: 0,
  tomato: 1,
  strawberry: 2,
  pumpkin: 3,
  corn: 4,
  potato: 5,
  cabbage: 6,
  lettuce: 8,
  wheat: 9,
  apple: 20,
  avocado: 21,
  cherry: 22,
  orange: 24,
  pear: 27,
  peach: 28,
  milk: 30,
  butter: 32,
  cheese: 33,
  whiteEgg: 40,
  smallWhiteEgg: 41,
  brownEgg: 42,
  smallBrownEgg: 43,
  greenEgg: 44,
  blueEgg: 46,
  hay: 56,
  raspberry: 60,
  wildBerries: 61,
  mushroom: 62,
  diamond: 64,
  ruby: 65,
  emerald: 66,
  loveHeart: 116,
} as const;

/** Each species hatches from a differently coloured egg. */
export const EGG_FOR_SPECIES: Record<PetSpecies, number> = {
  chicken: ITEM.whiteEgg,
  bunny: ITEM.smallBrownEgg,
  pig: ITEM.smallWhiteEgg,
  sheep: ITEM.blueEgg,
  goat: ITEM.greenEgg,
  cow: ITEM.brownEgg,
};

// ---------------------------------------------------------------------------
// Avatars — 256x128 walk sheets, 32px cells, 8 frames x 4 direction rows.
// ---------------------------------------------------------------------------

export const AVATAR_CELL = 32;
export const AVATAR_COUNT = 8;
export const avatarFile = (n: number) => `/pixelart/avatars/char${n}.png`;

/**
 * Hair, clothes and eyes ship as the full merged animation sheet (256x1568,
 * i.e. 8 cols x 49 rows of 32px cells) repeated horizontally once per colour
 * variant. So colour c's standing-facing-viewer frame is at column c * 8,
 * row 0 — the same coordinates the bare body uses, which is what makes the
 * layers line up when stacked.
 */
export const LAYER_ROWS = 49;
export const LAYER_COLS_PER_COLOUR = 8;
export const layerCols = (sheetWidth: number) => sheetWidth / AVATAR_CELL;

export interface AvatarLayer {
  src: string;
  /** Total columns across the whole sheet (all colour variants). */
  cols: number;
  colour: number;
}

const HAIR_STYLES = [
  "/pixelart/avatars/layers/hair_bob.png",
  "/pixelart/avatars/layers/hair_curly.png",
  "/pixelart/avatars/layers/hair_braids.png",
  "/pixelart/avatars/layers/hair_buzz.png",
];

/** Hair and clothes sheets are 3584 and 2560 wide respectively. */
const HAIR_COLS = 3584 / AVATAR_CELL;
const CLOTHES_COLS = 2560 / AVATAR_CELL;
const EYES_COLS = 3584 / AVATAR_CELL;

/**
 * A stable, varied look per character slot, so the eight choices read as eight
 * different people rather than eight bare bodies.
 */
export function lookFor(character: number): AvatarLayer[] {
  const i = Math.max(0, character - 1);
  return [
    { src: "/pixelart/avatars/layers/eyes.png", cols: EYES_COLS, colour: i % 3 },
    { src: "/pixelart/avatars/layers/clothes_pants.png", cols: CLOTHES_COLS, colour: (i + 2) % 10 },
    { src: "/pixelart/avatars/layers/clothes_basic.png", cols: CLOTHES_COLS, colour: i % 10 },
    { src: HAIR_STYLES[i % HAIR_STYLES.length], cols: HAIR_COLS, colour: (i * 3) % 14 },
  ];
}

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
