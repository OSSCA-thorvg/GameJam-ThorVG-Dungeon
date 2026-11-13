import type { Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import type { Point } from './room';

type Color = [r: number, g: number, b: number];

// How many screen pixels one pixel of the tile art covers at zoom 1. A tile is 32 by 16 art pixels.
export const ART_PIXEL = 2;
// The height of a wall in art pixels, about 0.6 times the height of a cube on the tile.
export const WALL_PIXELS = 12;

// Placeholder colors of a stage's tiles. The first stage keeps the colors the tiles had before they
// were drawn as pixels, and the second is the warmer stone of the catacombs.
export interface TileTheme {
  floor: Color;
  floorLight: Color;
  wallTop: Color;
  wallLeft: Color;
  wallRight: Color;
  doorFloor: Color;
  doorLeft: Color;
  doorRight: Color;
  // The iron bands across a door.
  iron: Color;
  water: Color;
  waterLight: Color;
  // What the gray of the steps is multiplied by.
  stepTint: Color;
  // The share of the bricks in a wall that are bones.
  bones: number;
}

const TILE_THEMES: TileTheme[] = [
  {
    floor: [86, 90, 100],
    floorLight: [98, 102, 112],
    wallTop: [130, 134, 144],
    wallLeft: [70, 74, 84],
    wallRight: [50, 54, 64],
    doorFloor: [150, 104, 60],
    doorLeft: [120, 82, 46],
    doorRight: [96, 64, 36],
    iron: [138, 142, 154],
    water: [58, 100, 138],
    waterLight: [66, 112, 150],
    stepTint: [1, 1, 1],
    bones: 0,
  },
  {
    floor: [98, 88, 76],
    floorLight: [112, 101, 87],
    wallTop: [158, 144, 120],
    wallLeft: [98, 86, 68],
    wallRight: [68, 58, 46],
    doorFloor: [112, 82, 58],
    doorLeft: [88, 64, 46],
    doorRight: [64, 46, 32],
    iron: [150, 140, 120],
    water: [44, 78, 66],
    waterLight: [54, 92, 78],
    stepTint: [1.06, 0.96, 0.84],
    bones: 0.12,
  },
];

// The surface uses the first stage's tiles, and a stage past the last uses the last one's.
export const tileThemeOf = (stage: number) =>
  TILE_THEMES[Math.min(Math.max(stage, 0), TILE_THEMES.length - 1)];

// The parts of the tiles that are drawn apart, because the room view shows, hides or fades them
// apart. The lock lies over the sides of a locked door.
export type TilePart =
  | 'floor'
  | 'water'
  | 'wall-left'
  | 'wall-right'
  | 'wall-top'
  | 'door-floor'
  | 'door-left'
  | 'door-right'
  | 'door-top'
  | 'lock'
  | 'burnt-doorway'
  | 'stairs-down'
  | 'stairs-up';

// Placeholder values. How much darker and lighter than its color a shaded pixel is.
const darker = (color: Color, factor = 0.8): Color =>
  color.map((value) => Math.round(value * factor)) as Color;
const lighter = (color: Color): Color =>
  color.map((value) => Math.min(255, Math.round(value * 1.12 + 4))) as Color;
const tinted = (color: Color, tint: Color): Color =>
  color.map((value, index) => Math.min(255, Math.round(value * tint[index]))) as Color;

const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const modulo = (value: number, size: number) => ((value % size) + size) % size;

// Points are in art pixels from the center of the tile's floor.
const diamond = (lift = 0, half = 16): Point[] => [
  { x: 0, y: -half / 2 - lift },
  { x: half, y: -lift },
  { x: 0, y: half / 2 - lift },
  { x: -half, y: -lift },
];
const LEFT_SIDE: Point[] = [
  { x: -16, y: 0 },
  { x: 0, y: 8 },
  { x: 0, y: 8 - WALL_PIXELS },
  { x: -16, y: -WALL_PIXELS },
];
const RIGHT_SIDE: Point[] = LEFT_SIDE.map(({ x, y }) => ({ x: -x, y }));

const isInside = (points: Point[], x: number, y: number) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
};

