import { doorCountsFrom, findPath } from './path';
import { pick, shuffle, type Random } from './random';
import { DIRECTIONS, doorDirection, type Point, type Room, type Tile } from './room';
import type { RoomSource } from './roomgen';

export interface GeneratedMap extends Room {
  start: Point;
  stairs: Point;
  // The tiles inside the special room and its doorways, or none when the map has no special room.
  specialRoom: Point[];
}

export interface MapOptions {
  startRooms: RoomSource[];
  normalRooms: RoomSource[];
  // A room the map must have once. It is attached after half of the rooms, so it is usually a
  // few rooms away from the start.
  specialRoom?: RoomSource;
  roomCount: number;
  random: Random;
}

// Starts over after this many maps that had no place for the special room, and then gives up.
const MAX_MAP_ATTEMPTS = 20;

// Chosen by measuring loop counts on generated maps. Brogue CE passes 20 to addLoops(), but its
// 79x29 map is larger and its distance does not count diagonal steps.
const LOOP_MIN_PATH_LENGTH = 12;

// Gives up on more rooms after this many failed tries, so generation always ends.
const MAX_ATTACH_ATTEMPTS = 500;

// A limited grid packs rooms together, and loops need rooms that share a wall.
const GRID_SIZE = 32;

// The stairs are at least this many doors from the start, so they are at least two rooms away.
const STAIRS_MIN_DOORS = 2;

// Placeholder value. Each monster tile in a template holds a monster this often.
const MONSTER_CHANCE = 0.4;

interface Door extends Point {
  // Points out of the room.
  direction: Point;
}

function rotated(room: Room): Room {
  const turn = ({ x, y }: Point): Point => ({ x: room.height - 1 - y, y: x });
  const tiles = Array.from({ length: room.width }, () => Array<Tile>(room.height));
  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      const point = turn({ x, y });
      tiles[point.y][point.x] = tile;
    }),
  );
  return {
    width: room.height,
    height: room.width,
    tiles,
    start: room.start && turn(room.start),
    monsters: room.monsters.map(turn),
  };
}

function mirrored(room: Room): Room {
  const flip = ({ x, y }: Point): Point => ({ x: room.width - 1 - x, y });
  return {
    ...room,
    tiles: room.tiles.map((row) => [...row].reverse()),
    start: room.start && flip(room.start),
    monsters: room.monsters.map(flip),
  };
}

function randomVariant(room: Room, random: Random): Room {
  let variant = random() < 0.5 ? room : mirrored(room);
  const turns = Math.floor(random() * 4);
  for (let i = 0; i < turns; i++) {
    variant = rotated(variant);
  }
  return variant;
}

function findDoors(room: Room): Door[] {
  const doors: Door[] = [];
  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile !== 'door') {
        return;
      }
      const direction = doorDirection(room, x, y);
      if (!direction) {
        throw new Error(`The door at (${x}, ${y}) must connect a floor to the outside of the room`);
      }
      doors.push({ x, y, direction });
    }),
  );
  return doors;
}

// Builds a map by attaching template rooms to each other, door to door.
// Based on attachRooms() and addLoops() in Brogue CE, using templates for the room shapes.
export function generateMap(options: MapOptions): GeneratedMap {
  for (let attempt = 0; attempt < MAX_MAP_ATTEMPTS; attempt++) {
    const map = tryGenerateMap(options);
    if (map) {
      return map;
    }
  }
  throw new Error('No map had a place for the special room');
}

