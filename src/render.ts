import type { Scene, ThorVGNamespace } from '@thorvg/webcanvas';
import type { Room } from './room';

interface Point {
  x: number;
  y: number;
}

type Color = [r: number, g: number, b: number];

// 2:1 isometric tile from https://clintbellanger.net/articles/isometric_math/
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

// 0.6 times the height of a cube on this tile.
const WALL_HEIGHT = 0.6 * Math.sqrt((TILE_WIDTH ** 2 - TILE_HEIGHT ** 2) / 2);

const FLOOR_LIGHT: Color = [96, 100, 110];
const FLOOR_DARK: Color = [86, 90, 100];
const DOOR: Color = [150, 104, 60];
const WALL_TOP: Color = [130, 134, 144];
const WALL_LEFT: Color = [70, 74, 84];
const WALL_RIGHT: Color = [50, 54, 64];

function mapToScreen(x: number, y: number): Point {
  return {
    x: (x - y) * (TILE_WIDTH / 2),
    y: (x + y) * (TILE_HEIGHT / 2),
  };
}

function lift(point: Point): Point {
  return { x: point.x, y: point.y - WALL_HEIGHT };
}

// Builds a Scene with the room centered on its local origin.
export function createRoomScene(TVG: ThorVGNamespace, room: Room): Scene {
  const scene = new TVG.Scene();

  const addPolygon = (points: Point[], [r, g, b]: Color) => {
    const shape = new TVG.Shape();
    shape.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) {
      shape.lineTo(point.x, point.y);
    }
    shape.close().fill(r, g, b);
    scene.add(shape);
  };

  const roomCenter = mapToScreen((room.width - 1) / 2, (room.height - 1) / 2);
  const offsetX = -roomCenter.x;
  const offsetY = -roomCenter.y + WALL_HEIGHT / 2;

  // Row order draws each tile after the two neighbors behind it, (x - 1, y) and (x, y - 1).
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const tileCenter = mapToScreen(x, y);
      const cx = tileCenter.x + offsetX;
      const cy = tileCenter.y + offsetY;

      const top = { x: cx, y: cy - TILE_HEIGHT / 2 };
      const right = { x: cx + TILE_WIDTH / 2, y: cy };
      const bottom = { x: cx, y: cy + TILE_HEIGHT / 2 };
      const left = { x: cx - TILE_WIDTH / 2, y: cy };

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

  return scene;
}
