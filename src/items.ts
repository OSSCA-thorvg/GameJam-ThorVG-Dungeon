import { HUNGRY, STARVING } from './hunger';
import { phrase, type Phrase } from './i18n';
import { normalIntRange, roundRandomly } from './random';
import type { MessageCategory } from './messageLog';
import type { GasKind } from './render';
import type { Point } from './room';
import type { StatusName } from './status';

export type PotionName =
  | 'healing-potion'
  | 'strength-potion'
  | 'experience-potion'
  | 'haste-potion'
  | 'invisibility-potion'
  | 'levitation-potion'
  | 'telepathy-potion'
  | 'fire-potion'
  | 'frost-potion'
  | 'poison-gas-potion'
  | 'paralysis-potion';
export type ItemName =
  | PotionName
  | 'dart'
  | 'javelin'
  | 'throwing-axe'
  | 'worn-shortsword'
  | 'longsword'
  | 'spear'
  | 'dagger'
  | 'zweihander'
  | 'cloth-armor'
  | 'leather-armor'
  | 'chain-mail'
  | 'plate-armor'
  | 'ration'
  | 'travel-ration'
  | 'raw-meat'
  | 'cooked-meat'
  | 'iron-key';

// What kind of equipment an item is, which decides the slots it fits.
export type EquipmentKind = 'weapon' | 'armor' | 'accessory';
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory1' | 'accessory2';
export type Equipment = Record<EquipmentSlot, ItemName | null>;

// The equipment slots, in the order they are shown.
export const EQUIPMENT_SLOTS: { slot: EquipmentSlot; kind: EquipmentKind }[] = [
  { slot: 'weapon', kind: 'weapon' },
  { slot: 'armor', kind: 'armor' },
  { slot: 'accessory1', kind: 'accessory' },
  { slot: 'accessory2', kind: 'accessory' },
];

export interface ItemStack {
  name: ItemName;
  count: number;
}

// What an item can read and change when it is used.
export interface ItemContext {
  hp: number;
  maxHp: number;
  heal(amount: number): void;
  // Puts an effect on the hero.
  addStatus(name: StatusName, turns: number): void;
  // Heals the hero by a total spread over the next turns, replacing what was left of an earlier one.
  regenerate(total: number, turns: number): void;
  gainStrength(): void;
  gainLevel(): void;
  satisfyHunger(amount: number): void;
  // Adds a line to the log. The message is English text, which the log translates.
  log(message: string, category?: MessageCategory): void;
  // The tiles within some steps of a tile, going around walls and closed doors.
  areaAround(tile: Point, steps: number): Point[];
  setFire(tiles: Point[], turns: number): void;
  // Releases gas on a tile, which spreads from there over the next turns.
  releaseGas(kind: GasKind, tile: Point, amount: number): void;
  // Freezes every character on the tiles for some turns, and puts out fire there.
  freeze(tiles: Point[], turns: number): void;
}

export interface ItemDefinition {
  // The name and the description shown to the player, in English, which i18n.ts translates. The
  // item's name in the code is its ItemName. The description may hold {name} places, which
  // descriptionValues fills.
  displayName: string;
  description: string;
  descriptionValues?: Record<string, number>;
  // Set for food, with how many turns of hunger it takes away.
  foodTurns?: number;
  // The label of the button that uses the item, for items that can be used.
  useLabel?: string;
  // Set for items that can be equipped.
  equipKind?: EquipmentKind;
  // The damage range of a weapon and the range of damage an armor blocks.
  damage?: [min: number, max: number];
  armor?: [min: number, max: number];
  // The damage range of a weapon on a surprise attack, for weapons that roll it differently.
  surpriseDamage?: [min: number, max: number];
  // Set for weapons that are thrown, with the damage of a hit.
  thrownDamage?: [min: number, max: number];
  // Set for thrown weapons that fly point first, instead of spinning. Its icon must point to the
  // upper right.
  isStraightFlight?: boolean;
  // How many steps away a weapon hits. Without it, a weapon hits only the tiles next to the hero.
  reach?: number;
  // The strength needed to use a weapon or armor without a penalty.
  strength?: number;
  // Set for potions, which break where they land when thrown. A helpful one only splashes there.
  // A harmful one has its effect there, and drinking it breaks it at the hero's feet.
  potion?: 'helpful' | 'harmful';
  // SVG markup, shared by the map and the inventory window. Potions have none, because their color
  // changes every run.
  icon?: string;
  // Why the item cannot be used right now, if there is a reason.
  blockedReason?(context: ItemContext): string | null;
  use?(context: ItemContext): void;
  shatter?(context: ItemContext, tile: Point): void;
  // The log line when the hero drinks or eats it. {item} in it is the name of the item.
  useMessage?: string;
  // Set for items that fire can burn in the bag of a burning hero. A burned one turns into this
  // item, as raw meat cooks, or burns up when it is null.
  burnsInto?: ItemName | null;
  // What a helpful potion does to an enemy it hits. Without it, nothing happens.
  enemyEffect?: EnemyEffect;
}