// Returns null when the special room found no place.
function tryGenerateMap({
  startRooms,
  normalRooms,
  specialRoom,
  roomCount,
  random,
}: MapOptions): GeneratedMap | null {
  const tiles = Array.from({ length: GRID_SIZE }, () => Array<Tile>(GRID_SIZE).fill('void'));
  const grid: Room = { width: GRID_SIZE, height: GRID_SIZE, tiles, monsters: [] };
  const openDoors = new Map<string, Door>();
  const doorKey = (x: number, y: number) => `${x},${y}`;

  const fits = (room: Room, offset: Point, joined: Point) =>
    room.tiles.every((row, y) =>
      row.every((tile, x) => {
        if (tile === 'void' || (x === joined.x && y === joined.y)) {
          return true;
        }
        const existing = tiles[y + offset.y]?.[x + offset.x];
        if (existing === undefined) {
          return false;
        }
        if (tile === 'wall' || tile === 'door') {
          return (
            existing === 'void' ||
            existing === 'wall' ||
            openDoors.has(doorKey(x + offset.x, y + offset.y))
          );
        }
        return existing === 'void';
      }),
    );

  const stamp = (room: Room, offset: Point, joined?: Point) => {
    const roomDoors = findDoors(room);

    room.tiles.forEach((row, y) =>
      row.forEach((tile, x) => {
        const gridX = x + offset.x;
        const gridY = y + offset.y;
        const key = doorKey(gridX, gridY);

        if (tile === 'void') {
          return;
        }
        if (joined && x === joined.x && y === joined.y) {
          openDoors.delete(key);
          return;
        }
        if (tile === 'door' && tiles[gridY][gridX] === 'void') {
          const door = roomDoors.find((d) => d.x === x && d.y === y)!;
          tiles[gridY][gridX] = 'door';
          openDoors.set(key, { x: gridX, y: gridY, direction: door.direction });
          return;
        }

        // A wall or door that lands on an existing wall or unused door stays a wall.
        openDoors.delete(key);
        tiles[gridY][gridX] = tile === 'door' ? 'wall' : tile;
      }),
    );
  };

  const startRoom = randomVariant(pick(random, startRooms)(random), random);
  if (!startRoom.start) {
    throw new Error('A start room needs a "@" tile');
  }
  const startOffset = {
    x: Math.floor((GRID_SIZE - startRoom.width) / 2),
    y: Math.floor((GRID_SIZE - startRoom.height) / 2),
  };
  stamp(startRoom, startOffset);
  const gridStart = {
    x: startRoom.start.x + startOffset.x,
    y: startRoom.start.y + startOffset.y,
  };

  const gridMonsters: Point[] = [];
  let roomsBuilt = 1;
  // Where the special room was put, or null while it still needs a place.
  let specialTiles: Point[] | null = specialRoom ? null : [];

  for (
    let attempt = 0;
    attempt < MAX_ATTACH_ATTEMPTS && (roomsBuilt < roomCount || !specialTiles);
    attempt++
  ) {
    if (openDoors.size === 0) {
      break;
    }
    const door = pick(random, [...openDoors.values()]);
    const isSpecial = !specialTiles && roomsBuilt >= Math.ceil(roomCount / 2);
    const source = isSpecial && specialRoom ? specialRoom : pick(random, normalRooms);
    const room = randomVariant(source(random), random);

    // The new room's door has to face the existing room's door.
    const facing = findDoors(room).filter(
      ({ direction }) => direction.x === -door.direction.x && direction.y === -door.direction.y,
    );
    if (facing.length === 0) {
      continue;
    }

    const joined = pick(random, facing);
    const offset = { x: door.x - joined.x, y: door.y - joined.y };
    if (!fits(room, offset, joined)) {
      continue;
    }

    stamp(room, offset, joined);
    roomsBuilt++;
    if (isSpecial) {
      specialTiles = room.tiles.flatMap((row, y) =>
        row.flatMap((tile, x) =>
          tile === 'void' || tile === 'wall' ? [] : [{ x: x + offset.x, y: y + offset.y }],
        ),
      );
    }
    for (const monster of room.monsters) {
      if (random() < MONSTER_CHANCE) {
        gridMonsters.push({ x: monster.x + offset.x, y: monster.y + offset.y });
      }
    }
  }

  if (!specialTiles) {
    return null;
  }

  for (const { x, y } of openDoors.values()) {
    tiles[y][x] = 'wall';
  }

  addLoops(grid, random);

  return finishMap(grid, gridStart, gridMonsters, specialTiles, random);
}

// Joins two rooms with a door where they share a wall but are far apart on foot.
function addLoops(grid: Room, random: Random) {
  const walls: Point[] = [];
  grid.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === 'wall') {
        walls.push({ x, y });
      }
    }),
  );

  for (const { x, y } of shuffle(random, walls)) {
    for (const d of DIRECTIONS.slice(0, 2)) {
      const a = { x: x + d.x, y: y + d.y };
      const b = { x: x - d.x, y: y - d.y };
      if (
        grid.tiles[a.y]?.[a.x] === 'floor' &&
        grid.tiles[b.y]?.[b.x] === 'floor' &&
        findPath(grid, a, b, []).length > LOOP_MIN_PATH_LENGTH
      ) {
        grid.tiles[y][x] = 'door';
        break;
      }
    }
  }
}

// Picks different floor tiles for items to lie on, as randomDropCell() of Shattered Pixel Dungeon:
// outside the start room unless the map is only that room, and not under the hero or a monster.
// Returns fewer tiles when there are not enough.
export function pickItemTiles(map: GeneratedMap, count: number, random: Random): Point[] {
  const doorCounts = doorCountsFrom(map, map.start);
  const minDoors = Math.min(1, Math.max(...doorCounts.flat()));
  const tiles: Point[] = [];
  map.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      const isTaken = [map.start, ...map.monsters].some((taken) => taken.x === x && taken.y === y);
      if (tile === 'floor' && !isTaken && doorCounts[y][x] >= minDoors) {
        tiles.push({ x, y });
      }
    }),
  );
  return shuffle(random, tiles).slice(0, count);
}

// Crops the map to its rooms and puts the stairs on a random floor tile away from the start.
function finishMap(
  grid: Room,
  start: Point,
  monsters: Point[],
  specialRoom: Point[],
  random: Random,
): GeneratedMap {
  const doorCounts = doorCountsFrom(grid, start);
  const minDoors = Math.min(STAIRS_MIN_DOORS, Math.max(...doorCounts.flat()));
  const stairsTiles: Point[] = [];
  let minX = GRID_SIZE;
  let minY = GRID_SIZE;
  let maxX = 0;
  let maxY = 0;

  grid.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === 'void') {
        return;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const isFree = ![start, ...monsters].some((taken) => taken.x === x && taken.y === y);
      if (tile === 'floor' && isFree && doorCounts[y][x] >= minDoors) {
        stairsTiles.push({ x, y });
      }
    }),
  );

  const stairs = pick(random, stairsTiles);
  grid.tiles[stairs.y][stairs.x] = 'stairs';

  const crop = ({ x, y }: Point): Point => ({ x: x - minX, y: y - minY });
  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    tiles: grid.tiles.slice(minY, maxY + 1).map((row) => row.slice(minX, maxX + 1)),
    start: crop(start),
    stairs: crop(stairs),
    monsters: monsters.map(crop),
    specialRoom: specialRoom.map(crop),
  };
}
