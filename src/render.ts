import type { Paint, Scene, ThorVGNamespace } from '@thorvg/webcanvas';
import type { Point, Room } from './room';

type Color = [r: number, g: number, b: number];

export interface RoomView {
  scene: Scene;
  // Moves a paint onto a tile and into that tile's draw layer.
  place(paint: Paint, x: number, y: number): void;
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
  // Makes the bar visible, filled to a ratio from 0 to 1.
  show(ratio: number): void;
}

// 2:1 isometric tile from https://clintbellanger.net/articles/isometric_math/
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

// 0.6 times the height of a cube on this tile.
const WALL_HEIGHT = 0.6 * Math.sqrt((TILE_WIDTH ** 2 - TILE_HEIGHT ** 2) / 2);

const CHARACTER_SIZE = TILE_WIDTH * 0.75;

const HEALTH_BAR_WIDTH = CHARACTER_SIZE * 0.8;
const HEALTH_BAR_HEIGHT = 5;
const HEALTH_BAR_GAP = 4;

const FLOOR_LIGHT: Color = [96, 100, 110];
const FLOOR_DARK: Color = [86, 90, 100];
const DOOR: Color = [150, 104, 60];
const WALL_TOP: Color = [130, 134, 144];
const WALL_LEFT: Color = [70, 74, 84];
const WALL_RIGHT: Color = [50, 54, 64];
const DUMMY_ENEMY: Color = [196, 64, 64];
const HEALTH_BAR_BACKGROUND: Color = [30, 30, 36];
const HEALTH_BAR_FILL: Color = [90, 200, 90];

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
      };

      const center = tileCenter(x, y);
      const top = { x: center.x, y: center.y - TILE_HEIGHT / 2 };
      const right = { x: center.x + TILE_WIDTH / 2, y: center.y };
      const bottom = { x: center.x, y: center.y + TILE_HEIGHT / 2 };
      const left = { x: center.x - TILE_WIDTH / 2, y: center.y };

      switch (room.tiles[y][x]) {
        case 'floor':
          addPolygon([top, right, bottom, left], (x + y) % 2 === 0 ? FLOOR_LIGHT : FLOOR_DARK);
          break;
        case 'door':
          addPolygon([top, right, bottom, left], DOOR);
          break;
        case 'wall':
          addPolygon([left, bottom, lift(bottom), lift(left)], WALL_LEFT);
          addPolygon([right, bottom, lift(bottom), lift(right)], WALL_RIGHT);
          addPolygon([lift(top), lift(right), lift(bottom), lift(left)], WALL_TOP);
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

  return {
    scene,
    place(paint, x, y) {
      placeInLayer(paint, layers[x + y], x, y);
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

// A hidden bar centered below the scene's local origin.
export function createHealthBar(TVG: ThorVGNamespace): HealthBar {
  const left = -HEALTH_BAR_WIDTH / 2;

  const background = new TVG.Shape();
  background.appendRect(left, HEALTH_BAR_GAP, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
  background.fill(...HEALTH_BAR_BACKGROUND);

  const fill = new TVG.Shape();

  const scene = new TVG.Scene();
  scene.add(background);
  scene.add(fill);
  scene.visible(false);

  return {
    scene,
    show(ratio) {
      fill.reset();
      fill.appendRect(left, HEALTH_BAR_GAP, HEALTH_BAR_WIDTH * ratio, HEALTH_BAR_HEIGHT);
      fill.fill(...HEALTH_BAR_FILL);
      scene.visible(true);
    },
  };
}
