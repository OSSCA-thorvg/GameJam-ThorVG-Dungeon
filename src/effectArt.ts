import type { Scene, ThorVGNamespace } from '@thorvg/webcanvas';
import type { Point } from './room';
import { ART_PIXEL, createRaster, diamond, hash, type ClearColor } from './tileArt';

// What covers a tile's floor for a while: the light of a search, fire and gases, the flash of frost
// and of dark magic, and the line a charge is about to run down.
export type FloorEffect = 'search' | 'fire' | 'poison' | 'paralysis' | 'frost' | 'dark' | 'lane';

// Placeholder colors of each, from the faintest part to the brightest.
const FLOOR_COLORS: Record<FloorEffect, ClearColor[]> = {
  search: [
    [170, 215, 255, 150],
    [215, 238, 255, 230],
  ],
  fire: [
    [160, 36, 20, 210],
    [236, 104, 30, 225],
    [255, 204, 90, 240],
  ],
  poison: [
    [70, 128, 50, 170],
    [116, 186, 78, 190],
    [168, 222, 120, 200],
  ],
  paralysis: [
    [160, 140, 48, 170],
    [224, 204, 86, 190],
    [250, 236, 150, 200],
  ],
  frost: [
    [140, 196, 240, 150],
    [190, 228, 255, 200],
    [240, 248, 255, 240],
  ],
  dark: [
    [44, 12, 64, 220],
    [100, 36, 150, 225],
    [176, 96, 224, 235],
  ],
  lane: [
    [255, 60, 50, 110],
    [255, 92, 70, 200],
  ],
};

// A tile is 16 art pixels from its center to its left and right corners. The inner diamond is one
// art pixel in from the top and bottom corners, so the rim between them has no gaps.
const TILE = diamond(0, 16);
const isOnRim = (x: number, y: number) => Math.abs(x) / 14 + Math.abs(y) / 7 >= 1;

const smooth = (t: number) => t * t * (3 - 2 * t);

// Value noise: random values on a grid of cells, blended across each cell.
function noise(x: number, y: number, seed: number, cell: number): number {
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  const fx = smooth(x / cell - cx);
  const fy = smooth(y / cell - cy);
  const at = (i: number, j: number) => hash(cx + i, cy + j, seed);
  const top = at(0, 0) + (at(1, 0) - at(0, 0)) * fx;
  const bottom = at(0, 1) + (at(1, 1) - at(0, 1)) * fx;
  return top + (bottom - top) * fy;
}

// Each paint of fire or gas gets its own pattern, so that the tiles of a cloud do not repeat.
let nextSeed = 1;

// The effects that last for turns move, so that they look alive: fire flickers fast, and gas swirls
// slowly. Placeholder values: the frames of the loop, how fast it runs, and how far in art pixels
// the pattern drifts.
export type MovingFloorEffect = 'fire' | 'poison' | 'paralysis';
const MOVING: Record<MovingFloorEffect, { frames: number; framesPerSecond: number; drift: number }> =
  {
    fire: { frames: 6, framesPerSecond: 10, drift: 3 },
    poison: { frames: 8, framesPerSecond: 4, drift: 4 },
    paralysis: { frames: 8, framesPerSecond: 4, drift: 4 },
  };

// One of the effects over a tile's floor, centered on the paint's local origin. The phase, from 0 to
// 1, moves the pattern of a moving effect around a circle, so that its last frame leads back to its
// first.
export function drawFloorEffect(
  TVG: ThorVGNamespace,
  kind: FloorEffect,
  seed = nextSeed++,
  phase = 0,
): Scene {
  const raster = createRaster();
  const [faint, middle, bright = middle] = FLOOR_COLORS[kind];
  const moving = kind in MOVING ? MOVING[kind as MovingFloorEffect] : null;
  const angle = 2 * Math.PI * phase;
  const driftX = (moving?.drift ?? 0) * Math.cos(angle);
  const driftY = (moving?.drift ?? 0) * Math.sin(angle);
  // Fire also changes its single pixels from frame to frame, which makes it flicker.
  const grain = kind === 'fire' ? seed + Math.round(phase * (moving?.frames ?? 1)) * 7919 : seed;
  const isChecker = (x: number, y: number) => (Math.floor(x) + Math.floor(y)) % 2 === 0;
  raster.fill(TILE, (x, y) => {
    // The noise runs along the floor, so its blobs are squashed like the tile.
    const n =
      noise(x + driftX, y * 2 + driftY, seed, 6) * 0.8 +
      hash(Math.floor(x), Math.floor(y), grain) * 0.2;
    switch (kind) {
      case 'search':
        return isOnRim(x, y) ? middle : isChecker(x, y) ? faint : null;
      case 'lane':
        return isOnRim(x, y) ? middle : isChecker(x, y) ? faint : null;
      case 'fire':
        return n < 0.28 ? null : n < 0.5 ? faint : n < 0.72 ? middle : bright;
      case 'poison':
      case 'paralysis':
        return n < 0.34 ? null : n < 0.6 ? faint : n < 0.8 ? middle : bright;
      case 'frost':
        return hash(Math.floor(x), Math.floor(y), seed) < 0.07
          ? bright
          : isChecker(x, y)
            ? middle
            : faint;
      case 'dark':
        return n < 0.42 ? faint : n < 0.7 ? middle : bright;
    }
  });
  return raster.toScene(TVG, { x: 0, y: 0 });
}

