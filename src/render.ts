import type { Paint, Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import type { EnemyKind, UndeadKind } from './enemy';
import { isFixture, isWalkable, type Point, type Room } from './room';
import { STATUS_LABELS, type StatusName } from './status';

type Color = [r: number, g: number, b: number];

// What the cursor is pointing at, which decides the color of the tile outline.
export type CursorTarget = 'floor' | 'enemy' | 'item' | 'target';

// Who took the damage, which decides the color of the number.
export type DamageTarget = 'enemy' | 'hero' | 'heal';

// An effect that shows as a color over a character.
export type CharacterTint = 'frozen' | 'paralyzed' | 'burning' | 'shielded';

// Fire or gas lying on a tile.
export type GasKind = 'poison' | 'paralysis';
export type HazardKind = 'fire' | GasKind;

export interface Light {
  // The tile the light comes from.
  center: Point;
  // How far the light reaches, in tiles.
  radius: number;
  // The lit floor area, where a tile's center is at its (x, y).
  outline: Point[];
  // The tiles in view. Walls and doors among them are lit as a whole.
  tiles: Point[];
}

export interface RoomView {
  scene: Scene;
  // Draws the doors on these tiles as open, and all other doors as closed.
  setOpenDoors(tiles: Point[]): void;
  // Draws a door that burned down as a charred doorway. The room must already have floor there.
  burnDoor(tile: Point): void;
  // Draws a locked door that was unlocked as a closed door. The room must already have a door
  // there.
  unlockDoor(tile: Point): void;
  // Shows the column of light over the stairs, which stands out from anywhere, even in darkness.
  // Call it once the stairs were seen.
  revealStairs(): void;
  // Draws steps going up on a tile's floor, where the hero came down from the floor above. The
  // steps cannot be used.
  markEntrance(tile: Point): void;
  // Hides everything that was never lit, and darkens everything outside the light.
  setLight(light: Light): void;
  // Moves a paint onto a tile and into that tile's draw layer.
  place(paint: Paint, x: number, y: number): void;
  // Moves a paint onto a tile's floor, below everything else placed on the tile.
  placeOnFloor(paint: Paint, x: number, y: number): void;
  // Cuts a hole in the walls in front of a tile, but only when they cover that tile.
  cutAwayWalls(tile: Point): void;
  // Shows a walkable tile through the walls with an outline. Returns whether anything changed.
  setCursorTile(tile: Point | null, target: CursorTarget): boolean;
  // Moves a paint onto a tile, drawn above the whole room.
  placeOverlay(paint: Paint, x: number, y: number): void;
  // Draws a paint away from its tile by an offset, without changing its draw layer.
  nudge(paint: Paint, tile: Point, offset: Point): void;
  // Takes a placed paint out of the room.
  remove(paint: Paint): void;
  // Returns the tile whose floor contains a position in scene coordinates.
  tileAt(sceneX: number, sceneY: number): Point | null;
  // Returns the center of a tile's floor in scene coordinates.
  tileCenter(tile: Point): Point;
}

export interface HealthBar {
  scene: Scene;
  // Makes the bar visible, filled to a ratio from 0 to 1. Lost health trails behind,
  // unless the bar should jump straight to the ratio.
  show(ratio: number, options?: { jump: boolean }): void;
}

// 2:1 isometric tile from https://clintbellanger.net/articles/isometric_math/
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

// 0.6 times the height of a cube on this tile.
const WALL_HEIGHT = 0.6 * Math.sqrt((TILE_WIDTH ** 2 - TILE_HEIGHT ** 2) / 2);

const CHARACTER_SIZE = TILE_WIDTH * 0.75;
// Half of a character's height, above the floor.
export const CHARACTER_WAIST_HEIGHT = CHARACTER_SIZE / 2;
const ITEM_SIZE = TILE_WIDTH * 0.5;

// Placeholder values. A hole is fully open up to this fraction of its radius, then fades out.
const CUTAWAY_RADIUS = TILE_WIDTH * 1.75;
const CURSOR_CUTAWAY_RADIUS = TILE_WIDTH * 0.9;
const CUTAWAY_OPEN_FRACTION = 0.7;
// Placeholder value. A closed door inside a hole stays visible at this opacity, while walls are cut.
const DOOR_IN_HOLE_OPACITY = 110;

const CURSOR_OUTLINE_WIDTH = 2;

// Placeholder values. How opaque the darkness is over places that were lit before,
// and the fraction of the light's radius that stays fully lit before it fades out.
const REMEMBERED_DARKNESS_OPACITY = 170;
const LIGHT_FULL_FRACTION = 0.5;
// Placeholder value. How far the edges of the light are blurred.
const LIGHT_BLUR_SIGMA = 8;
// One tile on the floor is TILE_WIDTH / sqrt(2) long in the light map.
const LIGHT_MAP_TILE_LENGTH = TILE_WIDTH / Math.SQRT2;
// The lit top of a wall grows by one sigma on each side, so the blur fades it past its edges
// instead of inside them.
const LIT_WALL_TOP_SCALE = 1 + (2 * LIGHT_BLUR_SIGMA) / LIGHT_MAP_TILE_LENGTH;
// The floor light reaches this many tiles under the walls, so that the blur does not darken the
// floor beside them. Two sigmas hold nearly all of the blur, and stay within a wall's thickness.
const LIGHT_UNDER_WALLS = (2 * LIGHT_BLUR_SIGMA) / LIGHT_MAP_TILE_LENGTH;

const ENEMY_HEALTH_BAR_WIDTH = CHARACTER_SIZE * 0.8;
const ENEMY_HEALTH_BAR_HEIGHT = 5;
const ENEMY_HEALTH_BAR_GAP = 4;

// Placeholder values for the health bar at the top left of the screen. Its height is the line
// height of #hp in index.html, whose text sits on it.
const HERO_HEALTH_BAR_MARGIN = 12;
const HERO_HEALTH_BAR_WIDTH = 200;
const HERO_HEALTH_BAR_HEIGHT = 23;

// No standard exists for these. Lost health stays visible briefly, then catches up.
const HEALTH_TRAIL_HOLD_MS = 300;
const HEALTH_TRAIL_SHRINK_MS = 250;

// Placeholder values for the size of a damage number's digits.
const DIGIT_SCALE = 0.75;
const DIGIT_WIDTH = 10 * DIGIT_SCALE;
const DIGIT_HEIGHT = 16 * DIGIT_SCALE;
const DIGIT_GAP = 2;
const DIGIT_STROKE_WIDTH = 2.5;

// The height one number takes up, with a gap to the next number.
export const DAMAGE_NUMBER_HEIGHT = DIGIT_HEIGHT + DIGIT_STROKE_WIDTH + DIGIT_GAP;
// One character height, like the one tile that numbers rise in Shattered Pixel Dungeon.
export const DAMAGE_NUMBER_RISE = CHARACTER_SIZE;

// Same as the page background, so that places that were never lit look like empty space.
const DARKNESS: Color = [20, 21, 26];
const FLOOR_LIGHT: Color = [96, 100, 110];
const FLOOR_DARK: Color = [86, 90, 100];
const WATER_LIGHT: Color = [66, 112, 150];
const WATER_DARK: Color = [58, 100, 138];
const DOOR: Color = [150, 104, 60];
// Placeholder color of the floor left where a door burned down.
const BURNT_DOORWAY: Color = [62, 54, 50];
// Placeholder colors for a closed door, shaded like a wall.
const CLOSED_DOOR_TOP: Color = [168, 118, 70];
const CLOSED_DOOR_LEFT: Color = [120, 82, 46];
const CLOSED_DOOR_RIGHT: Color = [96, 64, 36];
// A locked door looks like a closed door with a padlock standing on top of it. Placeholder colors
// and sizes of the padlock, in screen pixels at zoom 1.
const LOCK_BODY: Color = [226, 184, 70];
const LOCK_SHACKLE: Color = [200, 206, 216];
const LOCK_KEYHOLE: Color = [70, 50, 20];
const LOCK_BODY_WIDTH = 14;
const LOCK_BODY_HEIGHT = 11;
const LOCK_SHACKLE_WIDTH = 2.5;
// Placeholder colors and sizes of the stairs: an opening in the floor with steps going down away
// from the front of the tile, nearest step first. Each step lies lower by the depth, in screen
// pixels at zoom 1, and its front edge is lit as a lighter strip, as a fraction of the tile.
const STAIRS_OPENING: Color = [14, 15, 19];
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
const STAIRS_STEP_DEPTH = 4;
const STAIRS_NOSING = 0.1;
// Placeholder colors and size of the steps going up where the hero came down, nearest step first.
// Each step stands higher than the one before it by the height, in screen pixels at zoom 1.
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
const ENTRANCE_STEP_HEIGHT = 4;
// Placeholder look of the column of light over the stairs, which rises from the whole tile and
// fades out toward its top, in screen pixels at zoom 1. It is lighter over the tile itself, so
// the steps still show, and strongest just above the floor.
const STAIRS_BEAM_COLOR: Color = [150, 205, 255];
const STAIRS_BEAM_FOOT_ALPHA = 110;
const STAIRS_BEAM_PEAK_ALPHA = 200;
// How far up the column it is strongest, as a fraction of its height.
const STAIRS_BEAM_PEAK = 0.25;
const STAIRS_BEAM_HEIGHT = 96;
const STAIRS_BEAM_BLUR = 3;
const WALL_TOP: Color = [130, 134, 144];
const WALL_LEFT: Color = [70, 74, 84];
const WALL_RIGHT: Color = [50, 54, 64];
const CURSOR_OUTLINES: Record<CursorTarget, Color> = {
  floor: [255, 255, 255],
  enemy: [235, 60, 50],
  item: [245, 205, 70],
  target: [90, 170, 255],
};
// Placeholder color for the word and mark shown about an attack, such as EVADE.
const ATTACK_TEXT_COLOR: Color = [245, 205, 70];
// Placeholder color for the mark of an enemy that noticed the hero. Same red as the cursor
// outline on an enemy, so it does not look like the yellow mark of a surprise attack.
const NOTICE_MARK_COLOR: Color = [235, 60, 50];
// Placeholder color for the mark of a sleeping enemy, calm against the red of the notice mark.
const SLEEP_MARK_COLOR: Color = [70, 100, 170];
// Placeholder values for the speech bubble behind that mark, so it stands out on a dark map.
const NOTICE_BUBBLE_COLOR: Color = [245, 245, 245];
const NOTICE_BUBBLE_PADDING = 3;
const NOTICE_BUBBLE_RADIUS = 3;
const NOTICE_BUBBLE_TAIL = 4;
const DAMAGE_NUMBER_COLORS: Record<DamageTarget, Color> = {
  enemy: [255, 255, 255],
  hero: [255, 80, 70],
  heal: [120, 230, 120],
};
// Placeholder looks of each kind of enemy: its color, and its size against the hero.
const ENEMY_LOOKS: Record<
  EnemyKind | UndeadKind | 'ghost' | 'skeleton' | 'necromancer',
  { color: Color; scale: number }
> = {
  weak: { color: [176, 112, 96], scale: 0.8 },
  medium: { color: [196, 64, 64], scale: 1 },
  strong: { color: [130, 50, 150], scale: 1.2 },
  ghoul: { color: [128, 150, 112], scale: 1 },
  ghost: { color: [176, 196, 220], scale: 1 },
  skeleton: { color: [226, 220, 200], scale: 1 },
  necromancer: { color: [112, 72, 150], scale: 1.2 },
};
// Placeholder colors of each effect, for its name over a character and its icon on the screen.
export const STATUS_COLORS: Record<StatusName, Color> = {
  haste: [120, 230, 120],
  invisible: [210, 215, 225],
  levitating: [200, 235, 255],
  telepathy: [200, 140, 255],
  paralyzed: [245, 220, 70],
  frozen: [150, 215, 255],
  burning: [255, 140, 40],
  poisoned: [140, 200, 70],
  stunned: [255, 190, 60],
  weakened: [170, 130, 220],
  shielded: [120, 190, 255],
};
// Placeholder colors, laid over a character with the alpha at the end.
const CHARACTER_TINTS: Record<CharacterTint, [...Color, number]> = {
  frozen: [130, 200, 255, 150],
  paralyzed: [240, 220, 90, 130],
  burning: [255, 120, 40, 130],
  shielded: [90, 160, 255, 140],
};
// Placeholder color of the frost that flashes over the floor where a frost potion breaks.
const FROST_COLOR: [...Color, number] = [190, 230, 255, 210];
// Placeholder colors of fire and gas on the floor, with the alpha at the end.
const HAZARD_COLORS: Record<HazardKind, [...Color, number]> = {
  fire: [255, 110, 30, 170],
  poison: [110, 200, 70, 120],
  paralysis: [235, 215, 80, 120],
};
const HEALTH_BAR_BACKGROUND: Color = [30, 30, 36];
const ENEMY_HEALTH_BAR_FILL: Color = [90, 200, 90];
const ENEMY_HEALTH_BAR_TRAIL: Color = [220, 80, 60];
const HERO_HEALTH_BAR_FILL: Color = [210, 60, 55];
const HERO_HEALTH_BAR_TRAIL: Color = [245, 200, 120];

function mapToScreen(x: number, y: number): Point {
  return {
    x: (x - y) * (TILE_WIDTH / 2),
    y: (x + y) * (TILE_HEIGHT / 2),
  };
}

// Returns the on-screen distance between two tiles, before any zoom.
export function tileDistance(from: Point, to: Point): Point {
  const start = mapToScreen(from.x, from.y);
  const end = mapToScreen(to.x, to.y);
  return { x: end.x - start.x, y: end.y - start.y };
}

interface Wall {
  tile: Point;
  center: Point;
  faces: Shape[];
}

const layerOf = ({ x, y }: Point) => x + y;

// Whether any part of a wall is within a distance of a point.
function wallReaches(wall: Wall, point: Point, distance: number): boolean {
  const dx = Math.max(Math.abs(wall.center.x - point.x) - TILE_WIDTH / 2, 0);
  const wallTop = wall.center.y - WALL_HEIGHT - TILE_HEIGHT / 2;
  const wallBottom = wall.center.y + TILE_HEIGHT / 2;
  const dy = Math.max(wallTop - point.y, point.y - wallBottom, 0);
  return dx * dx + dy * dy < distance * distance;
}

function appendTileDiamond(shape: Shape): Shape {
  return shape
    .moveTo(0, -TILE_HEIGHT / 2)
    .lineTo(TILE_WIDTH / 2, 0)
    .lineTo(0, TILE_HEIGHT / 2)
    .lineTo(-TILE_WIDTH / 2, 0)
    .close();
}

function lift(point: Point): Point {
  return { x: point.x, y: point.y - WALL_HEIGHT };
}

// A gradient is round, but a circle on the floor is a 2:1 ellipse on the screen.
// So the light map is drawn at twice the height, then squeezed back to the height of the map.
const LIGHT_MAP_SQUEEZE = { e11: 1, e12: 0, e13: 0, e21: 0, e22: 0.5, e23: 0, e31: 0, e32: 0, e33: 1 };

// Outlines keep one winding direction, so that overlapping ones in a shape do not cancel out.
function appendLightOutline(shape: Shape, points: Point[]) {
  const area = points.reduce((sum, { x, y }, index) => {
    const next = points[(index + 1) % points.length];
    return sum + x * next.y - next.x * y;
  }, 0);
  const ordered = area < 0 ? [...points].reverse() : points;

  shape.moveTo(ordered[0].x, ordered[0].y * 2);
  for (const { x, y } of ordered.slice(1)) {
    shape.lineTo(x, y * 2);
  }
  shape.close();
}

// Builds a view with the room centered on the scene's local origin.
export function createRoomView(TVG: ThorVGNamespace, room: Room): RoomView {
  const scene = new TVG.Scene();

  // One layer per x + y value, because tiles with a larger sum are in front.
  const layers = Array.from({ length: room.width + room.height - 1 }, () => {
    const layer = new TVG.Scene();
    scene.add(layer);
    return layer;
  });

  // Drawn after the whole map, so it darkens everything under it.
  const darkness = new TVG.Shape();
  scene.add(darkness);

  const overlay = new TVG.Scene();
  scene.add(overlay);
  // Above the darkness, so the stairs show from anywhere once they were seen. Each is masked by the
  // walls in front of its stairs after all walls are known.
  const stairsBeacons: { tile: Point; beacon: Scene }[] = [];

  const cursorOutline = appendTileDiamond(new TVG.Shape());
  cursorOutline.stroke({ width: CURSOR_OUTLINE_WIDTH, color: CURSOR_OUTLINES.floor });
  cursorOutline.opacity(0);
  overlay.add(cursorOutline);

  const walls: Wall[] = [];
  // Every wall's outline on the screen, whether it was seen or not.
  const wallArea = new TVG.Shape();
  // The padlock of a locked door is among its faces too, so it fades and hides with the door.
  const doors: (Wall & { area: Shape; floor: Shape; lock: Shape[] })[] = [];
  let openDoors = new Set<number>();
  const tileKey = ({ x, y }: Point) => y * room.width + x;
  const cutLayers = new Map<number, { scene: Scene; heroHole: Shape; cursorHole: Shape }>();
  let cutWalls = new Set<Wall>();
  let coveredHeroTile: Point | null = null;
  let cursorTile: Point | null = null;
  let cursorTarget: CursorTarget = 'floor';

  const roomCenter = mapToScreen((room.width - 1) / 2, (room.height - 1) / 2);
  const offsetX = -roomCenter.x;
  const offsetY = -roomCenter.y + WALL_HEIGHT / 2;

  const tileCenter = (x: number, y: number): Point => {
    const screen = mapToScreen(x, y);
    return { x: screen.x + offsetX, y: screen.y + offsetY };
  };

  // A padlock that faces the screen, its body centered on a point such as the top of a door.
  const addPadlock = (layer: Scene, at: Point): Shape[] => {
    const bodyTop = at.y - LOCK_BODY_HEIGHT / 2;
    const shackleHalf = LOCK_BODY_WIDTH / 4;
    const shackle = new TVG.Shape();
    shackle.moveTo(at.x - shackleHalf, bodyTop);
    shackle.lineTo(at.x - shackleHalf, bodyTop - 3);
    shackle.cubicTo(
      at.x - shackleHalf,
      bodyTop - 8,
      at.x + shackleHalf,
      bodyTop - 8,
      at.x + shackleHalf,
      bodyTop - 3,
    );
    shackle.lineTo(at.x + shackleHalf, bodyTop);
    shackle.stroke({ width: LOCK_SHACKLE_WIDTH, color: LOCK_SHACKLE });
    const body = new TVG.Shape();
    body.appendRect(at.x - LOCK_BODY_WIDTH / 2, bodyTop, LOCK_BODY_WIDTH, LOCK_BODY_HEIGHT, {
      rx: 2,
      ry: 2,
    });
    body.fill(...LOCK_BODY);
    const keyhole = new TVG.Shape();
    keyhole.appendCircle(at.x, bodyTop + LOCK_BODY_HEIGHT * 0.45, 1.6);
    keyhole.fill(...LOCK_KEYHOLE);
    const shapes = [shackle, body, keyhole];
    for (const shape of shapes) {
      layer.add(shape);
    }
    return shapes;
  };

  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const layer = layers[x + y];

      const addPolygon = (points: Point[], color: Color) => {
        const shape = new TVG.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) {
          shape.lineTo(point.x, point.y);
        }
        shape.close().fill(...color);
        layer.add(shape);
        return shape;
      };

      const center = tileCenter(x, y);
      const top = { x: center.x, y: center.y - TILE_HEIGHT / 2 };
      const right = { x: center.x + TILE_WIDTH / 2, y: center.y };
      const bottom = { x: center.x, y: center.y + TILE_HEIGHT / 2 };
      const left = { x: center.x - TILE_WIDTH / 2, y: center.y };

      switch (room.tiles[y][x]) {
        case 'void':
          break;
        case 'stairs': {
          // A point on the tile, from the top corner along x by u and along y by v, lowered by a
          // depth.
          const at = (u: number, v: number, depth: number) => ({
            x: top.x + (right.x - top.x) * u + (left.x - top.x) * v,
            y: top.y + (right.y - top.y) * u + (left.y - top.y) * v + depth,
          });
          const opening = new TVG.Scene();
          const addToOpening = (points: Point[], color: Color) => {
            const shape = new TVG.Shape();
            shape.moveTo(points[0].x, points[0].y);
            for (const point of points.slice(1)) {
              shape.lineTo(point.x, point.y);
            }
            shape.close().fill(...color);
            opening.add(shape);
          };
          addToOpening([top, right, bottom, left], STAIRS_OPENING);
          // The far steps first, so the nearer ones are drawn over them.
          for (let step = STAIRS_TREADS.length - 1; step >= 0; step--) {
            const near = 1 - step / STAIRS_TREADS.length;
            const far = 1 - (step + 1) / STAIRS_TREADS.length;
            const depth = (step + 1) * STAIRS_STEP_DEPTH;
            const tread = [at(0, far, depth), at(1, far, depth), at(1, near, depth)];
            addToOpening([...tread, at(0, near, depth)], STAIRS_TREADS[step]);
            const edge = near - STAIRS_NOSING;
            addToOpening(
              [at(0, edge, depth), at(1, edge, depth), at(1, near, depth), at(0, near, depth)],
              STAIRS_NOSINGS[step],
            );
          }
          const outline = new TVG.Shape();
          outline.moveTo(top.x, top.y).lineTo(right.x, right.y).lineTo(bottom.x, bottom.y);
          outline.lineTo(left.x, left.y).close().fill(255, 255, 255);
          opening.mask(outline, TVG.MaskMethod.Alpha);
          layer.add(opening);

          // The column stands on the tile's diamond, so its foot is the near half of the diamond
          // and its sides go straight up from the left and right corners.
          const beamGradient = new TVG.LinearGradient(
            center.x,
            bottom.y,
            center.x,
            bottom.y - STAIRS_BEAM_HEIGHT,
          );
          beamGradient.addStop(0, [...STAIRS_BEAM_COLOR, STAIRS_BEAM_FOOT_ALPHA]);
          beamGradient.addStop(STAIRS_BEAM_PEAK, [...STAIRS_BEAM_COLOR, STAIRS_BEAM_PEAK_ALPHA]);
          beamGradient.addStop(1, [...STAIRS_BEAM_COLOR, 0]);
          beamGradient.build();
          const beam = new TVG.Shape();
          beam.moveTo(left.x, left.y).lineTo(bottom.x, bottom.y).lineTo(right.x, right.y);
          beam.lineTo(right.x, bottom.y - STAIRS_BEAM_HEIGHT);
          beam.lineTo(left.x, bottom.y - STAIRS_BEAM_HEIGHT);
          beam.close().fill(beamGradient);
          const beacon = new TVG.Scene();
          beacon.add(beam);
          beacon.gaussianBlur(STAIRS_BEAM_BLUR);
          beacon.visible(false);
          stairsBeacons.push({ tile: { x, y }, beacon });
          break;
        }
        // A fixture itself is placed on its floor like an item.
        case 'floor':
        case 'campfire':
        case 'sign':
          addPolygon([top, right, bottom, left], (x + y) % 2 === 0 ? FLOOR_LIGHT : FLOOR_DARK);
          break;
        case 'water':
          addPolygon([top, right, bottom, left], (x + y) % 2 === 0 ? WATER_LIGHT : WATER_DARK);
          break;
        // The coffin itself is placed on its floor like an item.
        case 'coffin':
          addPolygon([top, right, bottom, left], (x + y) % 2 === 0 ? FLOOR_LIGHT : FLOOR_DARK);
          break;
        case 'door':
        case 'locked-door': {
          const floor = addPolygon([top, right, bottom, left], DOOR);
          const faces = [
            addPolygon([left, bottom, lift(bottom), lift(left)], CLOSED_DOOR_LEFT),
            addPolygon([right, bottom, lift(bottom), lift(right)], CLOSED_DOOR_RIGHT),
            addPolygon([lift(top), lift(right), lift(bottom), lift(left)], CLOSED_DOOR_TOP),
          ];
          const lock = room.tiles[y][x] === 'locked-door' ? addPadlock(layer, lift(center)) : [];
          const area = new TVG.Shape();
          appendLightOutline(area, [lift(top), lift(right), right, bottom, left, lift(left)]);
          area.fill(255, 255, 255);
          doors.push({ tile: { x, y }, center, faces: [...faces, ...lock], area, floor, lock });
          break;
        }
        case 'wall':
          appendLightOutline(wallArea, [lift(top), lift(right), right, bottom, left, lift(left)]);
          walls.push({
            tile: { x, y },
            center,
            faces: [
              addPolygon([left, bottom, lift(bottom), lift(left)], WALL_LEFT),
              addPolygon([right, bottom, lift(bottom), lift(right)], WALL_RIGHT),
              addPolygon([lift(top), lift(right), lift(bottom), lift(left)], WALL_TOP),
            ],
          });
          break;
      }
    }
  }

  // The walls drawn after the stairs stand in front of them, so they hide the light over the stairs
  // where they overlap it.
  for (const { tile, beacon } of stairsBeacons) {
    // Not appendLightOutline, which doubles the height for the light map.
    const frontWalls = new TVG.Shape();
    for (const wall of walls.filter((wall) => layerOf(wall.tile) > layerOf(tile))) {
      const { x, y } = wall.center;
      const top = { x, y: y - TILE_HEIGHT / 2 };
      const right = { x: x + TILE_WIDTH / 2, y };
      const bottom = { x, y: y + TILE_HEIGHT / 2 };
      const left = { x: x - TILE_WIDTH / 2, y };
      const outline = [lift(top), lift(right), right, bottom, left, lift(left)];
      frontWalls.moveTo(outline[0].x, outline[0].y);
      for (const point of outline.slice(1)) {
        frontWalls.lineTo(point.x, point.y);
      }
      frontWalls.close();
    }
    frontWalls.fill(255, 255, 255);
    const masked = new TVG.Scene();
    masked.add(beacon);
    masked.mask(frontWalls, TVG.MaskMethod.InvAlpha);
    overlay.add(masked);
  }

  // Added after the tiles of each layer, so what lies on the floor is drawn under the characters.
  const floorLayers = layers.map((layer) => {
    const floorLayer = new TVG.Scene();
    layer.add(floorLayer);
    return floorLayer;
  });

  // The light map is a grayscale image, where brighter means less darkness. Black is what was never
  // lit, gray is what was lit before, and the light itself is drawn over those.
  const rememberedLevel = 255 - REMEMBERED_DARKNESS_OPACITY;
  const createBlurredLight = () => {
    const remembered = new TVG.Shape();
    remembered.fill(rememberedLevel, rememberedLevel, rememberedLevel);
    const lit = new TVG.Shape();
    const blurred = new TVG.Scene();
    blurred.add(remembered);
    blurred.add(lit);
    blurred.gaussianBlur(LIGHT_BLUR_SIGMA);
    return { remembered, lit, blurred };
  };
  const floorLight = createBlurredLight();
  const wallLight = createBlurredLight();

  // Light on a wall stays on the walls, so that it does not spill onto the floor behind them.
  wallArea.fill(255, 255, 255);
  const wallLightOnWalls = new TVG.Scene();
  wallLightOnWalls.add(wallLight.blurred);
  const solidArea = new TVG.Scene();
  solidArea.add(wallArea);
  for (const { area } of doors) {
    solidArea.add(area);
  }
  wallLightOnWalls.mask(solidArea, TVG.MaskMethod.Alpha);

  const lightMap = new TVG.Scene();
  lightMap.add(floorLight.blurred);
  lightMap.add(wallLightOnWalls);
  lightMap.transform(LIGHT_MAP_SQUEEZE);

  const rememberedOutlines = new Set<string>();

  const createLightGradient = (light: Light) => {
    const center = tileCenter(light.center.x, light.center.y);
    const gradient = new TVG.RadialGradient(
      center.x,
      center.y * 2,
      light.radius * LIGHT_MAP_TILE_LENGTH,
    );
    gradient.addStop(0, [255, 255, 255, 255]);
    gradient.addStop(LIGHT_FULL_FRACTION, [255, 255, 255, 255]);
    gradient.addStop(1, [rememberedLevel, rememberedLevel, rememberedLevel, 255]);
    gradient.build();
    return gradient;
  };

  const mapLeft = tileCenter(0, room.height - 1).x - TILE_WIDTH;
  const mapRight = tileCenter(room.width - 1, 0).x + TILE_WIDTH;
  const mapTop = tileCenter(0, 0).y - TILE_HEIGHT - WALL_HEIGHT;
  const mapBottom = tileCenter(room.width - 1, room.height - 1).y + TILE_HEIGHT;
  darkness.appendRect(mapLeft, mapTop, mapRight - mapLeft, mapBottom - mapTop);
  darkness.fill(...DARKNESS);
  darkness.mask(lightMap, TVG.MaskMethod.InvLuma);

  const paintLayers = new Map<Paint, Scene>();

  const placeInLayer = (paint: Paint, layer: Scene, x: number, y: number) => {
    paintLayers.get(paint)?.remove(paint);
    layer.add(paint);
    paintLayers.set(paint, layer);

    const center = tileCenter(x, y);
    paint.translate(center.x, center.y);
  };

  const createHole = (radius: number) => {
    const gradient = new TVG.RadialGradient(0, 0, radius);
    gradient.addStop(0, [0, 0, 0, 255]);
    gradient.addStop(CUTAWAY_OPEN_FRACTION, [0, 0, 0, 255]);
    gradient.addStop(1, [0, 0, 0, 0]);
    gradient.build();

    const hole = new TVG.Shape();
    hole.appendCircle(0, 0, radius);
    hole.fill(gradient);
    return hole;
  };

  // A paint keeps its mask once set, so each layer gets one scene that always has the holes.
  const cutLayer = (index: number) => {
    let cut = cutLayers.get(index);
    if (!cut) {
      const heroHole = createHole(CUTAWAY_RADIUS);
      const cursorHole = createHole(CURSOR_CUTAWAY_RADIUS);

      const holes = new TVG.Scene();
      holes.add(heroHole);
      holes.add(cursorHole);

      const cutScene = new TVG.Scene();
      cutScene.mask(holes, TVG.MaskMethod.InvAlpha);
      layers[index].add(cutScene);

      cut = { scene: cutScene, heroHole, cursorHole };
      cutLayers.set(index, cut);
    }
    return cut;
  };

  const isSolid = (x: number, y: number) => {
    const tile = room.tiles[y]?.[x];
    return (
      tile === 'wall' ||
      tile === 'locked-door' ||
      (tile === 'door' && !openDoors.has(tileKey({ x, y })))
    );
  };
  const isCovered = ({ x, y }: Point) =>
    isSolid(x + 1, y) || isSolid(x, y + 1) || isSolid(x + 1, y + 1);

  // Moves walls in and out of the masked scenes, then places the holes.
  const updateCuts = () => {
    const heroCenter = coveredHeroTile && tileCenter(coveredHeroTile.x, coveredHeroTile.y);
    const heroHolePoint = heroCenter && {
      x: heroCenter.x,
      y: heroCenter.y - CHARACTER_SIZE / 2,
    };
    const coveredCursorTile = cursorTile && isCovered(cursorTile) ? cursorTile : null;
    const cursorPoint =
      coveredCursorTile && tileCenter(coveredCursorTile.x, coveredCursorTile.y);

    const isInHole = (wall: Wall) =>
      (coveredHeroTile &&
        heroHolePoint &&
        layerOf(wall.tile) > layerOf(coveredHeroTile) &&
        wallReaches(wall, heroHolePoint, CUTAWAY_RADIUS)) ||
      (coveredCursorTile &&
        cursorPoint &&
        layerOf(wall.tile) > layerOf(coveredCursorTile) &&
        wallReaches(wall, cursorPoint, CURSOR_CUTAWAY_RADIUS));

    for (const door of doors) {
      const opacity = isInHole(door) ? DOOR_IN_HOLE_OPACITY : 255;
      for (const face of door.faces) {
        face.opacity(opacity);
      }
    }

    const wanted = new Set(walls.filter(isInHole));

    for (const wall of cutWalls) {
      if (!wanted.has(wall)) {
        const index = layerOf(wall.tile);
        for (const face of wall.faces) {
          cutLayer(index).scene.remove(face);
          layers[index].add(face);
        }
      }
    }
    for (const wall of wanted) {
      if (!cutWalls.has(wall)) {
        const index = layerOf(wall.tile);
        for (const face of wall.faces) {
          layers[index].remove(face);
          cutLayer(index).scene.add(face);
        }
      }
    }
    cutWalls = wanted;

    // A hole only applies to the layers in front of its tile.
    for (const [index, cut] of cutLayers) {
      const showHeroHole = coveredHeroTile && index > layerOf(coveredHeroTile);
      cut.heroHole.opacity(showHeroHole ? 255 : 0);
      if (heroHolePoint) {
        cut.heroHole.translate(heroHolePoint.x, heroHolePoint.y);
      }
      const showCursorHole = coveredCursorTile && index > layerOf(coveredCursorTile);
      cut.cursorHole.opacity(showCursorHole ? 255 : 0);
      if (cursorPoint) {
        cut.cursorHole.translate(cursorPoint.x, cursorPoint.y);
      }
    }
  };

  return {
    scene,
    setOpenDoors(tiles) {
      openDoors = new Set(tiles.map(tileKey));
      for (const { tile, faces, area } of doors) {
        const isClosed = !openDoors.has(tileKey(tile));
        area.visible(isClosed);
        for (const face of faces) {
          face.visible(isClosed);
        }
      }
      updateCuts();
    },
    burnDoor(tile) {
      const index = doors.findIndex((door) => door.tile.x === tile.x && door.tile.y === tile.y);
      if (index === -1) {
        return;
      }
      const [door] = doors.splice(index, 1);
      for (const face of door.faces) {
        layers[layerOf(tile)].remove(face);
      }
      solidArea.remove(door.area);
      door.floor.fill(...BURNT_DOORWAY);
      updateCuts();
    },
    unlockDoor(tile) {
      const door = doors.find((door) => door.tile.x === tile.x && door.tile.y === tile.y);
      if (!door) {
        return;
      }
      for (const shape of door.lock) {
        layers[layerOf(tile)].remove(shape);
      }
      door.faces = door.faces.filter((face) => !door.lock.includes(face));
      door.lock = [];
      updateCuts();
    },
    markEntrance({ x, y }) {
      const center = tileCenter(x, y);
      const top = { x: center.x, y: center.y - TILE_HEIGHT / 2 };
      const right = { x: center.x + TILE_WIDTH / 2, y: center.y };
      const left = { x: center.x - TILE_WIDTH / 2, y: center.y };
      // The same tile coordinates as the steps going down, raised by a height.
      const at = (u: number, v: number, height: number) => ({
        x: top.x + (right.x - top.x) * u + (left.x - top.x) * v,
        y: top.y + (right.y - top.y) * u + (left.y - top.y) * v - height,
      });
      const add = (points: Point[], color: Color) => {
        const shape = new TVG.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) {
          shape.lineTo(point.x, point.y);
        }
        shape.close().fill(...color);
        floorLayers[x + y].add(shape);
      };
      const count = ENTRANCE_TREADS.length;
      // The nearest step first, so that each higher step is drawn over the ones before it.
      for (let step = 0; step < count; step++) {
        const near = 1 - step / count;
        const far = 1 - (step + 1) / count;
        const low = step * ENTRANCE_STEP_HEIGHT;
        const high = (step + 1) * ENTRANCE_STEP_HEIGHT;
        // The side facing right goes down to the floor, so the step does not seem to float.
        add(
          [at(1, far, 0), at(1, near, 0), at(1, near, high), at(1, far, high)],
          ENTRANCE_SIDE,
        );
        add(
          [at(0, near, low), at(1, near, low), at(1, near, high), at(0, near, high)],
          ENTRANCE_RISERS[step],
        );
        add(
          [at(0, far, high), at(1, far, high), at(1, near, high), at(0, near, high)],
          ENTRANCE_TREADS[step],
        );
      }
    },
    revealStairs() {
      for (const { beacon } of stairsBeacons) {
        beacon.visible(true);
      }
    },
    setLight(light) {
      const remember = (key: string, shape: Shape, outline: Point[]) => {
        if (!rememberedOutlines.has(key)) {
          rememberedOutlines.add(key);
          appendLightOutline(shape, outline);
        }
      };

      // Moving a point along its own ray keeps the edges of the shadows where they are.
      const floorOutline = light.outline.map(({ x, y }) => {
        const rayX = x - light.center.x;
        const rayY = y - light.center.y;
        const scale = 1 + LIGHT_UNDER_WALLS / Math.hypot(rayX, rayY);
        return tileCenter(light.center.x + rayX * scale, light.center.y + rayY * scale);
      });
      floorLight.lit.reset();
      wallLight.lit.reset();
      appendLightOutline(floorLight.lit, floorOutline);
      remember(JSON.stringify(light.outline), floorLight.remembered, floorOutline);

      // The outline stops at walls and doors, so the ones in view are added whole.
      for (const { x, y } of light.tiles) {
        const tile = room.tiles[y][x];
        if (tile === 'wall' || tile === 'door' || tile === 'locked-door') {
          const center = tileCenter(x, y);
          const top = { x: center.x, y: center.y - TILE_HEIGHT / 2 };
          const right = { x: center.x + TILE_WIDTH / 2, y: center.y };
          const bottom = { x: center.x, y: center.y + TILE_HEIGHT / 2 };
          const left = { x: center.x - TILE_WIDTH / 2, y: center.y };
          if (tile === 'door' || tile === 'locked-door') {
            remember(`floor ${x},${y}`, floorLight.remembered, [top, right, bottom, left]);
          }
          if (tile === 'door' && openDoors.has(tileKey({ x, y }))) {
            appendLightOutline(floorLight.lit, [top, right, bottom, left]);
          } else {
            const litTop = [top, right, bottom, left].map((point) =>
              lift({
                x: center.x + (point.x - center.x) * LIT_WALL_TOP_SCALE,
                y: center.y + (point.y - center.y) * LIT_WALL_TOP_SCALE,
              }),
            );
            appendLightOutline(wallLight.lit, litTop);
            // A side of a wall is only lit when it faces the light, so a shadow starts at the wall.
            if (light.center.y > y + 0.5) {
              appendLightOutline(wallLight.lit, [left, bottom, lift(bottom), lift(left)]);
            }
            if (light.center.x > x + 0.5) {
              appendLightOutline(wallLight.lit, [right, bottom, lift(bottom), lift(right)]);
            }
            remember(`${x},${y}`, wallLight.remembered, [
              lift(top),
              lift(right),
              right,
              bottom,
              left,
              lift(left),
            ]);
          }
        }
      }
      floorLight.lit.fill(createLightGradient(light));
      wallLight.lit.fill(createLightGradient(light));
    },
    place(paint, x, y) {
      placeInLayer(paint, layers[x + y], x, y);
    },
    placeOnFloor(paint, x, y) {
      placeInLayer(paint, floorLayers[x + y], x, y);
    },
    cutAwayWalls(tile) {
      coveredHeroTile = isCovered(tile) ? tile : null;
      updateCuts();
    },
    // The outline shows on the tiles the hero can walk on, and on fixtures and locked doors, which
    // the hero uses.
    setCursorTile(tile, target) {
      const isPointable =
        tile &&
        (isWalkable(room, tile.x, tile.y) ||
          isFixture(room, tile.x, tile.y) ||
          room.tiles[tile.y][tile.x] === 'locked-door');
      const next = isPointable ? tile : null;
      if (next?.x === cursorTile?.x && next?.y === cursorTile?.y && target === cursorTarget) {
        return false;
      }

      cursorTile = next;
      cursorTarget = target;
      cursorOutline.stroke({ width: CURSOR_OUTLINE_WIDTH, color: CURSOR_OUTLINES[target] });
      cursorOutline.opacity(next ? 255 : 0);
      if (next) {
        const center = tileCenter(next.x, next.y);
        cursorOutline.translate(center.x, center.y);
      }
      updateCuts();
      return true;
    },
    placeOverlay(paint, x, y) {
      placeInLayer(paint, overlay, x, y);
    },
    nudge(paint, tile, offset) {
      const center = tileCenter(tile.x, tile.y);
      paint.translate(center.x + offset.x, center.y + offset.y);
    },
    remove(paint) {
      paintLayers.get(paint)?.remove(paint);
      paintLayers.delete(paint);
    },
    tileAt(sceneX, sceneY) {
      const screenX = (sceneX - offsetX) / (TILE_WIDTH / 2);
      const screenY = (sceneY - offsetY) / (TILE_HEIGHT / 2);
      const x = Math.round((screenX + screenY) / 2);
      const y = Math.round((screenY - screenX) / 2);
      return room.tiles[y]?.[x] ? { x, y } : null;
    },
    tileCenter(tile) {
      return tileCenter(tile.x, tile.y);
    },
  };
}

