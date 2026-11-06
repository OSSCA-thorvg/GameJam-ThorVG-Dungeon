import type { Point, Room } from './room';

// Same as the default viewDistance of a Level in Shattered Pixel Dungeon.
export const DEFAULT_VIEW_DISTANCE = 8;

// The rays beside each corner, from https://ncase.me/sight-and-light/
const RAY_OFFSET = 0.00001;
// Rays at even angles, so that the outline follows the round edge of the view.
// 32 rays stay within 0.05 tiles of a circle at the default view distance.
const ARC_RAYS = 32;
// Tile coordinates stay below 1000, where rounding errors are near 1e-13. These tolerances are well
// above that, and well below the distance between two points that RAY_OFFSET sets apart.
// Lets a ray stop exactly on a corner, so no light leaks between walls that touch diagonally.
const CORNER_TOLERANCE = 1e-9;
// A point is dropped from the outline when the sine of the turn at that point is below this.
const STRAIGHT_TOLERANCE = 1e-7;
// How far beside a point on a tile's side to look for the tiles that share it.
const SIDE_TOLERANCE = 1e-7;

export interface Vision {
  // The tiles the viewer can see. Everything in the game that depends on sight uses these.
  tiles: Point[];
  // The floor area lit from the viewer, only for drawing. A tile's center is at its (x, y).
  outline: Point[];
  // How far the outline reaches, which is the edge of the farthest tiles in view.
  radius: number;
}

interface Segment {
  from: Point;
  to: Point;
}

// Walls and closed doors block the view.
function blocksView(room: Room, openDoors: Point[], x: number, y: number): boolean {
  const tile = room.tiles[y]?.[x] ?? 'void';
  return tile === 'door'
    ? !openDoors.some((other) => other.x === x && other.y === y)
    : tile === 'wall' || tile === 'void';
}

// Whether a line passes through the inside of a tile. Touching a corner does not count.
function crossesTile(from: Point, to: Point, tile: Point): boolean {
  let enter = 0;
  let leave = 1;

  for (const axis of ['x', 'y'] as const) {
    const length = to[axis] - from[axis];
    const low = tile[axis] - 0.5 - from[axis];
    const high = tile[axis] + 0.5 - from[axis];
    if (length === 0) {
      if (low >= 0 || high <= 0) {
        return false;
      }
    } else {
      enter = Math.max(enter, Math.min(low / length, high / length));
      leave = Math.min(leave, Math.max(low / length, high / length));
    }
  }
  return leave - enter > CORNER_TOLERANCE;
}

// Whether a line passes exactly through a point between its ends.
function passesThrough(from: Point, to: Point, point: Point): boolean {
  const lineX = to.x - from.x;
  const lineY = to.y - from.y;
  const pointX = point.x - from.x;
  const pointY = point.y - from.y;
  const along = pointX * lineX + pointY * lineY;
  return (
    lineX * pointY === lineY * pointX && along > 0 && along < lineX * lineX + lineY * lineY
  );
}

// Whether nothing blocks a line. Light passes beside a single corner that the line touches, but a
// line that touches blockers on both of its sides has no width for light to pass through.
function isLineClear(from: Point, to: Point, blockers: Point[]): boolean {
  const lineX = to.x - from.x;
  const lineY = to.y - from.y;
  const left = Math.min(from.x, to.x) - 0.5;
  const right = Math.max(from.x, to.x) + 0.5;
  const top = Math.min(from.y, to.y) - 0.5;
  const bottom = Math.max(from.y, to.y) + 0.5;
  let touchesOneSide = false;
  let touchesOtherSide = false;

  for (const blocker of blockers) {
    if (blocker.x < left || blocker.x > right || blocker.y < top || blocker.y > bottom) {
      continue;
    }
    if (crossesTile(from, to, blocker)) {
      return false;
    }
    const touches = [-0.5, 0.5].some((offsetX) =>
      [-0.5, 0.5].some((offsetY) =>
        passesThrough(from, to, { x: blocker.x + offsetX, y: blocker.y + offsetY }),
      ),
    );
    if (touches) {
      const side = lineX * (blocker.y - from.y) - lineY * (blocker.x - from.x);
      touchesOneSide ||= side < 0;
      touchesOtherSide ||= side > 0;
      if (touchesOneSide && touchesOtherSide) {
        return false;
      }
    }
  }
  return true;
}

// Returns where a ray from the origin first hits a segment, or the end of the ray.
function castRay(origin: Point, angle: number, segments: Segment[], length: number): Point {
  const rayX = Math.cos(angle);
  const rayY = Math.sin(angle);
  let nearest = length;

  for (const { from, to } of segments) {
    const segmentX = to.x - from.x;
    const segmentY = to.y - from.y;
    const denominator = rayX * segmentY - rayY * segmentX;
    if (denominator === 0) {
      continue;
    }
    const toFromX = from.x - origin.x;
    const toFromY = from.y - origin.y;
    const alongRay = (toFromX * segmentY - toFromY * segmentX) / denominator;
    const alongSegment = (toFromX * rayY - toFromY * rayX) / denominator;
    if (
      alongRay >= 0 &&
      alongRay < nearest &&
      alongSegment >= -CORNER_TOLERANCE &&
      alongSegment <= 1 + CORNER_TOLERANCE
    ) {
      nearest = alongRay;
    }
  }
  return { x: origin.x + rayX * nearest, y: origin.y + rayY * nearest };
}