export interface EnemyEffect {
  heal?: number;
  status?: { name: StatusName; turns: number };
  // The log line when the hero sees it happen. {enemy} in it is the name of the enemy.
  message: string;
}

const SWORD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#c8ccd4" d="M20 2L22 4L11 15L9 13Z"/>
  <path fill="#8a6a3c" d="M6.500 13.500L10.500 17.500L9 19L5 15Z"/>
  <path fill="#6b4a2a" d="M8 17L4 21L3 20L7 16Z"/>
</svg>`;
const TUNIC_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#b9a27a" d="M8 3L12 5L16 3L21 7L18 10L17 9V21H7V9L6 10L3 7Z"/>
  <path fill="#9c8662" d="M10 4L12 5L14 4L13 7H11Z"/>
</svg>`;
const RING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="14" r="6" fill="none" stroke="#c8ccd4" stroke-width="2"/>
  <path fill="#c8ccd4" d="M10 5H14L15 7.500H9Z"/>
</svg>`;
const DART_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#8a6a3c" d="M5.500 17.500L18.500 4.500L19.500 5.500L6.500 18.500Z"/>
  <path fill="#c8ccd4" d="M22 2L18 4L20 6Z"/>
  <path fill="#c4455a" d="M2.500 16.500L7 17L5.500 18.500ZM7.500 21.500L7 17.500L5.500 19Z"/>
</svg>`;
const JAVELIN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#8a6a3c" d="M3 20.500L17 6.500L18.500 8L4.500 22Z"/>
  <path fill="#c8ccd4" d="M22.500 1.500L16 4L20 8Z"/>
  <path fill="#6b4a2a" d="M3 20.500L5 18.500L6 19.500L4 21.500Z"/>
</svg>`;
const THROWING_AXE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#8a6a3c" d="M4.500 20L15 9.500L16.500 11L6 21.500Z"/>
  <path fill="#c8ccd4" d="M12.500 4.500L20.500 3L21 10.500L17.500 12L14.500 9Z"/>
  <path fill="#a3a8b2" d="M17.500 5.500L20 5L20.200 9L18.500 9.800Z"/>
</svg>`;
const LONGSWORD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#c8ccd4" d="M6.272 15.889L8.111 17.728L21.051 4.788L22.253 1.747L19.212 2.949Z"/>
  <path fill="#a3a8b2" d="M7.863 15.642L8.358 16.137L19.672 4.823L19.177 4.328Z"/>
  <path fill="#8a6a3c" d="M4.010 13.626L10.374 19.990L9.313 21.051L2.949 14.687Z"/>
  <path fill="#6b4a2a" d="M5.495 17.233L6.767 18.505L3.727 21.546L2.454 20.273Z"/>
  <circle cx="2.383" cy="21.617" r="1.400" fill="#8a6a3c"/>
</svg>`;
const SPEAR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#8a6a3c" d="M17.091 5.777L18.223 6.909L1.959 23.172L0.828 22.041Z"/>
  <path fill="#6b4a2a" d="M1.393 21.192L2.808 22.607L1.676 23.738L0.262 22.324Z"/>
  <path fill="#a3a8b2" d="M18.010 4.151L19.849 5.990L18.293 7.545L16.455 5.707Z"/>
  <path fill="#c8ccd4" d="M23.667 0.333L22.677 4.575L19.849 5.990L18.010 4.151L19.425 1.323Z"/>
  <path fill="#a3a8b2" d="M22.960 1.040L21.086 3.409L19.212 4.788L20.591 2.914Z"/>
</svg>`;
const DAGGER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#c8ccd4" d="M8.677 12.919L11.081 15.323L15.394 10.444L18.010 5.990L13.556 8.606Z"/>
  <path fill="#a3a8b2" d="M10.374 13.202L10.798 13.626L16.455 7.969L16.031 7.545Z"/>
  <path fill="#8a6a3c" d="M7.899 12.141L11.859 16.101L10.939 17.020L6.980 13.061Z"/>
  <path fill="#6b4a2a" d="M8.358 14.440L9.560 15.642L7.368 17.834L6.166 16.632Z"/>
  <circle cx="6.131" cy="17.869" r="1.200" fill="#8a6a3c"/>