// The picture's bottom center stands on the scene's local origin.
// It is a Scene because scene effects, such as the hit flash, only apply to scenes.
export function createCharacter(TVG: ThorVGNamespace, svg: string): Scene {
  const picture = new TVG.Picture();
  picture.load(svg, { type: 'svg' });
  picture.size(CHARACTER_SIZE, CHARACTER_SIZE);
  picture.origin(0.5, 1);

  const scene = new TVG.Scene();
  scene.add(picture);
  return scene;
}

// An item lying on the tile, with its lower part on the paint's local origin.
export function createItemPaint(TVG: ThorVGNamespace, svg: string): Paint {
  const picture = new TVG.Picture();
  picture.load(svg, { type: 'svg' });
  picture.size(ITEM_SIZE, ITEM_SIZE);
  picture.origin(0.5, 0.7);
  return picture;
}

// A placeholder enemy with its feet on the scene's local origin.
// It is a Scene because scene effects, such as the hit flash, only apply to scenes.
// Placeholder look of the giant centipede: a low, round body segment, and a head with eyes that is
// a little bigger.
const CENTIPEDE_BODY: Color = [150, 70, 40];
const CENTIPEDE_HEAD: Color = [185, 60, 40];
const CENTIPEDE_EYE: Color = [250, 230, 90];

