import { muted, mutedPalette, pixelSvg } from './pixelSprite';

type Color = [r: number, g: number, b: number];

// Pixel art of the items and the objects that lie on the floor. An item is 16 by 16 art pixels, the
// chest is 24 by 24, about as big as a coffin, and the campfire is 32 by 32, as wide as a tile. k is
// the outline.
// The colors the art was drawn in, before mutedPalette() fits them to the tiles.
const DRAWN_PALETTE: Record<string, Color> = {
  '1': [207, 232, 240],
  '2': [44, 44, 52],
  '3': [138, 142, 154],
  '4': [200, 66, 30],
  '5': [244, 160, 48],
  '6': [255, 224, 112],
  A: [109, 115, 128],
  B: [91, 70, 54],
  E: [138, 118, 86],
  G: [154, 116, 36],
  H: [74, 54, 38],
  N: [138, 58, 54],
  R: [106, 20, 24],
  X: [106, 58, 24],
  Y: [122, 106, 146],
  Z: [50, 40, 62],
  a: [174, 180, 192],
  b: [138, 106, 60],
  e: [185, 162, 122],
  f: [212, 192, 144],
  g: [224, 176, 64],
  h: [122, 90, 60],
  i: [200, 136, 72],
  j: [154, 118, 80],
  k: [21, 22, 28],
  n: [200, 106, 96],
  r: [216, 53, 42],
  u: [224, 144, 138],
  v: [168, 132, 78],
  w: [238, 232, 216],
  x: [168, 96, 44],
  y: [244, 216, 120],
  z: [228, 232, 240],
};

const WORN_SHORTSWORD = [
  '................',
  '..............k.',
  '.............kak',
  '............kzzk',
  '...........kzAk.',
  '..........kzAk..',
  '.........kzAk...',
  '....k...kzAk....',
  '...kBk.kzAk.....',
  '....kBkzAk......',
  '.....kBak.......',
  '....kjkBk.......',
  '...kjk.kBk......',
  '..kjk...k.......',
  '.kjk............',
  'kBk.............',
];

const LONGSWORD = [
  '...............k',
  '..............kz',
  '.............kzz',
  '............kzAk',
  '...........kzAk.',
  '..........kzAk..',
  '...k.....kzAk...',
  '..kyk...kzAk....',
  '...kyk.kzAk.....',
  '....kykzAk......',
  '.....kykk.......',
  '....kjkyk.......',
  '...kjk.kyk......',
  '..kjk...kyk.....',
  '.kjk.....k......',
  'kgk.............',
];

const DAGGER = [
  '................',
  '...............k',
  '..............kz',
  '.............kzk',
  '............kzk.',
  '...........kzk..',
  '..........kzAk..',
  '.........kzAk...',
  '......k.kzAk....',
  '.....kykzAk.....',
  '......kykk......',
  '......k22k......',
  '.....k22kyk.....',
  '....k32k.k......',
  '...k22k.........',
  '..kgkk..........',
];

const SPEAR = [
  '............kkzk',
  '...........kzzAk',
  '..........kzazk.',
  '.........kzazak.',
  '.........kaaaAk.',
  '........kzaaAk..',
  '........kaaGk...',
  '........kaGk....',
  '.......kvGk.....',
  '......kRrrk.....',
  '.....kvrrk......',
  '....kvkkk.......',
  '...kvk..........',
  '..kvk...........',
  '.kvk............',
  'kvk.............',
];

const ZWEIHANDER = [
  '...............k',
  '..............kz',
  '.............kzz',
  '............kzaA',
  '...........kzAAk',
  '..k.......kzAAk.',
  '.kyk.....kzAAk..',
  '..kyk...kzAAk...',
  '...kyk.kzAAk....',
  '....kykzAAk.....',
  '.....kyaAk......',
  '....kYZGk.......',
  '...kYZkkyk......',
  '..kYZk..kyk.....',
  'kkYZk....kyk....',
  'yYZk......k.....',
];

const DART = [
  '...............k',
  '.............kkz',
  '............kaak',
  '............kaak',
  '...........kvkk.',
  '..........kvk...',
  '.........kvk....',
  '........kvk.....',
  '.......kvk......',
  '......kvk.......',
  '.....kvk........',
  '..k.kvk.........',
  '.krkvk..........',
  'krrvk...........',
  'krrrk...........',
  '.kkk............',
];

const JAVELIN = [
  '..............kz',
  '.............kak',
  '............kvk.',
  '...........kvk..',
  '..........kvk...',
  '.........kvk....',
  '........kvk.....',
  '.......kvk......',
  '......kvk.......',
  '.....kvk........',
  '....kvk.........',
  '...kvk..........',
  '..kvk...........',
  '.kvk............',
  'kvk.............',
  'vk..............',
];

