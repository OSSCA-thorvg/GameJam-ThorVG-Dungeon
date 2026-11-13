import { pixelSvg } from './pixelSprite';

type Color = [r: number, g: number, b: number];

// Pixel art of the interface: the icons of the buttons and the HUD, drawn in 12 by 12 art pixels,
// and the frames of buttons, windows and bag slots, which the page stretches as border images. k is
// the outline.
const PALETTE: Record<string, Color> = {
  '1': [207, 232, 240],
  A: [109, 115, 128],
  B: [91, 70, 54],
  G: [154, 116, 36],
  H: [74, 54, 38],
  T: [184, 168, 136],
  U: [126, 110, 86],
  V: [216, 200, 164],
  '[': [184, 88, 42],
  ']': [255, 154, 90],
  a: [174, 180, 192],
  f: [212, 192, 144],
  g: [224, 176, 64],
  h: [122, 90, 60],
  j: [154, 118, 80],
  k: [21, 22, 28],
  v: [168, 132, 78],
  y: [244, 216, 120],
  z: [228, 232, 240],
  '}': [255, 196, 144],
};

const WAIT = [
  '.kvvvvvvvvk.',
  '..k111111k..',
  '...k1yyyk...',
  '...k11yk....',
  '....k11k....',
  '.....kk.....',
  '.....kyk....',
  '....k1yk....',
  '...k111k....',
  '...k11y1k...',
  '..k11yyy1k..',
  '.kvBBBBBBvk.',
];

const EXAMINE = [
  '.kkkkkkk....',
  'kzzzzzzzk...',
  'kaaa11aazk..',
  'ka1zz111ak..',
  'ka111111ak..',
  'ka111111ak..',
  'ka111111ak..',
  'kaaa11aaak..',
  'kAAAAAAABBk.',
  '.kkkkkkkkBBk',
  '.........kBB',
  '..........kB',
];

const LOG = [
  'kVVVVVVVVVVk',
  'kUTTTTTTTTUk',
  '.kffffffffk.',
  '.kffffffffk.',
  '.kfUUUUUUfk.',
  '.kffffffffk.',
  '.kfUUUUUffk.',
  '.kffffffffk.',
  '.kfUUUUUUfk.',
  '.kffffffffk.',
  'kVTTTTTTTTVk',
  'kUUUUUUUUUUk',
];

const SETTINGS = [
  '..k.kzzk.k..',
  '.kakkaakkak.',
  'kakzzaazzkak',
  '.kzaaAAaazk.',
  'kkaaAkkAaakk',
  'zzaak..kaazz',
  'AAaak..kaaAA',
  'kkaazkkzaakk',
  '.kAaazzaaAk.',
  'kakAAaaAAkak',
  '.kakkaakkak.',
  '..k.kAAk.k..',
];

const BAG_CLOSED = [
  '.....kk.....',
  '....kTTk....',
  '...kVVVVk...',
  '...kTTTTk...',
  '..kjhhhhjk..',
  '.kjhhhhhhjk.',
  '.khHHHHHHHk.',
  'kjhhhhhhhhjk',
  'khhhhjjhhhHk',
  'kHhhhhhhhhk.',
  '.kHHHHHHHHk.',
  '..kkkkkkkk..',
];

const BAG_OPEN = [
  '............',
  '............',
  '.kkkkkkkkkk.',
  'kjjjjjjjjjjk',
  'kjkkkyykkkk.',
  '.kjkkkkgkjk.',
  '.khhhhhhhhk.',
  'kjhhhhhhhhjk',
  'khhhHhhhhhHk',
  'kHhhhhhHhhk.',
  '.kHHHHHHHHk.',
  '..kkkkkkkk..',
];

const CLOSE = [
  '.k....k.',
  'kzk..kzk',
  '.kzkkzk.',
  '..kzzk..',
  '..kzzk..',
  '.kzkkzk.',
  'kzk..kzk',
  '.k....k.',
];

const COIN = [
  '....kkk.....',
  '...kyyykk...',
  '..kygggyyk..',
  '.kygyygggyk.',
  'kyggggggggyk',
  'kggyggGggggk',
  'kGggggGgggGk',
  '.kggggGgggk.',
  '.kGggggggGk.',
  '..kGGggGGk..',
  '...kkGGkk...',
  '.....kk.....',
];

const STRENGTH = [
  '.......k}}}k',
  '......k}]]]}',
  '......k]][[]',
  '......k[[]]]',
  '...kkk.k]]]]',
  '..k}}}kk]]]]',
  '.k}}]]}k]]]]',
  'k}]]]]]}]]]]',
  '}]]]]]][]]][',
  ']]]]]]]][][k',
  ']]]]][]]][k.',
  '[[[[[[[[[k..',
];

