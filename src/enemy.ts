import type { Scene } from '@thorvg/webcanvas';
import { distancesFrom, findPath } from './path';
import type { HealthBar } from './render';
import { isAdjacent, isWalkable, type Point, type Room } from './room';
import type { Statuses } from './status';

// Placeholder values for testing combat.
const ENEMY_MAX_HP = 10;
export const HERO_MAX_HP = 20;
export const ENEMY_ATTACK_DAMAGE = 2;

// Same as the starting hero in Shattered Pixel Dungeon.
export const HERO_ACCURACY = 10;
export const HERO_EVASION = 5;
// Same as a rat, the first enemy in Shattered Pixel Dungeon.
export const ENEMY_ACCURACY = 8;
export const ENEMY_EVASION = 2;

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
  // The name shown to the player.
  name: string;
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
  name: string,
  position: Point,
  paint: Scene,
  healthBar: HealthBar,
  behavior: EnemyBehavior,
): Enemy {
  return {
    name,
    position,
    hp: ENEMY_MAX_HP,
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
  enemy.healthBar.show(enemy.hp / ENEMY_MAX_HP);
  delete enemy.statuses.frozen;
}

export function healEnemy(enemy: Enemy, amount: number): void {
  enemy.hp = Math.min(ENEMY_MAX_HP, enemy.hp + amount);
  enemy.healthBar.show(enemy.hp / ENEMY_MAX_HP);
}

// Being attacked makes the enemy hunt the hero.
export function attackEnemy(enemy: Enemy, hero: Point, damage: number): void {
  alertEnemy(enemy, hero);
  damageEnemy(enemy, damage);
}