export function createCentipedePart(TVG: ThorVGNamespace, isHead: boolean): Scene {
  const size = CHARACTER_SIZE * (isHead ? 1.15 : 1);
  const scene = new TVG.Scene();
  const body = new TVG.Shape();
  body.appendCircle(0, -size * 0.3, size * 0.38, size * 0.3);
  body.fill(...(isHead ? CENTIPEDE_HEAD : CENTIPEDE_BODY));
  scene.add(body);
  if (isHead) {
    for (const side of [-1, 1]) {
      const eye = new TVG.Shape();
      eye.appendCircle(side * size * 0.17, -size * 0.38, size * 0.07);
      eye.fill(...CENTIPEDE_EYE);
      scene.add(eye);
    }
  }
  return scene;
}

export function createDummyEnemy(
  TVG: ThorVGNamespace,
  kind: EnemyKind | UndeadKind | 'ghost' | 'skeleton' | 'necromancer',
): Scene {
  const { color, scale } = ENEMY_LOOKS[kind];
  const size = CHARACTER_SIZE * scale;
  const shape = new TVG.Shape();
  shape.appendRect(-size / 4, -size * 0.6, size / 2, size * 0.6);
  shape.appendCircle(0, -size * 0.8, size / 5);
  shape.fill(...color);

  const scene = new TVG.Scene();
  scene.add(shape);
  return scene;
}