const THROWING_AXE = [
  '............kkzk',
  '...........kzzaz',
  '..........kzaaaz',
  '..........kazaaz',
  '.........kzaaaaz',
  '.........kaAAAAz',
  '.........kaaaaaz',
  '........kvAaaaaz',
  '.......kvkkAAaaz',
  '......kvk..kkAAz',
  '.....kvk.....kkk',
  '....kvk.........',
  '...kvk..........',
  '..kvk...........',
  '.kvk............',
  '..k.............',
];

const CLOTH_ARMOR = [
  '................',
  '.....kk..kk.....',
  '...kkffkkffkk...',
  '..kffeeEEeeffk..',
  '.kfeeeeEEeeeefk.',
  '..keeeeeeeeeek..',
  '..kEEeeeEeeeEk..',
  '...kkeeeEeeEk...',
  '....keeeEeek....',
  '....keeeEeek....',
  '....keeeEeek....',
  '....keeeEeek....',
  '....keeeEeek....',
  '....kEEEEEEk....',
  '.....kkkkkk.....',
  '................',
];

const LEATHER_ARMOR = [
  '................',
  '.....kk..kk.....',
  '...kkjjkkjjkk...',
  '..kjjhgjjhgjjk..',
  '.kjhhhhhhhhhhjk.',
  '..khhhhhhhhhhk..',
  '..kHHHhhhhhHHk..',
  '...kkhHhhhHHk...',
  '....khhHhHhk....',
  '....khhhghhk....',
  '....khhHhHhk....',
  '....khHhhhHk....',
  '....kHhhhhhHk...',
  '....kHHHHHHk....',
  '.....kkkkkk.....',
  '................',
];

const CHAIN_MAIL = [
  '................',
  '.....kk..kk.....',
  '...kkzzkkzzkk...',
  '..kAzAaAzAaAzk..',
  '.kzaAaAaAaAaAzk.',
  '..kAaAaAaAaAak..',
  '..kAAaAaAaAaAk..',
  '..kAkAaAaAaAk...',
  '...kAaAaAaAkAk..',
  '..kAkAaAaAaAk...',
  '...kAaAaAaAkAk..',
  '..kAkAaAaAaAk...',
  '...kAaAaAaAkAk..',
  '..kAkAAAAAAAk...',
  '...k.kkkkkkk....',
  '................',
];

const PLATE_ARMOR = [
  '................',
  '..kk......kkk...',
  '.kzzkkkkkkzzzk..',
  'kzzzzzAzzAaazzk.',
  'zaaaaaAazAaaaazk',
  'AAaaaaAazAaaaaAk',
  'kAaAaaAazAaaAAk.',
  '.kAAAaAazAaAAk..',
  '..kkkaAazAakk...',
  '....kaAazAak....',
  '....kaaazaak....',
  '....kAAAAAAk....',
  '...kzaaaaaazk...',
  '...kAAAAAAAAk...',
  '...kAAAAAAAAk...',
  '....kkkkkkkk....',
];

const RING = [
  '................',
  '.......kk.......',
  '......kruk......',
  '.....krurrk.....',
  '.....krrrRk.....',
  '.....kkrRkk.....',
  '...kkyyggyykk...',
  '..kyyGGGGGgyyk..',
  '.kyggkkkkkGggyk.',
  '.kgggk....kgggk.',
  '.kGggk....kggGk.',
  '..kggkkkkkyggk..',
  '..kGGyyyyygGGk..',
  '...kkGGGGGGkk...',
  '.....kkkkkk.....',
  '................',
];

const RATION = [
  '................',
  '................',
  '................',
  '................',
  '...kkkkkkkkk....',
  '..kiiiffffiik...',
  '.kixxXeeeexXik..',
  'kixxxXeeeexXxik.',
  'kxxxxXeeeexXxxik',
  'kxxxXxeeeexxXxxk',
  'kxxxXxeeeexxXxxk',
  'kXXXXXeeeeXXXXXk',
  '.kkkkkEEEEkkkkk.',
  '......kkkk......',
  '................',
  '................',
];

const TRAVEL_RATION = [
  '................',
  '......k..k......',
  '.....kekkek.....',
  '.....kkeekk.....',
  '....kffffffk....',
  '....keeeeeek....',
  '...kjhhhhhhjk...',
  '...khhhhhhhhk...',
  '..kjhhhhhhhhjk..',
  '..khhHHHHHHHhk..',
  '..khhhhhhhhhhk..',
  '.kjhhhhhhhhhhjk.',
  '.kHHHHHHHHHHHHk.',
  '..kkkkkkkkkkkk..',
  '................',
  '................',
];

