import type { Point } from './room';

const LUNGE_MS = 70;
// 3 frames at 60 FPS, within the 2 to 5 frames that game feel guides suggest.
const HIT_STOP_MS = 50;
const RECOVER_MS = 110;

const KNOCKBACK_PX = 6;

// Game feel guides suggest 8 to 10 px for a strong hit. It fades out over the whole reaction.
const SHAKE_PX = 8;
const SHAKE_MS = HIT_STOP_MS + RECOVER_MS;

export interface AttackEffect {
  // The attacker's offset from its tile when the hit lands.
  lunge: Point;
  // A missed attack only lunges. The target does not flash or recoil, and the camera does not shake.
  isMiss: boolean;
  moveAttacker(offset: Point): void;
  moveTarget(offset: Point): void;
  flashTarget(isFlashing: boolean): void;
  shake?(offset: Point): void;
  render(): void;
  onHit(): void;
  onEnd(): void;
}

// Plays the effect and returns a function that ends it immediately.
export function playAttackEffect(effect: AttackEffect): () => void {
  const length = Math.hypot(effect.lunge.x, effect.lunge.y);
  const direction = { x: effect.lunge.x / length, y: effect.lunge.y / length };
  const scaled = (point: Point, factor: number) => ({ x: point.x * factor, y: point.y * factor });
  const none = { x: 0, y: 0 };

  let startTime: number | null = null;
  let hasHit = false;
  let isFinished = false;
  let frameRequest = 0;

  const hit = () => {
    if (!hasHit) {
      hasHit = true;
      effect.onHit();
    }
  };

  const finish = () => {
    if (isFinished) {
      return;
    }
    isFinished = true;
    cancelAnimationFrame(frameRequest);

    hit();
    effect.moveAttacker(none);
    effect.moveTarget(none);
    effect.flashTarget(false);
    effect.shake?.(none);
    effect.onEnd();
    effect.render();
  };

  const step = (time: number) => {
    startTime ??= time;
    const elapsed = time - startTime;
    const sinceHit = elapsed - LUNGE_MS;

    if (sinceHit < 0) {
      effect.moveAttacker(scaled(effect.lunge, (elapsed / LUNGE_MS) ** 2));
    } else {
      hit();
      const recover = Math.max(0, sinceHit - HIT_STOP_MS) / RECOVER_MS;
      if (recover >= 1) {
        finish();
        return;
      }

      effect.moveAttacker(scaled(effect.lunge, (1 - recover) ** 2));
      if (!effect.isMiss) {
        effect.moveTarget(scaled(direction, KNOCKBACK_PX * Math.sin(Math.PI * recover)));
        effect.flashTarget(sinceHit < HIT_STOP_MS);

        const shake = SHAKE_PX * Math.max(0, 1 - sinceHit / SHAKE_MS);
        effect.shake?.({
          x: (Math.random() * 2 - 1) * shake,
          y: (Math.random() * 2 - 1) * shake,
        });
      }
    }

    effect.render();
    frameRequest = requestAnimationFrame(step);
  };

  frameRequest = requestAnimationFrame(step);
  return finish;
}
