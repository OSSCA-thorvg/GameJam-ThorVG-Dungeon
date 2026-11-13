import type { Paint, ThorVGNamespace } from '@thorvg/webcanvas';
import { drawFloorEffect, drawPolygon } from './effectArt';
import { tileDistance, type RoomView } from './render';
import { ART_PIXEL } from './tileArt';
import type { Point } from './room';

// Placeholder look of the line a rearing centipede is about to charge down: each tile is tinted
// red, and an arrow runs along the line in the direction of the charge.
const ARROW_COLOR: [number, number, number, number] = [255, 60, 50, 220];
const ARROW_LENGTH = 11;
const ARROW_HALF_WIDTH = 8;
const ARROW_NOTCH = 3;
// How many tiles an arrow runs in a second.
const ARROW_TILES_PER_SECOND = 2;

export interface LaneWarning {
  stop(): void;
}

const origin: Point = { x: 0, y: 0 };

// Marks the tiles of a line in red, with arrows running down it. It runs until it is stopped.
export function showLaneWarning(
  TVG: ThorVGNamespace,
  view: RoomView,
  lane: Point[],
  direction: Point,
  render: () => void,
): LaneWarning {
  // The step of one tile along the line.
  const step = tileDistance(origin, direction);
  const length = Math.hypot(step.x, step.y);
  const ahead = { x: step.x / length, y: step.y / length };
  const side = { x: -ahead.y, y: ahead.x };

  const arrowPoints = [
    { x: ahead.x * ARROW_LENGTH, y: ahead.y * ARROW_LENGTH },
    {
      x: -ahead.x * ARROW_LENGTH * 0.5 + side.x * ARROW_HALF_WIDTH,
      y: -ahead.y * ARROW_LENGTH * 0.5 + side.y * ARROW_HALF_WIDTH,
    },
    { x: -ahead.x * ARROW_NOTCH, y: -ahead.y * ARROW_NOTCH },
    {
      x: -ahead.x * ARROW_LENGTH * 0.5 - side.x * ARROW_HALF_WIDTH,
      y: -ahead.y * ARROW_LENGTH * 0.5 - side.y * ARROW_HALF_WIDTH,
    },
  ];

  const paints: Paint[] = [];
  const arrows = lane.map((tile) => {
    const floor = drawFloorEffect(TVG, 'lane');
    view.placeOverlay(floor, tile.x, tile.y);
    paints.push(floor);
    const arrow = drawPolygon(TVG, arrowPoints, ARROW_COLOR);
    view.placeOverlay(arrow, tile.x, tile.y);
    paints.push(arrow);
    return { tile, arrow };
  });

  const started = performance.now();
  let frame = 0;
  const animate = (now: number) => {
    // Each arrow runs through its tile and starts over, so the arrows look like one stream. It moves
    // by whole art pixels.
    const progress = (((now - started) / 1000) * ARROW_TILES_PER_SECOND) % 1;
    const snap = (value: number) => Math.round(value / ART_PIXEL) * ART_PIXEL;
    for (const { tile, arrow } of arrows) {
      view.nudge(arrow, tile, {
        x: snap(step.x * (progress - 0.5)),
        y: snap(step.y * (progress - 0.5)),
      });
    }
    render();
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);

  return {
    stop() {
      cancelAnimationFrame(frame);
      for (const paint of paints) {
        view.remove(paint);
      }
      render();
    },
  };
}
