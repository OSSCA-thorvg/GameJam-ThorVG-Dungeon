import { isWalkable, type Point, type Room } from './room';

// Orthogonal steps come first, so paths use them when lengths are equal.
const STEPS: Point[] = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];

// Breadth-first search from the target, so the links from `from` read in walking order.
// Returns the tiles to walk through, ending at `to`, or nothing if `to` is unreachable.
// Tiles that isKnown rejects count as blocked, so the hero's paths cannot reveal the map.
export function findPath(
  room: Room,
  from: Point,
  to: Point,
  occupied: Point[],
  isKnown: (tile: Point) => boolean = () => true,
): Point[] {
  const canEnter = ({ x, y }: Point) =>
    isWalkable(room, x, y) &&
    isKnown({ x, y }) &&
    !occupied.some((tile) => tile.x === x && tile.y === y);

  if (!canEnter(to)) {
    return [];
  }

  const key = (point: Point) => point.y * room.width + point.x;
  const nextTile = new Map<number, Point>([[key(to), to]]);
  const queue = [to];

  for (let head = 0; head < queue.length && !nextTile.has(key(from)); head++) {
    const current = queue[head];
    for (const step of STEPS) {
      const neighbor = { x: current.x + step.x, y: current.y + step.y };
      if (canEnter(neighbor) && !nextTile.has(key(neighbor))) {
        nextTile.set(key(neighbor), current);
        queue.push(neighbor);
      }
    }
  }

  if (!nextTile.has(key(from))) {
    return [];
  }

  const path: Point[] = [];
  let current = from;
  while (key(current) !== key(to)) {
    current = nextTile.get(key(current))!;
    path.push(current);
  }
  return path;
}

// Returns the fewest doors on a walk to every tile, indexed as counts[y][x].
// Unreachable tiles are at -1.
export function doorCountsFrom(room: Room, from: Point): number[][] {
  const counts = room.tiles.map((row) => row.map(() => -1));
  counts[from.y][from.x] = 0;
  let layer = [from];

  while (layer.length > 0) {
    const nextLayer: Point[] = [];
    for (let head = 0; head < layer.length; head++) {
      const current = layer[head];
      for (const step of STEPS) {
        const x = current.x + step.x;
        const y = current.y + step.y;
        if (isWalkable(room, x, y) && counts[y][x] === -1) {
          const isDoor = room.tiles[y][x] === 'door';
          counts[y][x] = counts[current.y][current.x] + (isDoor ? 1 : 0);
          (isDoor ? nextLayer : layer).push({ x, y });
        }
      }
    }
    layer = nextLayer;
  }
  return counts;
}

// Returns the walking distance to every tile, indexed as distances[y][x].
// Unreachable tiles are at -1.
export function distancesFrom(room: Room, from: Point): number[][] {
  const distances = room.tiles.map((row) => row.map(() => -1));
  distances[from.y][from.x] = 0;
  const queue = [from];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const step of STEPS) {
      const x = current.x + step.x;
      const y = current.y + step.y;
      if (isWalkable(room, x, y) && distances[y][x] === -1) {
        distances[y][x] = distances[current.y][current.x] + 1;
        queue.push({ x, y });
      }
    }
  }
  return distances;
}
