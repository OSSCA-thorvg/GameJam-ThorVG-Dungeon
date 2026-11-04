import type { Paint, Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import { isWalkable, type Point, type Room } from './room';

type Color = [r: number, g: number, b: number];

// What the cursor is pointing at, which decides the color of the tile outline.
export type CursorTarget = 'floor' | 'enemy';

export interface RoomView {
  scene: Scene;
  // Moves a paint onto a tile and into that tile's draw layer.
  place(paint: Paint, x: number, y: number): void;
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

// Placeholder values. A hole is fully open up to this fraction of its radius, then fades out.
const CUTAWAY_RADIUS = TILE_WIDTH * 1.75;
const CURSOR_CUTAWAY_RADIUS = TILE_WIDTH * 0.9;
const CUTAWAY_OPEN_FRACTION = 0.7;

const CURSOR_OUTLINE_WIDTH = 2;

const HEALTH_BAR_WIDTH = CHARACTER_SIZE * 0.8;
const HEALTH_BAR_HEIGHT = 5;
const HEALTH_BAR_GAP = 4;

// No standard exists for these. Lost health stays visible briefly, then catches up.
const HEALTH_TRAIL_HOLD_MS = 300;
const HEALTH_TRAIL_SHRINK_MS = 250;

const FLOOR_LIGHT: Color = [96, 100, 110];
const FLOOR_DARK: Color = [86, 90, 100];
const DOOR: Color = [150, 104, 60];
const STAIRS_STEPS: Color[] = [
  [62, 65, 74],
  [44, 46, 54],
  [26, 27, 33],
];
const WALL_TOP: Color = [130, 134, 144];
const WALL_LEFT: Color = [70, 74, 84];
const WALL_RIGHT: Color = [50, 54, 64];
const CURSOR_OUTLINES: Record<CursorTarget, Color> = {
  floor: [255, 255, 255],
  enemy: [235, 60, 50],
};
const DUMMY_ENEMY: Color = [196, 64, 64];
const HEALTH_BAR_BACKGROUND: Color = [30, 30, 36];
const HEALTH_BAR_FILL: Color = [90, 200, 90];
const HEALTH_BAR_TRAIL: Color = [220, 80, 60];

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

// Builds a view with the room centered on the scene's local origin.
export function createRoomView(TVG: ThorVGNamespace, room: Room): RoomView {
  const scene = new TVG.Scene();

  // One layer per x + y value, because tiles with a larger sum are in front.
  const layers = Array.from({ length: room.width + room.height - 1 }, () => {
    const layer = new TVG.Scene();
    scene.add(layer);
    return layer;
  });

  const overlay = new TVG.Scene();
  scene.add(overlay);

  const cursorOutline = appendTileDiamond(new TVG.Shape());
  cursorOutline.stroke({ width: CURSOR_OUTLINE_WIDTH, color: CURSOR_OUTLINES.floor });
  cursorOutline.opacity(0);
  overlay.add(cursorOutline);

  const walls: Wall[] = [];
  const cutLayers = new Map<number, { scene: Scene; playerHole: Shape; cursorHole: Shape }>();
  let cutWalls = new Set<Wall>();
  let coveredPlayerTile: Point | null = null;
  let cursorTile: Point | null = null;
  let cursorTarget: CursorTarget = 'floor';

  const roomCenter = mapToScreen((room.width - 1) / 2, (room.height - 1) / 2);
  const offsetX = -roomCenter.x;
  const offsetY = -roomCenter.y + WALL_HEIGHT / 2;

  const tileCenter = (x: number, y: number): Point => {
    const screen = mapToScreen(x, y);
    return { x: screen.x + offsetX, y: screen.y + offsetY };
  };

  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const layer = layers[x + y];

      const addPolygon = (points: Point[], [r, g, b]: Color) => {
        const shape = new TVG.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) {
          shape.lineTo(point.x, point.y);
        }
        shape.close().fill(r, g, b);
        layer.add(shape);
        return shape;
      };

      const center = tileCenter(x, y);
      const top = { x: center.x, y: center.y - TILE_HEIGHT / 2 };
      const right = { x: center.x + TILE_WIDTH / 2, y: center.y };
      const bottom = { x: center.x, y: center.y + TILE_HEIGHT / 2 };
      const left = { x: center.x - TILE_WIDTH / 2, y: center.y };

      // Shrinks the tile's diamond toward its center.
      const inset = (scale: number) =>
        [top, right, bottom, left].map((point) => ({
          x: center.x + (point.x - center.x) * scale,
          y: center.y + (point.y - center.y) * scale,
        }));

      switch (room.tiles[y][x]) {
        case 'void':
          break;
        case 'stairs':
          STAIRS_STEPS.forEach((color, step) => addPolygon(inset(1 - step * 0.28), color));
          break;
        case 'floor':
          addPolygon([top, right, bottom, left], (x + y) % 2 === 0 ? FLOOR_LIGHT : FLOOR_DARK);
          break;
        case 'door':
          addPolygon([top, right, bottom, left], DOOR);
          break;
        case 'wall':
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
      const playerHole = createHole(CUTAWAY_RADIUS);
      const cursorHole = createHole(CURSOR_CUTAWAY_RADIUS);

      const holes = new TVG.Scene();
      holes.add(playerHole);
      holes.add(cursorHole);

      const cutScene = new TVG.Scene();
      cutScene.mask(holes, TVG.MaskMethod.InvAlpha);
      layers[index].add(cutScene);

      cut = { scene: cutScene, playerHole, cursorHole };
      cutLayers.set(index, cut);
    }
    return cut;
  };

  const isWall = (x: number, y: number) => room.tiles[y]?.[x] === 'wall';
  const isCovered = ({ x, y }: Point) =>
    isWall(x + 1, y) || isWall(x, y + 1) || isWall(x + 1, y + 1);

  // Moves walls in and out of the masked scenes, then places the holes.
  const updateCuts = () => {
    const playerCenter = coveredPlayerTile && tileCenter(coveredPlayerTile.x, coveredPlayerTile.y);
    const playerHolePoint = playerCenter && {
      x: playerCenter.x,
      y: playerCenter.y - CHARACTER_SIZE / 2,
    };
    const coveredCursorTile = cursorTile && isCovered(cursorTile) ? cursorTile : null;
    const cursorPoint =
      coveredCursorTile && tileCenter(coveredCursorTile.x, coveredCursorTile.y);

    const wanted = new Set(
      walls.filter(
        (wall) =>
          (coveredPlayerTile &&
            playerHolePoint &&
            layerOf(wall.tile) > layerOf(coveredPlayerTile) &&
            wallReaches(wall, playerHolePoint, CUTAWAY_RADIUS)) ||
          (coveredCursorTile &&
            cursorPoint &&
            layerOf(wall.tile) > layerOf(coveredCursorTile) &&
            wallReaches(wall, cursorPoint, CURSOR_CUTAWAY_RADIUS)),
      ),
    );

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
      const showPlayerHole = coveredPlayerTile && index > layerOf(coveredPlayerTile);
      cut.playerHole.opacity(showPlayerHole ? 255 : 0);
      if (playerHolePoint) {
        cut.playerHole.translate(playerHolePoint.x, playerHolePoint.y);
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
    place(paint, x, y) {
      placeInLayer(paint, layers[x + y], x, y);
    },
    cutAwayWalls(tile) {
      coveredPlayerTile = isCovered(tile) ? tile : null;
      updateCuts();
    },
    setCursorTile(tile, target) {
      const next = tile && isWalkable(room, tile.x, tile.y) ? tile : null;
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

// A placeholder enemy with its feet on the scene's local origin.
// It is a Scene because scene effects, such as the hit flash, only apply to scenes.
export function createDummyEnemy(TVG: ThorVGNamespace): Scene {
  const size = CHARACTER_SIZE;
  const shape = new TVG.Shape();
  shape.appendRect(-size / 4, -size * 0.6, size / 2, size * 0.6);
  shape.appendCircle(0, -size * 0.8, size / 5);
  shape.fill(...DUMMY_ENEMY);

  const scene = new TVG.Scene();
  scene.add(shape);
  return scene;
}

// A hidden, full bar centered below the scene's local origin.
export function createHealthBar(TVG: ThorVGNamespace, render: () => void): HealthBar {
  const left = -HEALTH_BAR_WIDTH / 2;

  const background = new TVG.Shape();
  const trail = new TVG.Shape();
  const fill = new TVG.Shape();

  const scene = new TVG.Scene();
  scene.add(background);
  scene.add(trail);
  scene.add(fill);
  scene.visible(false);

  const drawBar = (shape: Shape, ratio: number, color: Color) => {
    const radius = HEALTH_BAR_HEIGHT / 2;
    shape.reset();
    shape.appendRect(left, HEALTH_BAR_GAP, HEALTH_BAR_WIDTH * ratio, HEALTH_BAR_HEIGHT, {
      rx: radius,
      ry: radius,
    });
    shape.fill(...color);
  };

  drawBar(background, 1, HEALTH_BAR_BACKGROUND);

  let trailRatio = 1;
  let trailFrame = 0;

  return {
    scene,
    show(ratio, options) {
      drawBar(fill, ratio, HEALTH_BAR_FILL);
      scene.visible(true);

      cancelAnimationFrame(trailFrame);
      if (options?.jump || ratio >= trailRatio) {
        trailRatio = ratio;
        drawBar(trail, trailRatio, HEALTH_BAR_TRAIL);
        return;
      }
      drawBar(trail, trailRatio, HEALTH_BAR_TRAIL);

      // Each hit restarts the wait, from wherever the trail is now.
      const startRatio = trailRatio;
      let startTime: number | null = null;

      const step = (time: number) => {
        startTime ??= time;
        const progress = (time - startTime - HEALTH_TRAIL_HOLD_MS) / HEALTH_TRAIL_SHRINK_MS;

        if (progress > 0) {
          trailRatio = startRatio + (ratio - startRatio) * Math.min(1, progress);
          drawBar(trail, trailRatio, HEALTH_BAR_TRAIL);
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