// Computes what can be seen from a tile. The outline is a visibility polygon, made by casting rays
// at the corners of the blocking tiles, as in https://ncase.me/sight-and-light/
// A floor tile is in view when the line to its center is clear, so that sight goes both ways and
// agrees with the drawn shadows.
export function computeVision(
  room: Room,
  origin: Point,
  distance: number,
  openDoors: Point[],
): Vision {
  const blocks = (x: number, y: number) =>
    !(x === origin.x && y === origin.y) && blocksView(room, openDoors, x, y);
  // r^2 + r rounds the circle, and keeps all 8 neighbors in range at a distance of 1.
  const isInRange = (x: number, y: number) =>
    (x - origin.x) ** 2 + (y - origin.y) ** 2 <= distance ** 2 + distance;

  const reach = Math.ceil(distance) + 2;
  const blockers: Point[] = [];
  const segments: Segment[] = [];

  for (let y = origin.y - reach; y <= origin.y + reach; y++) {
    for (let x = origin.x - reach; x <= origin.x + reach; x++) {
      if (!blocks(x, y)) {
        continue;
      }
      blockers.push({ x, y });
      const left = x - 0.5;
      const right = x + 0.5;
      const top = y - 0.5;
      const bottom = y + 0.5;
      if (!blocks(x, y - 1)) {
        segments.push({ from: { x: left, y: top }, to: { x: right, y: top } });
      }
      if (!blocks(x, y + 1)) {
        segments.push({ from: { x: left, y: bottom }, to: { x: right, y: bottom } });
      }
      if (!blocks(x - 1, y)) {
        segments.push({ from: { x: left, y: top }, to: { x: left, y: bottom } });
      }
      if (!blocks(x + 1, y)) {
        segments.push({ from: { x: right, y: top }, to: { x: right, y: bottom } });
      }
    }
  }

  const radius = distance + 0.5;
  const angles = new Set<number>();
  for (let ray = 0; ray < ARC_RAYS; ray++) {
    angles.add(-Math.PI + (2 * Math.PI * ray) / ARC_RAYS);
  }
  for (const { from, to } of segments) {
    for (const corner of [from, to]) {
      if (Math.hypot(corner.x - origin.x, corner.y - origin.y) <= radius) {
        const angle = Math.atan2(corner.y - origin.y, corner.x - origin.x);
        angles.add(angle - RAY_OFFSET);
        angles.add(angle);
        angles.add(angle + RAY_OFFSET);
      }
    }
  }
  const rayHits = [...angles]
    .sort((a, b) => a - b)
    .map((angle) => castRay(origin, angle, segments, radius));

  // Most points lie on straight edges, and a floor's remembered outlines add up.
  const outline = rayHits.filter((point, index) => {
    const previous = rayHits[(index + rayHits.length - 1) % rayHits.length];
    const next = rayHits[(index + 1) % rayHits.length];
    const inX = point.x - previous.x;
    const inY = point.y - previous.y;
    const outX = next.x - point.x;
    const outY = next.y - point.y;
    const lengths = Math.hypot(inX, inY) * Math.hypot(outX, outY);
    return Math.abs(inX * outY - inY * outX) > STRAIGHT_TOLERANCE * lengths;
  });

  const tiles = new Map<number, Point>();
  const addTile = (x: number, y: number) => {
    const tile = room.tiles[y]?.[x];
    if (tile && tile !== 'void') {
      tiles.set(y * room.width + x, { x, y });
    }
  };

  // An enemy next to the viewer must always be visible, even around two corners.
  for (let y = origin.y - 1; y <= origin.y + 1; y++) {
    for (let x = origin.x - 1; x <= origin.x + 1; x++) {
      addTile(x, y);
    }
  }

  for (let y = origin.y - reach; y <= origin.y + reach; y++) {
    for (let x = origin.x - reach; x <= origin.x + reach; x++) {
      if (isInRange(x, y) && !blocks(x, y) && isLineClear(origin, { x, y }, blockers)) {
        addTile(x, y);
      }
    }
  }

  // A blocking tile is in view when the light reaches one of its sides.
  for (const { x, y } of rayHits) {
    for (const tileX of [Math.round(x - SIDE_TOLERANCE), Math.round(x + SIDE_TOLERANCE)]) {
      for (const tileY of [Math.round(y - SIDE_TOLERANCE), Math.round(y + SIDE_TOLERANCE)]) {
        if (isInRange(tileX, tileY) && blocks(tileX, tileY)) {
          addTile(tileX, tileY);
        }
      }
    }
  }

  return { tiles: [...tiles.values()], outline, radius };
}
