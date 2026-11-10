import { distancesFrom } from './path';
import { pick, randomInt, shuffle, type Random } from './random';
import {
  DIRECTIONS,
  doorDirection,
  isWalkable,
  parseRoom,
  type Point,
  type Room,
  type Tile,
} from './room';

// Builds one room per call, so rooms from the same source can differ.
export type RoomSource = (random: Random) => Room;

// Placeholder value, close to the density in the normal templates.
const FLOOR_TILES_PER_MONSTER = 30;

// A door site needs this many tiles without room floor outside it.
// From chooseRandomDoorSites() in Brogue CE.
const DOOR_CLEARANCE = 10;

// Gives up on random tiles after this many failed tries, so room creation always ends.
const MAX_RANDOM_TILE_ATTEMPTS = 20;

// From designCavern() and createBlobOnGrid() in Brogue CE.
const CAVE_MAX_WIDTH = 12;
const CAVE_MAX_HEIGHT = 8;
const CAVE_MIN_WIDTH = 3;
const CAVE_MIN_HEIGHT = 4;
const CAVE_FLOOR_CHANCE = 0.55;
const CAVE_ROUNDS = 5;
const CAVE_BIRTH_NEIGHBORS = 6;
const CAVE_SURVIVAL_NEIGHBORS = 4;

// From designCircularRoom() in Brogue CE.
const LARGE_CIRCLE_CHANCE = 0.05;
const MIN_LARGE_RADIUS = 4;
const MAX_LARGE_RADIUS = 10;
const MIN_RADIUS = 2;
const MAX_RADIUS = 4;
const MIN_RADIUS_WITH_HOLE = 7;
const HOLE_CHANCE = 0.5;
const MIN_HOLE_RADIUS = 3;
const HOLE_WALL_THICKNESS = 3;

// From designChunkyRoom() in Brogue CE.
const CHUNK_RADIUS = 2;
const MIN_EXTRA_CHUNKS = 2;
const MAX_EXTRA_CHUNKS = 8;

const tileKey = ({ x, y }: Point) => `${x},${y}`;

// Same test as drawCircleOnGrid() in Brogue CE, for a circle centered on (0, 0).
const isInCircle = ({ x, y }: Point, radius: number) => x * x + y * y < radius * radius + radius;

function circleTiles(center: Point, radius: number): Point[] {
  const tiles: Point[] = [];
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (isInCircle({ x, y }, radius)) {
        tiles.push({ x: center.x + x, y: center.y + y });
      }
    }
  }
  return tiles;
}

// Picks up to one door per direction, like chooseRandomDoorSites() in Brogue CE.
function addDoors(room: Room, random: Random) {
  const sites = DIRECTIONS.map((): Point[] => []);

  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      const direction = tile === 'wall' ? doorDirection(room, x, y) : undefined;
      if (!direction) {
        return;
      }
      const floorSides = DIRECTIONS.filter((d) => room.tiles[y - d.y]?.[x - d.x] === 'floor');
      let isClear = floorSides.length === 1;
      for (let step = 1; step <= DOOR_CLEARANCE && isClear; step++) {
        isClear = room.tiles[y + direction.y * step]?.[x + direction.x * step] !== 'floor';
      }
      if (isClear) {
        sites[DIRECTIONS.indexOf(direction)].push({ x, y });
      }
    }),
  );

  for (const list of sites) {
    if (list.length > 0) {
      const { x, y } = pick(random, list);
      room.tiles[y][x] = 'door';
    }
  }
}

function roomFromFloors(floors: Point[], random: Random): Room {
  const minX = Math.min(...floors.map(({ x }) => x));
  const minY = Math.min(...floors.map(({ y }) => y));
  // One extra row and column on each side hold the walls.
  const placed = floors.map(({ x, y }) => ({ x: x - minX + 1, y: y - minY + 1 }));
  const width = Math.max(...placed.map(({ x }) => x)) + 2;
  const height = Math.max(...placed.map(({ y }) => y)) + 2;
  const tiles = Array.from({ length: height }, () => Array<Tile>(width).fill('void'));

  for (const { x, y } of placed) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        tiles[y + dy][x + dx] = 'wall';
      }
    }
  }
  for (const { x, y } of placed) {
    tiles[y][x] = 'floor';
  }

  const monsterCount = Math.ceil(placed.length / FLOOR_TILES_PER_MONSTER);
  const room: Room = {
    width,
    height,
    tiles,
    monsters: shuffle(random, [...placed]).slice(0, monsterCount),
  };
  addDoors(room, random);
  return room;
}

