import { createStartingEquipment, createStartingInventory, type ItemName } from './items';
import type { GeneratedMap } from './mapgen';
import { parseRoom, type Point } from './room';
import surfaceTemplate from './rooms/special/surface.txt?raw';

export interface Sign {
  position: Point;
  text: string;
}

// The yard at the entrance of the dungeon, where the first run starts. The hero's starting gear and
// the key to the locked entrance lie on the ground there, and signs explain how to play.
export interface Surface {
  map: GeneratedMap;
  items: { name: ItemName; count?: number; position: Point }[];
  signs: Sign[];
}

// What each sign says, by the letter that marks it in the template.
const SIGN_TEXTS: Record<string, string> = {
  a:
    'You heard the rumors: a dungeon whose depths hold great riches, and from which few come ' +
    'back. So here you are at its entrance. Click a tile to walk there.',
  b:
    'Your gear lies on the ground. Walk onto an item to pick it up, then open the Bag to put on ' +
    'the weapon and the armor. Save the food for when you get hungry. Darts are thrown from the ' +
    'Bag at an enemy in sight.',
  c:
    'The way into the dungeon lies behind this locked door. Find the key, click the door to ' +
    'unlock it, step into the doorway, and take the stairs down. Below, click an enemy to attack ' +
    'it. Wait lets a turn pass.',
  d:
    'Examine tells you about a tile or an enemy you point at. Press Examine again to search the ' +
    'area around you, which takes a turn and may uncover something useful.',
};

export const SIGN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#6b4a2a" d="M11 11H13V22H11Z"/>
  <path fill="#a8763e" d="M3 3H21V12H3Z"/>
  <path fill="#7a5030" d="M3 11H21V12.500H3Z"/>
  <path fill="#5c3b22" d="M6 5.500H18V6.500H6Z"/>
  <path fill="#5c3b22" d="M6 8H15V9H6Z"/>
</svg>`;

// Whether this browser already went down from the surface once, so later runs start on floor 1.
const FINISHED_KEY = 'thorvg-dungeon.surface-finished';

// When storage is blocked, as in a private window, every run starts on the surface.
export function hasFinishedSurface(): boolean {
  try {
    return localStorage.getItem(FINISHED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markSurfaceFinished(): void {
  try {
    localStorage.setItem(FINISHED_KEY, 'true');
  } catch {
    // Nothing else can keep it.
  }
}

// The letters in the template that mark where the starting gear and the key to the dungeon lie.
function itemGlyphs(): Record<string, ItemName> {
  const { weapon, armor } = createStartingEquipment();
  const [food, darts] = createStartingInventory();
  return { W: weapon!, A: armor!, F: food.name, D: darts.name, K: 'iron-key' };
}

// Items and signs are taken out of the template, leaving a floor under each item and a sign tile
// under each sign.
export function createSurface(): Surface {
  const glyphs = itemGlyphs();
  const items: Surface['items'] = [];
  const signs: Sign[] = [];
  const text = surfaceTemplate
    .split(/\r?\n/)
    .map((row, y) =>
      [...row]
        .map((glyph, x) => {
          const name = glyphs[glyph];
          if (name) {
            const count = createStartingInventory().find((stack) => stack.name === name)?.count;
            items.push({ name, count, position: { x, y } });
            return '.';
          }
          if (glyph in SIGN_TEXTS) {
            signs.push({ position: { x, y }, text: SIGN_TEXTS[glyph] });
            return 's';
          }
          return glyph;
        })
        .join(''),
    )
    .join('\n');

  const room = parseRoom(text);
  let stairs: Point | undefined;
  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === 'stairs') {
        stairs = { x, y };
      }
    }),
  );
  const map = { ...room, start: room.start!, stairs: stairs!, specialRoom: [], corridor: [] };
  return { map, items, signs };
}