// A grid of art pixels around a tile. Each pixel is a whole square, so the edges of the tile step
// along its 2:1 lines.
function createRaster() {
  const pixels = new Map<string, { x: number; y: number; color: Color }>();
  return {
    set(x: number, y: number, color: Color) {
      pixels.set(`${x},${y}`, { x, y, color });
    },
    // Colors the pixels whose centers are inside the polygon. The pick gets the center of a pixel
    // and may leave it as it is by returning null.
    fill(points: Point[], pick: (x: number, y: number) => Color | null) {
      const xs = points.map(({ x }) => x);
      const ys = points.map(({ y }) => y);
      for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y++) {
        for (let x = Math.floor(Math.min(...xs)); x < Math.ceil(Math.max(...xs)); x++) {
          if (isInside(points, x + 0.5, y + 0.5)) {
            const color = pick(x + 0.5, y + 0.5);
            if (color) {
              this.set(x, y, color);
            }
          }
        }
      }
    },
    // One shape for each color, made of runs of pixels along the rows.
    toScene(TVG: ThorVGNamespace, center: Point): Scene {
      const shapes = new Map<string, Shape>();
      const shapeOf = (color: Color) => {
        const key = color.join(',');
        let shape = shapes.get(key);
        if (!shape) {
          shape = new TVG.Shape();
          shape.fill(...color);
          shapes.set(key, shape);
        }
        return shape;
      };
      const sorted = [...pixels.values()].sort((a, b) => a.y - b.y || a.x - b.x);
      for (let start = 0; start < sorted.length; ) {
        const first = sorted[start];
        const key = first.color.join(',');
        let end = start + 1;
        while (
          end < sorted.length &&
          sorted[end].y === first.y &&
          sorted[end].x === first.x + (end - start) &&
          sorted[end].color.join(',') === key
        ) {
          end++;
        }
        shapeOf(first.color).appendRect(
          center.x + first.x * ART_PIXEL,
          center.y + first.y * ART_PIXEL,
          (end - start) * ART_PIXEL,
          ART_PIXEL,
        );
        start = end;
      }
      const scene = new TVG.Scene();
      for (const shape of shapes.values()) {
        scene.add(shape);
      }
      return scene;
    },
  };
}

// The top of a wall, lit on its far edges and shaded on its near ones. (x, y) is from the center of
// the top.
const rim = (x: number, y: number, color: Color): Color => {
  const along = x + 2 * y;
  const across = x - 2 * y;
  if (along >= 14 || across <= -14) {
    return darker(color);
  }
  if (along <= -14 || across >= 14) {
    return lighter(color);
  }
  return color;
};

// How high above the bottom edge of a side a pixel is, and how far along the side, counted the same
// way on both sides.
const sidePosition = (x: number, y: number, isLeft: boolean) => {
  const bottom = isLeft ? 8 + x / 2 : 8 - x / 2;
  return {
    height: Math.floor(bottom - y),
    along: isLeft ? Math.floor(x) : -Math.floor(x) - 1,
  };
};

const BONE: Color = [216, 204, 176];

// Courses of bricks that run along the slope of a side, 4 art pixels high and 8 wide, each course
// shifted by half a brick. The top row is the lit edge of the top.
function brick(x: number, y: number, isLeft: boolean, color: Color, seed: number, theme: TileTheme) {
  const { height, along } = sidePosition(x, y, isLeft);
  if (height >= WALL_PIXELS - 1) {
    return lighter(color);
  }
  if (height % 4 === 0) {
    return darker(color);
  }
  const course = Math.floor(height / 4);
  const shifted = along + (course % 2) * 4 + 128;
  if (shifted % 8 === 0) {
    return darker(color);
  }
  const roll = hash(Math.floor(shifted / 8), course, seed + (isLeft ? 0 : 1));
  if (roll > 1 - theme.bones) {
    return darker(BONE, isLeft ? 0.62 : 0.46);
  }
  return roll < 0.25 ? lighter(color) : color;
}