</svg>`;
const ZWEIHANDER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#c8ccd4" d="M9.030 12.141L11.859 14.970L22.748 4.080L23.738 0.262L19.920 1.252Z"/>
  <path fill="#c8ccd4" d="M9.525 12.636L11.364 14.475L8.677 17.162L6.838 15.323Z"/>
  <path fill="#c8ccd4" d="M8.677 13.485L8.111 11.222L9.525 12.636Z"/>
  <path fill="#c8ccd4" d="M10.515 15.323L12.778 15.889L11.364 14.475Z"/>
  <path fill="#a3a8b2" d="M10.833 12.530L11.470 13.167L21.157 3.479L20.521 2.843Z"/>
  <path fill="#c9a440" d="M3.444 11.364L3.727 12.495L11.505 20.273L12.636 20.556L10.939 22.253L10.656 21.122L2.878 13.344L1.747 13.061Z"/>
  <path fill="#7c3030" d="M6.060 16.525L7.475 17.940L2.949 22.465L1.535 21.051Z"/>
  <path fill="#6b4a2a" d="M4.646 17.940L6.060 19.354L5.636 19.778L4.222 18.364Z"/>
  <path fill="#6b4a2a" d="M3.232 19.354L4.646 20.768L4.222 21.192L2.808 19.778Z"/>
  <circle cx="1.676" cy="22.324" r="1.400" fill="#c9a440"/>
</svg>`;
const LEATHER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#9a6a3c" d="M7 4L10 4L12 7L14 4L17 4L19 8L18 11L18 21L6 21L6 11L5 8Z"/>
  <path fill="#7a5030" d="M5 8L7 4L9.500 4L8.500 9L6 10Z"/>
  <path fill="#7a5030" d="M19 8L17 4L14.500 4L15.500 9L18 10Z"/>
  <path fill="#7a5030" d="M11.600 7L12.400 7L12.400 15L11.600 15Z"/>
  <path fill="#5c3b22" d="M6 15L18 15L18 17L6 17Z"/>
  <path fill="#c9a440" d="M11 14.600L13 14.600L13 17.400L11 17.400Z"/>
</svg>`;
const CHAIN_MAIL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#8e949e" d="M8 3L12 5L16 3L21 8L18 11L17 10L17 21L7 21L7 10L6 11L3 8Z"/>
  <path fill="#6f757f" d="M10 4L12 5L14 4L13 7L11 7Z"/>
  <circle cx="10" cy="8" r="0.550" fill="#6f757f"/>
  <circle cx="12" cy="8" r="0.550" fill="#6f757f"/>
  <circle cx="14" cy="8" r="0.550" fill="#6f757f"/>
  <circle cx="9" cy="10" r="0.550" fill="#6f757f"/>
  <circle cx="11" cy="10" r="0.550" fill="#6f757f"/>
  <circle cx="13" cy="10" r="0.550" fill="#6f757f"/>
  <circle cx="15" cy="10" r="0.550" fill="#6f757f"/>
  <circle cx="10" cy="12" r="0.550" fill="#6f757f"/>
  <circle cx="12" cy="12" r="0.550" fill="#6f757f"/>
  <circle cx="14" cy="12" r="0.550" fill="#6f757f"/>
  <circle cx="9" cy="14" r="0.550" fill="#6f757f"/>
  <circle cx="11" cy="14" r="0.550" fill="#6f757f"/>
  <circle cx="13" cy="14" r="0.550" fill="#6f757f"/>
  <circle cx="15" cy="14" r="0.550" fill="#6f757f"/>
  <circle cx="10" cy="16" r="0.550" fill="#6f757f"/>
  <circle cx="12" cy="16" r="0.550" fill="#6f757f"/>
  <circle cx="14" cy="16" r="0.550" fill="#6f757f"/>
  <circle cx="9" cy="18" r="0.550" fill="#6f757f"/>
  <circle cx="11" cy="18" r="0.550" fill="#6f757f"/>
  <circle cx="13" cy="18" r="0.550" fill="#6f757f"/>
  <circle cx="15" cy="18" r="0.550" fill="#6f757f"/>
  <path fill="#6f757f" d="M7 19.600L17 19.600L17 21L7 21Z"/>
</svg>`;
const PLATE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#c3cad4" d="M8 4L16 4L17.500 9L16.500 15L14.500 17L9.500 17L7.500 15L6.500 9Z"/>
  <path fill="#aab2be" d="M12 4L16 4L17.500 9L16.500 15L14.500 17L12 17Z"/>
  <path fill="#e3e7ed" d="M11.600 5L12.400 5L12.400 16.500L11.600 16.500Z"/>
  <path fill="#8c95a2" d="M3 9L4 5.500L9 4L8 10L3.500 11Z"/>
  <path fill="#8c95a2" d="M21 9L20 5.500L15 4L16 10L20.500 11Z"/>
  <path fill="#9aa3b0" d="M9 3L15 3L16 4L8 4Z"/>
  <path fill="#9aa3b0" d="M8.500 17.400L15.500 17.400L15.500 19L8.500 19Z"/>
  <path fill="#8a93a0" d="M9 19.400L15 19.400L15 21L9 21Z"/>
