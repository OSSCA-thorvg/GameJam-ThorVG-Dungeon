import type { Point } from './room';

// How a thrown or shot object travels, like the collision flags of Ballistica in Shattered Pixel
// Dungeon. Everything that targets a tile takes its path from traceLine with one of these.
export interface PathRule {
  // Stops on the chosen tile, as a thrown object falls there.
  stopAtTarget: boolean;
  // Stops on the first character in the way.
  stopAtCharacters: boolean;
}

// A thrown item flies over characters to the chosen tile. Throwing weapons, which must hit the
// first character in the way, will need a rule that stops at characters.
export const THROWN: PathRule = { stopAtTarget: true, stopAtCharacters: false };

export interface Trajectory {
  // The tiles the object passes through, ending where it stops.
  path: Point[];
  // Where the object stops, which is where it was thrown from if the first tile blocks it.
  end: Point;
}

export interface TraceWorld {
  isBlocked(tile: Point): boolean;
  hasCharacter(tile: Point): boolean;
}

// Follows a line between tile centers with the voxel traversal of Amanatides and Woo,
// "A Fast Voxel Traversal Algorithm for Ray Tracing" (1987). A line through a corner where both
// side tiles block stops there, as in computeVision, so a tile in view can always be reached.
export function traceLine(from: Point, to: Point, rule: PathRule, world: TraceWorld): Trajectory {
  const lengthX = to.x - from.x;
  const lengthY = to.y - from.y;
  const stepX = Math.sign(lengthX);
  const stepY = Math.sign(lengthY);
  // Where the line crosses the next tile side on each axis, as a fraction of its length scaled by
  // 2 * |lengthX| * |lengthY|. Whole numbers keep a line through a corner exactly on it.
  const deltaX = stepX === 0 ? Infinity : 2 * Math.abs(lengthY);
  const deltaY = stepY === 0 ? Infinity : 2 * Math.abs(lengthX);
  let nextX = stepX === 0 ? Infinity : Math.abs(lengthY);
  let nextY = stepY === 0 ? Infinity : Math.abs(lengthX);
  let x = from.x;
  let y = from.y;
  const path: Point[] = [];

  while (stepX !== 0 || stepY !== 0) {
    if (nextX === nextY) {
      if (world.isBlocked({ x: x + stepX, y }) && world.isBlocked({ x, y: y + stepY })) {
        break;
      }
      x += stepX;
      y += stepY;
      nextX += deltaX;
      nextY += deltaY;
    } else if (nextX < nextY) {
      x += stepX;
      nextX += deltaX;
    } else {
      y += stepY;
      nextY += deltaY;
    }

    const tile = { x, y };
    if (world.isBlocked(tile)) {
      break;
    }
    path.push(tile);
    const isTarget = x === to.x && y === to.y;
    if ((rule.stopAtCharacters && world.hasCharacter(tile)) || (rule.stopAtTarget && isTarget)) {
      break;
    }
  }

  return { path, end: path.at(-1) ?? from };
}