// Lays a color over a character, or takes it away.
export function tintCharacter(scene: Scene, tint: CharacterTint | null): void {
  scene.resetEffects();
  if (tint) {
    scene.fillEffect(...CHARACTER_TINTS[tint]);
  }
}

// Fire or gas covering a tile's floor, centered on the paint's local origin.
export function createHazardPaint(TVG: ThorVGNamespace, kind: HazardKind): Shape {
  const shape = appendTileDiamond(new TVG.Shape());
  shape.fill(...HAZARD_COLORS[kind]);
  return shape;
}

const SEARCH_COLOR: Color = [190, 225, 255];

// The light of a search over a tile's floor, centered on the paint's local origin.
export function createSearchPaint(TVG: ThorVGNamespace): Shape {
  const shape = appendTileDiamond(new TVG.Shape());
  shape.fill(...SEARCH_COLOR, 255);
  return shape;
}

const TRAP_PLATE_SCALE = 0.6;
const TRAP_COLORS = {
  known: { fill: [86, 48, 48, 255], edge: [210, 90, 70, 255] },
  spent: { fill: [70, 72, 80, 255], edge: [110, 112, 120, 255] },
} as const;

// The pressure plate of a trap on a tile's floor, centered on the paint's local origin, with spikes
// or an arrow on it by the kind. A spent plate is gray.
export function createTrapPaint(
  TVG: ThorVGNamespace,
  kind: 'spike' | 'arrow',
  state: 'known' | 'spent',
): Scene {
  const halfWidth = (TILE_WIDTH / 2) * TRAP_PLATE_SCALE;
  const halfHeight = (TILE_HEIGHT / 2) * TRAP_PLATE_SCALE;
  const { fill, edge } = TRAP_COLORS[state];
  const edgeColor: Color = [edge[0], edge[1], edge[2]];

  const plate = new TVG.Shape()
    .moveTo(0, -halfHeight)
    .lineTo(halfWidth, 0)
    .lineTo(0, halfHeight)
    .lineTo(-halfWidth, 0)
    .close();
  plate.fill(fill[0], fill[1], fill[2], fill[3]);
  plate.stroke({ width: 1.5, color: [...edgeColor, 255], join: TVG.StrokeJoin.Round });

  const mark = new TVG.Shape();
  if (kind === 'spike') {
    for (const x of [-7, 0, 7]) {
      mark.moveTo(x - 3.5, 3).lineTo(x, -4).lineTo(x + 3.5, 3).close();
    }
    mark.fill(...edgeColor, 255);
  } else {
    mark.moveTo(-9, 0).lineTo(5, 0);
    mark.moveTo(10, 0).lineTo(4, -4).lineTo(4, 4).close();
    mark.fill(...edgeColor, 255);
    mark.stroke({ width: 1.5, color: [...edgeColor, 255], join: TVG.StrokeJoin.Round });
  }

  const scene = new TVG.Scene();
  scene.add(plate);
  scene.add(mark);
  return scene;
}

