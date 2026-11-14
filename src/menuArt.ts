import type { Picture, Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import { pixelSvg } from './pixelSprite';

type Color = [r: number, g: number, b: number];
type Point = { x: number; y: number };
type Vector = { x: number; y: number; z: number };

// The picture behind the main menu: the entrance of the dungeon at night, seen from a little below
// in two-point perspective, apart from the view of the map. A stone gatehouse built into a hill:
// its front with a barred and padlocked gate and a torch on each side, its side wall going back to
// the right, the underside of its gabled roof, and steps up to the gate. Above it, a moon in a sky
// of stars. The torches flicker, and their light wavers. Placeholder colors, in the stone of the
// first stage.
const PALETTE: Record<string, Color> = {
  // The rock of the hill behind, and its specks.
  h: [24, 25, 32],
  H: [32, 33, 42],
  // The roof seen from below: the underside of the eaves, its rafters, and the boards along the
  // edges of the roof, with their lit edge.
  u: [34, 35, 44],
  U: [26, 27, 34],
  F: [62, 64, 76],
  G: [84, 87, 100],
  // The front wall in the light: brick, mortar, and the lit edge of a brick.
  w: [74, 78, 88],
  m: [54, 57, 66],
  W: [92, 96, 108],
  // The side wall in shade: brick and mortar.
  x: [52, 55, 64],
  X: [40, 42, 50],
  // The gate's frame, the dark beyond it, and the iron bars with their lit edge.
  f: [104, 108, 120],
  d: [10, 10, 14],
  i: [70, 74, 86],
  I: [118, 122, 134],
  // The padlock: brass, its shade, and its keyhole.
  l: [172, 132, 62],
  L: [128, 94, 42],
  // The keyhole of the padlock.
  k: [20, 20, 24],
  // The moon: its face, its darker seas, and its rim in shade.
  M: [236, 232, 214],
  N: [204, 200, 184],
  O: [176, 174, 164],
  // The stars, bright and faint.
  a: [200, 204, 220],
  A: [104, 108, 128],
  // The steps: their tops, fronts, and sides.
  t: [112, 114, 126],
  T: [84, 86, 98],
  V: [62, 64, 74],
  // The torches: the iron bracket, the wooden handle, and the fire, dark red to yellow.
  g: [58, 52, 46],
  n: [112, 80, 46],
  r: [190, 45, 25],
  o: [250, 130, 35],
  y: [255, 226, 110],
  // The ground: dirt, its darker depth, its specks, and pebbles.
  e: [74, 54, 38],
  E: [58, 42, 30],
  p: [96, 72, 50],
  P: [104, 104, 112],
};

export const MENU_ART_WIDTH = 132;
export const MENU_ART_HEIGHT = 100;
const GROUND_ROWS = 12;
// Art pixels between the picture and the right of the screen, half the reach of a torch's light.
const RIGHT_MARGIN = 15;

// The gatehouse, in units of about an art pixel on its front. Across is along its front, from its
// left to its right, up is up, and back is away from its front.
const WIDTH = 34;
const DEPTH = 26;
const WALL_HEIGHT = 30;
const GABLE_HEIGHT = 16;
const OVERHANG = 4;
const ROOF_THICKNESS = 3;
const GATE = { left: 11, right: 23, bottom: 6, top: 24 };

// The camera: how far the gatehouse is turned from facing it, so that its front goes away to the
// left and its side wall to the right, how high the eye is above the ground, which is a little,
// and how far it looks up. Placeholder values, picked by eye from the sketch the picture follows.
// The eye is close and looks well up, so the upright edges lean in toward the top and the
// gatehouse is wide at its foot and narrow at its roof, as seen from below.
const TURN = (22 * Math.PI) / 180;
const EYE_HEIGHT = 2;
const LOOK_UP = (16 * Math.PI) / 180;
// Where the front left corner of the gatehouse stands, from the eye along the ground.
const PLACE = { x: -20, z: 44 };

// A point of the gatehouse in the world, the eye at the origin looking along z.
function toWorld(across: number, up: number, back: number): Vector {
  return {
    x: PLACE.x + across * Math.cos(TURN) + back * Math.sin(TURN),
    y: up,
    z: PLACE.z - across * Math.sin(TURN) + back * Math.cos(TURN),
  };
}

// Where a point of the world falls on the picture plane, before the picture is fitted to the grid.
function toPlane({ x, y, z }: Vector): Point {
  const height = y - EYE_HEIGHT;
  const upward = height * Math.cos(LOOK_UP) - z * Math.sin(LOOK_UP);
  const forward = height * Math.sin(LOOK_UP) + z * Math.cos(LOOK_UP);
  return { x: x / forward, y: -upward / forward };
}

// The roof's underside rises from the eaves at both sides to the ridge over the middle.
const roofSlope = GABLE_HEIGHT / (WIDTH / 2 + OVERHANG);
const roofAt = (across: number) =>
  WALL_HEIGHT - 1 + (WIDTH / 2 + OVERHANG - Math.abs(across - WIDTH / 2)) * roofSlope;

// The picture plane fitted into the grid, with room for the steps and the roof.
const fitted = (() => {
  const corners = [
    toWorld(-OVERHANG, roofAt(-OVERHANG) + ROOF_THICKNESS, -OVERHANG),
    toWorld(WIDTH / 2, roofAt(WIDTH / 2) + ROOF_THICKNESS, -OVERHANG),
    toWorld(WIDTH + OVERHANG, roofAt(WIDTH + OVERHANG) + ROOF_THICKNESS, DEPTH + OVERHANG),
    toWorld(WIDTH + OVERHANG, roofAt(WIDTH + OVERHANG), -OVERHANG),
    toWorld(0, 0, -8),
    toWorld(WIDTH, 0, -8),
    toWorld(WIDTH, 0, DEPTH),
  ].map(toPlane);
  const left = Math.min(...corners.map(({ x }) => x));
  const right = Math.max(...corners.map(({ x }) => x));
  const top = Math.min(...corners.map(({ y }) => y));
  const bottom = Math.max(...corners.map(({ y }) => y));
  const room = { width: MENU_ART_WIDTH - 8, height: MENU_ART_HEIGHT - 4 };
  const scale = Math.min(room.width / (right - left), room.height / (bottom - top));
  return {
    scale,
    x: MENU_ART_WIDTH - 4 - right * scale,
    y: MENU_ART_HEIGHT - 2 - bottom * scale,
  };
})();

function project(across: number, up: number, back: number): Point {
  const { x, y } = toPlane(toWorld(across, up, back));
  return { x: fitted.x + x * fitted.scale, y: fitted.y + y * fitted.scale };
}

// The torches on the front, by the point their flame stands on.
const TORCHES = [project(5, 17, -1), project(WIDTH - 5, 17, -1)];
const FLAME_FRAMES = 4;
// Placeholder values: how fast the flames flicker, how far their light reaches in art pixels, and
// how bright it is, from 0 to 255, at its least and its most.
const FLAMES_PER_SECOND = 8;
const GLOW_RADIUS = 30;
const GLOW_DIM = 50;
const GLOW_BRIGHT = 90;

function noise(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function isInside(points: Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function createGrid(width: number, height: number) {
  const rows = Array.from({ length: height }, () => Array<string>(width).fill('.'));
  const set = (x: number, y: number, key: string) => {
    const row = rows[Math.floor(y)];
    const column = Math.floor(x);
    if (row && column >= 0 && column < width) {
      row[column] = key;
    }
  };
  return {
    set,
    fill(points: Point[], pick: (x: number, y: number) => string | null) {
      const top = Math.floor(Math.min(...points.map(({ y }) => y)));
      const bottom = Math.ceil(Math.max(...points.map(({ y }) => y)));
      const left = Math.floor(Math.min(...points.map(({ x }) => x)));
      const right = Math.ceil(Math.max(...points.map(({ x }) => x)));
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if (isInside(points, x + 0.5, y + 0.5)) {
            const key = pick(x + 0.5, y + 0.5);
            if (key) {
              set(x, y, key);
            }
          }
        }
      }
    },
    svg: () =>
      pixelSvg(
        rows.map((row) => row.join('')),
        PALETTE,
      ),
  };
}

type Grid = ReturnType<typeof createGrid>;

// Paints a surface of the gatehouse point by point, close enough that no pixel is missed, so that
// its pattern shrinks with distance as the surface does. where gives the point of the gatehouse for
// a place on the surface.
function paint(
  grid: Grid,
  [u0, u1]: [number, number],
  [v0, v1]: [number, number],
  where: (u: number, v: number) => [across: number, up: number, back: number],
  pick: (u: number, v: number) => string | null,
) {
  const step = 0.2;
  for (let u = u0; u < u1; u += step) {
    for (let v = v0; v < v1; v += step) {
      const key = pick(u, v);
      if (key) {
        const { x, y } = project(...where(u, v));
        grid.set(x, y, key);
      }
    }
  }
}

// Courses of bricks 3 high and 6 long, every other course shifted by half a brick.
function brick(along: number, up: number, colors: { brick: string; mortar: string; lit?: string }) {
  const course = Math.floor(up / 3);
  const shift = course % 2 === 0 ? 0 : 3;
  const isMortar = up - course * 3 < 0.6 || (((Math.floor(along) + shift) % 6) + 6) % 6 === 0;
  if (isMortar) {
    return colors.mortar;
  }
  return colors.lit && up - course * 3 >= 2.2 ? colors.lit : colors.brick;
}

function drawGatehouse(): string {
  const grid = createGrid(MENU_ART_WIDTH, MENU_ART_HEIGHT);
  const bottom = MENU_ART_HEIGHT - 1;

  // The hill the gatehouse is built into, highest behind its roof.
  const ridge = project(WIDTH / 2, roofAt(WIDTH / 2), DEPTH);
  for (let x = 0; x < MENU_ART_WIDTH; x++) {
    const rise = Math.max(0, 1 - Math.abs(x - ridge.x) / 70);
    const top = Math.round(bottom - rise * (bottom - ridge.y + 14) - 4 * noise(x, 1));
    for (let y = top; y <= bottom; y++) {
      grid.set(x, y, noise(x, y) < 0.08 ? 'H' : 'h');
    }
  }

  // The side wall, in shade, going back to the right.
  paint(
    grid,
    [0, DEPTH],
    [0, WALL_HEIGHT],
    (back, up) => [WIDTH, up, back],
    (back, up) => brick(back, up, { brick: 'x', mortar: 'X' }),
  );

  // The front wall, in the light, up into the gable under the roof, with the gate and its bars.
  paint(
    grid,
    [0, WIDTH],
    [0, WALL_HEIGHT + GABLE_HEIGHT],
    (across, up) => [across, up, 0],
    (across, up) => {
      if (up > roofAt(across)) {
        return null;
      }
      const inGate =
        across >= GATE.left && across < GATE.right && up >= GATE.bottom && up < GATE.top;
      if (inGate) {
        const column = across - GATE.left;
        const isBar = column % 3 >= 1.2 && column % 3 < 2;
        const isCrossbar = (up >= 12 && up < 12.8) || (up >= 19 && up < 19.8);
        if (isCrossbar) {
          return 'I';
        }
        if (isBar) {
          return column % 3 < 1.6 ? 'I' : 'i';
        }
        return 'd';
      }
      const inFrame =
        across >= GATE.left - 1 && across < GATE.right + 1 && up >= GATE.bottom && up < GATE.top + 1.2;
      return inFrame ? 'f' : brick(across, up, { brick: 'w', mortar: 'm', lit: 'W' });
    },
  );

  // The roof from below: the underside of its eaves over the side wall and over the front, with
  // rafters across it, then the boards along its edges.
  const rafter = (place: number) => (((place % 4) + 4) % 4 < 1 ? 'U' : 'u');
  paint(
    grid,
    [WIDTH, WIDTH + OVERHANG],
    [-OVERHANG, DEPTH + OVERHANG],
    (across, back) => [across, roofAt(across), back],
    (_, back) => rafter(back),
  );
  paint(
    grid,
    [-OVERHANG, WIDTH + OVERHANG],
    [-OVERHANG, 0],
    (across, back) => [across, roofAt(across), back],
    (across) => rafter(across),
  );
  paint(
    grid,
    [-OVERHANG, DEPTH + OVERHANG],
    [0, ROOF_THICKNESS],
    (back, rise) => [WIDTH + OVERHANG, roofAt(WIDTH + OVERHANG) + rise, back],
    (_, rise) => (rise > ROOF_THICKNESS - 0.8 ? 'G' : 'F'),
  );
  paint(
    grid,
    [-OVERHANG, WIDTH + OVERHANG],
    [0, ROOF_THICKNESS],
    (across, rise) => [across, roofAt(across) + rise, -OVERHANG],
    (_, rise) => (rise > ROOF_THICKNESS - 0.8 ? 'G' : 'F'),
  );

  // The steps up to the gate, the lowest reaching out the furthest. Each shows its front and its
  // right side, and its top when it is below the eye.
  for (let step = 2; step >= 0; step--) {
    const left = GATE.left - 2 - (2 - step);
    const right = GATE.right + 2 + (2 - step);
    const front = -2.5 * (3 - step);
    const low = 2 * step;
    const high = low + 2;
    paint(grid, [left, right], [front, 0], (across, back) => [across, high, back], () => 't');
    paint(grid, [front, 0], [low, high], (back, up) => [right, up, back], () => 'V');
    paint(grid, [left, right], [low, high], (across, up) => [across, up, front], () => 'T');
  }

  // The padlock, hanging from the lower crossbar on the right.
  const lock = project(GATE.right - 3, 11, -0.3);
  grid.set(lock.x + 1, lock.y - 1, 'I');
  grid.set(lock.x + 3, lock.y - 1, 'I');
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 5; x++) {
      grid.set(lock.x + x, lock.y + y, y === 3 ? 'L' : 'l');
    }
  }
  grid.set(lock.x + 2, lock.y + 1, 'k');

  // The torches: a bracket on the wall and a handle in it. The fire is drawn apart, as it moves.
  for (const { x, y } of TORCHES) {
    grid.set(x - 1, y + 5, 'g');
    grid.set(x, y + 5, 'g');
    grid.set(x + 1, y + 5, 'g');
    grid.set(x, y + 6, 'g');
    for (let k = 1; k <= 4; k++) {
      grid.set(x, y + k, 'n');
    }
  }

  return grid.svg();
}

