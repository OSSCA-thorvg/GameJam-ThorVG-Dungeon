import type { CentipedeState, Enemy, NecromancerState, UndeadKind } from './enemy';
import type { HazardSnapshot } from './hazards';
import type { Hunger } from './hunger';
import type { Equipment, ItemName, ItemStack } from './items';
import type { GroundThing } from './loot';
import type { LoggedMessage } from './messageLog';
import type { Point, Tile } from './room';
import type { Statuses } from './status';
import type { TrapKind } from './traps';

// What an enemy is, which decides its stats, its picture, and how it acts.
export type SavedEnemyKind =
  | 'weak'
  | 'medium'
  | 'strong'
  | 'ghoul'
  | 'ghost'
  | 'skeleton'
  | 'mimic'
  | 'centipede-head'
  | 'centipede-body'
  | 'necromancer';

// An enemy as saved. The fields an enemy changes as it acts are kept as they are, and its picture
// and behavior come back from its kind.
export type SavedEnemy = Pick<
  Enemy,
  | 'position'
  | 'hp'
  | 'state'
  | 'target'
  | 'lastSeen'
  | 'heading'
  | 'hasSearched'
  | 'hasSeenHero'
  | 'statuses'
  | 'loot'
> & {
  kind: SavedEnemyKind;
  // The segments that follow it, by their place in the list of enemies.
  followers: number[];
  centipede: CentipedeState | null;
  necromancer: NecromancerState | null;
};

// The whole of a run at the end of a turn. The map comes back from the run seed, and the tiles
// keep what changed on it since, like a door that burned down.
export interface SavedGame {
  version: typeof SAVE_VERSION;
  runSeed: number;
  floor: number;
  killCount: number;
  turnCount: number;
  hero: {
    position: Point;
    hp: number;
    maxHp: number;
    level: number;
    experience: number;
    strength: number;
    gold: number;
    statuses: Statuses;
    hunger: Hunger;
    naturalHealProgress: number;
    regeneration: { total: number; turns: number };
    wasHasted: boolean;
  };
  inventory: ItemStack[];
  equipment: Equipment;
  knownPotions: ItemName[];
  tiles: Tile[][];
  // A row of the map a string, with 1 for a tile seen.
  explored: string[];
  groundItems: { thing: GroundThing; position: Point }[];
  traps: { position: Point; kind: TrapKind; state: 'hidden' | 'known' | 'spent' }[];
  coffins: { position: Point; kind: UndeadKind | null; waker: 'hero' | 'boss' }[];
  // The turns of rest the campfire has left. A save from before it was kept has none, and the
  // campfire is then whole.
  restTurnsLeft?: number;
  // By their place in the lists of coffins and enemies.
  chantedCoffins: number[];
  summonedGhouls: number[];
  skippingThisTurn: number[];
  enemies: SavedEnemy[];
  hazards: HazardSnapshot;
  // The line a centipede is about to charge down, or the cone a necromancer gathers.
  warning: { tiles: Point[]; direction: Point } | null;
  log: LoggedMessage[];
}

// A save of another version is dropped, as its fields may not match.
const SAVE_VERSION = 1;
const SAVE_KEY = 'thorvg-dungeon.saved-game';

// JSON has no Infinity, which statuses that never wear off use.
const INFINITY = 'Infinity';

export function writeSave(game: Omit<SavedGame, 'version'>): void {
  try {
    const text = JSON.stringify({ ...game, version: SAVE_VERSION }, (_, value) =>
      value === Infinity ? INFINITY : value,
    );
    localStorage.setItem(SAVE_KEY, text);
  } catch {
    // Storage is blocked or full, and the run goes on unsaved.
  }
}

export function readSave(): SavedGame | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (text === null) {
      return null;
    }
    const game: SavedGame = JSON.parse(text, (_, value) => (value === INFINITY ? Infinity : value));
    return game.version === SAVE_VERSION ? game : null;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return readSave() !== null;
}

export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to delete.
  }
}
