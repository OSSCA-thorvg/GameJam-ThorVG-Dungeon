import { mutedPalette, pixelSvg } from './pixelSprite';

type Color = [r: number, g: number, b: number];

// Pixel art of the hero and the enemies, 32 by 32 art pixels. The mimic is 24 by 24, as big as the
// chest it passes for. k is the outline.

// The colors the art was drawn in, before mutedPalette() fits them to the tiles.
const DRAWN_PALETTE: Record<string, Color> = {
  '!': [78, 90, 70],
  '#': [200, 90, 60],
  '$': [74, 18, 16],
  '0': [152, 166, 140],
  '6': [255, 224, 112],
  '@': [138, 42, 36],
  A: [109, 115, 128],
  B: [91, 70, 54],
  C: [154, 48, 48],
  D: [90, 28, 28],
  F: [192, 80, 80],
  H: [74, 54, 38],
  L: [122, 136, 112],
  M: [90, 72, 114],
  O: [200, 140, 255],
  R: [106, 20, 24],
  S: [58, 62, 74],
  T: [184, 168, 136],
  U: [126, 110, 86],
  V: [216, 200, 164],
  X: [106, 58, 24],
  Y: [122, 106, 146],
  Z: [50, 40, 62],
  a: [174, 180, 192],
  b: [138, 106, 60],
  c: [207, 199, 176],
  d: [70, 59, 51],
  g: [224, 176, 64],
  h: [122, 90, 60],
  i: [200, 136, 72],
  j: [154, 118, 80],
  k: [21, 22, 28],
  l: [142, 122, 102],
  m: [107, 91, 78],
  n: [200, 106, 96],
  o: [138, 94, 92],
  p: [184, 138, 134],
  q: [212, 168, 162],
  r: [216, 53, 42],
  s: [168, 152, 136],
  t: [86, 92, 106],
  u: [224, 144, 138],
  v: [168, 132, 78],
  w: [238, 232, 216],
  x: [168, 96, 44],
  y: [244, 216, 120],
  z: [228, 232, 240],
  '~': [34, 36, 44],
};

const HERO = [
  '................................',
  '................kkk.............',
  '.............kkkDDDk............',
  '............kDDDDDDDk...........',
  '...........kkDDDDDDDDk..........',
  '..........kDDDDDDkkDDDk.........',
  '.........kDDDDDDDkkkkDk.........',
  '........kDDDDDDDDkkzzDk........k',
  '.........kDDaDDDDkkkkk........kz',
  '.......kkkazzDDDDkkkkjk.......kz',
  '......kFFFaaaaDDDDDDjk.......kzA',
  '.....kFCCCaaaaahhhhkkk......kzak',
  '....kFCCCCDChhhhhhazzzk.....kaAk',
  '...kFCCCCCAAAhHhhhhaaazkk..kzAk.',
  '..kFCCCDCAAbbAAHhhhhAaazykkzAk..',
  '..kCCCCDAAbbbbAHhhhhkAAaAyzAk...',
  '.kFCCCCDAbbzbbbAghhhkkkAkjjk....',
  '.kDCCCCDAbbbabbAhHhhk..k.kkyk...',
  '..kDCCCDAAbbbbAhhhHhjk.....k....',
  '...kDCCDCAAbbAAhhhHhhk..........',
  '....kDDCCCAAAHHHHgHHHk..........',
  '.....kDCCCDhhhHHhhhhk...........',
  '.....kDCCChhhCkkHhhhk...........',
  '....kFDCChhhhCk.khhhjk..........',
  '....kCDCChhhhDk.kHhhhjk.........',
  '...kFCCChhhhDk...khhhhk.........',
  '...kCDCChhhhk....kHhhhjkkk......',
  '..kFCkCHHHHHk.....khHHHHHHk.....',
  '...kDkHHHHHk......kHHHHHHHk.....',
  '....kHHHHHk........kHHHHHHHk....',
  '.....kkkkk..........kkkkkkk.....',
  '................................',
];