export interface MovingEffect {
  paint: Scene;
  // Shows the frame for a time in milliseconds, and tells whether it changed.
  showAt(time: number): boolean;
}

// A moving effect over a tile's floor, with all its frames drawn at once and one of them shown.
export function createMovingFloorEffect(
  TVG: ThorVGNamespace,
  kind: MovingFloorEffect,
): MovingEffect {
  const { frames, framesPerSecond } = MOVING[kind];
  const seed = nextSeed++;
  const paint = new TVG.Scene();
  const scenes = Array.from({ length: frames }, (_, index) => {
    const scene = drawFloorEffect(TVG, kind, seed, index / frames);
    scene.visible(index === 0);
    paint.add(scene);
    return scene;
  });
  let shown = 0;
  return {
    paint,
    showAt(time) {
      const next = Math.floor((time / 1000) * framesPerSecond) % frames;
      if (next === shown) {
        return false;
      }
      scenes[shown].visible(false);
      scenes[next].visible(true);
      shown = next;
      return true;
    },
  };
}

// The outline of a tile in one color, centered on the paint's local origin.
export function drawTileOutline(TVG: ThorVGNamespace, color: [number, number, number]): Scene {
  const raster = createRaster();
  raster.fill(TILE, (x, y) => (isOnRim(x, y) ? color : null));
  return raster.toScene(TVG, { x: 0, y: 0 });
}

// Placeholder look of the column of light over the stairs. Over the tile itself it is faint, so the
// steps show through. Above the tile it rises from the far edges, strongest a quarter of the way up,
// and fades in bands to nothing at its top. Its sides are fainter.
const BEAM_COLOR: [number, number, number] = [150, 205, 255];
const BEAM_HEIGHT = 48;
const BEAM_TILE_ALPHA = 40;
const BEAM_FOOT_ALPHA = 110;
const BEAM_PEAK_ALPHA = 200;
const BEAM_PEAK = 0.25;
const BEAM_BAND_ALPHA = 50;
const BEAM_EDGE_HALF_WIDTH = 13;
const BEAM_EDGE_FADE = 0.6;
// A 2 by 2 ordered dither, which mixes two bands where one turns into the other.
const BAYER = [
  [0, 2],
  [3, 1],
];

// The column of light over the stairs, with the tile's center at the given point.
export function drawStairsBeam(TVG: ThorVGNamespace, center: Point): Scene {
  const raster = createRaster();
  for (let x = -16; x < 16; x++) {
    const across = Math.abs(x + 0.5);
    const foot = 8 - across / 2;
    const back = -8 + across / 2;
    const top = foot - BEAM_HEIGHT;
    for (let y = Math.floor(top); y < foot; y++) {
      const up = (back - (y + 0.5)) / (back - top);
      let alpha =
        up < 0
          ? BEAM_TILE_ALPHA
          : up < BEAM_PEAK
            ? BEAM_FOOT_ALPHA + ((BEAM_PEAK_ALPHA - BEAM_FOOT_ALPHA) * up) / BEAM_PEAK
            : (BEAM_PEAK_ALPHA * (1 - up)) / (1 - BEAM_PEAK);
      if (across > BEAM_EDGE_HALF_WIDTH) {
        alpha *= BEAM_EDGE_FADE;
      }
      const level = alpha / BEAM_BAND_ALPHA;
      const threshold = (BAYER[((y % 2) + 2) % 2][((x % 2) + 2) % 2] + 0.5) / 4;
      const band = Math.floor(level) + (level - Math.floor(level) > threshold ? 1 : 0);
      if (band > 0) {
        raster.set(x, y, [...BEAM_COLOR, Math.min(255, band * BEAM_BAND_ALPHA)]);
      }
    }
  }
  return raster.toScene(TVG, center);
}