const RAW_MEAT = [
  '..............kk',
  '.............kww',
  '.............kww',
  '.......kkk..kwwk',
  '....kkkuuukkwwk.',
  '..kkuuunnnuwwk..',
  '.kuunnuunnnnnk..',
  '.knnuuuuunnnnuk.',
  '.knnnuunnnnnnNk.',
  '.kNnnnnnnnnNnk..',
  '..kNnnnnnnNnnk..',
  '...kNNnnnNNNNk..',
  '....kNNNNkkkk...',
  '.....kkkk.......',
  '................',
  '................',
];

const COOKED_MEAT = [
  '................',
  '.....kkk........',
  '..kkkiiik.......',
  '.kiiixxxik......',
  'kixxiixxxik.....',
  'kxxxxxxxxxik....',
  'kXxxxxxxxxXk....',
  '.kXxxXxXxXk.....',
  '..kXXxxxxk......',
  '...kkXXXwwk.....',
  '.....kkkkwwk....',
  '.........kwwk...',
  '..........kwwk..',
  '...........kwwkk',
  '............kwww',
  '.............kwk',
];

const IRON_KEY = [
  '.kkkkk..........',
  'kzzzzzk.........',
  'kaAAAazk........',
  'kakkkaak........',
  'kakkkaak........',
  'kazzzaak........',
  'kAAAAAAzk.......',
  '.kkkkkkAzk......',
  '.......kzzk.....',
  '........kzzk....',
  '.........kAzk.kk',
  '..........kAzkAA',
  '...........kAzkk',
  '...........kkAzk',
  '..........kAkAk.',
  '..........kAkk..',
];

const GOLD = [
  '................',
  '......kkk.......',
  '....kkyyykk.....',
  '...kyygggyyk....',
  '..kygGyyGGgyk...',
  '..kgGyggggGgyk..',
  '.kygygggGggGgk..',
  '.kggGgggGggGgyk.',
  '.kggGgggGggGgGk.',
  '.kGgGgggGggGgk..',
  '..kgGGggGgGgGk..',
  '..kGgGGGGGgGk...',
  '...kGGgggGGk....',
  '....kkGGGkk.....',
  '......kkk.......',
  '................',
];

const CAMPFIRE = [
  '................................',
  '................................',
  '...............kk...............',
  '..............k44k..............',
  '.............k4444k.............',
  '.............k4444k...k.........',
  '............k444444k.k4k........',
  '.........k.k44444444kk4k........',
  '........k4kk44444444kk44k.......',
  '........k444444554444k44k.......',
  '........k444445554444k444k......',
  '.......k44444455554444444k......',
  '.......k44444555555444444k......',
  '.......k4444455555544444k.......',
  '........k44445555554444k........',
  '.......k444455566554444k........',
  '.......k4444555665554444k.......',
  '.......k4444556666554444k.......',
  '.......k4444556666554444k.......',
  '..kk....k44445666654444k...kk...',
  '.kvvkkkkk44445566554444kkkkvvk..',
  'kvvbvvvvv4444556655444bvvvvbbvk.',
  'kBvbbbbbbbbbb45555bbbbbbbbbbBvk.',
  '.kkBBBBBbbbbbbbbbbbbbbbBBBBBkk..',
  '...kkkkkbbbbbbbbbbbbbbbkkkkk....',
  '..kkvvvvbbbbbbBBBbbbbbbvvvvkk...',
  '.kvvbbbbbbBBBBkkkBBBBbbbbbbvvk..',
  '.kvbbBBBBBkkkk...kkkkBBBBBbbvvk.',
  '.kvBBkkkkk...........kkkkkBBkk..',
  '..kkk.....................kk....',
  '................................',
  '................................',
];

const FLASK = [
  '......kkkk......',
  '.....kvvvvk.....',
  '.....kbbbbk.....',
  '.....k1111k.....',
  '.....k1z11k.....',
  '.....k1111k.....',
  '.....k1111k.....',
  '....k111111k....',
  '...k11111111k...',
  '..k11=====111k..',
  '.k1==z=======1k.',
  '.k===z========k.',
  '.k-==========-k.',
  '..k--=====---k..',
  '...kk-----kkk...',
  '.....kkkkk......',
];