function runCaveAutomaton(random: Random): boolean[][] {
  let floors = Array.from({ length: CAVE_MAX_HEIGHT }, () =>
    Array.from({ length: CAVE_MAX_WIDTH }, () => random() < CAVE_FLOOR_CHANCE),
  );

  for (let round = 0; round < CAVE_ROUNDS; round++) {
    const previous = floors;
    floors = previous.map((row, y) =>
      row.map((isFloor, x) => {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if ((dx !== 0 || dy !== 0) && previous[y + dy]?.[x + dx]) {
              neighbors++;
            }
          }
        }
        return neighbors >= (isFloor ? CAVE_SURVIVAL_NEIGHBORS : CAVE_BIRTH_NEIGHBORS);
      }),
    );
  }
  return floors;
}

function largestGroup(floors: boolean[][]): Point[] {
  const seen = floors.map((row) => row.map(() => false));
  let largest: Point[] = [];

  floors.forEach((row, y) =>
    row.forEach((isFloor, x) => {
      if (!isFloor || seen[y][x]) {
        return;
      }
      seen[y][x] = true;
      const group = [{ x, y }];
      for (let head = 0; head < group.length; head++) {
        for (const d of DIRECTIONS) {
          const next = { x: group[head].x + d.x, y: group[head].y + d.y };
          if (floors[next.y]?.[next.x] && !seen[next.y][next.x]) {
            seen[next.y][next.x] = true;
            group.push(next);
          }
        }
      }
      if (group.length > largest.length) {
        largest = group;
      }
    }),
  );
  return largest;
}

const span = (values: number[]) => Math.max(...values) - Math.min(...values) + 1;

export const createCaveRoom: RoomSource = (random) => {
  let floors: Point[];
  do {
    floors = largestGroup(runCaveAutomaton(random));
  } while (
    span(floors.map(({ x }) => x)) < CAVE_MIN_WIDTH ||
    span(floors.map(({ y }) => y)) < CAVE_MIN_HEIGHT
  );
  return roomFromFloors(floors, random);
};

export const createCircularRoom: RoomSource = (random) => {
  const radius =
    random() < LARGE_CIRCLE_CHANCE
      ? randomInt(random, MIN_LARGE_RADIUS, MAX_LARGE_RADIUS)
      : randomInt(random, MIN_RADIUS, MAX_RADIUS);
  const holeRadius =
    radius >= MIN_RADIUS_WITH_HOLE && random() < HOLE_CHANCE
      ? randomInt(random, MIN_HOLE_RADIUS, radius - HOLE_WALL_THICKNESS)
      : 0;
  const floors = circleTiles({ x: 0, y: 0 }, radius).filter(
    (tile) => !isInCircle(tile, holeRadius),
  );
  return roomFromFloors(floors, random);
};

export const createChunkyRoom: RoomSource = (random) => {
  const floors = new Map<string, Point>();
  const addCircle = (center: Point) => {
    for (const tile of circleTiles(center, CHUNK_RADIUS)) {
      floors.set(tileKey(tile), tile);
    }
  };

  addCircle({ x: 0, y: 0 });
  const extraChunks = randomInt(random, MIN_EXTRA_CHUNKS, MAX_EXTRA_CHUNKS);
  for (let i = 0; i < extraChunks; i++) {
    // A circle centered on an existing floor tile always stays connected to it.
    addCircle(pick(random, [...floors.values()]));
  }
  return roomFromFloors([...floors.values()], random);
};

function isConnected(room: Room): boolean {
  const walkable: Point[] = [];
  room.tiles.forEach((row, y) =>
    row.forEach((_, x) => {
      if (isWalkable(room, x, y)) {
        walkable.push({ x, y });
      }
    }),
  );
  const distances = distancesFrom(room, walkable[0]);
  return walkable.every(
    ({ x, y }) =>
      distances[y][x] >= 0 && (room.tiles[y][x] !== 'door' || doorDirection(room, x, y)),
  );
}

// Each "?" becomes a wall or a floor, like "SUBST: ? = x." in DCSS map files.
export function fromTemplate(text: string, isCorridor = false): RoomSource {
  return (random) => {
    for (let attempt = 0; attempt < MAX_RANDOM_TILE_ATTEMPTS; attempt++) {
      const room = parseRoom(text.replace(/\?/g, () => (random() < 0.5 ? 'x' : '.')));
      if (isConnected(room)) {
        return { ...room, isCorridor };
      }
    }
    return { ...parseRoom(text.replace(/\?/g, '.')), isCorridor };
  };
}
