import { STATUS_COLORS } from './render';
import {
  hasStatus,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  type StatusName,
  type Statuses,
} from './status';

// Each icon is drawn in a 10 by 10 box, filled or with lines.
const ICONS: Record<StatusName, string> = {
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
};

// The player's effects as a row of icons with the turns left, below the health bar. Pointing at
// an icon, or tapping it, explains the effect.
export interface StatusBar {
  show(statuses: Statuses): void;
}

export function createStatusBar(element: HTMLElement, tooltip: HTMLElement): StatusBar {
  let statuses: Statuses = {};
  // The effect being explained, and whether a click keeps it open after the pointer leaves.
  let explained: StatusName | null = null;
  let isPinned = false;

  const itemOf = (name: StatusName) =>
    element.querySelector<HTMLElement>(`[data-status="${name}"]`);

  const explain = (name: StatusName | null) => {
    explained = name;
    const item = name && itemOf(name);
    if (!name || !item) {
      explained = null;
      isPinned = false;
      tooltip.hidden = true;
      return;
    }
    const title = document.createElement('strong');
    title.textContent = STATUS_LABELS[name];
    title.style.color = item.style.color;
    const description = document.createElement('p');
    description.textContent = STATUS_DESCRIPTIONS[name];
    const turns = document.createElement('p');
    turns.textContent = `${statuses[name]} turns left`;
    tooltip.replaceChildren(title, description, turns);
    tooltip.hidden = false;

    const bounds = item.getBoundingClientRect();
    tooltip.style.left = `${bounds.left}px`;
    tooltip.style.top = `${bounds.bottom + 6}px`;
  };

  // A click anywhere else closes a pinned explanation.
  document.addEventListener('click', (event) => {
    if (isPinned && !element.contains(event.target as Node)) {
      explain(null);
    }
  });

  return {
    show(next) {
      statuses = next;
      const names = (Object.keys(STATUS_LABELS) as StatusName[]).filter((name) =>
        hasStatus(statuses, name),
      );
      element.replaceChildren(
        ...names.map((name) => {
          const [r, g, b] = STATUS_COLORS[name];
          const item = document.createElement('button');
          item.className = 'status-effect';
          item.dataset.status = name;
          item.setAttribute('aria-label', `${STATUS_LABELS[name]}, ${statuses[name]} turns`);
          const svg = `<svg viewBox="-1 -1 12 12" aria-hidden="true">${ICONS[name]}</svg>`;
          item.innerHTML = svg;
          item.style.color = `rgb(${r} ${g} ${b})`;
          item.append(String(statuses[name]));

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
      // The explanation follows the turns left, and closes when its effect ends.
      explain(explained);
    },
  };
}
