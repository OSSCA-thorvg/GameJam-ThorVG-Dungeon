import { normalIntRange, roundRandomly } from './random';
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
export type ItemName = PotionName | 'worn-shortsword' | 'cloth-armor';

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
  // Puts an effect on the player.
  addStatus(name: StatusName, turns: number): void;
  gainStrength(): void;
  gainLevel(): void;
  // The tiles within some steps of a tile, going around walls and closed doors.
  areaAround(tile: Point, steps: number): Point[];
  setFire(tiles: Point[], turns: number): void;
  // Releases gas on a tile, which spreads from there over the next turns.
  releaseGas(kind: GasKind, tile: Point, amount: number): void;
  // Freezes every character on the tiles for some turns, and puts out fire there.
  freeze(tiles: Point[], turns: number): void;
}

export interface ItemDefinition {
  // The name shown to the player. The item's name in the code is its ItemName.
  displayName: string;
  description: string;
  // The label of the button that uses the item, for items that can be used.
  useLabel?: string;
  // Set for items that can be equipped.
  equipKind?: EquipmentKind;
  // The damage range of a weapon and the range of damage an armor blocks.
  damage?: [min: number, max: number];
  armor?: [min: number, max: number];
  // Set for potions, which break where they land when thrown. A helpful one only splashes there.
  // A harmful one has its effect there, and drinking it breaks it at the player's feet.
  potion?: 'helpful' | 'harmful';
  // SVG markup, shared by the map and the inventory window. Potions have none, because their color
  // changes every run.
  icon?: string;
  // Why the item cannot be used right now, if there is a reason.
  blockedReason?(context: ItemContext): string | null;
  use?(context: ItemContext): void;
  shatter?(context: ItemContext, tile: Point): void;
  // The log line when the player drinks it.
  drinkMessage?: string;
  // What a helpful potion does to an enemy it hits. Without it, nothing happens.
  enemyEffect?: EnemyEffect;
}

export interface EnemyEffect {
  heal?: number;
  status?: { name: StatusName; turns: number };
  // The log line when the player sees it happen to the enemy with this name.
  message(enemyName: string): string;
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

// Same as the default capacity of a Bag in Shattered Pixel Dungeon.
export const INVENTORY_SLOTS = 20;

// Placeholder values for the potions. Effects last for a number of turns, and spread over the
// tiles within a number of steps from where a potion breaks.
const HEALING_POTION_HP = 10;
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

const potion = (
  kind: 'helpful' | 'harmful',
  definition: Omit<ItemDefinition, 'potion' | 'useLabel'>,
): ItemDefinition => ({ ...definition, potion: kind, useLabel: 'Drink' });

export const ITEMS: Record<ItemName, ItemDefinition> = {
  'healing-potion': potion('helpful', {
    displayName: 'Healing potion',
    description: `Restores ${HEALING_POTION_HP} HP.`,
    blockedReason: ({ hp, maxHp }) => (hp >= maxHp ? 'Your HP is already full.' : null),
    use: ({ heal }) => heal(HEALING_POTION_HP),
    drinkMessage: 'Your wounds healed!',
    enemyEffect: {
      heal: HEALING_POTION_HP,
      message: (name) => `The ${name}'s wounds healed!`,
    },
  }),
  'strength-potion': potion('helpful', {
    displayName: 'Strength potion',
    description: 'Raises your strength by 1, which makes all your attacks a little stronger.',
    use: ({ gainStrength }) => gainStrength(),
    drinkMessage: 'Your strength rose by 1!',
  }),
  'experience-potion': potion('helpful', {
    displayName: 'Experience potion',
    description: 'Raises your level by one.',
    use: ({ gainLevel }) => gainLevel(),
    drinkMessage: 'Your level rose by 1!',
  }),
  'haste-potion': potion('helpful', {
    displayName: 'Haste potion',
    description: `You act twice for every turn of the enemies, for ${HASTE_TURNS} turns.`,
    use: ({ addStatus }) => addStatus('haste', HASTE_TURNS),
    drinkMessage: 'Your body suddenly felt light!',
    enemyEffect: {
      status: { name: 'haste', turns: HASTE_TURNS },
      message: (name) => `The ${name} suddenly started moving fast!`,
    },
  }),
  'invisibility-potion': potion('helpful', {
    displayName: 'Invisibility potion',
    description: `Enemies cannot see you for ${INVISIBLE_TURNS} turns, or until you attack.`,
    use: ({ addStatus }) => addStatus('invisible', INVISIBLE_TURNS),
    drinkMessage: 'Your body suddenly turned invisible!',
    enemyEffect: {
      status: { name: 'invisible', turns: INVISIBLE_TURNS },
      message: (name) => `The ${name} suddenly turned invisible!`,
    },
  }),
  'levitation-potion': potion('helpful', {
    displayName: 'Levitation potion',
    description: `You float for ${LEVITATION_TURNS} turns, above any fire on the floor.`,
    use: ({ addStatus }) => addStatus('levitating', LEVITATION_TURNS),
    drinkMessage: 'Your body floated up into the air!',
    enemyEffect: {
      status: { name: 'levitating', turns: LEVITATION_TURNS },
      message: (name) => `The ${name} floated up into the air!`,
    },
  }),
  'telepathy-potion': potion('helpful', {
    displayName: 'Telepathy potion',
    description: `You sense every enemy on the floor for ${TELEPATHY_TURNS} turns.`,
    use: ({ addStatus }) => addStatus('telepathy', TELEPATHY_TURNS),
    drinkMessage: 'You can see into the minds of your enemies!',
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
  'worn-shortsword': {
    displayName: 'Worn shortsword',
    description: 'A short sword, worn from use.',
    equipKind: 'weapon',
    // Same as the worn shortsword in Shattered Pixel Dungeon.
    damage: [1, 10],
    icon: SWORD_ICON,
  },
  'cloth-armor': {
    displayName: 'Cloth armor',
    description: 'Thin padded cloth that gives a little protection.',
    equipKind: 'armor',
    // Same as cloth armor in Shattered Pixel Dungeon.
    armor: [0, 2],
    icon: TUNIC_ICON,
  },
};

// Same as fighting unarmed in Shattered Pixel Dungeon with the starting 10 strength.
const UNARMED_DAMAGE: [min: number, max: number] = [1, 2];

// Damage is unchanged at the strength the player starts with.
export const STARTING_STRENGTH = 10;
// Each point of strength above the starting strength adds this fraction of the damage, as each point
// above 10 does in stat_modify_damage() of Dungeon Crawl Stone Soup.
const DAMAGE_PER_STRENGTH = 0.025;

// Rolls the damage of an attack with the equipped weapon, scaled by strength. The result is rounded
// up or down at random, so that every point of strength raises the average damage a little.
export function rollDamage(equipment: Equipment, strength: number): number {
  const [min, max] = (equipment.weapon && ITEMS[equipment.weapon].damage) ?? UNARMED_DAMAGE;
  const scale = 1 + (strength - STARTING_STRENGTH) * DAMAGE_PER_STRENGTH;
  return roundRandomly(Math.random, normalIntRange(Math.random, min, max) * scale);
}

// Rolls how much of a hit the equipped armor blocks, as Hero.drRoll() of Shattered Pixel Dungeon.
export function rollArmor(equipment: Equipment): number {
  const armor = equipment.armor && ITEMS[equipment.armor].armor;
  return armor ? normalIntRange(Math.random, armor[0], armor[1]) : 0;
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