const ARROW_COLOR: Color = [214, 184, 132];

// Placeholder colors of a wooden coffin: its lid, and its two sides.
const COFFIN_TOP: Color = [118, 82, 52];
const COFFIN_TOP_AWAKE: Color = [170, 64, 56];
const COFFIN_LEFT: Color = [84, 58, 38];
const COFFIN_RIGHT: Color = [62, 43, 29];
// A coffin's half length along the map's x axis and half width along its y axis, in tiles, and its
// height in pixels.
const COFFIN_HALF_LENGTH = 0.44;
const COFFIN_HALF_WIDTH = 0.26;
const COFFIN_HEIGHT = 12;

// A wooden coffin standing on a tile's floor, centered on the paint's local origin. A coffin that
// is being chanted over has a red lid.
export function createCoffinPaint(TVG: ThorVGNamespace, isAwake = false): Scene {
  const corner = (x: number, y: number, lift = 0): Point => ({
    x: ((x - y) * TILE_WIDTH) / 2,
    y: ((x + y) * TILE_HEIGHT) / 2 - lift,
  });
  const a = COFFIN_HALF_LENGTH;
  const b = COFFIN_HALF_WIDTH;
  const h = COFFIN_HEIGHT;
  const scene = new TVG.Scene();
  const face = (points: Point[], color: Color) => {
    const shape = new TVG.Shape().moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) {
      shape.lineTo(point.x, point.y);
    }
    shape.close().fill(...color, 255);
    scene.add(shape);
  };

  // The side facing the viewer on the left runs along the edge y = +b, and the right one along
  // x = +a.
  face([corner(-a, b), corner(a, b), corner(a, b, h), corner(-a, b, h)], COFFIN_LEFT);
  face([corner(a, b), corner(a, -b), corner(a, -b, h), corner(a, b, h)], COFFIN_RIGHT);
  face(
    [corner(-a, -b, h), corner(a, -b, h), corner(a, b, h), corner(-a, b, h)],
    isAwake ? COFFIN_TOP_AWAKE : COFFIN_TOP,
  );
  return scene;
}

