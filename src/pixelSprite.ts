import type { Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import type { Point } from './room';
import { ART_PIXEL } from './tileArt';

type Color = [r: number, g: number, b: number];

// A picture of art pixels, written as rows of characters. Each character names a color in the
// palette, and '.' is left empty. The bottom center of the picture stands on the foot point. Each
// color is one shape, made of runs of pixels along the rows.
export function createPixelSprite(
  TVG: ThorVGNamespace,
  rows: string[],
  palette: Record<string, Color>,
  foot: Point,
): Scene {
  const width = Math.max(...rows.map((row) => row.length));
  const left = foot.x - (width / 2) * ART_PIXEL;
  const top = foot.y - rows.length * ART_PIXEL;
  const shapes = new Map<string, Shape>();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) {
        end++;
      }
      if (key !== '.') {
        let shape = shapes.get(key);
        if (!shape) {
          shape = new TVG.Shape();
          shape.fill(...palette[key]);
          shapes.set(key, shape);
        }
        shape.appendRect(left + x * ART_PIXEL, top + y * ART_PIXEL, (end - x) * ART_PIXEL, ART_PIXEL);
      }
      x = end;
    }
  });
  const scene = new TVG.Scene();
  for (const shape of shapes.values()) {
    scene.add(shape);
  }
  return scene;
}