const RAT = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '...........................k....',
  '..........................kqk...',
  '.........k.........k.......kqk..',
  '........kqkk......kdk.kk....kqk.',
  '........kpqqk....kddkkddk....kqk',
  '........kokpqk.kkkdddkddk....kok',
  '.........kpkpqkddkmmmkkdk.....kq',
  '.........kppppkddlmmmllmdk....kp',
  '.........kpppplmmmmmmmmmmk....ko',
  '......kkklmpppmmmdmdmmmmmlk..kqk',
  '....kklllkmmmpmdmdmdmmmmmmlk.kok',
  '...kllkkkmsmmmmdmdmdmmmmmmmkkqk.',
  '..klmmmrrmmsmmdmdmdmmmmmmmmkqk..',
  '.klmmmdddddmsmddddddddmmmmmqk...',
  'klddddkkkkkmmmdkkkkkkkmmmmmmk...',
  '.kkwkRRRRRlmmdk......kmmmmmdk...',
  '..kwRwRRwmwmmk.......kdmmmdk....',
  '..kwlwmmwmmmdk........kdmdk.....',
  '...kddmmddmdk..........kdklk....',
  '....kkddkkdk............kkdk....',
  '..kkllkkklk.............klk.....',
  '.kcckkkklk...........kkkkdk.....',
  '..kkkccck...........kllllk......',
  '.....kkk.............kkkk.......',
];

const CRAB = [
  '.....kkk........................',
  '...kkFFFkk......................',
  '..kFFCCCFFk.....................',
  '.kFCCFFCFCFk....................',
  '.kDCCCCCCCCk....................',
  '..kDDDCCCCCk...............k....',
  '...kkkCCCCCFk.............kFk...',
  '...kkkCCCCCCk............kFCFkkk',
  'kkkFFFCCCCCDk......k....kFCCCkFF',
  'FFFCCCCCCCCk..k...kkk...kCCFCFCC',
  'kDDCCCCCCCDk.kkk..kwk...kCFCCCCD',
  '.kkFDCCCDDk..kwk..kFk...kCCCCCCk',
  '...kkDDDkk...kFk..kCk...kDCCCCDk',
  '.....kkkDDk..kDk..kCk....kDCCDk.',
  '.......kDDk...kFkkkCkkkk..kDDk..',
  '........kDDk.kkCFFFCFFFFk..kkk..',
  '........kDDkkFFCCCCCCCCCFkkkDDk.',
  '.........kDDFCCCCCCCCCCCCFFkDDk.',
  '.........kDDCCCCFFCCCCCFCCCDDk..',
  '.........kCDDCCCCCCCCCCCCCCDDk..',
  '.........kCDDCCCCCCCCCCCCCCCk...',
  '........kFCCDDDDDDDDDDDDDDDCFk..',
  '........kCCCCCCCCCCCCCCCCCCCCk..',
  '.......kDDCCCCCCCCCCCCCCCCCCDDk.',
  '.......kDkDCCDDDDDDDDDDDDDCDkDk.',
  '......kDk.kDCCCCCCCCCCCCCCDk.kDk',
  '......kDk..kCDDDDDDDDDDDDCk..kDk',
  '.....kDk...kDkkkkkkkkkkkkDk..kDk',
  '.....kDk..kDk............kDk..kD',
  '....kDk...kDk............kDk..kD',
  '.....k...kDk..............kDk..k',
  '.........kDk..............kDk...',
];