</svg>`;
const RATION_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#9a5f2c" d="M2 15Q2 7 12 7Q22 7 22 15Q22 19 19 19H5Q2 19 2 15Z"/>
  <path fill="#c88a45" d="M3.500 14Q3.500 8.500 12 8.500Q20.500 8.500 20.500 14Q20.500 16 18.500 16H5.500Q3.500 16 3.500 14Z"/>
  <path fill="#9a5f2c" d="M7 10.500L8.300 10L10 14L8.700 14.400Z"/>
  <path fill="#9a5f2c" d="M11.300 10L12.700 9.800L14.200 13.900L12.800 14.200Z"/>
  <path fill="#9a5f2c" d="M15.600 10.300L17 10.400L18.200 13.800L16.800 14Z"/>
</svg>`;
const TRAVEL_RATION_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#c9b48a" d="M5 9H19L20 19Q20 21 18 21H6Q4 21 4 19Z"/>
  <path fill="#a8936a" d="M5 9H19L19.200 11.500H4.800Z"/>
  <path fill="#7a4e26" d="M4.500 14H19.500L19.600 15.500H4.400Z"/>
  <path fill="#7a4e26" d="M10.500 9L11 4.500Q12 3 13 4.500L13.500 9Z"/>
</svg>`;
const meatIcon = (meat: string, light: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#ece4d0" d="M4.500 15.500L8.500 19.500L6.800 21.200Q6 22.500 4.800 21.600Q4 22.600 2.900 21.600Q1.600 20.400 2.800 19.400Q1.800 18.200 3.200 17.200Z"/>
  <path fill="${meat}" d="M7 17C5 13 7 6 13 4C18 2.500 22 6 20.500 11C19 17 12 19.500 7 17Z"/>
  <path fill="${light}" d="M11 7C13.500 5.500 17 5.500 18 8C16 7.500 13 8 11 7Z"/>
</svg>`;
const IRON_KEY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#9aa0aa" fill-rule="evenodd" d="M8 3A5 5 0 1 1 8 13A5 5 0 1 1 8 3ZM8 6A2 2 0 1 0 8 10A2 2 0 1 0 8 6Z"/>
  <path fill="#9aa0aa" d="M11.500 10.500L21 20L19.500 21.500L10 12Z"/>
  <path fill="#9aa0aa" d="M16 15.500L18.500 13L19.500 14L17 16.500Z"/>
  <path fill="#9aa0aa" d="M18.500 18L21 15.500L22 16.500L19.500 19Z"/>
