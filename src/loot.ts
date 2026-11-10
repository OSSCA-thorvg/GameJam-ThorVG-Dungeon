import type { ItemName } from './items';
import { ITEM_FLOORS_PER_STAGE } from './potions';
import { pick, randomInt, type Random } from './random';

// Something lying on a tile that the hero can pick up. Gold goes to the hero's purse, not the bag.
export type Loot = { kind: 'item'; name: ItemName } | { kind: 'gold'; amount: number };

// What lies on a tile. A chest hides what is in it until the hero opens it.
export type GroundThing = Loot | { kind: 'chest'; contents: Loot };

// The average on a floor of Shattered Pixel Dungeon, where a floor has 3.5 items and 10 of every
// 35 items are gold.
export const GOLD_PILES_PER_FLOOR = 1;

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

export const GOLD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <ellipse cx="7.500" cy="18.300" rx="4.600" ry="2.200" fill="#a87a22"/>
  <ellipse cx="7.500" cy="17" rx="4.600" ry="2.200" fill="#e8bf45"/>
  <ellipse cx="7.500" cy="17" rx="2.600" ry="1.100" fill="#f5d877"/>
  <ellipse cx="16.500" cy="18.300" rx="4.600" ry="2.200" fill="#a87a22"/>
  <ellipse cx="16.500" cy="17" rx="4.600" ry="2.200" fill="#e8bf45"/>
  <ellipse cx="16.500" cy="17" rx="2.600" ry="1.100" fill="#f5d877"/>
  <ellipse cx="12" cy="19.900" rx="4.600" ry="2.200" fill="#a87a22"/>
  <ellipse cx="12" cy="18.600" rx="4.600" ry="2.200" fill="#e8bf45"/>
  <ellipse cx="12" cy="18.600" rx="2.600" ry="1.100" fill="#f5d877"/>
  <ellipse cx="12" cy="14.900" rx="4.600" ry="2.200" fill="#a87a22"/>
  <ellipse cx="12" cy="13.600" rx="4.600" ry="2.200" fill="#e8bf45"/>
  <ellipse cx="12" cy="13.600" rx="2.600" ry="1.100" fill="#f5d877"/>
  <ellipse cx="9.200" cy="10.700" rx="4.600" ry="2.200" fill="#a87a22"/>
  <ellipse cx="9.200" cy="9.400" rx="4.600" ry="2.200" fill="#e8bf45"/>
  <ellipse cx="9.200" cy="9.400" rx="2.600" ry="1.100" fill="#f5d877"/>
</svg>`;

export const CHEST_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#8a5a2c" d="M3 11H21V20H3Z"/>
  <path fill="#a86d36" d="M3 11V8Q3 4.500 7 4.500H17Q21 4.500 21 8V11Z"/>
  <path fill="#5c3b1e" d="M3 10.500H21V12H3Z"/>
  <path fill="#9aa0aa" d="M5.500 4.900H7.500V20H5.500Z"/>
  <path fill="#9aa0aa" d="M16.500 4.900H18.500V20H16.500Z"/>
  <path fill="#c9a440" d="M10.500 9H13.500V14H10.500Z"/>
  <path fill="#3a2a1a" d="M11.600 10.600H12.400V12.600H11.600Z"/>
</svg>`;

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
