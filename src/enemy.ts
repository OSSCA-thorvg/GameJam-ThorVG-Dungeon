import type { Scene } from '@thorvg/webcanvas';
import { distancesFrom, findPath } from './path';
import type { Random } from './random';
import type { HealthBar } from './render';
import { isAdjacent, isWalkable, type Point, type Room } from './room';
import type { Statuses } from './status';

// Placeholder value.
export const HERO_MAX_HP = 20;

// Same as the starting hero in Shattered Pixel Dungeon.
export const HERO_ACCURACY = 10;
export const HERO_EVASION = 5;

export type EnemyKind = 'weak' | 'medium' | 'strong';

export interface EnemyStats {
  // The name shown to the player.
  name: string;
  maxHp: number;
  damage: [min: number, max: number];
  accuracy: number;
  evasion: number;
  // How many times it acts in each turn.
  actions: number;
  // The experience the hero gets for defeating it.
  experience: number;
  // The first floor it appears on.
  firstFloor: number;
  // How often it appears, against the other kinds that can appear on a floor.
  weight: number;
}

// Placeholder values, worked out from how many hits the hero needs to defeat each enemy with the
// starting sword, about 2, 3 and 4.5, and how many hits each needs to defeat a hero with 20 HP in
// cloth armor, about 13, 8 and 8. The strong enemy lands its 8 hits in 4 turns, as it acts twice.
// The weak one has the accuracy and evasion of a rat in Shattered Pixel Dungeon.
export const ENEMY_KINDS: Record<EnemyKind, EnemyStats> = {
  weak: {
    name: 'small dummy',
    maxHp: 11,
    damage: [1, 4],
    accuracy: 8,
    evasion: 2,
    actions: 1,
    experience: 1,
    firstFloor: 1,
    weight: 3,
  },
  medium: {
    name: 'dummy',
    maxHp: 16,
    damage: [2, 5],
    accuracy: 9,
    evasion: 3,
    actions: 1,
    experience: 2,
    firstFloor: 2,
    weight: 2,
  },
  strong: {
    name: 'big dummy',
    maxHp: 25,
    damage: [2, 5],
    accuracy: 12,
    evasion: 6,
    actions: 2,
    experience: 4,
    firstFloor: 3,
    weight: 1,
  },
};

// Picks a kind of enemy that can appear on the floor, by weight.
export function pickEnemyKind(random: Random, floor: number): EnemyKind {
  const kinds = (Object.keys(ENEMY_KINDS) as EnemyKind[]).filter(
    (kind) => ENEMY_KINDS[kind].firstFloor <= floor,
  );
  const total = kinds.reduce((sum, kind) => sum + ENEMY_KINDS[kind].weight, 0);
  let roll = random() * total;
  for (const kind of kinds) {
    roll -= ENEMY_KINDS[kind].weight;
    if (roll < 0) {
      return kind;
    }
  }
  return kinds[kinds.length - 1];
}

// Each side rolls from 0 up to its value, and the attack hits unless the evasion roll is higher,
// as in Char.hit() of Shattered Pixel Dungeon. Every roll is independent of earlier ones.
export function rollHit(accuracy: number, evasion: number): boolean {
  return Math.random() * accuracy >= Math.random() * evasion;
}

// The hero has no stealth yet. It starts at 0 in Shattered Pixel Dungeon as well.
const HERO_STEALTH = 0;
// Placeholder value. Shattered Pixel Dungeon divides the distance by 2, so a wandering enemy
// notices for sure only within 2 tiles. Dividing by 4 makes that 4 tiles, and 50% at 8 tiles.
const DETECTION_DISTANCE_DIVISOR = 4;
// Placeholder values. How likely an enemy that lost the hero is to look ahead along the way the
// hero was going, instead of going back to wandering, and how many steps ahead it looks.
const SEARCH_CHANCE = 0.5;
const SEARCH_STEPS = 6;
// Placeholder value. How many random tiles a wandering enemy tries before it waits a turn.
const WANDER_TRIES = 10;

export type EnemyAction = { type: 'wait' } | { type: 'move'; to: Point } | { type: 'attack' };

export interface EnemyContext {
  room: Room;
  hero: Point;
  // Whether the enemy can see the hero now.
  canSeeHero: boolean;
  // Tiles held by the other enemies.
  occupied: Point[];
}

// Decides what an enemy does on its turn. New enemy types add a new behavior.
export type EnemyBehavior = (enemy: Enemy, context: EnemyContext) => EnemyAction;

export interface Enemy {
  kind: EnemyKind;
  stats: EnemyStats;
  position: Point;
  hp: number;
  // A wandering enemy walks to random places. A hunting one goes after the hero, or after where
  // it last saw the hero, as the Wandering and Hunting states of Shattered Pixel Dungeon.
  state: 'wandering' | 'hunting';
  // Where the enemy is going.
  target: Point | null;
  // Where the enemy last saw the hero, and the way the hero was moving then.
  lastSeen: Point | null;
  heading: Point | null;
  // Whether the enemy already looked ahead for the hero since it lost sight of them.
  hasSearched: boolean;
  // Whether the enemy saw the hero at the start of its last turn. As in Shattered Pixel Dungeon,
  // an enemy that did not is surprised by the hero's attack, such as one that just came through
  // a door.
  hasSeenHero: boolean;
  statuses: Statuses;
  paint: Scene;
  healthBar: HealthBar;
  behavior: EnemyBehavior;
}

