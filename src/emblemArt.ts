import { mutedPalette, pixelSvg } from './pixelSprite';

type Color = [r: number, g: number, b: number];

// The emblem of the clear screen: a sword standing point up inside a laurel wreath, tied with a
// ribbon at the bottom. Placeholder colors, muted as those of the items are.
const PALETTE = mutedPalette(
  {
    // The leaves of the wreath, light and dark.
    g: [118, 168, 84],
    G: [62, 104, 50],
    // The blade, its lit middle, and its point.
    b: [150, 156, 170],
    B: [222, 226, 236],
    // The guard and the grip, gold, and the dark between the grip's wraps.
    y: [214, 172, 72],
    k: [92, 62, 30],
    // The ribbon and its shade.
    r: [178, 52, 48],
    R: [118, 30, 30],
  } satisfies Record<string, Color>,
  [],
);

const EMBLEM = [
  '.........B.........',
  '........bBb........',
  '...G....bBb....G...',
  '..Gg....bBb....gG..',
  '.Gg.....bBb.....gG.',
  '.Gg.....bBb.....gG.',
  'Gg......bBb......gG',
  'Gg......bBb......gG',
  'Ggg.....bBb.....ggG',
  '.Gg.....bBb.....gG.',
  '.Ggg..yyyyyyy..ggG.',
  '..Gg....kyk....gG..',
  '..Ggg...yky...ggG..',
  '...Ggg..kyk..ggG...',
  '....Gggg.y.ggggG...',
  '......GgRrRgG......',
  '.......RrRrR.......',
  '......Rr...rR......',
  '.....Rr.....rR.....',
];

export const EMBLEM_SVG = pixelSvg(EMBLEM, PALETTE);
export const EMBLEM_WIDTH = Math.max(...EMBLEM.map((row) => row.length));
export const EMBLEM_HEIGHT = EMBLEM.length;
