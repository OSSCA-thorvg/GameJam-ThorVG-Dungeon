import type { BodyBounds } from './characterArt';
import { pixelSvg } from './pixelSprite';

type Color = [r: number, g: number, b: number];

// What a status puts on a character's picture, from the status that matters most to the player.
export type StatusLook = 'frozen' | 'paralyzed' | 'stunned' | 'burning' | 'shielded';

// A frame of a look: its layers, each a picture over the character's picture, with an opacity
// from 0 to 1, so that ice and a shield show the character through them.
export interface LookLayer {
  svg: string;
  opacity: number;
}

export interface LookArt {
  frames: LookLayer[][];
  framesPerSecond: number;
}

// Rows above the character's picture, for what floats over its head.
export const LOOK_HEADROOM = 6;

// Placeholder colors. Fire is dark red at its tips, orange, and yellow at its heart. Ice is pale
// blue with lighter edges, a spark is yellow with a white core, and a shield is blue.
const PALETTE: Record<string, Color> = {
  r: [190, 45, 25],
  o: [250, 130, 35],
  y: [255, 226, 110],
  w: [255, 255, 255],
  i: [150, 215, 255],
  I: [215, 242, 255],
  s: [255, 232, 90],
  b: [110, 180, 255],
  B: [170, 215, 255],
};

// Placeholder values: how fast each look moves, how many frames its loop has, and how opaque the
// see-through parts of ice and a shield are.
const LOOK_TIMING: Record<StatusLook, { frames: number; framesPerSecond: number }> = {
  burning: { frames: 6, framesPerSecond: 10 },
  frozen: { frames: 4, framesPerSecond: 3 },
  paralyzed: { frames: 4, framesPerSecond: 12 },
  stunned: { frames: 8, framesPerSecond: 8 },
  shielded: { frames: 8, framesPerSecond: 8 },
};
const ICE_OPACITY = 0.5;
const SHIELD_OPACITY = 0.18;

