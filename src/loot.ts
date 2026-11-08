import type { ItemName } from './items';
import { randomInt, type Random } from './random';

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

// Same as Gold.random() of Shattered Pixel Dungeon.
export function rollGold(random: Random, floor: number): number {
  return randomInt(random, 30 + floor * 10, 60 + floor * 20);
}

// Puts some of the loot in chests, each piece on its own.
export function hideInChests(random: Random, loot: Loot[]): GroundThing[] {
  return loot.map((contents) => (random() < CHEST_CHANCE ? { kind: 'chest', contents } : contents));
}
