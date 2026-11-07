import type { Scene } from '@thorvg/webcanvas';
import { distancesFrom, findPath } from './path';
import type { HealthBar } from './render';
import { isAdjacent, isWalkable, type Point, type Room } from './room';
import type { Statuses } from './status';

// Placeholder values for testing combat.
const ENEMY_MAX_HP = 10;
export const PLAYER_MAX_HP = 20;
export const ENEMY_ATTACK_DAMAGE = 2;

// Same as the starting hero in Shattered Pixel Dungeon.
export const PLAYER_ACCURACY = 10;
export const PLAYER_EVASION = 5;
// Same as a rat, the first enemy in Shattered Pixel Dungeon.
export const ENEMY_ACCURACY = 8;
export const ENEMY_EVASION = 2;

// Each side rolls from 0 up to its value, and the attack hits unless the evasion roll is higher,
// as in Char.hit() of Shattered Pixel Dungeon. Every roll is independent of earlier ones.
export function rollHit(accuracy: number, evasion: number): boolean {
  return Math.random() * accuracy >= Math.random() * evasion;
}

// The player has no stealth yet. It starts at 0 in Shattered Pixel Dungeon as well.
const PLAYER_STEALTH = 0;
// Placeholder value. Shattered Pixel Dungeon divides the distance by 2, so a wandering enemy
// notices for sure only within 2 tiles. Dividing by 4 makes that 4 tiles, and 50% at 8 tiles.
const DETECTION_DISTANCE_DIVISOR = 4;
// Placeholder values. How likely an enemy that lost the player is to look ahead along the way the
// player was going, instead of going back to wandering, and how many steps ahead it looks.
const SEARCH_CHANCE = 0.5;
const SEARCH_STEPS = 6;
// Placeholder value. How many random tiles a wandering enemy tries before it waits a turn.
const WANDER_TRIES = 10;

export type EnemyAction = { type: 'wait' } | { type: 'move'; to: Point } | { type: 'attack' };

export interface EnemyContext {
  room: Room;
  player: Point;
  // Whether the enemy can see the player now.
  canSeePlayer: boolean;
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
  // A wandering enemy walks to random places. A hunting one goes after the player, or after where
  // it last saw the player, as the Wandering and Hunting states of Shattered Pixel Dungeon.
  state: 'wandering' | 'hunting';
  // Where the enemy is going.
  target: Point | null;
  // Where the enemy last saw the player, and the way the player was moving then.
  lastSeen: Point | null;
  heading: Point | null;
  // Whether the enemy already looked ahead for the player since it lost sight of them.
  hasSearched: boolean;
  // Whether the enemy saw the player at the start of its last turn. As in Shattered Pixel Dungeon,
  // an enemy that did not is surprised by the player's attack, such as one that just came through
  // a door.
  hasSeenPlayer: boolean;
  statuses: Statuses;
  paint: Scene;
  healthBar: HealthBar;
  behavior: EnemyBehavior;
}

const isSameTile = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

// Wandering.detectionChance of Shattered Pixel Dungeon, 1 in (distance / 2 + stealth), with a
// larger divisor. A diagonal step counts as one.
function detectionChance(enemy: Point, player: Point): number {
  const distance = Math.max(Math.abs(enemy.x - player.x), Math.abs(enemy.y - player.y));
  return 1 / (distance / DETECTION_DISTANCE_DIVISOR + PLAYER_STEALTH);
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

// Guesses where a player who went out of sight went: the tile farthest along the way they were
// moving, within a few steps of where they were last seen.
function guessPlayerTile(room: Room, lastSeen: Point, heading: Point): Point | null {
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

export function alertEnemy(enemy: Enemy, player: Point): void {
  if (enemy.lastSeen && !isSameTile(enemy.lastSeen, player)) {
    enemy.heading = { x: player.x - enemy.lastSeen.x, y: player.y - enemy.lastSeen.y };
  }
  enemy.state = 'hunting';
  enemy.target = player;
  enemy.lastSeen = player;
  enemy.hasSearched = false;
}

// Wanders until it notices the player in view, then chases. When it loses sight of the player,
// it goes to where it last saw them, which takes it through a door the player was seen using.
// From there it either looks ahead along the player's way or goes back to wandering.
export const chaser: EnemyBehavior = (enemy, { room, player, canSeePlayer, occupied }) => {
  const blocked = [...occupied, player];

  const noticesPlayer =
    canSeePlayer &&
    (enemy.state === 'hunting' || Math.random() < detectionChance(enemy.position, player));
  if (noticesPlayer) {
    alertEnemy(enemy, player);
    return isAdjacent(enemy.position, player)
      ? { type: 'attack' }
      : stepToward(room, enemy.position, player, occupied);
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
        ? guessPlayerTile(room, enemy.lastSeen, enemy.heading)
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
    hasSeenPlayer: false,
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

// Being attacked makes the enemy hunt the player.
export function attackEnemy(enemy: Enemy, player: Point, damage: number): void {
  alertEnemy(enemy, player);
  damageEnemy(enemy, damage);
}
