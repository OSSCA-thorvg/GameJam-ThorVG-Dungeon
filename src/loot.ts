import { ITEM_ICONS } from './itemArt';
import type { ItemName } from './items';
import { ITEM_FLOORS_PER_STAGE } from './potions';
import { pick, randomInt, type Random } from './random';

// Something lying on a tile that the hero can pick up. Gold goes to the hero's purse, not the bag.
// An item may be a pile of the same one.
export type Loot =
  | { kind: 'item'; name: ItemName; count?: number }
  | { kind: 'gold'; amount: number };

// What lies on a tile. A chest hides what is in it until the hero opens it.
export type GroundThing = Loot | { kind: 'chest'; contents: Loot };

// The average on a floor of Shattered Pixel Dungeon, where a floor has 3.5 items and 10 of every
// 35 items are gold.
export const GOLD_PILES_PER_FLOOR = 1;

// Same as Level.create() of Shattered Pixel Dungeon, which puts one food on every floor but the
// boss floors.
export const FOOD_PER_FLOOR = 1;

// RegularLevel.createItems() of Shattered Pixel Dungeon puts 5 of every 20 items in chests when no
// mimics take the place of any.
const CHEST_CHANCE = 5 / 20;

// Placeholder value. How often a stage has a mimic. It never has more than one.
const MIMIC_CHANCE_PER_STAGE = 1 / 2;

// Generator of Shattered Pixel Dungeon has 4 weapons and 3 armors in every 70 items, which comes
// to these chances on a floor of 3.5 items.
const WEAPON_CHANCE_PER_FLOOR = (3.5 * 4) / 70;
const ARMOR_CHANCE_PER_FLOOR = (3.5 * 3) / 70;

// Same as the chance of a tier 5 weapon, and of plate armor, on floors 5 to 9 of Shattered Pixel
// Dungeon (floorSetTierProbs of Generator).
const RARE_EQUIPMENT_CHANCE = 0.05;

// The weapons or armors that can lie on the floors of a stage. The rare one comes up with
// RARE_EQUIPMENT_CHANCE, and the common ones share the rest evenly, as the weapons of a tier do in
// Generator of Shattered Pixel Dungeon.
interface EquipmentPool {
  common: ItemName[];
  rare?: ItemName;
}

// One pool for each stage. Stages past the last use the last pool.
const STAGE_WEAPONS: EquipmentPool[] = [
  { common: ['dagger', 'spear', 'longsword'] },
  { common: ['dagger', 'spear', 'longsword'], rare: 'zweihander' },
];
const STAGE_ARMORS: EquipmentPool[] = [
  { common: ['leather-armor'] },
  { common: ['leather-armor', 'chain-mail'], rare: 'plate-armor' },
];

// Placeholder values. How likely a floor is to have a pile of throwing weapons, on which floors each
// kind lies, and how many are in a pile. A floor with a pile picks a rare kind that lies on it with
// THROWN_RARE_CHANCE, as melee weapons of the highest tier are rare, and otherwise one of the
// common kinds that lie on it.
const THROWN_WEAPON_CHANCE_PER_FLOOR = 0.5;
const THROWN_RARE_CHANCE = 0.2;
const THROWN_WEAPON_DROPS: {
  name: ItemName;
  firstFloor: number;
  lastFloor: number;
  count: [min: number, max: number];
  isRare?: boolean;
}[] = [
  { name: 'dart', firstFloor: 1, lastFloor: 4, count: [2, 4] },
  { name: 'javelin', firstFloor: 3, lastFloor: 9, count: [2, 3] },
  { name: 'throwing-axe', firstFloor: 6, lastFloor: 9, count: [1, 3], isRare: true },
];

// Rolls the pile of throwing weapons lying on a floor, or none.
export function rollThrownWeapons(random: Random, floor: number): Loot[] {
  const kinds = THROWN_WEAPON_DROPS.filter(
    ({ firstFloor, lastFloor }) => floor >= firstFloor && floor <= lastFloor,
  );
  if (kinds.length === 0 || random() >= THROWN_WEAPON_CHANCE_PER_FLOOR) {
    return [];
  }
  const rare = kinds.filter(({ isRare }) => isRare);
  const common = kinds.filter(({ isRare }) => !isRare);
  const { name, count } =
    rare.length > 0 && random() < THROWN_RARE_CHANCE ? pick(random, rare) : pick(random, common);
  return [{ kind: 'item', name, count: randomInt(random, ...count) }];
}

