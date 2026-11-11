import type { GeneratedMap } from './mapgen';
import { parseRoom, type Point } from './room';
import bossTemplate from './rooms/special/boss.txt?raw';
import necromancerTemplate from './rooms/special/necromancer.txt?raw';

// The arena of a boss floor, with the boss on its head tile and its body behind it. The way down
// is a locked door, which the boss drops the key to.
export interface BossFloor {
  map: GeneratedMap;
  // The tiles of the boss, from its head to its tail.
  tiles: Point[];
}

// "B" is the head of the boss and each "b" a segment of its body, which are floor under it.
export function createBossFloor(): BossFloor {
  const parts: { tile: Point; isHead: boolean }[] = [];
  const text = bossTemplate
    .split(/\r?\n/)
    .map((row, y) =>
      [...row]
        .map((glyph, x) => {
          if (glyph === 'B' || glyph === 'b') {
            parts.push({ tile: { x, y }, isHead: glyph === 'B' });
            return '.';
          }
          return glyph;
        })
        .join(''),
    )
    .join('\n');

  const head = parts.find(({ isHead }) => isHead)!.tile;
  // The body lies in a line from the head, so the distance from the head puts it in order.
  const distance = ({ x, y }: Point) => Math.abs(x - head.x) + Math.abs(y - head.y);
  const tiles = parts.map(({ tile }) => tile).sort((a, b) => distance(a) - distance(b));

  const room = parseRoom(text);
  let stairs: Point | undefined;
  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === 'stairs') {
        stairs = { x, y };
      }
    }),
  );
  const map = { ...room, start: room.start!, stairs: stairs!, specialRoom: [], corridor: [] };
  return { map, tiles };
}

// The arena of the necromancer on the last floor of the second stage: a wide room with coffins in
// niches along its sides and a few in the middle. "N" is the necromancer, on a floor tile.
export interface NecromancerFloor {
  map: GeneratedMap;
  boss: Point;
}

export function createNecromancerFloor(): NecromancerFloor {
  let boss: Point | undefined;
  const text = necromancerTemplate
    .split(/\r?\n/)
    .map((row, y) =>
      [...row]
        .map((glyph, x) => {
          if (glyph === 'N') {
            boss = { x, y };
            return '.';
          }
          return glyph;
        })
        .join(''),
    )
    .join('\n');

  const room = parseRoom(text);
  let stairs: Point | undefined;
  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === 'stairs') {
        stairs = { x, y };
      }
    }),
  );
  const map = { ...room, start: room.start!, stairs: stairs!, specialRoom: [], corridor: [] };
  return { map, boss: boss! };
}