// A wooden panel with two iron bands, framed by the bricks of the wall around it.
function doorSide(x: number, y: number, isLeft: boolean, seed: number, theme: TileTheme) {
  const frame = isLeft ? theme.wallLeft : theme.wallRight;
  const wood = isLeft ? theme.doorLeft : theme.doorRight;
  const { height, along } = sidePosition(x, y, isLeft);
  if (along < -15 || along > -2 || height < 0 || height > 10) {
    return brick(x, y, isLeft, frame, seed, theme);
  }
  if (height === 3 || height === 7) {
    return isLeft ? theme.iron : darker(theme.iron);
  }
  if (along === -15 || along === -2 || height === 10) {
    return darker(wood, 0.62);
  }
  return modulo(along, 3) === 0 ? darker(wood) : wood;
}

// The top of a door: planks inside a stone rim, so that a door shows as one from above too, where
// its sides are hidden behind walls. (x, y) is from the center of the top.
function doorTop(x: number, y: number, theme: TileTheme): Color {
  const along = x + 2 * y;
  const across = x - 2 * y;
  if (Math.abs(along) >= 11 || Math.abs(across) >= 11) {
    return rim(x, y, theme.wallTop);
  }
  if (Math.abs(along) >= 9 || Math.abs(across) >= 9) {
    return darker(theme.doorLeft, 0.62);
  }
  return modulo(Math.floor(across / 4), 2) === 0 ? theme.doorFloor : darker(theme.doorFloor, 0.88);
}

// Flagstones 16 art pixels square along the floor's axes, each row shifted by half a stone, with
// joints between them. The axes are those of the whole map, so the stones go on across tiles.
function flagstone(along: number, across: number, theme: TileTheme): Color {
  const row = Math.floor(across / 16);
  const shifted = along + modulo(row, 2) * 8;
  if (modulo(across, 16) < 1.5 || modulo(shifted, 16) < 1.5) {
    return darker(theme.floor, 0.66);
  }
  return hash(Math.floor(shifted / 16), row, 5) < 0.3 ? theme.floorLight : theme.floor;
}

// Short light ripples in rows along one axis of the floor.
function ripple(along: number, across: number, theme: TileTheme): Color {
  const row = Math.floor(across / 6);
  const segment = Math.floor((along + row * 5) / 10);
  return modulo(across, 6) < 2 && hash(row, segment, 9) < 0.45 ? theme.waterLight : theme.water;
}

const LOCK_BODY: Color = [236, 188, 70];
const LOCK_EDGE: Color = [154, 116, 36];
const LOCK_SHACKLE: Color = [190, 194, 204];
const LOCK_KEYHOLE: Color = [21, 22, 28];
const BURNT_DOORWAY: Color = [62, 54, 50];
const STAIRS_OPENING: Color = [14, 15, 19];
// Placeholder colors of the steps, nearest first, before the stage's tint.
const STAIRS_TREADS: Color[] = [
  [132, 136, 146],
  [100, 104, 114],
  [72, 75, 84],
];
const STAIRS_NOSINGS: Color[] = [
  [190, 194, 204],
  [150, 154, 164],
  [110, 114, 123],
];
const ENTRANCE_TREADS: Color[] = [
  [112, 116, 126],
  [124, 128, 138],
  [138, 142, 152],
];
const ENTRANCE_RISERS: Color[] = [
  [64, 67, 76],
  [72, 75, 84],
  [80, 83, 92],
];
const ENTRANCE_SIDE: Color = [50, 53, 62];
// Each step lies this many art pixels lower, or higher, than the one before it.
const STEP_PIXELS = 2;
// The lit front edge of a step going down, as a fraction of the tile.
const NOSING = 0.2;

