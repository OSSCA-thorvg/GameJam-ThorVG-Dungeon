import { mutedPalette, pixelSvg } from './pixelSprite';

type Color = [r: number, g: number, b: number];

// The title of the main menu as pixel art: "Dungeon" carved in stone, lit from above, cracked, and
// outlined, under a smaller "ThorVG" in gold. The letters are those of the game's font, drawn at the
// size its pixels are made for, so that each pixel of a letter is one pixel of the art.
// Placeholder colors, muted as those of the items and the characters are, so that the title is in
// the same tone as the game.
const DRAWN_PALETTE: Record<string, Color> = {
  // The shadow and the outline of all the letters.
  S: [6, 6, 9],
  K: [14, 13, 18],
  // The stone: its lit top edge, its shades from top to bottom, its shaded bottom edge, and cracks.
  H: [226, 228, 236],
  A: [178, 180, 192],
  B: [146, 148, 162],
  C: [118, 120, 134],
  D: [92, 94, 108],
  L: [62, 63, 74],
  X: [44, 44, 54],
  // The gold: its lit top edge, its shades from top to bottom, and its shaded bottom edge.
  W: [255, 248, 210],
  Y: [255, 228, 130],
  O: [234, 172, 70],
  R: [184, 112, 40],
  Q: [120, 64, 24],
};
const PALETTE = mutedPalette(DRAWN_PALETTE, []);

// The sizes the font is drawn at: 2 and 3 times the 11 pixels its pixels are made for, so that each
// pixel of a letter is a whole square of art pixels, with room inside each stroke for its light and
// shade.
const SMALL = 22;
const LARGE = 33;
// Room around the letters for the outline and the shadow.
const MARGIN = 4;
// How many screen pixels an art pixel of the title takes, so that "Dungeon" is 99 pixels high, 9
// times the font's 11. A screen too narrow for that shrinks it to fit (index.html).
export const TITLE_SCALE = 3;
// Placeholder value. How likely a pixel inside a thick stroke is to start a crack.
const CRACK_CHANCE = 0.012;

type Mask = boolean[][];

// The pixels a text covers in the font at a size, cropped to them.
function textMask(text: string, size: number): Mask {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const font = `bold ${size}px Galmuri11`;
  context.font = font;
  const metrics = context.measureText(text);
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent);
  canvas.width = Math.ceil(metrics.width) + 4;
  canvas.height = ascent + Math.ceil(metrics.actualBoundingBoxDescent) + 4;
  context.font = font;
  context.fillStyle = '#fff';
  context.fillText(text, 2, 2 + ascent);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  const rows: Mask = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => data[(y * width + x) * 4 + 3] >= 128),
  );
  const filled = rows.flatMap((row, y) => row.flatMap((on, x) => (on ? [{ x, y }] : [])));
  const left = Math.min(...filled.map(({ x }) => x));
  const right = Math.max(...filled.map(({ x }) => x));
  const top = Math.min(...filled.map(({ y }) => y));
  const bottom = Math.max(...filled.map(({ y }) => y));
  return rows.slice(top, bottom + 1).map((row) => row.slice(left, right + 1));
}

function noise(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Draws the title once the font is loaded. Returns its picture as SVG and its size in art pixels.
export async function drawTitle(): Promise<{ svg: string; width: number; height: number }> {
  await Promise.all([
    document.fonts.load(`bold ${SMALL}px Galmuri11`),
    document.fonts.load(`bold ${LARGE}px Galmuri11`),
  ]);
  const small = textMask('ThorVG', SMALL);
  const large = textMask('Dungeon', LARGE);
  const width = Math.max(small[0].length, large[0].length) + MARGIN * 2;
  const smallTop = MARGIN;
  const largeTop = smallTop + small.length + 4;
  const height = largeTop + large.length + MARGIN;
  const rows = Array.from({ length: height }, () => Array<string>(width).fill('.'));

  // Each word, as a function telling whether an art pixel is in its letters.
  const inWord = (mask: Mask, top: number) => (x: number, y: number) =>
    mask[y - top]?.[x - MARGIN] === true;
  const words = [
    { isIn: inWord(small, smallTop), top: smallTop, height: small.length, shadow: 2 },
    { isIn: inWord(large, largeTop), top: largeTop, height: large.length, shadow: 3 },
  ];
  const isLetter = (x: number, y: number) => words.some(({ isIn }) => isIn(x, y));

  // The shadow falls down and to the right of the letters, and the outline goes around them.
  for (const { isIn, shadow } of words) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isLetter(x, y) && isIn(x - shadow, y - shadow)) {
          rows[y][x] = 'S';
        }
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isNextToLetter = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => isLetter(x + dx, y + dy)));
      if (!isLetter(x, y) && isNextToLetter) {
        rows[y][x] = 'K';
      }
    }
  }

  // The gold of "ThorVG", from light at the top to dark at the bottom of the word.
  const gold = words[0];
  const goldShades = ['Y', 'Y', 'O', 'O', 'R'];
  // The stone of "Dungeon", from light at the top to dark at the bottom of the word.
  const stone = words[1];
  const stoneShades = ['A', 'B', 'B', 'C', 'C', 'D'];
  for (const [word, shades, lit, shaded] of [
    [gold, goldShades, 'W', 'Q'],
    [stone, stoneShades, 'H', 'L'],
  ] as const) {
    for (let y = word.top; y < word.top + word.height; y++) {
      for (let x = 0; x < width; x++) {
        if (!word.isIn(x, y)) {
          continue;
        }
        const share = (y - word.top) / word.height;
        let key: string = shades[Math.min(shades.length - 1, Math.floor(share * shades.length))];
        if (!word.isIn(x, y - 1)) {
          key = lit;
        } else if (!word.isIn(x, y + 1)) {
          key = shaded;
        }
        rows[y][x] = key;
      }
    }
  }

  // Cracks run down and across the stone, where a stroke is thick enough to hold one.
  const isInside = (x: number, y: number) =>
    [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => stone.isIn(x + dx, y + dy)));
  for (let y = stone.top; y < stone.top + stone.height; y++) {
    for (let x = 0; x < width; x++) {
      if (isInside(x, y) && noise(x, y) < CRACK_CHANCE) {
        let crackX = x;
        for (let step = 0; step < 4 && isInside(crackX, y + step); step++) {
          rows[y + step][crackX] = 'X';
          crackX += noise(x, y + step + 9) < 0.5 ? 1 : 0;
        }
      }
    }
  }

  return {
    svg: pixelSvg(
      rows.map((row) => row.join('')),
      PALETTE,
    ),
    width,
    height,
  };
}
