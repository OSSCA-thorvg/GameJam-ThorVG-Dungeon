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
export function findPath(room: Room, from: Point, to: Point, occupied: Point[]): Point[] {
  const canEnter = ({ x, y }: Point) =>
    isWalkable(room, x, y) && !occupied.some((tile) => tile.x === x && tile.y === y);

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
