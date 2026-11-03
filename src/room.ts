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
}

const GLYPHS = new Map<string, Tile>([
  ['x', 'wall'],
  ['.', 'floor'],
  ['+', 'door'],
  ['@', 'floor'],
]);

export function parseRoom(text: string): Room {
  const rows = text.trimEnd().split(/\r?\n/);
  const width = rows[0].length;
  let start: Point | undefined;

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
      return tile;
    });
  });

  return { width, height: rows.length, tiles, start };
}

export function isWalkable(room: Room, x: number, y: number): boolean {
  const tile = room.tiles[y]?.[x];
  return tile === 'floor' || tile === 'door';
}
