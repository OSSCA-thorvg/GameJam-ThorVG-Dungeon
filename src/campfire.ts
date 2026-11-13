import { ITEM_ICONS } from './itemArt';
import { ITEM_FLOORS_PER_STAGE } from './potions';
import type { Random } from './random';

// Placeholder value. Resting heals a part of the max HP over this many turns.
export const REST_TURNS = 20;
export const REST_HEAL_FRACTION = 0.4;
// Cooking a piece of raw meat takes one turn, so cooking stays quick.
export const COOK_TURNS = 1;

export const CAMPFIRE_ICON = ITEM_ICONS.campfire;

// Picks the floor of a stage, counted from 0, that has the campfire: one of the last two floors
// before the boss floor.
export function pickCampfireFloor(random: Random): number {
  return ITEM_FLOORS_PER_STAGE - (random() < 0.5 ? 1 : 2);
}
