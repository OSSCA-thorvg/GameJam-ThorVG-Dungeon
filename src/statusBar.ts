import {
  describeHunger,
  HUNGER_LABELS,
  hungerState,
  type Hunger,
  type HungerState,
} from './hunger';
import { STATUS_COLORS } from './render';
import {
  hasStatus,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  type StatusName,
  type Statuses,
} from './status';

type Color = [r: number, g: number, b: number];
type ShownHunger = Exclude<HungerState, 'fed'>;

const FORK_AND_KNIFE =
  '<path class="line" d="M1 0.5V3.5Q1 5 2.5 5Q4 5 4 3.5V0.5M2.5 0.5V9.5M7.5 9.5V0.5Q9 2 9 5.5H7.5"/>';

// Each icon is drawn in a 10 by 10 box, filled or with lines.
const ICONS: Record<StatusName | ShownHunger, string> = {
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
  hungry: FORK_AND_KNIFE,
  starving: FORK_AND_KNIFE,
};

// Placeholder colors of the hunger icons.
const HUNGER_COLORS: Record<ShownHunger, Color> = {
  hungry: [235, 190, 70],
  starving: [230, 80, 60],
};

// An icon on the bar: an effect with the turns it has left, or the hero's hunger, which has none.
interface Entry {
  name: StatusName | ShownHunger;
  label: string;
  description: string;
  color: Color;
  turns: number | null;
}

// The hero's hunger and effects as a row of icons, below the health bar. An effect shows the turns
// it has left. Pointing at an icon, or tapping it, explains it.
export interface StatusBar {
  show(statuses: Statuses, hunger: Hunger): void;
}

export function createStatusBar(element: HTMLElement, tooltip: HTMLElement): StatusBar {
  let entries: Entry[] = [];
  // The icon being explained, and whether a click keeps it open after the pointer leaves.
  let explained: Entry['name'] | null = null;
  let isPinned = false;

  const itemOf = (name: Entry['name']) =>
    element.querySelector<HTMLElement>(`[data-status="${name}"]`);

  const explain = (name: Entry['name'] | null) => {
    const entry = entries.find((candidate) => candidate.name === name);
    const item = entry && itemOf(entry.name);
    if (!entry || !item) {
      explained = null;
      isPinned = false;
      tooltip.hidden = true;
      return;
    }
    explained = entry.name;
    const title = document.createElement('strong');
    title.textContent = entry.label;
    title.style.color = item.style.color;
    const description = document.createElement('p');
    description.textContent = entry.description;
    const lines = [title, description];
    if (entry.turns !== null) {
      const turns = document.createElement('p');
      turns.textContent = `${entry.turns} turns left`;
      lines.push(turns);
    }
    tooltip.replaceChildren(...lines);
    tooltip.hidden = false;

    // The bounds are on the screen, but the tooltip's own position is zoomed by the UI scale.
    const bounds = item.getBoundingClientRect();
    const zoom = tooltip.currentCSSZoom;
    tooltip.style.left = `${bounds.left / zoom}px`;
    tooltip.style.top = `${bounds.bottom / zoom + 6}px`;
  };

  // A click anywhere else closes a pinned explanation.
  document.addEventListener('click', (event) => {
    if (isPinned && !element.contains(event.target as Node)) {
      explain(null);
    }
  });

  return {
    show(statuses, hunger) {
      const effects = (Object.keys(STATUS_LABELS) as StatusName[])
        .filter((name) => hasStatus(statuses, name))
        .map(
          (name): Entry => ({
            name,
            label: STATUS_LABELS[name],
            description: STATUS_DESCRIPTIONS[name],
            color: STATUS_COLORS[name],
            turns: statuses[name] ?? 0,
          }),
        );
      const state = hungerState(hunger);
      entries =
        state === 'fed'
          ? effects
          : [
              {
                name: state,
                label: HUNGER_LABELS[state],
                description: describeHunger(hunger),
                color: HUNGER_COLORS[state],
                turns: null,
              },
              ...effects,
            ];

      element.replaceChildren(
        ...entries.map(({ name, label, color: [r, g, b], turns }) => {
          const item = document.createElement('button');
          item.className = 'status-effect';
          item.dataset.status = name;
          item.setAttribute('aria-label', turns === null ? label : `${label}, ${turns} turns`);
          const svg = `<svg viewBox="-1 -1 12 12" aria-hidden="true">${ICONS[name]}</svg>`;
          item.innerHTML = svg;
          item.style.color = `rgb(${r} ${g} ${b})`;
          if (turns !== null) {
            item.append(String(turns));
          }

          item.addEventListener('pointerenter', (event) => {
            if (event.pointerType === 'mouse' && !isPinned) {
              explain(name);
            }
          });
          item.addEventListener('pointerleave', (event) => {
            if (event.pointerType === 'mouse' && !isPinned) {
              explain(null);
            }
          });
          item.addEventListener('click', () => {
            const isOpen = isPinned && explained === name;
            explain(isOpen ? null : name);
            isPinned = !isOpen;
          });
          return item;
        }),
      );
      // The explanation follows the turns left, and closes when its icon goes away.
      explain(explained);
    },
  };
}
