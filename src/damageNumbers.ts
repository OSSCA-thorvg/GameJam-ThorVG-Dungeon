import type { Paint } from '@thorvg/webcanvas';
import { DAMAGE_NUMBER_HEIGHT, DAMAGE_NUMBER_RISE, type RoomView } from './render';
import type { Point } from './room';

// Same as FloatingText in Shattered Pixel Dungeon: a number lives for 1 second,
// rises at a constant speed, and fades out over the second half of its life.
const LIFESPAN_MS = 1000;
const FADE_START = 0.5;

export interface DamageNumbers {
  // Takes over a paint made by createDamageNumber and floats it up from a tile.
  show(view: RoomView, paint: Paint, tile: Point): void;
  // Forgets all numbers, for when their room is being replaced.
  clear(): void;
}

interface FloatingNumber {
  view: RoomView;
  paint: Paint;
  tile: Point;
  startTime: number;
  // Extra height from being pushed up by newer numbers on the same tile.
  pushed: number;
}

const riseOf = (number: FloatingNumber, time: number) =>
  (DAMAGE_NUMBER_RISE * Math.max(0, time - number.startTime)) / LIFESPAN_MS + number.pushed;

export function createDamageNumbers(render: () => void): DamageNumbers {
  let numbers: FloatingNumber[] = [];
  let frame = 0;

  const step = (time: number) => {
    numbers = numbers.filter((number) => {
      const age = (time - number.startTime) / LIFESPAN_MS;
      if (age >= 1) {
        number.view.remove(number.paint);
        return false;
      }
      number.view.nudge(number.paint, number.tile, { x: 0, y: -riseOf(number, time) });
      const fade = age > FADE_START ? (1 - age) / (1 - FADE_START) : 1;
      number.paint.opacity(Math.round(255 * fade));
      return true;
    });

    render();
    frame = numbers.length > 0 ? requestAnimationFrame(step) : 0;
  };

  return {
    show(view, paint, tile) {
      const time = performance.now();

      // Same as FloatingText: older numbers on the tile move up instead of overlapping.
      let height = 0;
      for (const number of [...numbers].reverse()) {
        if (number.tile.x !== tile.x || number.tile.y !== tile.y) {
          continue;
        }
        height += DAMAGE_NUMBER_HEIGHT;
        number.pushed += Math.max(0, height - riseOf(number, time));
        height = riseOf(number, time);
      }

      view.placeOverlay(paint, tile.x, tile.y);
      numbers.push({ view, paint, tile, startTime: time, pushed: 0 });
      if (!frame) {
        frame = requestAnimationFrame(step);
      }
    },
    clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      numbers = [];
    },
  };
}
