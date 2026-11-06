export type ItemKind = 'healing-potion';

export interface ItemStack {
  kind: ItemKind;
  count: number;
}

// What an item can read and change when it is used.
export interface ItemContext {
  hp: number;
  maxHp: number;
  heal(amount: number): void;
}

export interface ItemDefinition {
  name: string;
  description: string;
  // The label of the button that uses the item.
  useLabel: string;
  // Set when the item breaks where it lands when thrown, like a flask. It is the color it splashes.
  shatterColor?: [r: number, g: number, b: number];
  // SVG markup, shared by the map and the inventory window.
  icon: string;
  // Why the item cannot be used right now, if there is a reason.
  blockedReason(context: ItemContext): string | null;
  use(context: ItemContext): void;
}

// Same as the default capacity of a Bag in Shattered Pixel Dungeon.
export const INVENTORY_SLOTS = 20;

// Placeholder value.
const HEALING_POTION_HP = 10;

export const ITEMS: Record<ItemKind, ItemDefinition> = {
  'healing-potion': {
    name: 'Healing potion',
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
};

// Returns false when there is no free slot for the item.
export function addItem(stacks: ItemStack[], kind: ItemKind): boolean {
  const stack = stacks.find((candidate) => candidate.kind === kind);
  if (stack) {
    stack.count++;
    return true;
  }
  if (stacks.length >= INVENTORY_SLOTS) {
    return false;
  }
  stacks.push({ kind, count: 1 });
  return true;
}

export function removeItem(stacks: ItemStack[], kind: ItemKind): void {
  const index = stacks.findIndex((candidate) => candidate.kind === kind);
  if (index === -1) {
    return;
  }
  stacks[index].count--;
  if (stacks[index].count === 0) {
    stacks.splice(index, 1);
  }
}
