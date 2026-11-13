import { phrase, type Phrase } from './i18n';
import { flaskIcon } from './itemArt';
import { ITEMS, itemDescription, type ItemName, type PotionName } from './items';
import { shuffle, type Random } from './random';
import { STATUS_COLORS } from './render';
import type { StatusName } from './status';
import { STATUS_ICONS } from './statusIcons';

type Color = [r: number, g: number, b: number];

// Every potion looks like one of these, picked anew for each run. Plain color names, so a player
// can tell them apart at a glance.
const POTION_COLORS: { name: string; color: Color }[] = [
  { name: 'Red', color: [210, 50, 45] },
  { name: 'Orange', color: [235, 130, 30] },
  { name: 'Yellow', color: [240, 210, 40] },
  { name: 'Lime', color: [150, 215, 50] },
  { name: 'Green', color: [40, 150, 70] },
  { name: 'Cyan', color: [60, 200, 220] },
  { name: 'Blue', color: [50, 100, 220] },
  { name: 'Purple', color: [140, 70, 200] },
  { name: 'Pink', color: [240, 130, 190] },
  { name: 'Brown', color: [130, 85, 45] },
  { name: 'Black', color: [35, 35, 40] },
  { name: 'White', color: [250, 250, 250] },
];

export const POTIONS = (Object.keys(ITEMS) as ItemName[]).filter(
  (name): name is PotionName => ITEMS[name].potion !== undefined,
);

// Floors in a stage, as in a chapter of Shattered Pixel Dungeon. The last one is a boss floor, and
// no items lie there, as on the boss floors of Shattered Pixel Dungeon.
export const FLOORS_PER_STAGE = 5;
export const ITEM_FLOORS_PER_STAGE = FLOORS_PER_STAGE - 1;
// Placeholder value.
const RANDOM_POTIONS_PER_STAGE = 4;

type RandomPotionName = Exclude<PotionName, 'strength-potion' | 'healing-potion'>;

// How often each potion comes up among the random ones, as its cards in the two potion decks of
// Generator in Shattered Pixel Dungeon together. Telepathy, its mind vision, has 4 cards there but
// is as rare here as haste, invisibility, and levitation.
const RANDOM_POTION_WEIGHTS: Record<RandomPotionName, number> = {
  'telepathy-potion': 2,
  'fire-potion': 3,
  'frost-potion': 3,
  'poison-gas-potion': 3,
  'haste-potion': 2,
  'invisibility-potion': 2,
  'levitation-potion': 2,
  'paralysis-potion': 2,
  'experience-potion': 1,
};

function randomPotion(random: Random): RandomPotionName {
  const names = Object.keys(RANDOM_POTION_WEIGHTS) as RandomPotionName[];
  const total = names.reduce((sum, name) => sum + RANDOM_POTION_WEIGHTS[name], 0);
  let roll = random() * total;
  for (const name of names) {
    roll -= RANDOM_POTION_WEIGHTS[name];
    if (roll < 0) {
      return name;
    }
  }
  return names[names.length - 1];
}

// One floor among floors 1 and 2 of a stage and one among floors 3 and 4, each the earlier floor
// half the time, as Dungeon.posNeeded() of Shattered Pixel Dungeon places strength potions.
const pickTwoFloors = (random: Random) => [random() < 0.5 ? 0 : 1, random() < 0.5 ? 2 : 3];

// Decides the potions lying on each floor of a stage before its boss floor: 2 strength potions,
// 2 healing potions, and some random others, each of those on a different floor.
export function planStagePotions(random: Random): PotionName[][] {
  const floors = Array.from({ length: ITEM_FLOORS_PER_STAGE }, (): PotionName[] => []);
  for (const index of pickTwoFloors(random)) {
    floors[index].push('strength-potion');
  }
  for (const index of pickTwoFloors(random)) {
    floors[index].push('healing-potion');
  }
  const randomFloors = shuffle(random, [...floors.keys()]).slice(0, RANDOM_POTIONS_PER_STAGE);
  for (const index of randomFloors) {
    floors[index].push(randomPotion(random));
  }
  return floors;
}