// A flame on each torch, one frame of its flicker.
function drawFlames(frame: number): string {
  const grid = createGrid(MENU_ART_WIDTH, MENU_ART_HEIGHT);
  TORCHES.forEach(({ x, y }, index) => {
    const tall = 4 + Math.round(3 * noise(index, frame));
    const sway = noise(index, frame + 10) < 0.5 ? -1 : 1;
    for (let k = 0; k < tall; k++) {
      const share = k / tall;
      const center = x + (share > 0.6 ? sway : 0);
      const key = share < 0.34 ? 'y' : share < 0.7 ? 'o' : 'r';
      grid.set(center, y - k, key);
      if (share < 0.5) {
        grid.set(center - 1, y - k, 'o');
        grid.set(center + 1, y - k, 'o');
      }
    }
  });
  return grid.svg();
}

// The dirt below the picture, as wide as the screen, with an uneven top.
function drawGround(width: number): string {
  const grid = createGrid(width, GROUND_ROWS);
  for (let x = 0; x < width; x++) {
    const top = Math.round(1 + Math.sin(x * 0.45) + noise(x, 2));
    for (let y = top; y < GROUND_ROWS; y++) {
      const roll = noise(x, y + 3);
      const key = roll < 0.03 ? 'P' : roll < 0.12 ? 'p' : y > GROUND_ROWS / 2 ? 'E' : 'e';
      grid.set(x, y, key);
    }
  }
  return grid.svg();
}