// An arrow in flight, pointing right and centered on the paint's local origin.
export function createArrowPaint(TVG: ThorVGNamespace): Shape {
  const shape = new TVG.Shape();
  shape.moveTo(-9, 0).lineTo(5, 0);
  shape.moveTo(10, 0).lineTo(4, -3.5).lineTo(4, 3.5).close();
  shape.fill(...ARROW_COLOR, 255);
  shape.stroke({ width: 2, color: [...ARROW_COLOR, 255], join: TVG.StrokeJoin.Round });
  return shape;
}

// Placeholder color of the dark magic that strikes a tile.
const DARK_COLOR: [...Color, number] = [120, 40, 170, 230];

// Dark magic covering a tile's floor, centered on the paint's local origin.
export function createDarkPaint(TVG: ThorVGNamespace): Shape {
  const shape = appendTileDiamond(new TVG.Shape());
  shape.fill(...DARK_COLOR);
  return shape;
}

// Frost covering a tile's floor, centered on the paint's local origin.
export function createFrostPaint(TVG: ThorVGNamespace): Shape {
  const shape = appendTileDiamond(new TVG.Shape());
  shape.fill(...FROST_COLOR);
  return shape;
}

// Each digit is one path in a 10 by 16 box, before DIGIT_SCALE. The first point of a path is a
// move, a point with 2 values is a line, and a point with 6 values is a cubic curve.
const DIGIT_PATHS: number[][][] = [
  [[5, 0], [8, 0, 10, 3, 10, 8], [10, 13, 8, 16, 5, 16], [2, 16, 0, 13, 0, 8], [0, 3, 2, 0, 5, 0]],
  [[2, 3], [5.5, 0], [5.5, 16]],
  [[0.5, 4], [0.5, 1.5, 2.5, 0, 5, 0], [7.5, 0, 9.5, 1.5, 9.5, 4], [9.5, 7, 6, 9, 0, 16], [10, 16]],
  [
    [0.5, 2.5],
    [1.5, 0.8, 3, 0, 5, 0],
    [7.5, 0, 9.5, 1.5, 9.5, 4],
    [9.5, 6.2, 7.5, 7.5, 4.5, 7.5],
    [7.5, 7.5, 10, 9, 10, 11.8],
    [10, 14.5, 7.5, 16, 5, 16],
    [3, 16, 1, 15.2, 0, 13.2],
  ],
  [[7.5, 16], [7.5, 0], [0, 10.5], [10, 10.5]],
  [
    [9, 0],
    [1.5, 0],
    [0.8, 7],
    [2, 6, 3.5, 5.5, 5, 5.5],
    [8, 5.5, 10, 7.5, 10, 10.7],
    [10, 14, 7.8, 16, 5, 16],
    [3, 16, 1.2, 15, 0, 13],
  ],
  [
    [8.5, 0.5],
    [4, 1.5, 0, 5, 0, 10.5],
    [0, 14, 2, 16, 5, 16],
    [8, 16, 10, 14, 10, 11],
    [10, 8, 8, 6, 5, 6],
    [2.5, 6, 0.5, 7.8, 0, 10.5],
  ],
  [[0, 0], [10, 0], [3.5, 16]],
  [
    [5, 7.5],
    [2.5, 7.5, 0.8, 6, 0.8, 3.8],
    [0.8, 1.5, 2.7, 0, 5, 0],
    [7.3, 0, 9.2, 1.5, 9.2, 3.8],
    [9.2, 6, 7.5, 7.5, 5, 7.5],
    [2.2, 7.5, 0, 9.2, 0, 11.7],
    [0, 14.3, 2.2, 16, 5, 16],
    [7.8, 16, 10, 14.3, 10, 11.7],
    [10, 9.2, 7.8, 7.5, 5, 7.5],
  ],
  [
    [1.5, 15.5],
    [6, 14.5, 10, 11, 10, 5.5],
    [10, 2, 8, 0, 5, 0],
    [2, 0, 0, 2, 0, 5],
    [0, 8, 2, 10, 5, 10],
    [7.5, 10, 9.5, 8.2, 10, 5.5],
  ],
];