const BAT = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '...kk.....k...k.................',
  '..kZZkk..kYk.kYk................',
  '..kZMZZkkkZYkkMYk...............',
  '...kMMMZZkkZkYMMk...............',
  '...kMMMZZZkkYMMMk..........kk...',
  '...kMZZZMMZYrMrMYk......kkkZZk..',
  '..kYZMMZMMMMMMMMMYk...kkYZZZk...',
  '..kZMMMZMMMMwMwMMMYkkkZZZMMk....',
  '...kZZMZMMMMMMMMMMMYZZMZZMMk....',
  '....kkZMMMMMMMMMMMMMMMMZMZZk....',
  '.....kZMZZZZMMMMMMMMMMMZMMMZk...',
  '.....kZZkkkkZZMMMMMMZMMMZZZZZk..',
  '......kk....kkMMMMMZkZMMZkkkk...',
  '.............kZMMMZk.kZMZk......',
  '..............kZMZk...kZZk......',
  '...............kZk.....kk.......',
  '................k...............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const GHOUL = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '.........kk.....................',
  '.......kk00kk...................',
  '......k00LL00k..kk..............',
  '.....k0LLLLLLkkk00kk............',
  '.....kLkkLLkk000LL00kkk.........',
  '.....kLL6LL6LLLLL!LL000k........',
  '.....kLLLLLLLLLLL!LLLLL0k.......',
  '.....k!!LLLLLLLLL!LLLLLLk.......',
  '.....kLLLLLLLLLLL!LLLL@L0k......',
  '.....k!wRwLwL!!!!!!!!LL@Lk......',
  '......kRRLLRLLLLL!LLLLLLL0k.....',
  '......k!wLwLL!!!!!!!!!LLLLk.....',
  '.......kLLLLLLLLL!LLLLLLLLk.....',
  '.......kL!!LLL!!!!!!!!LLLL0k....',
  '......k0LkkL@LLLL!LLLLL!LLLk....',
  '......kL!kk!LLL!!!!!!L!kLLLk....',
  '.....k0Lk..kLhhhhhhhhLkk!LL0k...',
  '.....kL!k..kLhhhhhhhhLk.kLLLk...',
  '....k0Lk...kLLhhhhhhLLk.kLLLk...',
  '...k0L!k..k0LLhHHHHhLL0kk!LL0k..',
  '...kLLk...kLLLLkkkkLLLLk.kLLLk..',
  '..k0L!k...kLLLLk..kLLLLk.kLLLk..',
  '..kLLk....kLLLLk..k!LLLk.k!LLk..',
  '..kL!k....kLLL!k...kLLL0k.kLLk..',
  '.k0!k....k0LLLk....k!LLLk.k!L0k.',
  'kc!kk....k!!!!k.....k!!!0kkk!!ck',
  'ckckck..kccckk.......kkkcccckckc',
];

const GHOST = [
  '.................kk.............',
  '..............kkkttkk...........',
  '.............ktttSSttk..........',
  '............ktSSSSSSStk.........',
  '...........ktSSSSSSSSStk........',
  '...........kSkktSSSSSSSk........',
  '..........kkkkkktSSSSSSk........',
  '...kk.....kkkkkktSSSSSStk.......',
  '..kcskkk..kkkkkkktSSSSSSk.......',
  '..kkksstk.kkkkkkktSS~SSSk.......',
  '.kcssssStkkkkkkkStSS~SSSk.......',
  '..kkkks~SttkkkkktSSS~SSSk.......',
  '...ksskk~~SSkkSStSSS~SSSk.......',
  '..kckk..kk~SSSSSSSSSS~SSk.......',
  '...k......k~SSSSSSSSS~SStk......',
  '...kk......kSSSSSSSSS~SSSk......',
  '..kcskkk...kSSSSSSSSS~SSSk......',
  '..kkksstkk.kSSSSSSSSS~SSStk.....',
  '.kcssssSttkkSSSSSSSSS~SSSSk.....',
  '..kkkkksSSttSSSSSSSSSS~SSSk.....',
  '....kssk~~SSSSSSSSSSSS~S~Sk.....',
  '...kckk.kk~~~SSSS~SSSS~S~Stk....',
  '....k.....kkkSSSS~SSSS~SS~Sk....',
  '............kSSSS~SSSSSSS~Sk....',
  '............kSSSSS~SSSSSS~Sk....',
  '............k~SSSS~SSSSSS~Stk...',
  '.............kSSSS~SSSSSSS~Sk...',
  '.............kSS~~~SS~~SSS~Sk...',
  '.............k~~kk~SSkk~SS~~tk..',
  '..............kk..k~~k.k~~kk~k..',
  '...................kk...kk..ktk.',
  '.............................k..',
];

