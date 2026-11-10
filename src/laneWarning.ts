import type { Paint, ThorVGNamespace } from '@thorvg/webcanvas';
import { tileDistance, type RoomView } from './render';
import type { Point } from './room';

// Placeholder look of the line a rearing centipede is about to charge down: each tile is tinted
// red, and an arrow runs along the line in the direction of the charge.
const LANE_COLOR: [number, number, number] = [255, 60, 50];
const LANE_ALPHA = 80;
const ARROW_ALPHA = 220;
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
  // The sides of a tile on the screen, and the step of one tile along the line.
  const alongX = tileDistance(origin, { x: 1, y: 0 });
  const alongY = tileDistance(origin, { x: 0, y: 1 });
  const step = tileDistance(origin, direction);
  const length = Math.hypot(step.x, step.y);
  const ahead = { x: step.x / length, y: step.y / length };
  const side = { x: -ahead.y, y: ahead.x };

  const corners = [
    { x: (-alongX.x - alongY.x) / 2, y: (-alongX.y - alongY.y) / 2 },
    { x: (alongX.x - alongY.x) / 2, y: (alongX.y - alongY.y) / 2 },
    { x: (alongX.x + alongY.x) / 2, y: (alongX.y + alongY.y) / 2 },
    { x: (alongY.x - alongX.x) / 2, y: (alongY.y - alongX.y) / 2 },
  ];
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

  const polygon = (points: Point[], alpha: number) => {
    const shape = new TVG.Shape();
    shape.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) {
      shape.lineTo(point.x, point.y);
    }
    shape.close().fill(...LANE_COLOR, alpha);
    return shape;
  };

  const paints: Paint[] = [];
  const arrows = lane.map((tile) => {
    const floor = polygon(corners, LANE_ALPHA);
    view.placeOverlay(floor, tile.x, tile.y);
    paints.push(floor);
    const arrow = polygon(arrowPoints, ARROW_ALPHA);
    view.placeOverlay(arrow, tile.x, tile.y);
    paints.push(arrow);
    return { tile, arrow };
  });

  const started = performance.now();
  let frame = 0;
  const animate = (now: number) => {
    // Each arrow runs through its tile and starts over, so the arrows look like one stream.
    const progress = (((now - started) / 1000) * ARROW_TILES_PER_SECOND) % 1;
    for (const { tile, arrow } of arrows) {
      view.nudge(arrow, tile, { x: step.x * (progress - 0.5), y: step.y * (progress - 0.5) });
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
