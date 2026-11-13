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

// Placeholder values. How likely a floor is to have throwing weapons, on which floors each kind
// lies, and how many can lie together. A floor with them picks a rare kind that lies on it with
// THROWN_RARE_CHANCE, as melee weapons of the highest tier are rare, and otherwise one of the
// common kinds that lie on it. There is one, and each one more comes with THROWN_EXTRA_CHANCE up
// to the most of the kind, so a pile of 4 darts comes up 1 time in 8.
const THROWN_WEAPON_CHANCE_PER_FLOOR = 0.3;
const THROWN_RARE_CHANCE = 0.2;
const THROWN_EXTRA_CHANCE = 0.5;
const THROWN_WEAPON_DROPS: {
  name: ItemName;
  firstFloor: number;
  lastFloor: number;
  maxCount: number;
  isRare?: boolean;
}[] = [
  { name: 'dart', firstFloor: 1, lastFloor: 4, maxCount: 4 },
  { name: 'javelin', firstFloor: 3, lastFloor: 9, maxCount: 3 },
  { name: 'throwing-axe', firstFloor: 6, lastFloor: 9, maxCount: 3, isRare: true },
];

// Rolls the throwing weapons lying on a floor, or none.
export function rollThrownWeapons(random: Random, floor: number): Loot[] {
  const kinds = THROWN_WEAPON_DROPS.filter(
    ({ firstFloor, lastFloor }) => floor >= firstFloor && floor <= lastFloor,
  );
  if (kinds.length === 0 || random() >= THROWN_WEAPON_CHANCE_PER_FLOOR) {
    return [];
  }
  const rare = kinds.filter(({ isRare }) => isRare);
  const common = kinds.filter(({ isRare }) => !isRare);
  const { name, maxCount } =
    rare.length > 0 && random() < THROWN_RARE_CHANCE ? pick(random, rare) : pick(random, common);
  let count = 1;
  while (count < maxCount && random() < THROWN_EXTRA_CHANCE) {
    count++;
  }
  return [{ kind: 'item', name, count }];
}

export const GOLD_ICON = ITEM_ICONS.gold;

export const CHEST_ICON = ITEM_ICONS.chest;

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