const SKELETON = [
  '...........kkkkkkkk.............',
  '..........kVVVVVVVVk............',
  '..........kTUTTTTTTVk..k........',
  '.........kVUTTTTTTTTk.kwk.......',
  '....k....kTTkkkTTkkkVkkkwk......',
  '...kwk...kTTkrkTTkrkUkwkk.......',
  '...kBwk..kUTTTTTTTTTkjrjrk......',
  '..kvkkwk..kUTTTkkkTUkhhhhk......',
  '..kbk.kwkk.kTTkkkkkkkhhhhk......',
  '..kbk..kwwkVTTTTUTTVVhhhhk......',
  '..kBk...kkwTTTTTUTTTThhhhk......',
  'kkvkkkkkkVTwrrkkUkTTTThhhk......',
  'zavvvvvvvvvvvVTTTTTTThhhhk......',
  'kkBkkkkkkkkwrrkkUkkkkhhhhk......',
  '..kvk....kwkTTTTUTVTkhhhhk......',
  '..kbk..kkwkkkkkkUkkkkHHHHk......',
  '..kbk.kwwk.kUUUUUUUUkkkkk.......',
  '..kBkkwkk...kkkkUkkk............',
  '...kvwk.....kkkkUkkk............',
  '...kwk.....kVVVVUVVVk...........',
  '....k......kUTUTkTUk............',
  '............kUTUUUTk............',
  '.............kTkkkUk............',
  '.............kUk..kVk...........',
  '............kVk...kUk...........',
  '............kUk....kVk..........',
  '...........kVk.....kVk..........',
  '...........kTk.....kUk..........',
  '...........kTk......kVk.........',
  '...........kTk......kTk.........',
  '..........kkTk......kTkk........',
  '.........kVVUVk....kVUVVk.......',
];

const NECROMANCER = [
  '..............kYYk......kwwwwk..',
  '.............kYMMYk....kwwwwwk..',
  '............kYMMYMYk...kwwkwkwk.',
  '...........kYMMYMMMYk..kwwwwwk..',
  '..........kYMMMMMMMMYk..kwwkk...',
  '..........kMMkkkkkkMMk...kkBk...',
  '..........kMMkkkkkkMMk....kBk...',
  '..........kMMkOOkOOMMk....kBk...',
  '.........kYMMkkkkkkMMYk...kBk...',
  '.........kMMMkkkkkkMMMk...kBk...',
  '.........kMMMkwkwkwMMMk...kBk...',
  '.........kMMMMMMMMMMMMk...kBk...',
  '.........kMMMMZZZZMMMMkk..kBk...',
  '....kkk..kMMMMZZZZMMMMYYk.kBk...',
  '...kOOOkkYMMMMZZMZMMMMMMYkkBk...',
  '...kOzOkkMMMMMZZMZMMMMMMMkkBk...',
  '...kMOOOkMMYMMZZMZMMMMMMMkkBk...',
  '..kYMOMMYMMYMZZZMZZMMMZMMYkBk...',
  '..kMMMMMMMMYMZZZMZZMMMZMMMkBk...',
  '..kZMMMMMMMwwwwwwwwwwMMZMZkBk...',
  '...kMMMMMMYMwZZwMZZwMMMZMkkBk...',
  '...kZZZMMMYMMZZZMZZMMMMZMTTBk...',
  '....kkkMMMYMMZZZMZZMMMMZMkkBk...',
  '......kMMMYMMZZZMZZMMMMZMkkBk...',
  '.....kYMMMYMMZZZMZZMMMMZMkkBk...',
  '.....kMMMMYMMZZZMZZMMMMMZYkBk...',
  '.....kMMMYMMZZZZMZZZMMMMZMkBk...',
  '.....kMMMYMMZZZZMZZZMMMMZMkBk...',
  '.....kZZZYMMZZZZMZZZZZZMZMkBk...',
  '....kYkkkMMMZZZZMZZZkkkMMMYBk...',
  '....kZYkYZZZZZZZZZZZYkYZZZZBk...',
  '.....kk.kkkkkkkkkkkkk.kkkkkBk...',
];

