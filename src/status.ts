import type { CharacterTint } from './render';

// Effects that last for some turns on the hero or an enemy.
export type StatusName =
  | 'haste'
  | 'invisible'
  | 'levitating'
  | 'telepathy'
  | 'paralyzed'
  | 'frozen'
  | 'burning'
  | 'poisoned'
  | 'stunned'
  | 'weakened';

// The effects that work against the character they are on.
export const HARMFUL_STATUSES: readonly StatusName[] = [
  'paralyzed',
  'frozen',
  'burning',
  'poisoned',
  'stunned',
  'weakened',
];

// The turns left of each effect on a character.
export type Statuses = Partial<Record<StatusName, number>>;

// The names shown to the player, in the order they are listed.
export const STATUS_LABELS: Record<StatusName, string> = {
  haste: 'Haste',
  invisible: 'Invisible',
  levitating: 'Levitating',
  telepathy: 'Telepathy',
  paralyzed: 'Paralyzed',
  frozen: 'Frozen',
  burning: 'Burning',
  poisoned: 'Poisoned',
  stunned: 'Stunned',
  weakened: 'Weakened',
};

// What each effect does to the hero, shown when the player points at its icon.
export const STATUS_DESCRIPTIONS: Record<StatusName, string> = {
  haste: 'You act twice for every turn of the enemies.',
  invisible: 'Enemies cannot see you. Attacking ends it.',
  levitating: 'You float above the floor, out of reach of fire on it.',
  telepathy: 'You sense every enemy on the floor, even through walls.',
  paralyzed: 'You cannot act or dodge.',
  frozen: 'You cannot act or dodge. Any damage breaks the ice.',
  burning: 'Fire hurts you at the end of every turn.',
  poisoned: 'Poison hurts you at the end of every turn, less as it wears off.',
  stunned: 'You cannot act or dodge, dazed from a crash.',
  weakened: 'You feel weak. Your strength is lowered by one, so heavy gear weighs on you more.',
};

// As Poison.act() of Shattered Pixel Dungeon, poison with some turns left deals a third of them
// plus 1 in a turn.
export function poisonDamage(statuses: Statuses): number {
  const turns = statuses.poisoned ?? 0;
  return turns > 0 ? Math.floor(turns / 3) + 1 : 0;
}

export function hasStatus(statuses: Statuses, name: StatusName): boolean {
  return (statuses[name] ?? 0) > 0;
}

// A longer effect replaces a shorter one of the same kind. Fire thaws ice, and ice puts out fire.
export function addStatus(statuses: Statuses, name: StatusName, turns: number): void {
  statuses[name] = Math.max(statuses[name] ?? 0, turns);
  if (name === 'burning') {
    delete statuses.frozen;
  }
  if (name === 'frozen') {
    delete statuses.burning;
  }
}

// One turn passes for every effect.
export function tickStatuses(statuses: Statuses): void {
  for (const name of Object.keys(statuses) as StatusName[]) {
    const turns = (statuses[name] ?? 0) - 1;
    if (turns > 0) {
      statuses[name] = turns;
    } else {
      delete statuses[name];
    }
  }
}

// A paralyzed or frozen character cannot act, and cannot evade.
export function isHelpless(statuses: Statuses): boolean {
  return (['paralyzed', 'frozen', 'stunned'] as const).some((name) => hasStatus(statuses, name));
}

// The color a character is tinted with, from the effect that matters most to the player.
export function tintOf(statuses: Statuses): CharacterTint | null {
  const order: CharacterTint[] = ['frozen', 'paralyzed', 'burning'];
  // A stunned character is tinted like a paralyzed one, as it is as helpless.
  if (hasStatus(statuses, 'stunned') && !hasStatus(statuses, 'frozen')) {
    return 'paralyzed';
  }
  return order.find((name) => hasStatus(statuses, name)) ?? null;
}
