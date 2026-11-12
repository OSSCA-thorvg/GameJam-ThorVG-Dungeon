// Placeholder values. How many recent messages stay on the screen, and how much fainter each older
// message is than the one after it.
const VISIBLE_MESSAGES = 6;
const FADE_PER_MESSAGE = 0.15;

// What a message is about, which sets its color: plain news, good news, harm done to the hero, and
// warnings, which are signs of harm to come that the hero can still act on.
export type MessageCategory = 'info' | 'good' | 'danger' | 'warning';

// Placeholder colors, light enough to read over the dark floor.
const CATEGORY_COLORS: Record<MessageCategory, string> = {
  info: '#e8e8ec',
  good: '#8fd694',
  danger: '#ff7f78',
  warning: '#f4a65a',
};

export const colorOf = (category: MessageCategory) => CATEGORY_COLORS[category];

export interface LoggedMessage {
  text: string;
  category: MessageCategory;
}

// The messages about what happened in the game, with the newest at the bottom. The screen shows the
// latest few, and the history keeps all of them until the log is cleared.
export interface MessageLog {
  add(text: string, category?: MessageCategory): void;
  clear(): void;
  history(): readonly LoggedMessage[];
}

export function createMessageLog(element: HTMLElement): MessageLog {
  const history: LoggedMessage[] = [];
  return {
    history: () => history,
    add(text, category = 'info') {
      history.push({ text, category });
      const line = document.createElement('div');
      line.textContent = text;
      line.style.color = colorOf(category);
      element.append(line);
      while (element.children.length > VISIBLE_MESSAGES) {
        element.firstElementChild!.remove();
      }
      // Older messages fade, so the newest stands out.
      const lines = [...element.children] as HTMLElement[];
      lines.forEach((child, index) => {
        child.style.opacity = String(1 - (lines.length - 1 - index) * FADE_PER_MESSAGE);
      });
    },
    clear() {
      history.length = 0;
      element.replaceChildren();
    },
  };
}