const MIMIC = [
  '....kzzjjjjjjjjjjzzjk...',
  '..kkjaahhhhhhhhhhaahjk..',
  '.kjjhaahhhhhHHHHHaaHHjk.',
  '.khHHaaHHHHHhhhhhaahhhk.',
  '.khhhaahhhhhhhhhhaahhhk.',
  '.khhhaahhhhhRRRRRRRRRRk.',
  '.kRwwRRwwRRwwRRwwRRwwRk.',
  '.kRwwRRwwRRwwRRwwRRwwRk.',
  '.kRwwRRwwRRwwRRwwRRwwRk.',
  '.kRwRRRwRRRwRRRwRRRwRRk.',
  '.kRRwRRRuuuuuuuuRRRwRRk.',
  '.kRRwRRRuuuunuuuRRRwRRk.',
  '.kRwwRRuuzuunuuuuRwwRRk.',
  '.kRwwRRuuzuunuuuuRwwRRk.',
  '.khhhaauuuuunuuuuaahhhk.',
  '.khhhaauuuuunuuuuaahhhk.',
  '.khhhaauuuuunuuuhaahhhk.',
  '.khhhaahuuuunuuuhaahhhk.',
  '.khhhaahuuuunuuuhaahhhk.',
  '.kHHHaaHuuuunuuHHaaHHHk.',
  '.khhhaahHuuuuuhHhaahhhk.',
  '.khhhaahHhuuuhhHhaahhhk.',
  '.kHHHAAHHHHHHHHHHAAHHHk.',
  '..kkkkkkkkkkkkkkkkkkkk..',
];

const CENTIPEDE_HEAD = [
  '................................',
  '................................',
  '....k......................k....',
  '...k$k....................k$k...',
  '....k$k..................k$k....',
  '.....k$k................k$k.....',
  '.....k$k................k$k.....',
  '......k$k..............k$k......',
  '.......k$kk.........k..k$k......',
  '.......k$k#k.......k#kk$k.......',
  '........k#@#k.....k#@#$k........',
  '........k@@@#kkkkk#@@@$k........',
  '.......k#@@@@##$##@@@@@#k.......',
  '......k#@@@@@@@$@@@@@@@@#k......',
  '.....k#@@@@@@#@$@@@@@@@@@#k.....',
  '....k#@kk@@@@@@$@@@@@@@kk@#k....',
  '...k#@@@@kk@@@@$@@@@@kk@@@@#k...',
  '..k#@@@@666kk@@$@@@kk666@@@@#k..',
  '.k#@@@@@@@666@@$@@@666@@@@@@@#k.',
  '.k@@@@@@@@@@@@@$@@@@@@@@@@@@@@k.',
  '.k@@@@@w@@@@@@@$@@@@@@w@@@@@@@k.',
  '.k@@@@#ww@@@@@@$@@@@@www@#@@@@k.',
  '.k@@@wwwww@@@@@$@@@@wwwww@@@@@k.',
  '.k@@wwwwwww@@@@$@@@wwwwwww@@@@k.',
  'k#@@wwwwwwww@@@$@@wwwwwwwww@@@#k',
  'k@@@wwwwwwwww@@@@@wwwwwwwww@@@@k',
  'k@@@wwwwwwww@@@@@@@wwwwwwww@@@@k',
  'k@@wwwwwwwww@@@@@@@wwwwwwww@@@@k',
  'k$$wwwww$$ww$$$$$$$ww$@wwwww$$$k',
  '.kkwwwwwkkkkkkkkkkkkkk$wwwwwkkk.',
  '..kwwww$k............k$kwwwwk...',
  '.k$kkk$k............k$k.k$kk....',
];

const CENTIPEDE_BODY = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................k...............',
  '..........k....kik....k.........',
  '.........kik..kixk...kik........',
  '........kixik.kxxk..kixk........',
  '........kxxxikkxxikkkxxik.......',
  '.......kixxxxiiXxxiiixxxik......',
  '......kixxxxxxxXxxxxxxxxxk......',
  '.....kixxXxixxxXxixxxXxxxik.....',
  '....kixxxXxxxxxXxxxxxXxxxxik....',
  '...kixxixXxxxxxXxxxxxXxxixxik...',
  '...kxxixxXxxxxxXxxxxxXxxxxxxk...',
  '..kixxxxxXxxxxxXxxxxxXxxxxxxik..',
  '..kxxxxxxXxxxxxXxxxxxxXxxxxxxk..',
  '..kxxxxxXxxxxxxXxxxxxxXxxxxxxk..',
  '..kxxxxxXxxxxxxXxxxxxxXxxxxxxk..',
  '..kxxxxxXxxxxxxXxxxxxxXxxxxxxk..',
  '.kixxxxxXxxxxxxXxxxxxxXxxxxxxik.',
  '.kXXxXXXXXXXxXXXXxXXXxXXXxXXXXk.',
  '..kkXkkkXkkkXkkkkXkkkXkkkXkkkk..',
  '...kXk.kXk.kXk..kXk.kXk.kXk.....',
  '..kXk.kXk.kXk..kXk.kXk.kXk......',
  '..kXk.kXk.kXk..kXk.kXk.kXk......',
];

