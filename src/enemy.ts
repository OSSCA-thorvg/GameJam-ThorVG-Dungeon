import type { Scene } from '@thorvg/webcanvas';
import { findPath } from './path';
import type { HealthBar } from './render';
import { isAdjacent, type Point, type Room } from './room';

// Placeholder values for testing combat.
const ENEMY_MAX_HP = 10;
const PLAYER_ATTACK_DAMAGE = 2;
export const PLAYER_MAX_HP = 20;
export const ENEMY_ATTACK_DAMAGE = 2;

// Placeholder value. An enemy starts chasing once the player is this many steps away.
const ENEMY_NOTICE_DISTANCE = 8;

export type EnemyAction = { type: 'wait' } | { type: 'move'; to: Point } | { type: 'attack' };

export interface EnemyContext {
  room: Room;
  player: Point;
  // Tiles held by the other enemies.
  occupied: Point[];
}

// Decides what an enemy does on its turn. New enemy types add a new behavior.
export type EnemyBehavior = (enemy: Enemy, context: EnemyContext) => EnemyAction;

export interface Enemy {
  position: Point;
  hp: number;
  hasNoticedPlayer: boolean;
  paint: Scene;
  healthBar: HealthBar;
  behavior: EnemyBehavior;
}

export const chasePlayer: EnemyBehavior = (enemy, { room, player, occupied }) => {
  if (isAdjacent(enemy.position, player)) {
    enemy.hasNoticedPlayer = true;
    return { type: 'attack' };
  }

  const path = findPath(room, enemy.position, player, occupied);
  if (path.length > 0 && path.length <= ENEMY_NOTICE_DISTANCE) {
    enemy.hasNoticedPlayer = true;
  }
  return enemy.hasNoticedPlayer && path.length > 0
    ? { type: 'move', to: path[0] }
    : { type: 'wait' };
};

export function createEnemy(
  position: Point,
  paint: Scene,
  healthBar: HealthBar,
  behavior: EnemyBehavior,
): Enemy {
  return { position, hp: ENEMY_MAX_HP, hasNoticedPlayer: false, paint, healthBar, behavior };
}

// Returns the damage dealt.
export function attackEnemy(enemy: Enemy): number {
  enemy.hasNoticedPlayer = true;
  enemy.hp = Math.max(0, enemy.hp - PLAYER_ATTACK_DAMAGE);
  enemy.healthBar.show(enemy.hp / ENEMY_MAX_HP);
  return PLAYER_ATTACK_DAMAGE;
}