// The mark of each potion, drawn in a 10 by 10 box. It is the icon of the status effect the potion
// causes, in the color of that effect. A potion that causes none has a mark of its own, with a
// placeholder color.
interface PotionMark {
  icon: string;
  color: Color;
}

const ofStatus = (name: StatusName): PotionMark => ({
  icon: STATUS_ICONS[name],
  color: STATUS_COLORS[name],
});

const POTION_MARKS: Record<PotionName, PotionMark> = {
  'healing-potion': ofStatus('regenerating'),
  'strength-potion': {
    // A triangle pointing up.
    icon: '<path class="fill" d="M5 1L9 9H1Z"/>',
    color: [255, 150, 90],
  },
  'experience-potion': {
    // A star.
    icon: '<path class="fill" d="M5 0L6.3 3.7L10 5L6.3 6.3L5 10L3.7 6.3L0 5L3.7 3.7Z"/>',
    color: [100, 210, 190],
  },
  'haste-potion': ofStatus('haste'),
  'invisibility-potion': ofStatus('invisible'),
  'levitation-potion': ofStatus('levitating'),
  'telepathy-potion': ofStatus('telepathy'),
  'fire-potion': ofStatus('burning'),
  'frost-potion': ofStatus('frozen'),
  'poison-gas-potion': ofStatus('poisoned'),
  'paralysis-potion': ofStatus('paralyzed'),
};

// The icons style their parts by class, which a picture drawn outside the page does not have.
const markStyled = ({ icon, color: [r, g, b] }: PotionMark) =>
  icon
    .replaceAll(
      'class="line"',
      `fill="none" stroke="rgb(${r},${g},${b})" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`,
    )
    .replaceAll('class="fill"', `fill="rgb(${r},${g},${b})"`);

// A flask of the color of its liquid. Once the potion is known, its mark sits in a corner. The
// badge is drawn in a 24 by 24 box, scaled to the 16 art pixels of the flask.
function potionIcon(color: Color, mark?: PotionMark): string {
  const flask = flaskIcon(color);
  if (!mark) {
    return flask;
  }
  const badge = `<g transform="scale(${16 / 24})" shape-rendering="auto">
    <circle cx="19" cy="5" r="5" fill="#1e2027" stroke="#6a6e7c" stroke-width="0.7"/>
    <g transform="translate(15.500 1.500) scale(0.700)">${markStyled(mark)}</g>
  </g>`;
  return flask.replace('</svg>', `${badge}</svg>`);
}

// How an item looks to the player. A potion shows only its color until it is identified.
export interface ItemLook {
  name: Phrase;
  description: Phrase;
  icon: string;
  isKnown: boolean;
  // The color a potion splashes when it breaks.
  color?: Color;
}

// Which color each potion has in this run, and which potions the player has identified.
export interface PotionLore {
  lookOf(name: ItemName): ItemLook;
  identify(name: ItemName): void;
}

export function createPotionLore(random: Random): PotionLore {
  const colors = shuffle(random, [...POTION_COLORS]);
  const colorOf = new Map(POTIONS.map((name, index) => [name, colors[index]]));
  const known = new Set<ItemName>();

  return {
    lookOf(name) {
      const item = ITEMS[name];
      const appearance = colorOf.get(name as PotionName);
      if (!appearance) {
        return {
          name: phrase(item.displayName),
          description: itemDescription(name),
          icon: item.icon ?? '',
          isKnown: true,
        };
      }
      const isKnown = known.has(name);
      return {
        name: isKnown
          ? phrase(item.displayName)
          : phrase('{color} potion', { color: phrase(appearance.name) }),
        description: isKnown
          ? itemDescription(name)
          : phrase('You do not know what this potion does. Drinking it will tell you.'),
        icon: potionIcon(appearance.color, isKnown ? POTION_MARKS[name as PotionName] : undefined),
        isKnown,
        color: appearance.color,
      };
    },
    identify(name) {
      known.add(name);
    },
  };
}