// The moon, a round face with darker seas and its rim in shade on the side away from the sun.
const MOON_RADIUS = 7;
function drawMoon(): string {
  const size = MOON_RADIUS * 2 + 1;
  const grid = createGrid(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - MOON_RADIUS;
      const dy = y - MOON_RADIUS;
      const distance = Math.hypot(dx, dy);
      if (distance > MOON_RADIUS + 0.3) {
        continue;
      }
      const isRim = distance > MOON_RADIUS - 1.5 && dx + dy > 2;
      const isSea = noise(Math.floor(x / 3), Math.floor(y / 3) + 50) < 0.3;
      grid.set(x, y, isRim ? 'O' : isSea ? 'N' : 'M');
    }
  }
  return grid.svg();
}

// Stars over a sky of a size in art pixels, a few of them bright.
function drawStars(width: number, height: number): string {
  const grid = createGrid(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const roll = noise(x, y + 70);
      if (roll < 0.004) {
        grid.set(x, y, roll < 0.0012 ? 'a' : 'A');
      }
    }
  }
  return grid.svg();
}

// Where the moon is, in art pixels from the top right corner of the screen to its middle, and how
// far its glow reaches in art pixels.
const MOON_PLACE = { right: 22, top: 18 };
const MOON_GLOW_RADIUS = 40;

