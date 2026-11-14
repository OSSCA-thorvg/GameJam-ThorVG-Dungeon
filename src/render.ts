import type { Paint, Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import { CHARACTER_ART, type CharacterArt } from './characterArt';
import type { EnemyKind, UndeadKind } from './enemy';
import { isFixture, isWalkable, type Point, type Room } from './room';
import {
  ART_PIXEL,
  drawTilePart,
  drawWallCover,
  tileThemeOf,
  WALL_PIXELS,
  type TilePart,
} from './tileArt';
import { FONT_BOLD } from './fonts';
import { BAR_LEFT, BAR_TOP } from './hud';
import { createPixelSprite, pixelSvg } from './pixelSprite';
import { drawStairsBeam, drawTileOutline } from './effectArt';
import { t } from './i18n';
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

const WALL_HEIGHT = WALL_PIXELS * ART_PIXEL;

// A character is three quarters of a tile wide and high. Its art is 32 by 32 art pixels, so one of
// its art pixels is 1.5 screen pixels, smaller than those of the tiles and items.
const CHARACTER_SIZE = TILE_WIDTH * 0.75;
const CHARACTER_PIXEL = CHARACTER_SIZE / 32;
// Half of a character's height, above the floor.
export const CHARACTER_WAIST_HEIGHT = CHARACTER_SIZE / 2;
const ITEM_SIZE = TILE_WIDTH * 0.5;

// Placeholder values. A hole is fully open up to this fraction of its radius, then fades out.
const CUTAWAY_RADIUS = TILE_WIDTH * 1.75;
const CURSOR_CUTAWAY_RADIUS = TILE_WIDTH * 0.9;
const CUTAWAY_OPEN_FRACTION = 0.7;
// Placeholder value. A closed door inside a hole stays visible at this opacity, while walls are cut.
const DOOR_IN_HOLE_OPACITY = 110;

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

// Placeholder value. The gap between an enemy's feet and its health bar.
const ENEMY_HEALTH_BAR_GAP = 4;

// No standard exists for these. Lost health stays visible briefly, then catches up.
const HEALTH_TRAIL_HOLD_MS = 300;
const HEALTH_TRAIL_SHRINK_MS = 250;

// Placeholder values for the text that floats over characters. Galmuri11 is drawn at twice its own
// size, so a pixel of the letters is as big as a pixel of the art.
const FLOATING_TEXT_SIZE = 22;
// The text has a dark copy of itself one art pixel below it, so that it reads over light floors. An
// outline would do the same, but ThorVG's GL renderer now and then draws outlined text as a hole.
const FLOATING_TEXT_SHADOW = 2;
const FLOATING_TEXT_SHADOW_COLOR: Color = [20, 20, 28];
const FLOATING_TEXT_GAP = 2;

// The height one number takes up, with a gap to the next number.
export const DAMAGE_NUMBER_HEIGHT = FLOATING_TEXT_SIZE + FLOATING_TEXT_SHADOW + FLOATING_TEXT_GAP;
// One character height, like the one tile that numbers rise in Shattered Pixel Dungeon.
export const DAMAGE_NUMBER_RISE = CHARACTER_SIZE;

// Same as the page background, so that places that were never lit look like empty space.
const DARKNESS: Color = [20, 21, 26];
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
// Placeholder pictures of those marks in a speech bubble, so they stand out on a dark map. W is the
// bubble, S its shaded bottom, K its outline, and M the mark. The tail ends on the character's head.
const BUBBLE_PALETTE: Record<string, Color> = {
  W: [245, 245, 245],
  S: [200, 202, 212],
  K: [20, 20, 28],
};
const NOTICE_BUBBLE = [
  '.KKKKKKKK.',
  'KWWWWWWWWK',
  'KWWWMMWWWK',
  'KWWWMMWWWK',
  'KWWWMMWWWK',
  'KWWWMMWWWK',
  'KWWWWWWWWK',
  'KWWWMMWWWK',
  'KSSSSSSSSK',
  '.KKKSSKKK.',
  '...KSSK...',
  '....KK....',
];
const SLEEP_BUBBLE = [
  '.KKKKKKKKKKKK.',
  'KWWWWWWWWWWWWK',
  'KWWWWWWWMMMMWK',
  'KWWWWWWWWWMWWK',
  'KWMMMMMWWMWWWK',
  'KWWWWMWWMMMMWK',
  'KWWWMWWWWWWWWK',
  'KWWMWWWWWWWWWK',
  'KWMMMMMWWWWWWK',
  'KSSSSSSSSSSSSK',
  '.KKKKKSSKKKKK.',
  '.....KSSK.....',
  '......KK......',
];
// How far the tip of the tail is above the character's feet.
const BUBBLE_TAIL_HEIGHT = CHARACTER_SIZE - 4;
const DAMAGE_NUMBER_COLORS: Record<DamageTarget, Color> = {
  enemy: [255, 255, 255],
  hero: [255, 80, 70],
  heal: [120, 230, 120],
};
// Placeholder looks of each kind of enemy: its color, and its size against the hero.
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
  regenerating: [230, 70, 70],
};
// Placeholder colors, laid over a character with the alpha at the end.
const CHARACTER_TINTS: Record<CharacterTint, [...Color, number]> = {
  frozen: [130, 200, 255, 150],
  paralyzed: [240, 220, 90, 130],
  burning: [255, 120, 40, 130],
  shielded: [90, 160, 255, 140],
};
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
  faces: Paint[];
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

