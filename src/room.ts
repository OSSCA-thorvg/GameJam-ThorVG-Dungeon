export type Tile = 'wall' | 'floor' | 'door';

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
  ['x', 'wall'],
  ['.', 'floor'],
  ['+', 'door'],
  ['@', 'floor'],
  ['1', 'floor'],
]);

export function parseRoom(text: string): Room {
  const rows = text.trimEnd().split(/\r?\n/);
  const width = rows[0].length;
  let start: Point | undefined;
  const monsters: Point[] = [];

  const tiles = rows.map((row, y) => {
    if (row.length !== width) {
      throw new Error(`Room row ${y} has ${row.length} tiles, expected ${width}`);
    }
    return [...row].map((glyph, x) => {
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
    });
  });

  return { width, height: rows.length, tiles, start, monsters };
}

// Diagonal tiles count as adjacent.
export function isAdjacent(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
}

export function isWalkable(room: Room, x: number, y: number): boolean {
  const tile = room.tiles[y]?.[x];
  return tile === 'floor' || tile === 'door';
}
