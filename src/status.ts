import type { CharacterTint } from './render';

// Effects that last for some turns on the player or an enemy.
export type StatusName =
  | 'haste'
  | 'invisible'
  | 'levitating'
  | 'telepathy'
  | 'paralyzed'
  | 'frozen'
  | 'burning';

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
};

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
  return hasStatus(statuses, 'paralyzed') || hasStatus(statuses, 'frozen');
}

// The color a character is tinted with, from the effect that matters most to the player.
export function tintOf(statuses: Statuses): CharacterTint | null {
  const order: CharacterTint[] = ['frozen', 'paralyzed', 'burning'];
  return order.find((name) => hasStatus(statuses, name)) ?? null;
}
