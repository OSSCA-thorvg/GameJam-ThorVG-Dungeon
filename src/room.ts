export type Tile = 'wall' | 'floor' | 'door';

export interface Room {
  width: number;
  height: number;
  // Indexed as tiles[y][x].
  tiles: Tile[][];
}

const GLYPHS = new Map<string, Tile>([
  ['x', 'wall'],
  ['.', 'floor'],
  ['+', 'door'],
]);

export function parseRoom(text: string): Room {
  const rows = text.trimEnd().split(/\r?\n/);
  const width = rows[0].length;

  const tiles = rows.map((row, y) => {
    if (row.length !== width) {
      throw new Error(`Room row ${y} has ${row.length} tiles, expected ${width}`);
    }
    return [...row].map((glyph, x) => {
      const tile = GLYPHS.get(glyph);
      if (!tile) {
        throw new Error(`Unknown room glyph "${glyph}" at (${x}, ${y})`);
      }
      return tile;
    });
  });

  return { width, height: rows.length, tiles };
}