// A padlock on each side of a locked door, 6 art pixels wide, standing straight up over the panel.
function drawLocks(raster: ReturnType<typeof createRaster>) {
  for (const isLeft of [true, false]) {
    const start = isLeft ? -11 : 5;
    for (let i = 0; i < 6; i++) {
      const x = start + i;
      const bottom = Math.floor(isLeft ? 8 + (x + 0.5) / 2 : 8 - (x + 0.5) / 2);
      const isEdge = i === 0 || i === 5;
      for (let y = bottom - 7; y <= bottom - 3; y++) {
        raster.set(x, y, isEdge || y === bottom - 3 ? LOCK_EDGE : LOCK_BODY);
      }
      if (i === 1 || i === 4) {
        for (let y = bottom - 10; y <= bottom - 8; y++) {
          raster.set(x, y, LOCK_SHACKLE);
        }
      }
      if (i === 2 || i === 3) {
        raster.set(x, bottom - 10, LOCK_SHACKLE);
        raster.set(x, bottom - 5, LOCK_KEYHOLE);
        raster.set(x, bottom - 4, LOCK_KEYHOLE);
      }
    }
  }
}

// A point on the tile, from its top corner along x by u and along y by v, lowered by a depth, in
// art pixels.
const onTile = (u: number, v: number, depth = 0): Point => ({
  x: 16 * u - 16 * v,
  y: -8 + 8 * u + 8 * v + depth,
});

// Draws a part of a tile as pixel art. The center is that of the tile's floor in the scene, and the
// tile's place in the map keeps the patterns going on across tiles.
export function drawTilePart(
  TVG: ThorVGNamespace,
  part: TilePart,
  center: Point,
  tile: Point,
  theme: TileTheme,
): Scene {
  const raster = createRaster();
  const seed = tile.x * 7919 + tile.y * 104729;
  // The floor's axes over the whole map. Centers of tiles are 16 art pixels apart across and 8
  // down, so a tile is 32 long along each axis.
  const along = (x: number, y: number) => 32 * tile.x + x + 2 * y;
  const across = (x: number, y: number) => -32 * tile.y + x - 2 * y;

  switch (part) {
    case 'floor':
      raster.fill(diamond(), (x, y) => flagstone(along(x, y), across(x, y), theme));
      break;
    case 'water':
      raster.fill(diamond(), (x, y) => ripple(along(x, y), across(x, y), theme));
      break;
    case 'wall-left':
    case 'wall-right': {
      const isLeft = part === 'wall-left';
      const color = isLeft ? theme.wallLeft : theme.wallRight;
      raster.fill(isLeft ? LEFT_SIDE : RIGHT_SIDE, (x, y) =>
        brick(x, y, isLeft, color, seed, theme),
      );
      break;
    }
    case 'wall-top':
      raster.fill(diamond(WALL_PIXELS), (x, y) => rim(x, y + WALL_PIXELS, theme.wallTop));
      break;
    case 'door-floor':
      // Planks across the doorway, which shows when the door is open.
      raster.fill(diamond(), (x, y) =>
        modulo(Math.floor((x - 2 * y) / 4), 2) === 0 ? theme.doorFloor : darker(theme.doorFloor, 0.88),
      );
      break;
    case 'door-left':
    case 'door-right': {
      const isLeft = part === 'door-left';
      raster.fill(isLeft ? LEFT_SIDE : RIGHT_SIDE, (x, y) => doorSide(x, y, isLeft, seed, theme));
      break;
    }
    case 'door-top':
      raster.fill(diamond(WALL_PIXELS), (x, y) => doorTop(x, y + WALL_PIXELS, theme));
      break;
    case 'lock':
      drawLocks(raster);
      break;
    case 'burnt-doorway':
      raster.fill(diamond(), () => BURNT_DOORWAY);
      break;
    case 'stairs-down': {
      // An opening in the floor with steps going down away from the front of the tile. The far
      // steps go first, so that the nearer ones are drawn over them, and the steps stay inside the
      // opening.
      const opening = diamond();
      raster.fill(opening, () => STAIRS_OPENING);
      const inOpening = (color: Color) => (x: number, y: number) =>
        isInside(opening, x, y) ? color : null;
      const count = STAIRS_TREADS.length;
      for (let step = count - 1; step >= 0; step--) {
        const near = 1 - step / count;
        const far = 1 - (step + 1) / count;
        const depth = (step + 1) * STEP_PIXELS;
        const edge = near - NOSING;
        raster.fill(
          [onTile(0, far, depth), onTile(1, far, depth), onTile(1, near, depth), onTile(0, near, depth)],
          inOpening(tinted(STAIRS_TREADS[step], theme.stepTint)),
        );
        raster.fill(
          [onTile(0, edge, depth), onTile(1, edge, depth), onTile(1, near, depth), onTile(0, near, depth)],
          inOpening(tinted(STAIRS_NOSINGS[step], theme.stepTint)),
        );
      }
      break;
    }
    case 'stairs-up': {
      // Steps going up from the floor, nearest first, so that each higher step is drawn over the
      // ones before it. The side facing right goes down to the floor, so a step does not float.
      const count = ENTRANCE_TREADS.length;
      for (let step = 0; step < count; step++) {
        const near = 1 - step / count;
        const far = 1 - (step + 1) / count;
        const low = -step * STEP_PIXELS;
        const high = -(step + 1) * STEP_PIXELS;
        raster.fill(
          [onTile(1, far), onTile(1, near), onTile(1, near, high), onTile(1, far, high)],
          () => tinted(ENTRANCE_SIDE, theme.stepTint),
        );
        raster.fill(
          [onTile(0, near, low), onTile(1, near, low), onTile(1, near, high), onTile(0, near, high)],
          () => tinted(ENTRANCE_RISERS[step], theme.stepTint),
        );
        raster.fill(
          [onTile(0, far, high), onTile(1, far, high), onTile(1, near, high), onTile(0, near, high)],
          () => tinted(ENTRANCE_TREADS[step], theme.stepTint),
        );
      }
      break;
    }
  }
  return raster.toScene(TVG, center);
}

