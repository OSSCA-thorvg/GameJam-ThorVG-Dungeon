import type { ThorVGNamespace } from '@thorvg/webcanvas';
import { createSearchPaint, type RoomView } from './render';
import type { Point } from './room';
import { SEARCH_RADIUS } from './search';

// Placeholder values. A search lights the tiles ring by ring, outwards from the hero, and each
// tile fades out after its flash.
const RING_DELAY_MS = 130;
const FLASH_MS = 350;
const PEAK_OPACITY = 0.5;
// The share of a flash that it takes to reach its peak.
const RISE = 0.25;

export interface Search {
  TVG: ThorVGNamespace;
  view: RoomView;
  center: Point;
  // The tiles that the search covers, apart from the one the hero stands on.
  tiles: Point[];
  render(): void;
  onEnd(): void;
}

// Plays the pulse over the searched area, then calls onEnd. Returns a function that ends it
// immediately.
export function playSearch({ TVG, view, center, tiles, render, onEnd }: Search): () => void {
  const flashes = tiles.map((tile) => {
    const paint = createSearchPaint(TVG);
    paint.opacity(0);
    view.placeOverlay(paint, tile.x, tile.y);
    const ring = Math.max(Math.abs(tile.x - center.x), Math.abs(tile.y - center.y));
    return { paint, delay: RING_DELAY_MS * (ring - 1) };
  });
  const totalMs = RING_DELAY_MS * (SEARCH_RADIUS - 1) + FLASH_MS;

  let startTime: number | null = null;
  let frame = 0;
  let isFinished = false;

  const finish = () => {
    if (isFinished) {
      return;
    }
    isFinished = true;
    cancelAnimationFrame(frame);
    for (const { paint } of flashes) {
      view.remove(paint);
    }
    onEnd();
    render();
  };

  const step = (time: number) => {
    startTime ??= time;
    const elapsed = time - startTime;
    if (elapsed >= totalMs) {
      finish();
      return;
    }
    for (const { paint, delay } of flashes) {
      const progress = (elapsed - delay) / FLASH_MS;
      const strength =
        progress < 0 || progress > 1 ? 0 : progress < RISE ? progress / RISE : (1 - progress) / (1 - RISE);
      paint.opacity(Math.round(255 * PEAK_OPACITY * strength));
    }
    render();
    frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);
  return finish;
}
