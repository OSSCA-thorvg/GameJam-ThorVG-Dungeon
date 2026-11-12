import type { HungerState } from './hunger';
import type { StatusName } from './status';

export type ShownHunger = Exclude<HungerState, 'fed'>;

const FORK_AND_KNIFE =
  '<path class="line" d="M1 0.5V3.5Q1 5 2.5 5Q4 5 4 3.5V0.5M2.5 0.5V9.5M7.5 9.5V0.5Q9 2 9 5.5H7.5"/>';

// Each icon is drawn in a 10 by 10 box, filled or with lines.
export const STATUS_ICONS: Record<StatusName | ShownHunger, string> = {
  // Two arrowheads pointing forward.
  haste: '<path class="line" d="M1.5 1.5L5 5L1.5 8.5M5 1.5L8.5 5L5 8.5"/>',
  // A circle crossed out.
  invisible: '<circle class="line" cx="5" cy="5" r="4.2"/><path class="line" d="M2 8L8 2"/>',
  // An arrow pointing up.
  levitating: '<path class="line" d="M5 9V1.5M2 4.5L5 1.5L8 4.5"/>',
  // An eye.
  telepathy:
    '<path class="line" d="M0.5 5C2.5 1.5 7.5 1.5 9.5 5C7.5 8.5 2.5 8.5 0.5 5Z"/>' +
    '<circle class="line" cx="5" cy="5" r="1.6"/>',
  // A bolt of lightning.
  paralyzed: '<path class="fill" d="M6 0L1.5 5.8H4.6L3.6 10L8.5 3.9H5.3Z"/>',
  // A snowflake.
  frozen: '<path class="line" d="M5 0V10M0.7 2.5L9.3 7.5M0.7 7.5L9.3 2.5"/>',
  // A flame.
  burning:
    '<path class="fill" d="M5 0C6.5 2.5 9 4 9 6.5C9 8.7 7.2 10 5 10C2.8 10 1 8.7 1 6.5' +
    'C1 4.5 2.5 3.5 3 2C3.8 3.2 4 4 4.5 4.5C4.8 3 4.8 1.5 5 0Z"/>',
  // A drop.
  poisoned:
    '<path class="fill" d="M5 0.5C6.8 3.5 8.5 5 8.5 6.8C8.5 8.7 6.9 10 5 10C3.1 10 1.5 8.7 1.5 6.8' +
    'C1.5 5 3.2 3.5 5 0.5Z"/>',
  // A circle with a cross in it.
  stunned: '<circle class="line" cx="5" cy="5" r="4.2"/><path class="line" d="M3 3L7 7M7 3L3 7"/>',
  // A shield.
  shielded: '<path class="line" d="M5 0.8L9 2.3V5.5C9 7.7 7.2 9 5 9.8C2.8 9 1 7.7 1 5.5V2.3Z"/>',
  // A cross.
  regenerating: '<path class="line" d="M5 1V9M1 5H9"/>',
  // An arrow pointing down.
  weakened: '<path class="line" d="M5 1V8.5M2 5.5L5 8.5L8 5.5"/>',
  hungry: FORK_AND_KNIFE,
  starving: FORK_AND_KNIFE,
};
