import { createStartingEquipment, createStartingInventory, type ItemName } from './items';
import type { GeneratedMap } from './mapgen';
import { parseRoom, type Point } from './room';
import surfaceTemplate from './rooms/special/surface.txt?raw';

export interface Sign {
  position: Point;
  text: string;
}

// The yard at the entrance of the dungeon, where the first run starts. The hero's starting gear lies
// on the ground there, and signs explain how to play.
export interface Surface {
  map: GeneratedMap;
  items: { name: ItemName; position: Point }[];
  signs: Sign[];
}

// What the signs say, in the order they appear in the template, row by row.
const SIGN_TEXTS = [
  'You heard the rumors: a dungeon whose depths hold great riches, and from which few come back. ' +
    'So here you are at its entrance. Click a tile to walk there.',
  'Your gear lies on the ground. Walk onto an item to pick it up, then open the Bag to put on ' +
    'the weapon and the armor. Save the food for when you get hungry.',
  'These stairs lead down into the dungeon. Click them to go down. Below, click an enemy to ' +
    'attack it. Examine tells you what something is, and Wait lets a turn pass.',
];

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

// The letters in the template that mark where the starting gear lies.
function gearGlyphs(): Record<string, ItemName> {
  const { weapon, armor } = createStartingEquipment();
  return { W: weapon!, A: armor!, F: createStartingInventory()[0].name };
}

export function createSurface(): Surface {
  const glyphs = gearGlyphs();
  const items: Surface['items'] = [];
  const text = surfaceTemplate
    .split(/\r?\n/)
    .map((row, y) =>
      [...row]
        .map((glyph, x) => {
          const name = glyphs[glyph];
          if (!name) {
            return glyph;
          }
          items.push({ name, position: { x, y } });
          return '.';
        })
        .join(''),
    )
    .join('\n');

  const room = parseRoom(text);
  const signs: Sign[] = [];
  let stairs: Point | undefined;
  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === 'sign') {
        signs.push({ position: { x, y }, text: SIGN_TEXTS[signs.length] });
      }
      if (tile === 'stairs') {
        stairs = { x, y };
      }
    }),
  );
  return { map: { ...room, start: room.start!, stairs: stairs!, specialRoom: [] }, items, signs };
}