export const GOLD_ICON = ITEM_ICONS.gold;

export const CHEST_ICON = ITEM_ICONS.chest;

export const MIMIC_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#2a1410" d="M3 14H21L20.500 7H3.500Z"/>
  <ellipse cx="12" cy="13" rx="4" ry="1.600" fill="#c4455a"/>
  <path fill="#8a5a2c" d="M3 14H21V21H3Z"/>
  <path fill="#9aa0aa" d="M5.500 14H7.500V21H5.500Z"/>
  <path fill="#9aa0aa" d="M16.500 14H18.500V21H16.500Z"/>
  <path fill="#a86d36" d="M3.500 7L4.500 2.500Q5.500 1 8 1H16Q18.500 1 19.500 2.500L20.500 7Z"/>
  <path fill="#9aa0aa" d="M5.800 1.600H7.700L7.300 7H5.200Z"/>
  <path fill="#9aa0aa" d="M16.300 1.600H18.200L18.800 7H16.700Z"/>
  <path fill="#f2efe6" d="M4 14L5.500 11.300L7 14Z"/>
  <path fill="#f2efe6" d="M7.500 14L9 11.300L10.500 14Z"/>
  <path fill="#f2efe6" d="M10.500 14L12 11.300L13.500 14Z"/>
  <path fill="#f2efe6" d="M13.500 14L15 11.300L16.500 14Z"/>
  <path fill="#f2efe6" d="M17 14L18.500 11.300L20 14Z"/>
  <path fill="#f2efe6" d="M5.200 7L6.700 9.500L8.200 7Z"/>
  <path fill="#f2efe6" d="M8.500 7L10 9.500L11.500 7Z"/>
  <path fill="#f2efe6" d="M12.500 7L14 9.500L15.500 7Z"/>
  <path fill="#f2efe6" d="M15.800 7L17.300 9.500L18.800 7Z"/>
  <circle cx="9.500" cy="4.300" r="1.300" fill="#f5d040"/>
  <circle cx="14.500" cy="4.300" r="1.300" fill="#f5d040"/>
  <circle cx="9.500" cy="4.300" r="0.550" fill="#2a1410"/>
  <circle cx="14.500" cy="4.300" r="0.550" fill="#2a1410"/>
</svg>`;

// Same as Gold.random() of Shattered Pixel Dungeon.
export function rollGold(random: Random, floor: number): number {
  return randomInt(random, 30 + floor * 10, 60 + floor * 20);
}

function pickEquipment(random: Random, pools: EquipmentPool[], stage: number): ItemName {
  const { common, rare } = pools[Math.min(stage, pools.length - 1)];
  return rare && random() < RARE_EQUIPMENT_CHANCE ? rare : pick(random, common);
}

// Rolls the weapon and the armor lying on a floor of a stage, counted from 0. A floor can have
// neither, one, or both.
export function rollEquipment(random: Random, stage: number): ItemName[] {
  const items: ItemName[] = [];
  if (random() < WEAPON_CHANCE_PER_FLOOR) {
    items.push(pickEquipment(random, STAGE_WEAPONS, stage));
  }
  if (random() < ARMOR_CHANCE_PER_FLOOR) {
    items.push(pickEquipment(random, STAGE_ARMORS, stage));
  }
  return items;
}

// Puts some of the loot in chests, each piece on its own.
export function hideInChests(random: Random, loot: Loot[]): GroundThing[] {
  return loot.map((contents) => (random() < CHEST_CHANCE ? { kind: 'chest', contents } : contents));
}

// Picks the floor of a stage, counted from 0, that has the stage's mimic, or null for none.
export function pickMimicFloor(random: Random): number | null {
  return random() < MIMIC_CHANCE_PER_STAGE ? Math.floor(random() * ITEM_FLOORS_PER_STAGE) : null;
}