// A round hole for cutting walls open, solid in its middle and fading out to its edge.
function createHole(TVG: ThorVGNamespace, radius: number): Shape {
  const gradient = new TVG.RadialGradient(0, 0, radius);
  gradient.addStop(0, [0, 0, 0, 255]);
  gradient.addStop(CUTAWAY_OPEN_FRACTION, [0, 0, 0, 255]);
  gradient.addStop(1, [0, 0, 0, 0]);
  gradient.build();

  const hole = new TVG.Shape();
  hole.appendCircle(0, 0, radius);
  hole.fill(gradient);
  return hole;
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

// Builds a view with the room centered on the scene's local origin, with the tiles of a stage.
export function createRoomView(TVG: ThorVGNamespace, room: Room, stage: number): RoomView {
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
  const beaconCovers: { wall: Wall; cover: Scene; solid: Scene; cut: Scene; isCut: boolean }[] = [];
  const beaconHoles: { heroHole: Shape; cursorHole: Shape }[] = [];

  // One outline for each kind of target, of which the one in use is shown.
  const cursorOutline = new TVG.Scene();
  const cursorOutlines = Object.fromEntries(
    Object.entries(CURSOR_OUTLINES).map(([target, color]) => {
      const outline = drawTileOutline(TVG, color);
      cursorOutline.add(outline);
      return [target, outline];
    }),
  ) as Record<CursorTarget, Scene>;
  cursorOutline.opacity(0);

  const walls: Wall[] = [];
  // Every wall's outline on the screen, whether it was seen or not.
  const wallArea = new TVG.Shape();
  // The padlock of a locked door is among its faces too, so it fades and hides with the door.
  const doors: (Wall & { area: Shape; floor: Scene; lock: Paint[] })[] = [];
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

  const theme = tileThemeOf(stage);
  const drawPart = (part: TilePart, tile: Point) =>
    drawTilePart(TVG, part, tileCenter(tile.x, tile.y), tile, theme);

  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const layer = layers[x + y];
      const addPart = (part: TilePart) => {
        const paint = drawPart(part, { x, y });
        layer.add(paint);
        return paint;
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
          addPart('stairs-down');

          const beacon = new TVG.Scene();
          beacon.add(drawStairsBeam(TVG, center));
          beacon.visible(false);
          stairsBeacons.push({ tile: { x, y }, beacon });
          break;
        }
        // A fixture itself is placed on its floor like an item.
        case 'floor':
        case 'campfire':
        // The coffin itself is placed on its floor like an item.
        case 'coffin':
          addPart('floor');
          break;
        case 'water':
          addPart('water');
          break;
        case 'door':
        case 'locked-door': {
          // The floor is in a scene of its own, so that a burned door can swap it in its place.
          const floor = new TVG.Scene();
          floor.add(drawPart('door-floor', { x, y }));
          layer.add(floor);
          const faces = [addPart('door-left'), addPart('door-right'), addPart('door-top')];
          const lock = room.tiles[y][x] === 'locked-door' ? [addPart('lock')] : [];
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
              addPart('wall-left'),
              addPart('wall-right'),
              addPart('wall-top'),
            ],
          });
          break;
      }
    }
  }

  // The walls drawn after the stairs stand in front of them, so they hide the light over the stairs
  // where they overlap it. Each wall that can reach the light has a cover of its own, which steps
  // along its art pixels as the wall does. A wall cut open near the hero or the cursor moves its
  // cover under the same holes, so the light shows through where the wall does not.
  for (const { tile, beacon } of stairsBeacons) {
    const center = tileCenter(tile.x, tile.y);
    const solid = new TVG.Scene();
    const cut = new TVG.Scene();
    const heroHole = createHole(TVG, CUTAWAY_RADIUS);
    const cursorHole = createHole(TVG, CURSOR_CUTAWAY_RADIUS);
    const holes = new TVG.Scene();
    holes.add(heroHole);
    holes.add(cursorHole);
    cut.mask(holes, TVG.MaskMethod.InvAlpha);
    beaconHoles.push({ heroHole, cursorHole });
    for (const wall of walls) {
      const reaches =
        layerOf(wall.tile) > layerOf(tile) &&
        Math.abs(wall.center.x - center.x) < TILE_WIDTH &&
        wall.center.y - TILE_HEIGHT / 2 - WALL_HEIGHT < center.y + TILE_HEIGHT / 2;
      if (reaches) {
        const cover = drawWallCover(TVG, [wall.center]);
        solid.add(cover);
        beaconCovers.push({ wall, cover, solid, cut, isCut: false });
      }
    }
    const covers = new TVG.Scene();
    covers.add(solid);
    covers.add(cut);
    const masked = new TVG.Scene();
    masked.add(beacon);
    masked.mask(covers, TVG.MaskMethod.InvAlpha);
    overlay.add(masked);
  }
  // Over the light of the stairs, so the outline shows on the stairs too.
  overlay.add(cursorOutline);

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

  // A paint keeps its mask once set, so each layer gets one scene that always has the holes.
  const cutLayer = (index: number) => {
    let cut = cutLayers.get(index);
    if (!cut) {
      const heroHole = createHole(TVG, CUTAWAY_RADIUS);
      const cursorHole = createHole(TVG, CURSOR_CUTAWAY_RADIUS);

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

    for (const entry of beaconCovers) {
      const isCut = wanted.has(entry.wall);
      if (isCut !== entry.isCut) {
        (isCut ? entry.solid : entry.cut).remove(entry.cover);
        (isCut ? entry.cut : entry.solid).add(entry.cover);
        entry.isCut = isCut;
      }
    }
    for (const { heroHole, cursorHole } of beaconHoles) {
      heroHole.opacity(heroHolePoint ? 255 : 0);
      if (heroHolePoint) {
        heroHole.translate(heroHolePoint.x, heroHolePoint.y);
      }
      cursorHole.opacity(cursorPoint ? 255 : 0);
      if (cursorPoint) {
        cursorHole.translate(cursorPoint.x, cursorPoint.y);
      }
    }

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
      door.floor.clear();
      door.floor.add(drawPart('burnt-doorway', tile));
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
    markEntrance(tile) {
      floorLayers[layerOf(tile)].add(drawPart('stairs-up', tile));
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
      for (const [kind, outline] of Object.entries(cursorOutlines)) {
        outline.visible(kind === target);
      }
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

// A picture whose bottom center stands on the paint's local origin.
function createStandingPicture(TVG: ThorVGNamespace, svg: string, size: number): Paint {
  const picture = new TVG.Picture();
  picture.load(svg, { type: 'svg' });
  picture.size(size, size);
  picture.origin(0.5, 1);
  return picture;
}

// The pictures of each character facing left and facing right, of which one is shown.
const facings = new WeakMap<Paint, { left: Paint; right: Paint }>();

// A character standing on the scene's local origin, facing one way at first. It is a Scene because
// scene effects, such as the hit flash, only apply to scenes.
function createCharacter(
  TVG: ThorVGNamespace,
  art: CharacterArt,
  facing: 'left' | 'right' = 'left',
  size = art.pixels * CHARACTER_PIXEL,
): Scene {
  const left = createStandingPicture(TVG, art.left, size);
  const right = createStandingPicture(TVG, art.right, size);
  left.visible(facing === 'left');
  right.visible(facing === 'right');
  const scene = new TVG.Scene();
  scene.add(left);
  scene.add(right);
  facings.set(scene, { left, right });
  return scene;
}

// Turns a character to face the way from one tile to another on the screen. A move straight up or
// down the screen keeps the way it faced.
export function faceToward(paint: Paint, from: Point, to: Point): void {
  const facing = facings.get(paint);
  const screenX = to.x - from.x - (to.y - from.y);
  if (!facing || screenX === 0) {
    return;
  }
  facing.left.visible(screenX < 0);
  facing.right.visible(screenX > 0);
}

export function createHero(TVG: ThorVGNamespace): Scene {
  return createCharacter(TVG, CHARACTER_ART.hero, 'right');
}

// A chest is 24 by 24 art pixels, about as big as a coffin. It stands like a character, with the
// bottom of its picture on the scene's local origin.
const CHEST_PIXELS = 24;

export function createChest(TVG: ThorVGNamespace, svg: string): Scene {
  const scene = new TVG.Scene();
  scene.add(createStandingPicture(TVG, svg, CHEST_PIXELS * ART_PIXEL));
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

// A campfire is 32 by 32 art pixels, as wide as a tile, with the middle of its logs, 24.5 pixels
// down, on the paint's local origin.
const CAMPFIRE_PIXELS = 32;
const CAMPFIRE_LOGS = 24.5;

export function createCampfirePaint(TVG: ThorVGNamespace, svg: string): Paint {
  const picture = new TVG.Picture();
  picture.load(svg, { type: 'svg' });
  picture.size(CAMPFIRE_PIXELS * ART_PIXEL, CAMPFIRE_PIXELS * ART_PIXEL);
  picture.origin(0.5, CAMPFIRE_LOGS / CAMPFIRE_PIXELS);
  return picture;
}

export function createCentipedePart(TVG: ThorVGNamespace, isHead: boolean): Scene {
  return createCharacter(TVG, CHARACTER_ART[isHead ? 'centipede-head' : 'centipede-body']);
}

type EnemyLook = EnemyKind | UndeadKind | 'ghost' | 'skeleton' | 'necromancer' | 'mimic';

const ENEMY_ART: Record<EnemyLook, CharacterArt> = {
  weak: CHARACTER_ART.rat,
  medium: CHARACTER_ART.crab,
  strong: CHARACTER_ART.bat,
  ghoul: CHARACTER_ART.ghoul,
  ghost: CHARACTER_ART.ghost,
  skeleton: CHARACTER_ART.skeleton,
  necromancer: CHARACTER_ART.necromancer,
  mimic: CHARACTER_ART.mimic,
};

// An enemy standing on the scene's local origin.
export function createEnemyPaint(TVG: ThorVGNamespace, look: EnemyLook): Scene {
  // A mimic is as big as the chest it passed for.
  return look === 'mimic'
    ? createCharacter(TVG, ENEMY_ART.mimic, 'left', CHEST_PIXELS * ART_PIXEL)
    : createCharacter(TVG, ENEMY_ART[look]);
}

// Lays a color over a character, or takes it away.
export function tintCharacter(scene: Scene, tint: CharacterTint | null): void {
  scene.resetEffects();
  if (tint) {
    scene.fillEffect(...CHARACTER_TINTS[tint]);
  }
}

// Text just above the head of a character standing on the scene's local origin, in the font that
// ThorVG draws text with. It is in a scene, so that the paint that moves it can place the scene
// without losing the height of the text.
function createFloatingText(TVG: ThorVGNamespace, text: string, color: Color): Scene {
  const label = (fill: Color, offset: number) =>
    new TVG.Text()
      .font(FONT_BOLD)
      .fontSize(FLOATING_TEXT_SIZE)
      .text(text)
      .fill(...fill)
      .align(0.5, 1)
      .translate(0, -CHARACTER_SIZE + offset);
  const scene = new TVG.Scene();
  scene.add(label(FLOATING_TEXT_SHADOW_COLOR, FLOATING_TEXT_SHADOW));
  scene.add(label(color, 0));
  return scene;
}

export function createDamageNumber(
  TVG: ThorVGNamespace,
  amount: number,
  target: DamageTarget,
): Scene {
  return createFloatingText(TVG, String(amount), DAMAGE_NUMBER_COLORS[target]);
}

// The name of an effect, shown over a character when the effect starts.
export function createStatusText(TVG: ThorVGNamespace, name: StatusName): Scene {
  return createFloatingText(TVG, t(STATUS_LABELS[name]), STATUS_COLORS[name]);
}

// The word shown over a character that evaded an attack.
export function createEvadeText(TVG: ThorVGNamespace): Scene {
  return createFloatingText(TVG, t('Evade'), ATTACK_TEXT_COLOR);
}

// The mark shown over an enemy that was surprised, like the one in Shattered Pixel Dungeon.
export function createSurpriseMark(TVG: ThorVGNamespace): Scene {
  return createFloatingText(TVG, '!', ATTACK_TEXT_COLOR);
}

// A speech bubble over a character standing on the scene's local origin, with a mark of a color.
function createSpeechBubble(TVG: ThorVGNamespace, rows: string[], color: Color): Scene {
  return createPixelSprite(TVG, rows, { ...BUBBLE_PALETTE, M: color }, {
    x: 0,
    y: -BUBBLE_TAIL_HEIGHT,
  });
}

// The mark shown over an enemy that just noticed the hero.
// Shown over the hero when something has marked them as the target of an attack.
export function createTargetedText(TVG: ThorVGNamespace): Scene {
  return createFloatingText(TVG, t('Targeted'), [255, 70, 60]);
}

export function createNoticeMark(TVG: ThorVGNamespace): Scene {
  return createSpeechBubble(TVG, NOTICE_BUBBLE, NOTICE_MARK_COLOR);
}

// The same mark as SVG, for the windows of the page.
export const NOTICE_MARK_SVG = pixelSvg(NOTICE_BUBBLE, { ...BUBBLE_PALETTE, M: NOTICE_MARK_COLOR });

// The mark shown over a sleeping enemy.
export function createSleepMark(TVG: ThorVGNamespace): Scene {
  return createSpeechBubble(TVG, SLEEP_BUBBLE, SLEEP_MARK_COLOR);
}

// A bar of art pixels with a dark rim. Each row of its inside has a color of its own, lit at the top
// and shaded at the bottom, and lost health trails behind in rows of another set of colors.
interface HealthBarStyle {
  left: number;
  top: number;
  // How many art pixels the inside is wide.
  width: number;
  fillRows: Color[];
  trailRows: Color[];
}

const HEALTH_BAR_RIM: Color = [21, 22, 28];
const HEALTH_BAR_EMPTY: Color = [35, 35, 43];

// A hidden, full bar.
function createHealthBar(
  TVG: ThorVGNamespace,
  render: () => void,
  { left, top, width, fillRows, trailRows }: HealthBarStyle,
): HealthBar {
  const rim = new TVG.Shape();
  rim.appendRect(left, top, (width + 2) * ART_PIXEL, (fillRows.length + 2) * ART_PIXEL);
  rim.fill(...HEALTH_BAR_RIM);
  const empty = new TVG.Shape();
  const insideHeight = fillRows.length * ART_PIXEL;
  empty.appendRect(left + ART_PIXEL, top + ART_PIXEL, width * ART_PIXEL, insideHeight);
  empty.fill(...HEALTH_BAR_EMPTY);

  const scene = new TVG.Scene();
  scene.add(rim);
  scene.add(empty);
  const rowsOf = (colors: Color[]) =>
    colors.map(() => {
      const shape = new TVG.Shape();
      scene.add(shape);
      return shape;
    });
  const trail = rowsOf(trailRows);
  const fill = rowsOf(fillRows);
  scene.visible(false);

  const drawBar = (shapes: Shape[], colors: Color[], ratio: number) => {
    const pixels = Math.round(width * ratio);
    shapes.forEach((shape, row) => {
      shape.reset();
      if (pixels > 0) {
        shape.appendRect(
          left + ART_PIXEL,
          top + (1 + row) * ART_PIXEL,
          pixels * ART_PIXEL,
          ART_PIXEL,
        );
      }
      shape.fill(...colors[row]);
    });
  };

  let trailRatio = 1;
  let trailFrame = 0;

  return {
    scene,
    show(ratio, options) {
      drawBar(fill, fillRows, ratio);
      scene.visible(true);

      cancelAnimationFrame(trailFrame);
      if (options?.jump || ratio >= trailRatio) {
        trailRatio = ratio;
        drawBar(trail, trailRows, trailRatio);
        return;
      }
      drawBar(trail, trailRows, trailRatio);

      // Each hit restarts the wait, from wherever the trail is now.
      const startRatio = trailRatio;
      let startTime: number | null = null;

      const step = (time: number) => {
        startTime ??= time;
        const progress = (time - startTime - HEALTH_TRAIL_HOLD_MS) / HEALTH_TRAIL_SHRINK_MS;

        if (progress > 0) {
          trailRatio = startRatio + (ratio - startRatio) * Math.min(1, progress);
          drawBar(trail, trailRows, trailRatio);
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

const rows = (...runs: [count: number, color: Color][]) =>
  runs.flatMap(([count, color]) => Array.from({ length: count }, () => color));

// Placeholder values. An enemy's bar is 18 by 3 art pixels inside its rim, green over a red trail,
// and the hero's is 100 by 12, red over a yellow trail.
const ENEMY_HEALTH_BAR_WIDTH = 18;
const ENEMY_HEALTH_FILL = rows([1, [154, 240, 154]], [1, [90, 200, 90]], [1, [58, 154, 66]]);
const ENEMY_HEALTH_TRAIL = rows([1, [240, 136, 112]], [1, [220, 80, 60]], [1, [168, 56, 40]]);
const HERO_HEALTH_BAR_WIDTH = 100;
const HERO_HEALTH_FILL = rows(
  [1, [240, 116, 104]],
  [1, [224, 76, 70]],
  [7, [210, 60, 55]],
  [1, [184, 48, 48]],
  [1, [160, 40, 40]],
  [1, [122, 30, 30]],
);
const HERO_HEALTH_TRAIL = rows(
  [1, [250, 220, 160]],
  [9, [245, 200, 120]],
  [1, [216, 170, 98]],
  [1, [184, 142, 76]],
);

// Centered below the scene's local origin, which stands on the enemy's tile.
export function createEnemyHealthBar(TVG: ThorVGNamespace, render: () => void): HealthBar {
  return createHealthBar(TVG, render, {
    left: -((ENEMY_HEALTH_BAR_WIDTH + 2) * ART_PIXEL) / 2,
    top: ENEMY_HEALTH_BAR_GAP,
    width: ENEMY_HEALTH_BAR_WIDTH,
    fillRows: ENEMY_HEALTH_FILL,
    trailRows: ENEMY_HEALTH_TRAIL,
  });
}

// At the top left of the screen, because it is not part of the map.
export function createHeroHealthBar(TVG: ThorVGNamespace, render: () => void): HealthBar {
  return createHealthBar(TVG, render, {
    left: BAR_LEFT,
    top: BAR_TOP,
    width: HERO_HEALTH_BAR_WIDTH,
    fillRows: HERO_HEALTH_FILL,
    trailRows: HERO_HEALTH_TRAIL,
  });
}
