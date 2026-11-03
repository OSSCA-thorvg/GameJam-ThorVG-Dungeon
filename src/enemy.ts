import type { HealthBar } from './render';
import type { Point } from './room';

// Placeholder values for testing combat.
const ENEMY_MAX_HP = 10;
const PLAYER_ATTACK_DAMAGE = 2;

export interface Enemy {
  position: Point;
  hp: number;
  healthBar: HealthBar;
}

export function createEnemy(position: Point, healthBar: HealthBar): Enemy {
  return { position, hp: ENEMY_MAX_HP, healthBar };
}

export function attackEnemy(enemy: Enemy): void {
  enemy.hp = Math.max(0, enemy.hp - PLAYER_ATTACK_DAMAGE);
  enemy.healthBar.show(enemy.hp / ENEMY_MAX_HP);
}