const isSameTile = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

// Wandering.detectionChance of Shattered Pixel Dungeon, 1 in (distance / 2 + stealth), with a
// larger divisor. A diagonal step counts as one.
function detectionChance(enemy: Point, hero: Point): number {
  const distance = Math.max(Math.abs(enemy.x - hero.x), Math.abs(enemy.y - hero.y));
  return 1 / (distance / DETECTION_DISTANCE_DIVISOR + HERO_STEALTH);
}

function stepToward(room: Room, from: Point, to: Point, blocked: Point[]): EnemyAction {
  const path = findPath(room, from, to, blocked);
  return path.length > 0 ? { type: 'move', to: path[0] } : { type: 'wait' };
}

function randomDestination(room: Room, from: Point, blocked: Point[]): Point | null {
  const tiles = room.tiles.flatMap((row, y) =>
    row.flatMap((_, x) => (isWalkable(room, x, y) ? [{ x, y }] : [])),
  );
  for (let attempt = 0; attempt < WANDER_TRIES; attempt++) {
    const tile = tiles[Math.floor(Math.random() * tiles.length)];
    if (!isSameTile(tile, from) && findPath(room, from, tile, blocked).length > 0) {
      return tile;
    }
  }
  return null;
}

// Guesses where the hero went after going out of sight: the tile farthest along the way they were
// moving, within a few steps of where they were last seen.
function guessHeroTile(room: Room, lastSeen: Point, heading: Point): Point | null {
  const distances = distancesFrom(room, lastSeen);
  let best: Point | null = null;
  let bestProgress = 0;
  distances.forEach((row, y) =>
    row.forEach((distance, x) => {
      const progress = (x - lastSeen.x) * heading.x + (y - lastSeen.y) * heading.y;
      if (distance > 0 && distance <= SEARCH_STEPS && progress > bestProgress) {
        best = { x, y };
        bestProgress = progress;
      }
    }),
  );
  return best;
}

export function alertEnemy(enemy: Enemy, hero: Point): void {
  if (enemy.lastSeen && !isSameTile(enemy.lastSeen, hero)) {
    enemy.heading = { x: hero.x - enemy.lastSeen.x, y: hero.y - enemy.lastSeen.y };
  }
  enemy.state = 'hunting';
  enemy.target = hero;
  enemy.lastSeen = hero;
  enemy.hasSearched = false;
}

// Wanders until it notices the hero in view, then chases. When it loses sight of the hero,
// it goes to where it last saw them, which takes it through a door the hero was seen using.
// From there it either looks ahead along the hero's way or goes back to wandering.
export const chaser: EnemyBehavior = (enemy, { room, hero, canSeeHero, occupied }) => {
  const blocked = [...occupied, hero];

  const noticesHero =
    canSeeHero &&
    (enemy.state === 'hunting' || Math.random() < detectionChance(enemy.position, hero));
  if (noticesHero) {
    alertEnemy(enemy, hero);
    return isAdjacent(enemy.position, hero)
      ? { type: 'attack' }
      : stepToward(room, enemy.position, hero, occupied);
  }

  if (enemy.state === 'hunting') {
    if (enemy.target && !isSameTile(enemy.position, enemy.target)) {
      const action = stepToward(room, enemy.position, enemy.target, blocked);
      if (action.type === 'move') {
        return action;
      }
    }
    const guess =
      !enemy.hasSearched && enemy.lastSeen && enemy.heading && Math.random() < SEARCH_CHANCE
        ? guessHeroTile(room, enemy.lastSeen, enemy.heading)
        : null;
    if (guess) {
      enemy.hasSearched = true;
      enemy.target = guess;
      return stepToward(room, enemy.position, guess, blocked);
    }
    enemy.state = 'wandering';
    enemy.target = null;
  }

  if (!enemy.target || isSameTile(enemy.position, enemy.target)) {
    enemy.target = randomDestination(room, enemy.position, blocked);
  }
  const action = enemy.target ? stepToward(room, enemy.position, enemy.target, blocked) : null;
  if (!action || action.type === 'wait') {
    enemy.target = null;
    return { type: 'wait' };
  }
  return action;
};

export function createEnemy(
  kind: EnemyKind,
  position: Point,
  paint: Scene,
  healthBar: HealthBar,
  behavior: EnemyBehavior,
): Enemy {
  return {
    kind,
    stats: ENEMY_KINDS[kind],
    position,
    hp: ENEMY_KINDS[kind].maxHp,
    state: 'wandering',
    target: null,
    lastSeen: null,
    heading: null,
    hasSearched: false,
    hasSeenHero: false,
    statuses: {},
    paint,
    healthBar,
    behavior,
  };
}

// Damage breaks the ice of a frozen enemy.
export function damageEnemy(enemy: Enemy, damage: number): void {
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.healthBar.show(enemy.hp / enemy.stats.maxHp);
  delete enemy.statuses.frozen;
}

export function healEnemy(enemy: Enemy, amount: number): void {
  enemy.hp = Math.min(enemy.stats.maxHp, enemy.hp + amount);
  enemy.healthBar.show(enemy.hp / enemy.stats.maxHp);
}

// Being attacked makes the enemy hunt the hero.
export function attackEnemy(enemy: Enemy, hero: Point, damage: number): void {
  alertEnemy(enemy, hero);
  damageEnemy(enemy, damage);
}
