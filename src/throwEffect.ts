import type { Paint, ThorVGNamespace } from '@thorvg/webcanvas';
import { CHARACTER_WAIST_HEIGHT, createFrostPaint, tileDistance, type RoomView } from './render';
import type { Point } from './room';

// Same as MissileSprite in Shattered Pixel Dungeon: 240 pixels per second on 16 pixel tiles,
// and a spin of 720 degrees per second.
const TILES_PER_SECOND = 240 / 16;
const SPIN_DEGREES_PER_SECOND = 720;
// Placeholder values for how a shattered flask splashes.
const SPLASH_MS = 300;
// Placeholder value for how long an item that could not be picked up takes to rise and fall back.
const BOUNCE_MS = 400;
const SPLASH_RADIUS = 18;
// Placeholder value. How long the frost from a frost potion takes to fade.
const FROST_MS = 700;

export interface Throw {
  view: RoomView;
  paint: Paint;
  from: Point;
  to: Point;
  render(): void;
  onLand(): void;
}

// Flies a paint in a straight line between two tiles, then calls onLand.
// Returns a function that lands it immediately.
export function playThrow({ view, paint, from, to, render, onLand }: Throw): () => void {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const durationMs = (1000 * distance) / TILES_PER_SECOND;
  const offset = tileDistance(from, to);
  view.placeOverlay(paint, from.x, from.y);

  let startTime: number | null = null;
  let frame = 0;
  let isLanded = false;

  const land = () => {
    if (isLanded) {
      return;
    }
    isLanded = true;
    cancelAnimationFrame(frame);
    view.remove(paint);
    onLand();
    render();
  };

  const step = (time: number) => {
    startTime ??= time;
    // A throw onto the hero's own tile has no distance to fly, so it lands at once.
    const progress = durationMs > 0 ? (time - startTime) / durationMs : 1;
    if (progress >= 1) {
      land();
      return;
    }

    view.nudge(paint, from, { x: offset.x * progress, y: offset.y * progress });
    paint.rotate(((time - startTime) / 1000) * SPIN_DEGREES_PER_SECOND);
    render();
    frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);
  return land;
}

// Lifts an item to a character's waist and drops it back, as when the bag has no room for it.
export function playBounce(view: RoomView, paint: Paint, tile: Point, render: () => void): void {
  let startTime: number | null = null;
  const step = (time: number) => {
    startTime ??= time;
    const progress = Math.min(1, (time - startTime) / BOUNCE_MS);
    // A parabola, so the item slows down at the top and speeds up as it falls.
    const height = CHARACTER_WAIST_HEIGHT * 4 * progress * (1 - progress);
    view.nudge(paint, tile, { x: 0, y: -height });
    render();
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

// A ring that spreads from a tile and fades out, where a flask broke.
export function playShatter(
  TVG: ThorVGNamespace,
  view: RoomView,
  tile: Point,
  color: [number, number, number],
  render: () => void,
): void {
  const ring = new TVG.Shape();
  view.placeOverlay(ring, tile.x, tile.y);

  let startTime: number | null = null;
  const step = (time: number) => {
    startTime ??= time;
    const progress = (time - startTime) / SPLASH_MS;
    if (progress >= 1) {
      view.remove(ring);
      render();
      return;
    }
    const radius = SPLASH_RADIUS * (0.3 + progress);
    ring.reset();
    ring.appendCircle(0, 0, radius, radius / 2);
    ring.stroke({ width: 2, color: [...color, Math.round(255 * (1 - progress))] });
    render();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Frost that covers the tiles at once and fades out, where a frost potion broke.
export function playFrost(
  TVG: ThorVGNamespace,
  view: RoomView,
  tiles: Point[],
  render: () => void,
): void {
  const paints = tiles.map((tile) => {
    const paint = createFrostPaint(TVG);
    view.placeOnFloor(paint, tile.x, tile.y);
    return paint;
  });

  let startTime: number | null = null;
  const step = (time: number) => {
    startTime ??= time;
    const progress = (time - startTime) / FROST_MS;
    if (progress >= 1) {
      for (const paint of paints) {
        view.remove(paint);
      }
      render();
      return;
    }
    for (const paint of paints) {
      paint.opacity(Math.round(255 * (1 - progress)));
    }
    render();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
