import type { Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import type { Point } from './room';
import { ART_PIXEL } from './tileArt';

type Color = [r: number, g: number, b: number];

// Placeholder values, set by eye against the floor. The items and characters were drawn more
// saturated and with more contrast than the tiles, so on the floor they stood out from them. Each
// color loses part of its saturation, toward its own luma, and then part of its distance from a
// middle value near the lighter tiles.
const SATURATION = 0.7;
const CONTRAST = 0.85;
const MIDDLE = 110;

// Luma with the Rec. 601 weights.
const lumaOf = ([r, g, b]: Color) => 0.299 * r + 0.587 * g + 0.114 * b;

export function muted(color: Color): Color {
  const luma = lumaOf(color);
  return color.map((value) => {
    const desaturated = luma + (value - luma) * SATURATION;
    return Math.min(255, Math.max(0, Math.round(MIDDLE + (desaturated - MIDDLE) * CONTRAST)));
  }) as Color;
}

// A palette with every color muted, except the colors of things that give off light.
export const mutedPalette = (
  palette: Record<string, Color>,
  glowing: string[],
): Record<string, Color> =>
  Object.fromEntries(
    Object.entries(palette).map(([key, color]) => [
      key,
      glowing.includes(key) ? color : muted(color),
    ]),
  );

const hex = (color: Color) =>
  `#${color.map((value) => value.toString(16).padStart(2, '0')).join('')}`;

// The same kind of picture as SVG markup, one art pixel to a unit, for the paints and the page that
// take SVG. Each color is one path, made of runs of pixels along the rows.
export function pixelSvg(rows: string[], palette: Record<string, Color>): string {
  const width = Math.max(...rows.map((row) => row.length));
  const paths = new Map<string, string>();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) {
        end++;
      }
      if (key !== '.') {
        paths.set(key, `${paths.get(key) ?? ''}M${x} ${y}h${end - x}v1h${x - end}z`);
      }
      x = end;
    }
  });
  const body = [...paths]
    .map(([key, d]) => `<path fill="${hex(palette[key])}" d="${d}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${rows.length}" shape-rendering="crispEdges">${body}</svg>`;
}

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