// Letters drawn in the same box and style as the digits, each made of one or more paths.
const LETTER_PATHS: Record<string, number[][][]> = {
  A: [
    [[0, 16], [5, 0], [10, 16]],
    [[1.7, 10.5], [8.3, 10.5]],
  ],
  B: [
    [
      [0, 8],
      [6, 8],
      [8.5, 8, 10, 9.5, 10, 12],
      [10, 14.5, 8.5, 16, 6, 16],
      [0, 16],
      [0, 0],
      [5.5, 0],
      [7.8, 0, 9.2, 1.4, 9.2, 4],
      [9.2, 6.6, 7.8, 8, 5.5, 8],
    ],
  ],
  C: [
    [
      [10, 3],
      [8.8, 1, 7, 0, 5, 0],
      [2, 0, 0, 3, 0, 8],
      [0, 13, 2, 16, 5, 16],
      [7, 16, 8.8, 15, 10, 13],
    ],
  ],
  D: [[[0, 0], [4, 0], [8, 0, 10, 3.5, 10, 8], [10, 12.5, 8, 16, 4, 16], [0, 16], [0, 0]]],
  E: [
    [[10, 0], [0, 0], [0, 16], [10, 16]],
    [[0, 8], [8, 8]],
  ],
  F: [
    [[10, 0], [0, 0], [0, 16]],
    [[0, 8], [8, 8]],
  ],
  G: [
    [
      [10, 3],
      [8.8, 1, 7, 0, 5, 0],
      [2, 0, 0, 3, 0, 8],
      [0, 13, 2, 16, 5, 16],
      [8, 16, 10, 14, 10, 10],
      [10, 9],
      [5.5, 9],
    ],
  ],
  H: [
    [[0, 0], [0, 16]],
    [[10, 0], [10, 16]],
    [[0, 8], [10, 8]],
  ],
  I: [
    [[2, 0], [8, 0]],
    [[5, 0], [5, 16]],
    [[2, 16], [8, 16]],
  ],
  J: [
    [[2, 0], [10, 0]],
    [[8, 0], [8, 12], [8, 14.5, 6.5, 16, 4.5, 16], [2.5, 16, 0.8, 14.6, 0.3, 12.5]],
  ],
  K: [
    [[0, 0], [0, 16]],
    [[10, 0], [0, 9]],
    [[3, 6.5], [10, 16]],
  ],
  L: [[[0, 0], [0, 16], [10, 16]]],
  M: [[[0, 16], [0, 0], [5, 10], [10, 0], [10, 16]]],
  N: [[[0, 16], [0, 0], [10, 16], [10, 0]]],
  O: [
    [[5, 0], [8, 0, 10, 3, 10, 8], [10, 13, 8, 16, 5, 16], [2, 16, 0, 13, 0, 8], [0, 3, 2, 0, 5, 0]],
  ],
  P: [[[0, 16], [0, 0], [6, 0], [8.5, 0, 10, 1.8, 10, 4.5], [10, 7.2, 8.5, 9, 6, 9], [0, 9]]],
  Q: [
    [[5, 0], [8, 0, 10, 3, 10, 8], [10, 13, 8, 16, 5, 16], [2, 16, 0, 13, 0, 8], [0, 3, 2, 0, 5, 0]],
    [[6, 11], [10, 16]],
  ],
  R: [
    [[0, 16], [0, 0], [6, 0], [8.5, 0, 10, 1.8, 10, 4.5], [10, 7.2, 8.5, 9, 6, 9], [0, 9]],
    [[5, 9], [10, 16]],
  ],
  S: [
    [
      [9.5, 2.5],
      [8.5, 0.8, 7, 0, 5, 0],
      [2.5, 0, 0.5, 1.5, 0.5, 4],
      [0.5, 6.5, 2.5, 7.3, 5, 8],
      [7.5, 8.7, 10, 9.5, 10, 12],
      [10, 14.5, 7.8, 16, 5, 16],
      [3, 16, 1.2, 15.2, 0, 13.5],
    ],
  ],
  T: [
    [[0, 0], [10, 0]],
    [[5, 0], [5, 16]],
  ],
  U: [[[0, 0], [0, 11], [0, 14, 2, 16, 5, 16], [8, 16, 10, 14, 10, 11], [10, 0]]],
  V: [[[0, 0], [5, 16], [10, 0]]],
  W: [[[0, 0], [2.5, 16], [5, 6], [7.5, 16], [10, 0]]],
  X: [
    [[0, 0], [10, 16]],
    [[10, 0], [0, 16]],
  ],
  Y: [
    [[0, 0], [5, 8], [10, 0]],
    [[5, 8], [5, 16]],
  ],
  Z: [[[0, 0], [10, 0], [0, 16], [10, 16]]],
  '!': [
    [[5, 0], [5, 11]],
    [[5, 15.5], [5, 16]],
  ],
};

