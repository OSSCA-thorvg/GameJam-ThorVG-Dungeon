// A locked door blocks the way and the view until a key unlocks it into a door.
export type Tile =
  | 'void'
  | 'wall'
  | 'floor'
  | 'door'
  | 'locked-door'
  | 'stairs'
  | 'campfire'
  | 'sign';

// Fixtures are things that stand on a floor, like a campfire or a sign. Nothing can step on them,
// they do not block the view, and the hero uses them from a tile next to them.
const FIXTURES: readonly Tile[] = ['campfire', 'sign'];

export function isFixture(room: Room, x: number, y: number): boolean {
  return FIXTURES.includes(room.tiles[y]?.[x] ?? 'void');
}

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  width: number;
  height: number;
  // Indexed as tiles[y][x].
  tiles: Tile[][];
  start?: Point;
  monsters: Point[];
}

const GLYPHS = new Map<string, Tile>([
  [' ', 'void'],
  ['x', 'wall'],
  ['.', 'floor'],
  ['+', 'door'],
  ['@', 'floor'],
  ['1', 'floor'],
  ['&', 'campfire'],
  ['s', 'sign'],
  ['>', 'stairs'],
  ['L', 'locked-door'],
]);

export function parseRoom(text: string): Room {
  const rows = text.replace(/(\r?\n)+$/, '').split(/\r?\n/);
  // Short rows end in void, so rooms that are not rectangles need no trailing spaces.
  const width = Math.max(...rows.map((row) => row.length));
  let start: Point | undefined;
  const monsters: Point[] = [];

  const tiles = rows.map((row, y) =>
    [...row.padEnd(width)].map((glyph, x) => {
      const tile = GLYPHS.get(glyph);
      if (!tile) {
        throw new Error(`Unknown room glyph "${glyph}" at (${x}, ${y})`);
      }
      if (glyph === '@') {
        if (start) {
          throw new Error(`Second "@" at (${x}, ${y})`);
        }
        start = { x, y };
      }
      if (glyph === '1') {
        monsters.push({ x, y });
      }
      return tile;
    }),
  );

  return { width, height: rows.length, tiles, start, monsters };
}

// Diagonal tiles count as adjacent.
export function isAdjacent(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
}

export function isWalkable(room: Room, x: number, y: number): boolean {
  const tile = room.tiles[y]?.[x];
  return tile === 'floor' || tile === 'door' || tile === 'stairs';
}

export const DIRECTIONS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

// Returns the way out of a room through a door: a walkable tile behind it and open space ahead.
export function doorDirection(room: Room, x: number, y: number): Point | undefined {
  return DIRECTIONS.find(
    (d) =>
      (room.tiles[y + d.y]?.[x + d.x] ?? 'void') === 'void' && isWalkable(room, x - d.x, y - d.y),
  );
}
