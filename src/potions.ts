import { ITEMS, type ItemName, type PotionName } from './items';
import { shuffle, type Random } from './random';

type Color = [r: number, g: number, b: number];

// Every potion looks like one of these, picked anew for each run. Plain color names, so a player
// can tell them apart at a glance.
const POTION_COLORS: { name: string; color: Color }[] = [
  { name: 'Red', color: [210, 50, 45] },
  { name: 'Orange', color: [235, 130, 30] },
  { name: 'Yellow', color: [240, 210, 40] },
  { name: 'Lime', color: [150, 215, 50] },
  { name: 'Green', color: [40, 150, 70] },
  { name: 'Cyan', color: [60, 200, 220] },
  { name: 'Blue', color: [50, 100, 220] },
  { name: 'Purple', color: [140, 70, 200] },
  { name: 'Pink', color: [240, 130, 190] },
  { name: 'Brown', color: [130, 85, 45] },
  { name: 'Black', color: [35, 35, 40] },
  { name: 'White', color: [250, 250, 250] },
];

export const POTIONS = (Object.keys(ITEMS) as ItemName[]).filter(
  (name): name is PotionName => ITEMS[name].potion !== undefined,
);

// Placeholder values. How often each potion drops, against the others.
const POTION_WEIGHTS: Record<PotionName, number> = {
  'healing-potion': 8,
  'strength-potion': 1,
  'experience-potion': 1,
  'haste-potion': 3,
  'invisibility-potion': 3,
  'levitation-potion': 3,
  'telepathy-potion': 3,
  'fire-potion': 3,
  'frost-potion': 3,
  'poison-gas-potion': 3,
  'paralysis-potion': 3,
};

export function randomPotion(random: Random): PotionName {
  const total = POTIONS.reduce((sum, name) => sum + POTION_WEIGHTS[name], 0);
  let roll = random() * total;
  for (const name of POTIONS) {
    roll -= POTION_WEIGHTS[name];
    if (roll < 0) {
      return name;
    }
  }
  return POTIONS[POTIONS.length - 1];
}

function potionIcon([r, g, b]: Color): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path fill="#b9c0cc" d="M9 2H15V4H14V9L19.500 18.500Q20.500 21 18 21H6Q3.500 21 4.500 18.500L10 9V4H9Z"/>
    <path fill="rgb(${r},${g},${b})" d="M8.300 13H15.700L18.600 18.800Q19 20 17.500 20H6.500Q5 20 5.400 18.800Z"/>
  </svg>`;
}

// How an item looks to the player. A potion shows only its color until it is identified.
export interface ItemLook {
  displayName: string;
  description: string;
  icon: string;
  isKnown: boolean;
  // The color a potion splashes when it breaks.
  color?: Color;
}

// Which color each potion has in this run, and which potions the player has identified.
export interface PotionLore {
  lookOf(name: ItemName): ItemLook;
  identify(name: ItemName): void;
}

export function createPotionLore(random: Random): PotionLore {
  const colors = shuffle(random, [...POTION_COLORS]);
  const colorOf = new Map(POTIONS.map((name, index) => [name, colors[index]]));
  const known = new Set<ItemName>();

  return {
    lookOf(name) {
      const item = ITEMS[name];
      const appearance = colorOf.get(name as PotionName);
      if (!appearance) {
        const { displayName, description, icon = '' } = item;
        return { displayName, description, icon, isKnown: true };
      }
      const isKnown = known.has(name);
      return {
        displayName: isKnown ? item.displayName : `${appearance.name} potion`,
        description: isKnown
          ? item.description
          : 'You do not know what this potion does. Drinking it will tell you.',
        icon: potionIcon(appearance.color),
        isKnown,
        color: appearance.color,
      };
    },
    identify(name) {
      known.add(name);
    },
  };
}