export interface MenuArt {
  scene: Scene;
  // Fits the picture to a canvas of a size in its own pixels, with the gatehouse at the right.
  layout(width: number, height: number): void;
  // Shows the frame of the flicker for a time in milliseconds, and tells whether it changed.
  showAt(time: number): boolean;
}

const loadPicture = (TVG: ThorVGNamespace, svg: string) => {
  const picture = new TVG.Picture();
  picture.load(svg, { type: 'svg' });
  return picture;
};

export function createMenuArt(TVG: ThorVGNamespace): MenuArt {
  const scene = new TVG.Scene();
  const background = new TVG.Shape();
  scene.add(background);
  // The stars are drawn for the size of the screen, so they have a layer of their own to be
  // replaced in.
  const starLayer = new TVG.Scene();
  scene.add(starLayer);
  let stars: Picture | null = null;
  const moonGlow = new TVG.Shape();
  scene.add(moonGlow);
  const moon = loadPicture(TVG, drawMoon());
  scene.add(moon);
  const gatehouse = loadPicture(TVG, drawGatehouse());
  scene.add(gatehouse);
  const glows = TORCHES.map(() => {
    const glow = new TVG.Shape();
    scene.add(glow);
    return glow;
  });
  const flames = Array.from({ length: FLAME_FRAMES }, (_, frame) => {
    const picture = loadPicture(TVG, drawFlames(frame));
    picture.visible(frame === 0);
    scene.add(picture);
    return picture;
  });
  let ground: Picture | null = null;
  let shown = 0;
  let shownStep = -1;

  return {
    scene,
    layout(width, height) {
      // Whole screen pixels to an art pixel, as large as fits. A wide screen has the picture at the
      // right of the menu, with room at the right for the light of the torch there. A tall one has
      // it centered below the menu, which index.html moves to the top.
      const isTall = height > width;
      const fit = isTall
        ? Math.min(width / (MENU_ART_WIDTH + RIGHT_MARGIN), (height * 0.45) / MENU_ART_HEIGHT)
        : Math.min(
            (width * 0.6) / (MENU_ART_WIDTH + RIGHT_MARGIN),
            (height * 0.8) / MENU_ART_HEIGHT,
          );
      const scale = Math.max(1, Math.floor(fit));
      const groundTop = height - GROUND_ROWS * scale;
      const left = isTall
        ? Math.round((width - MENU_ART_WIDTH * scale) / 2)
        : width - (MENU_ART_WIDTH + RIGHT_MARGIN) * scale;
      const top = groundTop - MENU_ART_HEIGHT * scale + scale;

      // The night sky darkens upward, a ThorVG gradient behind the pixel art.
      const gradient = new TVG.LinearGradient(0, 0, 0, height);
      gradient.addStop(0, [8, 8, 12, 255]);
      gradient.addStop(1, [24, 22, 30, 255]);
      gradient.build();
      background.reset();
      background.appendRect(0, 0, width, height);
      background.fill(gradient);

      if (stars) {
        starLayer.remove(stars);
      }
      const starColumns = Math.ceil(width / scale);
      const starRows = Math.ceil(groundTop / scale);
      stars = loadPicture(TVG, drawStars(starColumns, starRows));
      stars.size(starColumns * scale, starRows * scale);
      starLayer.add(stars);

      // The moon, and the pale light around it, a ThorVG gradient.
      const moonSize = (MOON_RADIUS * 2 + 1) * scale;
      const moonX = width - (MOON_PLACE.right + MOON_RADIUS + 1) * scale;
      const moonY = (MOON_PLACE.top - MOON_RADIUS) * scale;
      moon.size(moonSize, moonSize);
      moon.translate(moonX, moonY);
      const glowRadius = MOON_GLOW_RADIUS * scale;
      const moonLight = new TVG.RadialGradient(0, 0, glowRadius);
      moonLight.addStop(0, [190, 200, 240, 70]);
      moonLight.addStop(1, [190, 200, 240, 0]);
      moonLight.build();
      moonGlow.reset();
      moonGlow.appendCircle(0, 0, glowRadius);
      moonGlow.fill(moonLight);
      moonGlow.translate(moonX + moonSize / 2, moonY + moonSize / 2);

      for (const picture of [gatehouse, ...flames]) {
        picture.size(MENU_ART_WIDTH * scale, MENU_ART_HEIGHT * scale);
        picture.translate(left, top);
      }
      TORCHES.forEach(({ x, y }, index) => {
        const radius = GLOW_RADIUS * scale;
        const light = new TVG.RadialGradient(0, 0, radius);
        light.addStop(0, [255, 150, 60, 255]);
        light.addStop(1, [255, 150, 60, 0]);
        light.build();
        const glow = glows[index] as Shape;
        glow.reset();
        glow.appendCircle(0, 0, radius);
        glow.fill(light);
        glow.translate(left + (x + 0.5) * scale, top + (y - 3) * scale);
      });

      if (ground) {
        scene.remove(ground);
      }
      const groundWidth = Math.ceil(width / scale);
      ground = loadPicture(TVG, drawGround(groundWidth));
      ground.size(groundWidth * scale, GROUND_ROWS * scale);
      ground.translate(0, groundTop);
      scene.add(ground);
    },
    showAt(time) {
      // The light wavers twice in each frame of the flames, so nothing changes in between.
      const step = Math.floor((time / 1000) * FLAMES_PER_SECOND * 2);
      if (step === shownStep) {
        return false;
      }
      shownStep = step;
      const next = Math.floor(step / 2) % FLAME_FRAMES;
      if (next !== shown) {
        flames[shown].visible(false);
        flames[next].visible(true);
        shown = next;
      }
      glows.forEach((glow, index) => {
        const flicker = noise(index, step);
        glow.opacity(Math.round(GLOW_DIM + (GLOW_BRIGHT - GLOW_DIM) * flicker));
      });
      return true;
    },
  };
}
