import type { Paint } from '@thorvg/webcanvas';
import type { Point } from './room';

export type TrapKind = 'spike' | 'arrow';

// A trap lies hidden on a floor tile until it is found. Stepping on it, hidden or not, sets it off
// once, and it stays as a spent plate.
export interface Trap {
  position: Point;
  kind: TrapKind;
  state: 'hidden' | 'known' | 'spent';
  // The plate drawn on the floor, none while the trap is hidden.
  paint: Paint | null;
}

// A spike trap hurts whoever steps on it. An arrow trap shoots the nearest character in its range,
// which is whoever stepped on it, or whoever is nearest when a thrown item set it off. Armor does
// not take part of the damage away.
export const TRAP_LABELS: Record<TrapKind, string> = {
  spike: 'a spike trap',
  arrow: 'an arrow trap',
};

// Placeholder values for how much each kind hurts.
export const TRAP_DAMAGE: Record<TrapKind, [min: number, max: number]> = {
  spike: [1, 3],
  arrow: [3, 7],
};

// Placeholder values. How many traps a floor has, by the stage. The first stage has spike traps
// only, and the second adds arrow traps, which are the stronger ones.
const TRAP_COUNTS: readonly [min: number, max: number][] = [
  [2, 3],
  [3, 5],
];
const TRAP_KINDS: readonly (readonly TrapKind[])[] = [['spike'], ['spike', 'arrow']];

export const trapCount = (stage: number): [min: number, max: number] =>
  TRAP_COUNTS[Math.min(stage, TRAP_COUNTS.length - 1)];

export const trapKinds = (stage: number): readonly TrapKind[] =>
  TRAP_KINDS[Math.min(stage, TRAP_KINDS.length - 1)];

// Placeholder value. How far an arrow trap sees its target, in tiles.
export const ARROW_RANGE = 6;

// Placeholder value. The chance in each turn that the hero finds a hidden trap on a tile next to
// them, diagonals included.
export const NOTICE_CHANCE = 1 / 3;

// The floors of the dungeon have traps, but not the surface or the boss floors.
export function hasTraps(stage: number, floorInStage: number, floorsPerStage: number): boolean {
  return stage >= 0 && floorInStage < floorsPerStage - 1;
}

// Whether two tiles are within some tiles of each other, counting a diagonal step as one.
export function isWithin(a: Point, b: Point, radius: number): boolean {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= radius;
}
