import type { ThorVGNamespace } from '@thorvg/webcanvas';
import { drawRing, drawSpark } from './effectArt';
import { CHARACTER_WAIST_HEIGHT, type RoomView } from './render';
import { ART_PIXEL } from './tileArt';
import type { Point } from './room';

// Placeholder values. Rings spread over the floor from the hero's feet, one after another, and
// sparks rise around the hero. Everything fades out.
const RING_COUNT = 3;
const RING_DELAY_MS = 150;
const RING_MS = 600;
// The last ring starts at (RING_COUNT - 1) * RING_DELAY_MS and takes RING_MS.
const LEVEL_UP_MS = RING_DELAY_MS * (RING_COUNT - 1) + RING_MS;
// In art pixels.
const RING_RADIUS = (CHARACTER_WAIST_HEIGHT * 1.5) / ART_PIXEL;
const SPARK_COUNT = 10;
const SPARK_RISE = CHARACTER_WAIST_HEIGHT * 2.5;
// The share of the spark's rise at which it starts to fade.
const SPARK_FADE_START = 0.5;
const COLOR: [number, number, number] = [255, 224, 120];
const SPARK_MIDDLE: [number, number, number] = [255, 250, 220];

// Sparks move by whole art pixels, so they stay on the grid of the art.
const snap = (value: number) => Math.round(value / ART_PIXEL) * ART_PIXEL;

// Rings and rising sparks around a character, when the hero gains a level. The game does not wait
// for it to end.
export function playLevelUp(
  TVG: ThorVGNamespace,
  view: RoomView,
  tile: Point,
  render: () => void,
): void {
  const rings = Array.from({ length: RING_COUNT }, (_, index) => {
    const paint = new TVG.Scene();
    view.placeOverlay(paint, tile.x, tile.y);
    return { paint, delay: index * RING_DELAY_MS, drawnRadius: 0 };
  });
  const sparks = Array.from({ length: SPARK_COUNT }, (_, index) => {
    const paint = drawSpark(TVG, COLOR, SPARK_MIDDLE);
    paint.opacity(0);
    view.placeOverlay(paint, tile.x, tile.y);
    const angle = ((index + Math.random()) / SPARK_COUNT) * 2 * Math.PI;
    const distance = RING_RADIUS * (0.4 + 0.4 * Math.random());
    return {
      paint,
      // An isometric floor is squashed to half as tall as it is wide.
      x: Math.cos(angle) * distance * ART_PIXEL,
      y: (Math.sin(angle) * distance * ART_PIXEL) / 2,
      delay: Math.random() * (LEVEL_UP_MS - RING_MS),
    };
  });

  let startTime: number | null = null;
  const step = (time: number) => {
    startTime ??= time;
    const elapsed = time - startTime;
    if (elapsed >= LEVEL_UP_MS) {
      for (const { paint } of [...rings, ...sparks]) {
        view.remove(paint);
      }
      render();
      return;
    }

    for (const ring of rings) {
      const progress = Math.min(1, Math.max(0, (elapsed - ring.delay) / RING_MS));
      // The ring slows down as it spreads, and is drawn again only when it grows by an art pixel.
      const radius =
        progress > 0 && progress < 1 ? Math.round(RING_RADIUS * (1 - (1 - progress) ** 2)) : 0;
      if (radius !== ring.drawnRadius) {
        ring.drawnRadius = radius;
        ring.paint.clear();
        if (radius > 0) {
          ring.paint.add(drawRing(TVG, radius, COLOR));
        }
      }
      ring.paint.opacity(Math.round(255 * (1 - progress)));
    }
    for (const { paint, x, y, delay } of sparks) {
      const progress = Math.min(1, Math.max(0, (elapsed - delay) / RING_MS));
      view.nudge(paint, tile, { x: snap(x), y: snap(y - SPARK_RISE * progress) });
      const fade = Math.min(1, (1 - progress) / (1 - SPARK_FADE_START));
      paint.opacity(progress > 0 && progress < 1 ? Math.round(255 * fade) : 0);
    }
    render();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