const CHEST = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '....kkkkkkkkkkkkkkkk....',
  '...kjzzjjjjjjjjjjzzjk...',
  '..kjhaahhhhhhhhhhaahjk..',
  '.kjhhaahhhhhhhhhhaahhjk.',
  '.khhhaahhhhhhhhhhaahhhk.',
  '.kHHHaaHHHHHHHHHHaaHHHk.',
  '.khhhaahhhyggghhhaahhhk.',
  '.khhhaahhhgggghhhaahhhk.',
  '.kHHHaaHHHgkggHHHaaHHHk.',
  '.khhhaahHhgkgghHhaahhhk.',
  '.khhhaahHhgggghHhaahhhk.',
  '.khhhaahHhhhhhhHhaahhhk.',
  '.khhhaahHhhhhhhHhaahhhk.',
  '.kHHHaaHHHHHHHHHHaaHHHk.',
  '.khhhaahHhhhhhhHhaahhhk.',
  '.khhhaahHhhhhhhHhaahhhk.',
  '.kHHHAAHHHHHHHHHHAAHHHk.',
  '..kkkkkkkkkkkkkkkkkkkk..',
];

// The heart of the campfire's flames gives off light, so its orange and yellow keep their colors.
// Its red edge is muted as the rest of the art is, as its pure red stood apart from it.
const PALETTE = mutedPalette(DRAWN_PALETTE, ['5', '6']);

const icon = (rows: string[]) => pixelSvg(rows, PALETTE);

// The campfire flickers through a few frames, its flames swaying to the sides more the higher they
// are, over logs that stay still. Placeholder values: how many frames the loop has, the rows above
// the logs, and how far the top of the flames sways, in art pixels.
const CAMPFIRE_FRAME_COUNT = 4;
const FLAME_ROWS = 19;
const FLAME_SWAY = 1.6;

const shiftRow = (row: string, by: number) =>
  by > 0 ? '.'.repeat(by) + row.slice(0, -by) : by < 0 ? row.slice(-by) + '.'.repeat(-by) : row;

export const CAMPFIRE_FRAMES = Array.from({ length: CAMPFIRE_FRAME_COUNT }, (_, frame) =>
  icon(
    CAMPFIRE.map((row, y) => {
      if (y >= FLAME_ROWS) {
        return row;
      }
      const phase = (frame / CAMPFIRE_FRAME_COUNT) * 2 * Math.PI + y * 0.6;
      return shiftRow(row, Math.round(Math.sin(phase) * (1 - y / FLAME_ROWS) * FLAME_SWAY));
    }),
  ),
);

export const ITEM_ICONS = {
  'worn-shortsword': icon(WORN_SHORTSWORD),
  longsword: icon(LONGSWORD),
  dagger: icon(DAGGER),
  spear: icon(SPEAR),
  zweihander: icon(ZWEIHANDER),
  dart: icon(DART),
  javelin: icon(JAVELIN),
  'throwing-axe': icon(THROWING_AXE),
  'cloth-armor': icon(CLOTH_ARMOR),
  'leather-armor': icon(LEATHER_ARMOR),
  'chain-mail': icon(CHAIN_MAIL),
  'plate-armor': icon(PLATE_ARMOR),
  ring: icon(RING),
  ration: icon(RATION),
  'travel-ration': icon(TRAVEL_RATION),
  'raw-meat': icon(RAW_MEAT),
  'cooked-meat': icon(COOKED_MEAT),
  'iron-key': icon(IRON_KEY),
  gold: icon(GOLD),
  campfire: icon(CAMPFIRE),
  chest: icon(CHEST),
};

// Placeholder values. How much lighter and darker the lit top and the shaded bottom of a liquid are.
const lighter = (color: Color): Color =>
  color.map((value) => Math.min(255, Math.round(value * 1.2 + 24))) as Color;
const darker = (color: Color): Color => color.map((value) => Math.round(value * 0.7)) as Color;

// A gem in the corner of a flask, in the color of what the potion does, once it is known. M is the
// color and z its shine.
const MARK = [
  '...k...',
  '..kMk..',
  '.kMzMk.',
  'kMMMMMk',
  '.kMMMk.',
  '..kMk..',
  '...k...',
];
const MARK_LEFT = 9;

// A flask holding a liquid of a color, whose top is lit and whose bottom is shaded, with the gem of
// a mark color when there is one.
export function flaskIcon(liquid: Color, mark?: Color): string {
  const rows = mark
    ? FLASK.map((row, y) =>
        MARK[y]
          ? [...row]
              .map((pixel, x) => {
                const markPixel = MARK[y][x - MARK_LEFT] ?? '.';
                return markPixel === '.' ? pixel : markPixel;
              })
              .join('')
          : row,
      )
    : FLASK;
  return pixelSvg(rows, {
    ...PALETTE,
    '+': muted(lighter(liquid)),
    '=': muted(liquid),
    '-': muted(darker(liquid)),
    M: mark ? muted(mark) : PALETTE.k,
  });
}