// Each status icon is 11 by 11 art pixels, in one color, which # marks.
export const STATUS_ICON_ROWS = {
  haste: [
    '...........',
    '...........',
    '##...##....',
    '.##...##...',
    '..##...##..',
    '...##...##.',
    '..##...##..',
    '.##...##...',
    '##...##....',
    '...........',
    '...........',
  ],
  invisible: [
    '...#####...',
    '..#.....#..',
    '.#......##.',
    '#......#..#',
    '#.....#...#',
    '#....#....#',
    '#...#.....#',
    '#..#......#',
    '.##......#.',
    '..#.....#..',
    '...#####...',
  ],
  levitating: [
    '.....#.....',
    '....###....',
    '...#####...',
    '..#######..',
    '.#########.',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '...........',
  ],
  telepathy: [
    '...........',
    '...........',
    '...#####...',
    '.##.....##.',
    '#...###...#',
    '#...###...#',
    '#...###...#',
    '.##.....##.',
    '...#####...',
    '...........',
    '...........',
  ],
  paralyzed: [
    '......####.',
    '.....####..',
    '....####...',
    '...####....',
    '..########.',
    '.....####..',
    '....####...',
    '...###.....',
    '..##.......',
    '.#.........',
    '...........',
  ],
  frozen: [
    '.....#.....',
    '.#..###..#.',
    '..#..#..#..',
    '...#.#.#...',
    '.#..###..#.',
    '###########',
    '.#..###..#.',
    '...#.#.#...',
    '..#..#..#..',
    '.#..###..#.',
    '.....#.....',
  ],
  burning: [
    '.....#.....',
    '.....##....',
    '....###....',
    '...####.#..',
    '...#####...',
    '..#######..',
    '.#########.',
    '.#########.',
    '.#########.',
    '..#######..',
    '...#####...',
  ],
  poisoned: [
    '.....#.....',
    '.....#.....',
    '....###....',
    '....###....',
    '...#####...',
    '..#######..',
    '.##.######.',
    '.##.######.',
    '.#########.',
    '..#######..',
    '...#####...',
  ],
  stunned: [
    '...#####...',
    '..#.....#..',
    '.#.......#.',
    '#..#...#..#',
    '#...#.#...#',
    '#....#....#',
    '#...#.#...#',
    '#..#...#..#',
    '.#.......#.',
    '..#.....#..',
    '...#####...',
  ],
  weakened: [
    '...........',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '.#########.',
    '..#######..',
    '...#####...',
    '....###....',
    '.....#.....',
  ],
  shielded: [
    '.#########.',
    '.#.......#.',
    '.#.......#.',
    '.#.......#.',
    '.#.......#.',
    '.#.......#.',
    '..#.....#..',
    '..#.....#..',
    '...#...#...',
    '....#.#....',
    '.....#.....',
  ],
  regenerating: [
    '...........',
    '....###....',
    '....###....',
    '....###....',
    '.#########.',
    '.#########.',
    '.#########.',
    '....###....',
    '....###....',
    '....###....',
    '...........',
  ],
  hungry: [
    '#.#.#..##..',
    '#.#.#..###.',
    '#.#.#..###.',
    '#####..###.',
    '.###...###.',
    '..#....###.',
    '..#.....#..',
    '..#.....#..',
    '..#.....#..',
    '..#.....#..',
    '..#.....#..',
  ],
  starving: [
    '#.#.#..##..',
    '#.#.#..###.',
    '#.#.#..###.',
    '#####..###.',
    '.###...###.',
    '..#....###.',
    '..#.....#..',
    '..#.....#..',
    '..#.....#..',
    '..#.....#..',
    '..#.....#..',
  ],
};

export type StatusIconName = keyof typeof STATUS_ICON_ROWS;

// A status icon as SVG markup in an 11 by 11 box, painted in the color of the text around it.
export function statusIconMarkup(name: StatusIconName): string {
  return pixelSvg(STATUS_ICON_ROWS[name], { '#': [0, 0, 0] })
    .replace(/^<svg[^>]*>/, '')
    .replace('</svg>', '')
    .replace('fill="#000000"', 'fill="currentColor"');
}

export const HUD_ICONS = { coin: COIN, strength: STRENGTH };
export const HUD_PALETTE = PALETTE;

// The colors of the frames. Each frame is a set of rows, where a letter names a color and '.' is
// left empty.
const FRAME_COLORS: Record<string, Color> = {
  k: [21, 22, 28],
  // A button: its face, its lit top and left edges, and its shaded bottom and right edges.
  F: [44, 46, 54],
  L: [90, 94, 108],
  D: [28, 29, 36],
  f: [58, 62, 74],
  l: [122, 126, 142],
  p: [36, 38, 46],
  // A window: its rim, its inside and its rivets.
  B: [74, 77, 88],
  I: [31, 32, 39],
  R: [106, 110, 124],
  // A bag slot: its rim when normal, selected and holding an unknown potion, its inside, and the
  // shade inside its top and left edges.
  S: [74, 77, 88],
  Y: [224, 176, 64],
  P: [84, 73, 122],
  i: [44, 46, 54],
  u: [58, 51, 82],
  s: [28, 29, 36],
  e: [106, 84, 32],
  // A switch: its track off and on, and its knob.
  t: [44, 46, 54],
  T: [200, 90, 60],
  n: [168, 172, 184],
  N: [220, 223, 232],
  m: [106, 110, 124],
  // An arrow on a select box.
  a: [200, 202, 210],
};

