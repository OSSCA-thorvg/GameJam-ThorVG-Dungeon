import type { HungerState } from './hunger';
import type { StatusName } from './status';
import { STATUS_ICON_ROWS, statusIconMarkup } from './uiArt';

export type ShownHunger = Exclude<HungerState, 'fed'>;

// Typed here, so that every effect and every shown hunger must have an icon.
const ROWS: Record<StatusName | ShownHunger, string[]> = STATUS_ICON_ROWS;

// Each icon is SVG markup in an 11 by 11 box, painted in the color of the text around it.
export const STATUS_ICONS = Object.fromEntries(
  Object.keys(ROWS).map((name) => [name, statusIconMarkup(name as StatusName | ShownHunger)]),
) as Record<StatusName | ShownHunger, string>;
