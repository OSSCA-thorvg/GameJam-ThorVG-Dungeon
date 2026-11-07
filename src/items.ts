import { normalIntRange, roundRandomly } from './random';

export type ItemName = 'healing-potion' | 'worn-shortsword' | 'cloth-armor';

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
  // Set when the item breaks where it lands when thrown, like a flask. It is the color it splashes.
  shatterColor?: [r: number, g: number, b: number];
  // SVG markup, shared by the map and the inventory window.
  icon: string;
  // Why the item cannot be used right now, if there is a reason.
  blockedReason?(context: ItemContext): string | null;
  use?(context: ItemContext): void;
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

// Placeholder value.
const HEALING_POTION_HP = 10;

export const ITEMS: Record<ItemName, ItemDefinition> = {
  'healing-potion': {
    displayName: 'Healing potion',
    useLabel: 'Drink',
    shatterColor: [210, 60, 55],
    description: `Restores ${HEALING_POTION_HP} HP.`,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="#dfe3ea" d="M9 2H15V4H14V9L19.500 18.500Q20.500 21 18 21H6Q3.500 21 4.500 18.500L10 9V4H9Z"/>
      <path fill="#d23c37" d="M8.300 13H15.700L18.600 18.800Q19 20 17.500 20H6.500Q5 20 5.400 18.800Z"/>
    </svg>`,
    blockedReason: ({ hp, maxHp }) => (hp >= maxHp ? 'Your HP is already full.' : null),
    use: ({ heal }) => heal(HEALING_POTION_HP),
  },
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