// A random value from 0 to 1 for a pair of numbers, the same every time.
function noise(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// A grid as big as the character's picture, with the headroom above it. y counts from the top of
// the picture, so the headroom has negative rows.
function createGrid(pixels: number) {
  const rows = Array.from({ length: pixels + LOOK_HEADROOM }, () => Array<string>(pixels).fill('.'));
  return {
    set(x: number, y: number, key: string) {
      const row = rows[Math.round(y) + LOOK_HEADROOM];
      const column = Math.round(x);
      if (row && column >= 0 && column < pixels) {
        row[column] = key;
      }
    },
    svg: () =>
      pixelSvg(
        rows.map((row) => row.join('')),
        PALETTE,
      ),
  };
}

// Tongues of fire rise from the lower body, each flickering to its own height, with sparks above.
function drawBurning(pixels: number, body: BodyBounds, frame: number): LookLayer[] {
  const grid = createGrid(pixels);
  const bottom = pixels - 1;
  const height = bottom - body.top;
  const tongues = 6;
  for (let i = 0; i < tongues; i++) {
    const x = Math.round(body.left + ((body.right - body.left) * (i + 0.5)) / tongues);
    const base = bottom - Math.round(height * (0.05 + 0.45 * noise(i, 1)));
    const tall = 4 + Math.round(5 * noise(i, frame + 10));
    const sway = noise(i, frame + 20) < 0.5 ? -1 : 1;
    for (let k = 0; k < tall; k++) {
      const share = k / tall;
      const center = x + (share > 0.5 ? sway : 0);
      const key = share < 0.34 ? 'y' : share < 0.67 ? 'o' : 'r';
      grid.set(center, base - k, key);
      if (share < 0.5) {
        grid.set(center - 1, base - k, key === 'y' ? 'o' : 'r');
        grid.set(center + 1, base - k, key === 'y' ? 'o' : 'r');
      }
    }
  }
  for (let j = 0; j < 2; j++) {
    const x = body.left + (body.right - body.left) * noise(frame, 30 + j);
    const y = body.top + height * 0.6 * noise(frame, 40 + j);
    grid.set(x, y, 'o');
  }
  return [{ svg: grid.svg(), opacity: 1 }];
}

// Ice grows up from the feet over the lower body, its top jagged with crystals, seen through, with
// light edges, a few cracks, and a glint that moves. The upper body stays as it is.
function drawFrozen(pixels: number, body: BodyBounds, frame: number): LookLayer[] {
  const fill = createGrid(pixels);
  const edges = createGrid(pixels);
  const left = body.left - 1;
  const right = body.right + 1;
  const bottom = pixels - 1;
  const height = bottom - body.top;
  const tops: number[] = [];
  for (let x = left; x <= right; x++) {
    // The crystals are tallest in the middle, and each column has its own height.
    const middle = 1 - Math.abs((x - (left + right) / 2) / ((right - left) / 2 + 1));
    const top = Math.round(bottom - height * (0.25 + 0.3 * middle + 0.15 * noise(x, 80)));
    tops.push(top);
    for (let y = top; y <= bottom; y++) {
      const isEdge = y === top || x === left || x === right;
      (isEdge ? edges : fill).set(x, y, isEdge ? 'I' : 'i');
    }
  }
  for (let crack = 0; crack < 3; crack++) {
    const x = left + 2 + Math.floor(noise(crack, 90) * (right - left - 3));
    for (let y = tops[x - left] + 2; y < bottom - 1; y += 2) {
      edges.set(x + (y % 4 === 0 ? 1 : 0), y, 'I');
    }
  }
  const glint = left + 1 + Math.floor(noise(frame, 95) * (right - left - 1));
  edges.set(glint, tops[glint - left] + 1, 'w');
  return [
    { svg: fill.svg(), opacity: ICE_OPACITY },
    { svg: edges.svg(), opacity: 1 },
  ];
}

// Sparks jump around the body in zigzags, at new places in each frame.
function drawParalyzed(pixels: number, body: BodyBounds, frame: number): LookLayer[] {
  const grid = createGrid(pixels);
  const height = pixels - 1 - body.top;
  for (let j = 0; j < 4; j++) {
    let x = body.left + (body.right - body.left) * noise(frame, 50 + j);
    let y = body.top + height * 0.75 * noise(frame, 60 + j);
    const step = noise(frame, 70 + j) < 0.5 ? -1 : 1;
    grid.set(x, y, 'w');
    for (let k = 1; k < 7; k++) {
      x += k % 3 === 0 ? -step : step;
      y += 1;
      grid.set(x, y, k === 6 ? 'w' : 's');
    }
  }
  return [{ svg: grid.svg(), opacity: 1 }];
}

// Three stars circle over the head.
function drawStunned(pixels: number, body: BodyBounds, frame: number, frames: number): LookLayer[] {
  const grid = createGrid(pixels);
  const centerX = (body.left + body.right) / 2;
  const centerY = body.top - 3;
  const radius = Math.max(5, (body.right - body.left) / 2);
  for (let j = 0; j < 3; j++) {
    const angle = 2 * Math.PI * (frame / frames + j / 3);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + 1.5 * Math.sin(angle);
    grid.set(x, y - 1, 's');
    grid.set(x - 1, y, 's');
    grid.set(x + 1, y, 's');
    grid.set(x, y + 1, 's');
    grid.set(x, y, 'w');
  }
  return [{ svg: grid.svg(), opacity: 1 }];
}

// A bubble around the body, seen through, with a bright arc running around its rim.
function drawShielded(pixels: number, body: BodyBounds, frame: number, frames: number): LookLayer[] {
  const fill = createGrid(pixels);
  const rim = createGrid(pixels);
  const bottom = pixels - 1;
  const centerX = (body.left + body.right) / 2;
  // The bubble stays inside the picture, so its rim is never cut off.
  const radiusX = Math.min((body.right - body.left) / 2 + 2, centerX - 1, pixels - 2 - centerX);
  const radiusY = Math.min((bottom - body.top) / 2 + 2, (bottom + LOOK_HEADROOM) / 2);
  const centerY = bottom - radiusY;
  const arc = 2 * Math.PI * (frame / frames);
  for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y++) {
    for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x++) {
      const d = ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2;
      if (d > 1) {
        continue;
      }
      if (d > 0.82) {
        const angle = Math.atan2(y - centerY, x - centerX);
        const gap = Math.abs(((angle - arc + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
        rim.set(x, y, gap > 2.6 ? 'w' : 'B');
      } else {
        fill.set(x, y, 'b');
      }
    }
  }
  return [
    { svg: fill.svg(), opacity: SHIELD_OPACITY },
    { svg: rim.svg(), opacity: 1 },
  ];
}

// The frames of a look on a picture of a size in art pixels, with the body where it is in it.
export function drawStatusLook(look: StatusLook, pixels: number, body: BodyBounds): LookArt {
  const { frames, framesPerSecond } = LOOK_TIMING[look];
  const draw = (frame: number) => {
    switch (look) {
      case 'burning':
        return drawBurning(pixels, body, frame);
      case 'frozen':
        return drawFrozen(pixels, body, frame);
      case 'paralyzed':
        return drawParalyzed(pixels, body, frame);
      case 'stunned':
        return drawStunned(pixels, body, frame, frames);
      case 'shielded':
        return drawShielded(pixels, body, frame, frames);
    }
  };
  return { frames: Array.from({ length: frames }, (_, frame) => draw(frame)), framesPerSecond };
}