const frame = (rows: string[]) => pixelSvg(rows, FRAME_COLORS);

// Rows of a button, 7 by 7 art pixels, to be cut 2 pixels in from each side.
const buttonRows = (face: string, lit: string, shaded: string) => [
  '.kkkkk.',
  `k${lit.repeat(5)}k`,
  `k${lit}${face.repeat(3)}${shaded}k`,
  `k${lit}${face.repeat(3)}${shaded}k`,
  `k${lit}${face.repeat(3)}${shaded}k`,
  `k${shaded.repeat(5)}k`,
  '.kkkkk.',
];

// Rows of a bag slot, 7 by 7 art pixels, to be cut 3 pixels in from each side.
const slotRows = (rim: string, inside: string, bottom = inside) => [
  'kkkkkkk',
  `k${rim.repeat(5)}k`,
  `k${rim}sss${rim}k`,
  `k${rim}s${inside.repeat(2)}${rim}k`,
  `k${rim}s${bottom.repeat(2)}${rim}k`,
  `k${rim.repeat(5)}k`,
  'kkkkkkk',
];

// Rows of a switch, 26 by 14 art pixels, with its knob at the left or at the right.
function switchRows(isOn: boolean): string[] {
  const width = 26;
  const track = isOn ? 'T' : 't';
  const knobLeft = isOn ? width - 13 : 1;
  return Array.from({ length: 14 }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const isCorner = (x === 0 || x === width - 1) && (y === 0 || y === 13);
      if (isCorner) {
        return '.';
      }
      const kx = x - knobLeft;
      if (kx >= 0 && kx < 12 && y >= 1 && y <= 12) {
        if (kx === 0 || kx === 11 || y === 1 || y === 12) {
          return 'k';
        }
        if (y === 2) {
          return 'N';
        }
        if (y === 11 || ((kx === 4 || kx === 7) && y >= 5 && y <= 8)) {
          return 'm';
        }
        return 'n';
      }
      return x === 0 || x === width - 1 || y === 0 || y === 13 ? 'k' : track;
    }).join(''),
  );
}

// The knob of a slider, 7 by 12 art pixels.
const SLIDER_KNOB = [
  'kkkkkkk',
  'kNNNNNk',
  'knnnnnk',
  'knnmnnk',
  'knnmnnk',
  'knnmnnk',
  'knnmnnk',
  'knnmnnk',
  'knnmnnk',
  'knnnnnk',
  'kmmmmmk',
  'kkkkkkk',
];

// The badge behind a status icon, 15 by 15 art pixels.
const BADGE = Array.from({ length: 15 }, (_, y) =>
  Array.from({ length: 15 }, (_, x) => {
    const isEdge = x === 0 || x === 14 || y === 0 || y === 14;
    if (isEdge && (x === 0 || x === 14) && (y === 0 || y === 14)) {
      return '.';
    }
    return isEdge ? 'k' : y === 1 ? 'B' : 'I';
  }).join(''),
);

const SELECT_ARROW = ['aaaaaaa', '.aaaaa.', '..aaa..', '...a...'];

const url = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const icon = (rows: string[]) => url(pixelSvg(rows, PALETTE));

// Hands the art to the page's style sheet as custom properties, which index.html uses.
export function applyUiArt(root: HTMLElement = document.documentElement): void {
  const properties: Record<string, string> = {
    '--button': url(frame(buttonRows('F', 'L', 'D'))),
    '--button-hover': url(frame(buttonRows('f', 'l', 'D'))),
    '--button-pressed': url(frame(buttonRows('p', 'D', 'L'))),
    '--window': url(
      frame([
        '.kkkkkkk.',
        'kBBBBBBBk',
        'kBIIIIIBk',
        'kBIRIRIBk',
        'kBIIIIIBk',
        'kBIRIRIBk',
        'kBIIIIIBk',
        'kBBBBBBBk',
        '.kkkkkkk.',
      ]),
    ),
    '--slot': url(frame(slotRows('S', 'i'))),
    '--slot-selected': url(frame(slotRows('Y', 'i', 'e'))),
    '--slot-unknown': url(frame(slotRows('P', 'u'))),
    '--switch-off': url(frame(switchRows(false))),
    '--switch-on': url(frame(switchRows(true))),
    '--slider-knob': url(frame(SLIDER_KNOB)),
    '--badge': url(frame(BADGE)),
    '--select-arrow': url(frame(SELECT_ARROW)),
    '--icon-wait': icon(WAIT),
    '--icon-examine': icon(EXAMINE),
    '--icon-log': icon(LOG),
    '--icon-settings': icon(SETTINGS),
    '--icon-bag': icon(BAG_CLOSED),
    '--icon-bag-open': icon(BAG_OPEN),
    '--icon-close': icon(CLOSE),
  };
  for (const [name, value] of Object.entries(properties)) {
    root.style.setProperty(name, value);
  }
}
