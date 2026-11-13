import { t } from './i18n';

// Same as Hunger of Shattered Pixel Dungeon. Hunger goes up by 1 every turn, so the hero gets
// hungry 300 turns after a full meal and starts starving 150 turns later.
export const HUNGRY = 300;
export const STARVING = 450;

export interface Hunger {
  level: number;
  // Starving damage that has built up but is still less than 1 HP.
  partialDamage: number;
}

export type HungerState = 'fed' | 'hungry' | 'starving';

export const HUNGER_LABELS: Record<Exclude<HungerState, 'fed'>, string> = {
  hungry: 'Hungry',
  starving: 'Starving',
};

// What the hero's hunger means for them, with the turns left until they start starving.
export function describeHunger({ level }: Hunger): string {
  return level >= STARVING
    ? t('You slowly lose HP until you eat something.')
    : t('You need to eat. In {turns} turns without food, you start starving.', {
        turns: STARVING - level,
      });
}

export function createHunger(): Hunger {
  return { level: 0, partialDamage: 0 };
}

export function hungerState({ level }: Hunger): HungerState {
  return level >= STARVING ? 'starving' : level >= HUNGRY ? 'hungry' : 'fed';
}

// One turn passes, and returns the HP the hero loses. As in Hunger.act() of Shattered Pixel
// Dungeon, starting to starve costs 1 HP, and a starving hero loses a thousandth of their max HP
// every turn after that.
export function tickHunger(hunger: Hunger, maxHp: number): number {
  if (hunger.level >= STARVING) {
    hunger.partialDamage += maxHp / 1000;
    const damage = Math.floor(hunger.partialDamage);
    hunger.partialDamage -= damage;
    return damage;
  }
  hunger.level = Math.min(STARVING, hunger.level + 1);
  return hunger.level >= STARVING ? 1 : 0;
}

// Eating takes away hunger, down to none, as Hunger.satisfy() of Shattered Pixel Dungeon.
export function satisfyHunger(hunger: Hunger, amount: number): void {
  hunger.level = Math.max(0, hunger.level - amount);
}