// Placeholder colors of a trap's plate and its edge, red while it is armed and gray once spent.
const TRAP_COLORS = {
  known: { plate: [74, 40, 40], edge: [210, 90, 70], mark: [238, 200, 150], hole: [255, 90, 70] },
  spent: { plate: [60, 62, 70], edge: [112, 114, 122], mark: [40, 42, 48], hole: [70, 72, 80] },
} satisfies Record<string, Record<string, Color>>;
const SPIKE_LIGHT: Color = [214, 218, 226];
const SPIKE_SHADE: Color = [150, 154, 164];
const SPIKE_HOLE: Color = [36, 38, 44];
// The crosshair of an arrow trap, centered on the plate: a circle on the floor, which is twice as
// wide as it is high on the screen, with ticks around it and a dot in the middle.
const ARROW_MARK = [
  '..........#..........',
  '.....................',
  '.......#######.......',
  '.....##.......##.....',
  '....#...........#....',
  '###.#.....o.....#.###',
  '....#...........#....',
  '.....##.......##.....',
  '.......#######.......',
  '.....................',
  '..........#..........',
];

// The pressure plate of a trap on a tile's floor, centered on the paint's local origin, with a mark
// of its kind. An armed spike trap shows its spikes and a spent one their holes, and an arrow trap
// shows a crosshair.
export function drawTrap(
  TVG: ThorVGNamespace,
  kind: 'spike' | 'arrow',
  state: 'known' | 'spent',
): Scene {
  const raster = createRaster();
  const colors = TRAP_COLORS[state];
  raster.fill(diamond(0, 15), () => colors.edge);
  raster.fill(diamond(0, 13), () => colors.plate);
  if (kind === 'spike') {
    for (const { x, y } of [
      { x: -5, y: 0 },
      { x: 0, y: 3 },
      { x: 5, y: 0 },
    ]) {
      if (state === 'known') {
        const spike = [
          { x: x - 2, y: y + 1 },
          { x: x + 2, y: y + 1 },
          { x, y: y - 8 },
        ];
        raster.fill(spike, (px) => (px < x ? SPIKE_SHADE : SPIKE_LIGHT));
      } else {
        raster.fill(
          [
            { x: x - 2, y },
            { x: x + 2, y },
            { x: x + 2, y: y + 2 },
            { x: x - 2, y: y + 2 },
          ],
          () => SPIKE_HOLE,
        );
      }
    }
  } else {
    ARROW_MARK.forEach((row, y) => {
      [...row].forEach((pixel, x) => {
        if (pixel !== '.') {
          raster.set(x - 10, y - 5, pixel === 'o' ? colors.hole : colors.mark);
        }
      });
    });
  }
  return raster.toScene(TVG, { x: 0, y: 0 });
}

