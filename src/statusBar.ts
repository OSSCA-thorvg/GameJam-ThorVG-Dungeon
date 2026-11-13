import {
  describeHunger,
  HUNGER_LABELS,
  hungerState,
  type Hunger,
} from './hunger';
import { t } from './i18n';
import { STATUS_COLORS } from './render';
import { STATUS_ICONS, type ShownHunger } from './statusIcons';
import {
  hasStatus,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  type StatusName,
  type Statuses,
} from './status';

type Color = [r: number, g: number, b: number];
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
    title.textContent = t(entry.label);
    title.style.color = item.style.color;
    const description = document.createElement('p');
    description.textContent = t(entry.description);
    const lines = [title, description];
    if (entry.turns !== null) {
      const turns = document.createElement('p');
      turns.textContent = t('{turns} turns left', { turns: entry.turns });
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
          item.setAttribute(
            'aria-label',
            turns === null ? t(label) : `${t(label)}, ${t('{turns} turns', { turns })}`,
          );
          const svg = `<svg viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">${STATUS_ICONS[name]}</svg>`;
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
