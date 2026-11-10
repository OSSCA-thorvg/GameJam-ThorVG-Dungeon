import { ITEM_FLOORS_PER_STAGE } from './potions';
import type { Random } from './random';

// Placeholder value. Resting heals a part of the max HP over this many turns.
export const REST_TURNS = 20;
export const REST_HEAL_FRACTION = 0.4;
// Cooking a piece of raw meat takes one turn, so cooking stays quick.
export const COOK_TURNS = 1;

export const CAMPFIRE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#5c3b22" d="M4 15.500L22 18.500L21 20.500L3 17.500Z"/>
  <path fill="#7a5030" d="M2 18.500L20 15.500L21 17.500L3 20.500Z"/>
  <path fill="#e8662a" d="M12 2C14 6 18 8.500 18 13C18 16.300 15.300 18 12 18C8.700 18 6 16.300 6 13C6 10 8 8.500 9 6.500C10 8 10.300 9 11 9.500C11.300 7 11.300 4.500 12 2Z"/>
  <path fill="#f5c542" d="M12 8C13 10.500 15 11.500 15 14C15 15.700 13.700 17 12 17C10.300 17 9 15.700 9 14C9 12.500 10 11.500 10.500 10.500C11 11.300 11.300 11.700 11.600 12C11.800 10.500 11.700 9.300 12 8Z"/>
</svg>`;

// Picks the floor of a stage, counted from 0, that has the campfire: one of the last two floors
// before the boss floor.
export function pickCampfireFloor(random: Random): number {
  return ITEM_FLOORS_PER_STAGE - (random() < 0.5 ? 1 : 2);
}