// Placeholder colors of a wooden coffin: its lid and the cross on it, its two sides, and the dark
// inside that shows when its lid is pushed aside.
const COFFIN_LID: Color = [108, 86, 66];
const COFFIN_CROSS: Color = [150, 126, 98];
const COFFIN_LEFT: Color = [74, 56, 44];
const COFFIN_RIGHT: Color = [48, 36, 28];
const COFFIN_INSIDE: Color = [16, 12, 14];
// Half its length along the map's x axis and half its width along its y axis, as fractions of a
// tile, and its height in art pixels.
const COFFIN_HALF_LENGTH = 0.46;
const COFFIN_HALF_WIDTH = 0.2;
const COFFIN_HEIGHT = 6;
// How high the lid of a waking coffin is lifted, in art pixels.
const COFFIN_LID_LIFT = 2;

// A wooden coffin standing on a tile's floor, centered on the paint's local origin. A coffin whose
// dead is waking has its lid pushed aside, over the dark inside.
export function drawCoffin(TVG: ThorVGNamespace, isAwake: boolean): Scene {
  const raster = createRaster();
  // A point on the floor, along the map's axes in tiles from the center, raised by a height.
  const at = (u: number, v: number, lift = 0): Point => ({
    x: (u - v) * 16,
    y: (u + v) * 8 - lift,
  });
  const a = COFFIN_HALF_LENGTH;
  const b = COFFIN_HALF_WIDTH;
  const h = COFFIN_HEIGHT;
  const box = (lift: number) => [at(-a, -b, lift), at(a, -b, lift), at(a, b, lift), at(-a, b, lift)];
  const [, baseRight, baseNear, baseLeft] = box(0);
  const [, topRight, topNear, topLeft] = box(h);
  // The side facing the viewer on the left runs along the edge y = +b, and the right one along
  // x = +a.
  raster.fill([baseLeft, baseNear, topNear, topLeft], () => COFFIN_LEFT);
  raster.fill([baseRight, baseNear, topNear, topRight], () => COFFIN_RIGHT);
  if (!isAwake) {
    raster.fill(box(h), () => COFFIN_LID);
    raster.fill([at(-0.34, -0.03, h), at(0.34, -0.03, h), at(0.34, 0.03, h), at(-0.34, 0.03, h)], () => COFFIN_CROSS);
    raster.fill([at(-0.1, -0.15, h), at(0, -0.15, h), at(0, 0.15, h), at(-0.1, 0.15, h)], () => COFFIN_CROSS);
  } else {
    const lid = h + COFFIN_LID_LIFT;
    raster.fill(box(h), () => COFFIN_INSIDE);
    raster.fill([at(-0.1, -b, lid), at(a, -b, lid), at(a, b, lid), at(-0.1, b, lid)], () => COFFIN_LID);
    raster.fill([at(-0.1, b, lid), at(a, b, lid), at(a, b, h), at(-0.1, b, h)], () => COFFIN_LEFT);
  }
  return raster.toScene(TVG, { x: 0, y: 0 });
}