// A ring on the floor around the paint's local origin, as wide as twice the radius in art pixels
// and half as tall.
export function drawRing(
  TVG: ThorVGNamespace,
  radius: number,
  color: [number, number, number],
): Scene {
  const raster = createRaster();
  const size = Math.ceil(radius) + 1;
  for (let y = -size; y < size; y++) {
    for (let x = -size; x < size; x++) {
      const distance = Math.hypot(x + 0.5, (y + 0.5) * 2);
      if (distance >= radius - 1 && distance < radius + 0.5) {
        raster.set(x, y, color);
      }
    }
  }
  return raster.toScene(TVG, { x: 0, y: 0 });
}

// A spark, a cross of 5 art pixels with a lighter middle, centered on the paint's local origin.
export function drawSpark(
  TVG: ThorVGNamespace,
  color: [number, number, number],
  middle: [number, number, number],
): Scene {
  const raster = createRaster();
  for (const [x, y] of [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ]) {
    raster.set(x, y, color);
  }
  raster.set(0, 0, middle);
  return raster.toScene(TVG, { x: -ART_PIXEL / 2, y: -ART_PIXEL / 2 });
}

// A polygon in one color, given in screen pixels around the paint's local origin, with its edges
// stepped in art pixels.
export function drawPolygon(TVG: ThorVGNamespace, points: Point[], color: ClearColor): Scene {
  const raster = createRaster();
  raster.fill(
    points.map(({ x, y }) => ({ x: x / ART_PIXEL, y: y / ART_PIXEL })),
    () => color,
  );
  return raster.toScene(TVG, { x: 0, y: 0 });
}

// Placeholder colors of an arrow: its wooden shaft, its steel head, and its feathers.
const ARROW_SHAFT: [number, number, number] = [150, 112, 72];
const ARROW_HEAD: [number, number, number] = [204, 208, 218];
const ARROW_FEATHERS: [number, number, number] = [226, 222, 210];
// Its length from the middle to the tip and to the tail, in art pixels.
const ARROW_HALF_LENGTH = 6;

// An arrow in flight, pointing at an angle in degrees on the screen, where positive turns
// clockwise, centered on the paint's local origin. It is drawn at its angle instead of turned, so
// its pixels stay square.
export function drawArrow(TVG: ThorVGNamespace, angle: number): Scene {
  const raster = createRaster();
  const ahead = { x: Math.cos((angle * Math.PI) / 180), y: Math.sin((angle * Math.PI) / 180) };
  const side = { x: -ahead.y, y: ahead.x };
  const at = (along: number, across = 0) => ({
    x: Math.round(ahead.x * along + side.x * across - 0.5),
    y: Math.round(ahead.y * along + side.y * across - 0.5),
  });
  for (let along = -ARROW_HALF_LENGTH; along <= ARROW_HALF_LENGTH - 2; along += 0.5) {
    const { x, y } = at(along);
    raster.set(x, y, ARROW_SHAFT);
  }
  for (const along of [-ARROW_HALF_LENGTH, -ARROW_HALF_LENGTH + 1]) {
    for (const across of [-1, 1]) {
      const { x, y } = at(along, across);
      raster.set(x, y, ARROW_FEATHERS);
    }
  }
  raster.fill(
    [
      { x: ahead.x * (ARROW_HALF_LENGTH + 1), y: ahead.y * (ARROW_HALF_LENGTH + 1) },
      {
        x: ahead.x * (ARROW_HALF_LENGTH - 2.5) + side.x * 2,
        y: ahead.y * (ARROW_HALF_LENGTH - 2.5) + side.y * 2,
      },
      {
        x: ahead.x * (ARROW_HALF_LENGTH - 2.5) - side.x * 2,
        y: ahead.y * (ARROW_HALF_LENGTH - 2.5) - side.y * 2,
      },
    ],
    () => ARROW_HEAD,
  );
  return raster.toScene(TVG, { x: 0, y: 0 });
}