</svg>`;
const RAW_MEAT_ICON = meatIcon('#c94a4a', '#e88080');
const COOKED_MEAT_ICON = meatIcon('#8a4b22', '#b8743c');

// What an empty slot of each kind shows.
export const EQUIPMENT_ICONS: Record<EquipmentKind, string> = {
  weapon: SWORD_ICON,
  armor: TUNIC_ICON,
  accessory: RING_ICON,
};

// Same as Shattered Pixel Dungeon, where every hero starts in cloth armor and the Warrior starts
// with a worn shortsword.
export function createStartingEquipment(): Equipment {
  return { weapon: 'worn-shortsword', armor: 'cloth-armor', accessory1: null, accessory2: null };
}

// On the surface, the hero starts with nothing on and picks up the starting gear.
export function createEmptyEquipment(): Equipment {
  return { weapon: null, armor: null, accessory1: null, accessory2: null };
}

// Every hero starts with a ration in Shattered Pixel Dungeon too.
export function createStartingInventory(): ItemStack[] {
  return [
    { name: 'ration', count: 1 },
    { name: 'dart', count: 3 },
  ];
}

// Same as the default capacity of a Bag in Shattered Pixel Dungeon.
export const INVENTORY_SLOTS = 20;

// Placeholder values for the potions. Effects last for a number of turns, and spread over the
// tiles within a number of steps from where a potion breaks.
// A healing potion heals a share of the max HP at once, and another over some turns. Thrown at an
// enemy it heals a fixed amount.
const HEALING_POTION_NOW = 0.3;
const HEALING_POTION_LATER = 0.4;
const HEALING_POTION_TURNS = 10;
const THROWN_HEALING_HP = 10;
const HASTE_TURNS = 20;
const INVISIBLE_TURNS = 20;
const LEVITATION_TURNS = 20;
const TELEPATHY_TURNS = 30;
const FIRE_STEPS = 1;
const FIRE_TURNS = 5;
const FROST_STEPS = 1;
const FROZEN_TURNS = 6;
// Placeholder values. How much gas a potion releases. In an open room, poison gas reaches 3 tiles
// away and lasts 8 turns, and paralyzing gas reaches 2 tiles and lasts 6. In a corridor it has
// fewer tiles to spread over, so it reaches farther and lasts about 3 times as long.
const POISON_GAS_AMOUNT = 300;
const PARALYSIS_GAS_AMOUNT = 200;

// Same as the spear in Shattered Pixel Dungeon.
const SPEAR_REACH = 2;

// STRReq() of Shattered Pixel Dungeon at +0: 8 plus twice the tier, rounded for armor that sits
// between tiers.
const strengthForTier = (tier: number) => 8 + Math.round(tier * 2);

const potion = (
  kind: 'helpful' | 'harmful',
  definition: Omit<ItemDefinition, 'potion' | 'useLabel'>,
): ItemDefinition => ({ ...definition, potion: kind, useLabel: 'Drink' });

// How much hunger each food takes away. The ration fills as the pasty of Shattered Pixel Dungeon,
// the travel ration as its ration, and raw meat as its mystery meat.
const RATION_FOOD = STARVING;
const TRAVEL_RATION_FOOD = HUNGRY;
const RAW_MEAT_FOOD = HUNGRY / 2;
// Placeholder value. Cooked meat fills a third more than raw meat.
const COOKED_MEAT_FOOD = (RAW_MEAT_FOOD * 4) / 3;
// How likely raw meat is to poison the hero.
const FOOD_POISONING_CHANCE = 0.6;
// Same as the poison from mystery meat in Shattered Pixel Dungeon, a fifth of the max HP.
const FOOD_POISONING_FRACTION = 1 / 5;

const food = (
  amount: number,
  definition: Omit<ItemDefinition, 'useLabel' | 'use' | 'useMessage' | 'foodTurns'>,
  afterEating?: (context: ItemContext) => void,
): ItemDefinition => ({
  ...definition,
  foodTurns: amount,
  useLabel: 'Eat',
  useMessage: 'You ate the {item}.',
  use(context) {
    context.satisfyHunger(amount);
    afterEating?.(context);
  },
});

export const ITEMS: Record<ItemName, ItemDefinition> = {
  'healing-potion': potion('helpful', {
    displayName: 'Healing potion',
    description: 'Heals a good part of your HP at once, then keeps healing you for a while.',
    blockedReason: ({ hp, maxHp }) => (hp >= maxHp ? 'Your HP is already full.' : null),
    use: ({ maxHp, heal, regenerate }) => {
      heal(Math.round(maxHp * HEALING_POTION_NOW));
      regenerate(Math.round(maxHp * HEALING_POTION_LATER), HEALING_POTION_TURNS);
    },
    useMessage: 'Your wounds healed!',
    enemyEffect: {
      heal: THROWN_HEALING_HP,
      message: "The {enemy}'s wounds healed!",
    },
  }),
  'strength-potion': potion('helpful', {
    displayName: 'Strength potion',
    description: 'Raises your strength by 1, which makes all your attacks a little stronger.',
    use: ({ gainStrength }) => gainStrength(),
    useMessage: 'Your strength rose by 1!',
  }),
  'experience-potion': potion('helpful', {
    displayName: 'Experience potion',
    description: 'Raises your level by one.',
    use: ({ gainLevel }) => gainLevel(),
    useMessage: 'Your level rose by 1!',
  }),
  'haste-potion': potion('helpful', {
    displayName: 'Haste potion',
    description: 'You act twice for every turn of the enemies, for {turns} turns.',
    descriptionValues: { turns: HASTE_TURNS },
    use: ({ addStatus }) => addStatus('haste', HASTE_TURNS),
    useMessage: 'Your body suddenly felt light!',
    enemyEffect: {
      status: { name: 'haste', turns: HASTE_TURNS },
      message: 'The {enemy} suddenly started moving fast!',
    },
  }),
  'invisibility-potion': potion('helpful', {
    displayName: 'Invisibility potion',
    description: 'Enemies cannot see you for {turns} turns, or until you attack.',
    descriptionValues: { turns: INVISIBLE_TURNS },
    use: ({ addStatus }) => addStatus('invisible', INVISIBLE_TURNS),
    useMessage: 'Your body suddenly turned invisible!',
    enemyEffect: {
      status: { name: 'invisible', turns: INVISIBLE_TURNS },
      message: 'The {enemy} suddenly turned invisible!',
    },
  }),
  'levitation-potion': potion('helpful', {
    displayName: 'Levitation potion',
    description: 'You float for {turns} turns, above any fire on the floor.',
    descriptionValues: { turns: LEVITATION_TURNS },
    use: ({ addStatus }) => addStatus('levitating', LEVITATION_TURNS),
    useMessage: 'Your body floated up into the air!',
    enemyEffect: {
      status: { name: 'levitating', turns: LEVITATION_TURNS },
      message: 'The {enemy} floated up into the air!',
    },
  }),
  'telepathy-potion': potion('helpful', {
    displayName: 'Telepathy potion',
    description: 'You sense every enemy on the floor for {turns} turns.',
    descriptionValues: { turns: TELEPATHY_TURNS },
    use: ({ addStatus }) => addStatus('telepathy', TELEPATHY_TURNS),
    useMessage: 'You can see into the minds of your enemies!',
  }),
  'fire-potion': potion('harmful', {
    displayName: 'Fire potion',
    description: 'Bursts into flames where it breaks. Throw it at enemies.',
    shatter: ({ areaAround, setFire }, tile) => setFire(areaAround(tile, FIRE_STEPS), FIRE_TURNS),
  }),
  'frost-potion': potion('harmful', {
    displayName: 'Frost potion',
    description: 'Freezes everything around where it breaks. Throw it at enemies.',
    shatter: ({ areaAround, freeze }, tile) => freeze(areaAround(tile, FROST_STEPS), FROZEN_TURNS),
  }),
  'poison-gas-potion': potion('harmful', {
    displayName: 'Poison gas potion',
    description: 'Releases poison gas where it breaks. Throw it at enemies.',
    shatter: ({ releaseGas }, tile) => releaseGas('poison', tile, POISON_GAS_AMOUNT),
  }),
  'paralysis-potion': potion('harmful', {
    displayName: 'Paralysis potion',
    description: 'Releases a gas that paralyzes anything in it. Throw it at enemies.',
    shatter: ({ releaseGas }, tile) => releaseGas('paralysis', tile, PARALYSIS_GAS_AMOUNT),
  }),
  // Placeholder values. The damage of each throwing weapon is about that of a melee weapon of its
  // tier, with a hit of a dart at half of a worn shortsword. It needs 1 strength less than a melee
  // weapon of its tier.
  dart: {
    displayName: 'Dart',
    description: 'A small dart for throwing at an enemy from afar. Some break when they hit.',
    thrownDamage: [2, 4],
    isStraightFlight: true,
    strength: strengthForTier(1) - 1,
    icon: DART_ICON,
  },
  javelin: {
    displayName: 'Javelin',
    description:
      'A light spear made for throwing. It hits harder than a dart. Some break when they hit.',
    thrownDamage: [4, 7],
    isStraightFlight: true,
    strength: strengthForTier(2) - 1,
    icon: JAVELIN_ICON,
  },
  'throwing-axe': {
    displayName: 'Throwing axe',
    description:
      'A hatchet balanced for throwing. It hits harder than a javelin. Some break when they hit.',
    thrownDamage: [6, 10],
    strength: strengthForTier(3) - 1,
    icon: THROWING_AXE_ICON,
  },
  'worn-shortsword': {
    displayName: 'Worn shortsword',
    description: 'A short sword, worn from use.',
    equipKind: 'weapon',
    // Same as the worn shortsword in Shattered Pixel Dungeon.
    damage: [1, 10],
    strength: strengthForTier(1),
    icon: SWORD_ICON,
  },
  longsword: {
    displayName: 'Longsword',
    description: 'A long blade that hits a little harder than a shortsword.',
    equipKind: 'weapon',
    // MeleeWeapon.min() and max() of Shattered Pixel Dungeon at tier 2, one tier above the worn
    // shortsword.
    damage: [2, 15],
    strength: strengthForTier(2),
    icon: LONGSWORD_ICON,
  },
  spear: {
    displayName: 'Spear',
    description: 'A long spear that hits enemies up to {reach} tiles away.',
    descriptionValues: { reach: SPEAR_REACH },
    equipKind: 'weapon',
    // The spear in Shattered Pixel Dungeon deals 2-20 and takes 1.5 turns to attack. An attack here
    // takes one turn, so the damage is divided by 1.5 to keep the same damage per turn.
    damage: [1, 13],
    reach: SPEAR_REACH,
    // The spear is a tier 2 weapon in Shattered Pixel Dungeon.
    strength: strengthForTier(2),
    icon: SPEAR_ICON,
  },
  dagger: {
    displayName: 'Dagger',
    description: 'A short blade that hits much harder in a surprise attack.',
    equipKind: 'weapon',
    // Same as the dagger in Shattered Pixel Dungeon, which rolls a surprise attack from 75% of the
    // way to its maximum.
    damage: [1, 8],
    surpriseDamage: [6, 8],
    strength: strengthForTier(1),
    icon: DAGGER_ICON,
  },
  zweihander: {
    displayName: 'Zweihänder',
    description: 'A huge two-handed sword. Few adventurers ever find one.',
    equipKind: 'weapon',
    // MeleeWeapon.min() and max() of Shattered Pixel Dungeon at tier 3, the tier of plate armor
    // here. Its strength is what 2 strength potions every 5 floors give by floor 10, as in
    // Dungeon.posNeeded() of Shattered Pixel Dungeon.
    damage: [3, 20],
    strength: strengthForTier(3),
    icon: ZWEIHANDER_ICON,
  },
  'cloth-armor': {
    displayName: 'Cloth armor',
    description: 'Thin padded cloth that gives a little protection.',
    equipKind: 'armor',
    // Same as cloth armor in Shattered Pixel Dungeon.
    armor: [0, 2],
    strength: strengthForTier(1),
    icon: TUNIC_ICON,
  },
  'leather-armor': {
    displayName: 'Leather armor',
    description: 'Hardened leather that turns aside light blows.',
    equipKind: 'armor',
    // Armor.DRMax() of Shattered Pixel Dungeon a third of the way from cloth armor (tier 1) to
    // plate armor (tier 3 here), rounded.
    armor: [0, 3],
    strength: strengthForTier(5 / 3),
    icon: LEATHER_ICON,
  },
  'chain-mail': {
    displayName: 'Chain mail',
    description: 'A shirt of linked iron rings.',
    equipKind: 'armor',
    // Armor.DRMax() of Shattered Pixel Dungeon two thirds of the way from cloth armor (tier 1) to
    // plate armor (tier 3 here), rounded.
    armor: [0, 5],
    strength: strengthForTier(7 / 3),
    icon: CHAIN_MAIL_ICON,
  },
  'plate-armor': {
    displayName: 'Plate armor',
    description: 'Heavy steel plates that stop most blows.',
    equipKind: 'armor',
    // Same as mail armor in Shattered Pixel Dungeon, a tier 3 armor.
    armor: [0, 6],
    strength: strengthForTier(3),
    icon: PLATE_ICON,
  },
  ration: food(RATION_FOOD, {
    displayName: 'Ration',
    description: 'A full meal of bread and dried meat.',
    icon: RATION_ICON,
  }),
  'travel-ration': food(TRAVEL_RATION_FOOD, {
    displayName: 'Travel ration',
    description: 'A small bundle of food, made to be carried. It fills you less than a ration.',
    icon: TRAVEL_RATION_ICON,
  }),
  'raw-meat': food(
    RAW_MEAT_FOOD,
    {
      displayName: 'Raw meat',
      description:
        'Meat from a defeated enemy. Eating it raw may make you sick. ' +
        'Fire cooks it, even in your bag.',
      icon: RAW_MEAT_ICON,
      burnsInto: 'cooked-meat',
    },
    ({ maxHp, addStatus, log }) => {
      if (Math.random() < FOOD_POISONING_CHANCE) {
        addStatus('poisoned', Math.round(maxHp * FOOD_POISONING_FRACTION));
        log('Your stomach churns. The meat was bad!', 'danger');
      }
    },
  ),
  'cooked-meat': food(COOKED_MEAT_FOOD, {
    displayName: 'Cooked meat',
    description: 'Meat cooked through by fire. It is safe to eat.',
    icon: COOKED_MEAT_ICON,
  }),
  'iron-key': {
    displayName: 'Iron key',
    description: 'A heavy old key. Click a locked door while carrying it to unlock the door.',
    icon: IRON_KEY_ICON,
  },
};

// The description of an item, with how long food keeps hunger away.
export function itemDescription(name: ItemName): Phrase {
  const { description, descriptionValues, foodTurns } = ITEMS[name];
  const text = phrase(description, descriptionValues);
  return foodTurns === undefined
    ? text
    : phrase('{text} {food}', {
        text,
        food: phrase('Keeps hunger away for {turns} turns.', { turns: foodTurns }),
      });
}

// Same as fighting unarmed in Shattered Pixel Dungeon with the starting 10 strength.
const UNARMED_DAMAGE: [min: number, max: number] = [1, 2];

// Damage is unchanged at the strength the hero starts with.
export const STARTING_STRENGTH = 10;
// Each point of strength above the starting strength adds this fraction of the damage, as each point
// above 10 does in stat_modify_damage() of Dungeon Crawl Stone Soup.
const DAMAGE_PER_STRENGTH = 0.025;

// A surprise attack rolls from a third of the way up the range to its maximum, so the most it can
// do does not change, but a high roll is likelier. A range of 1 to 10 becomes 4 to 10.
function surpriseRange([min, max]: [number, number]): [number, number] {
  return [min + Math.floor((max - min) / 3), max];
}

// Rolls the damage of an attack with the equipped weapon, scaled by strength. The result is rounded
// up or down at random, so that every point of strength raises the average damage a little. A
// weapon that rolls a surprise attack its own way keeps its range.
export function rollDamage(equipment: Equipment, strength: number, isSurprise: boolean): number {
  const weapon = equipment.weapon ? ITEMS[equipment.weapon] : undefined;
  const range = weapon?.damage ?? UNARMED_DAMAGE;
  const [min, max] = isSurprise ? (weapon?.surpriseDamage ?? surpriseRange(range)) : range;
  const scale = 1 + (strength - STARTING_STRENGTH) * DAMAGE_PER_STRENGTH;
  return roundRandomly(Math.random, normalIntRange(Math.random, min, max) * scale);
}

// How likely a thrown weapon that hit is to break.
export const THROWN_BREAK_CHANCE = 1 / 4;

// Rolls the damage of a thrown weapon that hit. A surprise attack rolls it from a higher minimum, as
// a melee weapon does.
export function rollThrownDamage(name: ItemName, isSurprise: boolean): number {
  const range = ITEMS[name].thrownDamage ?? UNARMED_DAMAGE;
  const [min, max] = isSurprise ? surpriseRange(range) : range;
  return normalIntRange(Math.random, min, max);
}

// How many steps away the hero hits with the equipped weapon, or with bare hands.
export function weaponReach(equipment: Equipment): number {
  return (equipment.weapon && ITEMS[equipment.weapon].reach) ?? 1;
}

// Same as Weapon.accuracyFactor() and Armor.evasionFactor() of Shattered Pixel Dungeon. Each point
// of strength the hero lacks for the weapon or armor divides accuracy or evasion by this.
const MISSING_STRENGTH_DIVISOR = 1.5;
// Same as Hero.drRoll() of Shattered Pixel Dungeon. Each point of strength the hero lacks for the
// armor takes this much off what it blocks.
const ARMOR_PER_MISSING_STRENGTH = 2;

// Shattered Pixel Dungeon also slows attacks and steps with gear that is too heavy, but nothing
// here takes longer than a turn.
const TOO_HEAVY_MESSAGES: Partial<Record<EquipmentKind, string>> = {
  weapon: 'You are not strong enough for this weapon. You miss more and cannot surprise enemies.',
  armor: 'You are not strong enough for this armor. You evade less, and it blocks less.',
};

function missingStrength(name: ItemName | null, strength: number): number {
  const required = (name && ITEMS[name].strength) ?? 0;
  return Math.max(0, required - strength);
}

// The warning shown with equipment that is too heavy for the hero, or null when it is not.
export function tooHeavyMessage(name: ItemName, strength: number): string | null {
  // A thrown weapon is as heavy to throw as a weapon is to swing.
  const kind = ITEMS[name].equipKind ?? (ITEMS[name].thrownDamage ? 'weapon' : undefined);
  return kind && missingStrength(name, strength) > 0 ? (TOO_HEAVY_MESSAGES[kind] ?? null) : null;
}

export function accuracyFactor(equipment: Equipment, strength: number): number {
  return MISSING_STRENGTH_DIVISOR ** -missingStrength(equipment.weapon, strength);
}

// What a thrown weapon that is too heavy does to accuracy, and whether it can make a surprise
// attack, as a melee weapon does.
export function thrownAccuracyFactor(name: ItemName, strength: number): number {
  return MISSING_STRENGTH_DIVISOR ** -missingStrength(name, strength);
}

export function canSurpriseThrow(name: ItemName, strength: number): boolean {
  return missingStrength(name, strength) === 0;
}

export function evasionFactor(equipment: Equipment, strength: number): number {
  return MISSING_STRENGTH_DIVISOR ** -missingStrength(equipment.armor, strength);
}

// A weapon too heavy for the hero cannot make surprise attacks, as Hero.canSurpriseAttack() of
// Shattered Pixel Dungeon.
export function canSurpriseAttack(equipment: Equipment, strength: number): boolean {
  return missingStrength(equipment.weapon, strength) === 0;
}

// Rolls how much of a hit the equipped armor blocks, as Hero.drRoll() of Shattered Pixel Dungeon.
export function rollArmor(equipment: Equipment, strength: number): number {
  const armor = equipment.armor && ITEMS[equipment.armor].armor;
  if (!armor) {
    return 0;
  }
  const penalty = ARMOR_PER_MISSING_STRENGTH * missingStrength(equipment.armor, strength);
  return Math.max(0, normalIntRange(Math.random, armor[0], armor[1]) - penalty);
}

// Moves an item from the bag into a free slot of its kind, or into the first one when all of them
// are taken. Returns false when the bag has no room for the item it replaces.
export function equip(equipment: Equipment, stacks: ItemStack[], name: ItemName): boolean {
  const kind = ITEMS[name].equipKind;
  const fitting = EQUIPMENT_SLOTS.filter((slot) => slot.kind === kind);
  const slot = (fitting.find(({ slot }) => !equipment[slot]) ?? fitting[0])?.slot;
  if (!slot) {
    return false;
  }

  const replaced = equipment[slot];
  removeItem(stacks, name);
  if (replaced && !addItem(stacks, replaced)) {
    addItem(stacks, name);
    return false;
  }
  equipment[slot] = name;
  return true;
}

// Moves an equipped item back into the bag. Returns false when the bag has no room for it.
export function unequip(equipment: Equipment, stacks: ItemStack[], slot: EquipmentSlot): boolean {
  const name = equipment[slot];
  if (!name || !addItem(stacks, name)) {
    return false;
  }
  equipment[slot] = null;
  return true;
}

// Returns false when there is no free slot for the item.
export function addItem(stacks: ItemStack[], name: ItemName): boolean {
  const stack = stacks.find((candidate) => candidate.name === name);
  if (stack) {
    stack.count++;
    return true;
  }
  if (stacks.length >= INVENTORY_SLOTS) {
    return false;
  }
  stacks.push({ name, count: 1 });
  return true;
}

export function removeItem(stacks: ItemStack[], name: ItemName): void {
  const index = stacks.findIndex((candidate) => candidate.name === name);
  if (index === -1) {
    return;
  }
  stacks[index].count--;
  if (stacks[index].count === 0) {
    stacks.splice(index, 1);
  }
}