function appendGlyph(shape: Shape, character: string, left: number, top: number) {
  const paths = /\d/.test(character) ? [DIGIT_PATHS[Number(character)]] : LETTER_PATHS[character];
  for (const path of paths) {
    for (const [index, point] of path.entries()) {
      const [a, b, c, d, e, f] = point.map((value) => value * DIGIT_SCALE);
      if (index === 0) {
        shape.moveTo(left + a, top + b);
      } else if (point.length === 2) {
        shape.lineTo(left + a, top + b);
      } else {
        shape.cubicTo(left + a, top + b, left + c, top + d, left + e, top + f);
      }
    }
  }
}

// Text just above the head of a character standing on the scene's local origin.
// It is drawn from paths because ThorVG needs a font file to draw text.
function createFloatingText(TVG: ThorVGNamespace, text: string, color: Color): Shape {
  const characters = [...text];
  const totalWidth = characters.length * (DIGIT_WIDTH + DIGIT_GAP) - DIGIT_GAP;
  const top = -CHARACTER_SIZE - DIGIT_HEIGHT;

  const shape = new TVG.Shape();
  characters.forEach((character, index) => {
    appendGlyph(shape, character, -totalWidth / 2 + index * (DIGIT_WIDTH + DIGIT_GAP), top);
  });
  shape.stroke({
    width: DIGIT_STROKE_WIDTH,
    color,
    cap: TVG.StrokeCap.Round,
    join: TVG.StrokeJoin.Round,
  });
  return shape;
}

export function createDamageNumber(
  TVG: ThorVGNamespace,
  amount: number,
  target: DamageTarget,
): Shape {
  return createFloatingText(TVG, String(amount), DAMAGE_NUMBER_COLORS[target]);
}

// The name of an effect, shown over a character when the effect starts.
export function createStatusText(TVG: ThorVGNamespace, name: StatusName): Shape {
  return createFloatingText(TVG, STATUS_LABELS[name].toUpperCase(), STATUS_COLORS[name]);
}

// The word shown over a character that evaded an attack.
export function createEvadeText(TVG: ThorVGNamespace): Shape {
  return createFloatingText(TVG, 'EVADE', ATTACK_TEXT_COLOR);
}

// The mark shown over an enemy that was surprised, like the one in Shattered Pixel Dungeon.
export function createSurpriseMark(TVG: ThorVGNamespace): Shape {
  return createFloatingText(TVG, '!', ATTACK_TEXT_COLOR);
}

// Text in a speech bubble over a character standing on the scene's local origin.
function createSpeechBubble(TVG: ThorVGNamespace, text: string, color: Color): Scene {
  const textWidth = text.length * (DIGIT_WIDTH + DIGIT_GAP) - DIGIT_GAP;
  const width = textWidth + NOTICE_BUBBLE_PADDING * 2;
  const height = DIGIT_HEIGHT + NOTICE_BUBBLE_PADDING * 2;
  const top = -CHARACTER_SIZE - DIGIT_HEIGHT - NOTICE_BUBBLE_PADDING;
  const bottom = top + height;

  const bubble = new TVG.Shape();
  bubble.appendRect(-width / 2, top, width, height, {
    rx: NOTICE_BUBBLE_RADIUS,
    ry: NOTICE_BUBBLE_RADIUS,
  });
  bubble
    .moveTo(-NOTICE_BUBBLE_TAIL / 2, bottom)
    .lineTo(NOTICE_BUBBLE_TAIL / 2, bottom)
    .lineTo(0, bottom + NOTICE_BUBBLE_TAIL)
    .close();
  bubble.fill(...NOTICE_BUBBLE_COLOR);

  const scene = new TVG.Scene();
  scene.add(bubble);
  scene.add(createFloatingText(TVG, text, color));
  return scene;
}

// The mark shown over an enemy that just noticed the hero.
// Shown over the hero when something has marked them as the target of an attack.
export function createTargetedText(TVG: ThorVGNamespace): Shape {
  return createFloatingText(TVG, 'TARGETED', [255, 70, 60]);
}

export function createNoticeMark(TVG: ThorVGNamespace): Scene {
  return createSpeechBubble(TVG, '!', NOTICE_MARK_COLOR);
}

// The mark shown over a sleeping enemy.
export function createSleepMark(TVG: ThorVGNamespace): Scene {
  return createSpeechBubble(TVG, 'ZZZ', SLEEP_MARK_COLOR);
}

interface HealthBarStyle {
  left: number;
  top: number;
  width: number;
  height: number;
  fillColor: Color;
  trailColor: Color;
}

// A hidden, full bar.
function createHealthBar(
  TVG: ThorVGNamespace,
  render: () => void,
  { left, top, width, height, fillColor, trailColor }: HealthBarStyle,
): HealthBar {
  const background = new TVG.Shape();
  const trail = new TVG.Shape();
  const fill = new TVG.Shape();

  const scene = new TVG.Scene();
  scene.add(background);
  scene.add(trail);
  scene.add(fill);
  scene.visible(false);

  const drawBar = (shape: Shape, ratio: number, color: Color) => {
    const radius = height / 2;
    shape.reset();
    shape.appendRect(left, top, width * ratio, height, { rx: radius, ry: radius });
    shape.fill(...color);
  };

  drawBar(background, 1, HEALTH_BAR_BACKGROUND);

  let trailRatio = 1;
  let trailFrame = 0;

  return {
    scene,
    show(ratio, options) {
      drawBar(fill, ratio, fillColor);
      scene.visible(true);

      cancelAnimationFrame(trailFrame);
      if (options?.jump || ratio >= trailRatio) {
        trailRatio = ratio;
        drawBar(trail, trailRatio, trailColor);
        return;
      }
      drawBar(trail, trailRatio, trailColor);

      // Each hit restarts the wait, from wherever the trail is now.
      const startRatio = trailRatio;
      let startTime: number | null = null;

      const step = (time: number) => {
        startTime ??= time;
        const progress = (time - startTime - HEALTH_TRAIL_HOLD_MS) / HEALTH_TRAIL_SHRINK_MS;

        if (progress > 0) {
          trailRatio = startRatio + (ratio - startRatio) * Math.min(1, progress);
          drawBar(trail, trailRatio, trailColor);
          render();
        }
        if (progress < 1) {
          trailFrame = requestAnimationFrame(step);
        }
      };

      trailFrame = requestAnimationFrame(step);
    },
  };
}

// Centered below the scene's local origin, which stands on the enemy's tile.
export function createEnemyHealthBar(TVG: ThorVGNamespace, render: () => void): HealthBar {
  return createHealthBar(TVG, render, {
    left: -ENEMY_HEALTH_BAR_WIDTH / 2,
    top: ENEMY_HEALTH_BAR_GAP,
    width: ENEMY_HEALTH_BAR_WIDTH,
    height: ENEMY_HEALTH_BAR_HEIGHT,
    fillColor: ENEMY_HEALTH_BAR_FILL,
    trailColor: ENEMY_HEALTH_BAR_TRAIL,
  });
}

// At the top left of the screen, because it is not part of the map.
export function createHeroHealthBar(TVG: ThorVGNamespace, render: () => void): HealthBar {
  return createHealthBar(TVG, render, {
    left: HERO_HEALTH_BAR_MARGIN,
    top: HERO_HEALTH_BAR_MARGIN,
    width: HERO_HEALTH_BAR_WIDTH,
    height: HERO_HEALTH_BAR_HEIGHT,
    fillColor: HERO_HEALTH_BAR_FILL,
    trailColor: HERO_HEALTH_BAR_TRAIL,
  });
}