// The eyes and the magic give off light, so they keep their own colors.
const PALETTE = mutedPalette(DRAWN_PALETTE, ['6', 'O']);

// A character as SVG, facing left and facing right, and how many art pixels wide and high it is.
export interface CharacterArt {
  left: string;
  right: string;
  pixels: number;
  // Where the body is in the picture, facing either way: its first and last columns and its first
  // row, in art pixels.
  body: BodyBounds;
  // How it falls when it dies: one that stands falls on its side, and a beast or a thing rolls
  // onto its back.
  fall: 'side' | 'back';
}

export interface BodyBounds {
  left: number;
  right: number;
  top: number;
  // The first row, from the top, where the bulk of the body starts: one at least half as wide as
  // the widest row. Above it are only thin parts, as eye stalks or claws.
  bulkTop: number;
  // How far the bulk of the body reaches in front, from the middle of the picture: to the last
  // column, on the side it faces, at least half as tall as the tallest column. Past it are only thin
  // parts, as a staff or the hem of a robe.
  frontReach: number;
}

const mirrored = (rows: string[]) => rows.map((row) => [...row].reverse().join(''));

function bodyOf(rows: string[], drawnFacing: 'left' | 'right'): BodyBounds {
  const columns = rows.flatMap((row) => [...row].flatMap((pixel, x) => (pixel === '.' ? [] : [x])));
  const left = Math.min(...columns);
  const right = Math.max(...columns);
  const last = rows.length - 1;
  const widths = rows.map((row) => [...row].filter((pixel) => pixel !== '.').length);
  const widest = Math.max(...widths);
  const heights = [...rows[0]].map((_, x) => rows.filter((row) => row[x] !== '.').length);
  const tallest = Math.max(...heights);
  const bulkColumns = heights.flatMap((height, x) => (height >= tallest / 2 ? [x] : []));
  const middle = rows[0].length / 2;
  return {
    left: Math.min(left, last - right),
    right: Math.max(right, last - left),
    top: rows.findIndex((row) => /[^.]/.test(row)),
    bulkTop: widths.findIndex((width) => width >= widest / 2),
    frontReach:
      drawnFacing === 'left'
        ? middle - Math.min(...bulkColumns)
        : Math.max(...bulkColumns) + 1 - middle,
  };
}

// Each picture is drawn facing one way, and the other way is its mirror image.
const art = (rows: string[], drawnFacing: 'left' | 'right', fall: 'side' | 'back'): CharacterArt => {
  const drawn = pixelSvg(rows, PALETTE);
  const mirror = pixelSvg(mirrored(rows), PALETTE);
  return {
    left: drawnFacing === 'left' ? drawn : mirror,
    right: drawnFacing === 'left' ? mirror : drawn,
    pixels: rows.length,
    body: bodyOf(rows, drawnFacing),
    fall,
  };
};

export const CHARACTER_ART = {
  hero: art(HERO, 'right', 'side'),
  rat: art(RAT, 'left', 'back'),
  crab: art(CRAB, 'left', 'back'),
  bat: art(BAT, 'left', 'back'),
  ghoul: art(GHOUL, 'left', 'side'),
  ghost: art(GHOST, 'left', 'side'),
  skeleton: art(SKELETON, 'left', 'side'),
  necromancer: art(NECROMANCER, 'left', 'side'),
  mimic: art(MIMIC, 'left', 'back'),
  'centipede-head': art(CENTIPEDE_HEAD, 'left', 'back'),
  'centipede-body': art(CENTIPEDE_BODY, 'left', 'back'),
};
