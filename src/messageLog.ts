import { translate, type Phrase } from './i18n';

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

// A message keeps its phrase, so it is shown in the language that is on when it is shown.
export interface LoggedMessage {
  message: Phrase;
  category: MessageCategory;
}

// The messages about what happened in the game, with the newest at the bottom. The screen shows the
// latest few, and the history keeps all of them until the log is cleared.
export interface MessageLog {
  add(message: Phrase, category?: MessageCategory): void;
  clear(): void;
  history(): readonly LoggedMessage[];
  // Shows the messages again, in the language now on.
  refresh(): void;
}

export function createMessageLog(element: HTMLElement): MessageLog {
  const history: LoggedMessage[] = [];

  const show = () => {
    const recent = history.slice(-VISIBLE_MESSAGES);
    element.replaceChildren(
      ...recent.map(({ message, category }, index) => {
        const line = document.createElement('div');
        line.textContent = translate(message);
        line.style.color = colorOf(category);
        // Older messages fade, so the newest stands out.
        line.style.opacity = String(1 - (recent.length - 1 - index) * FADE_PER_MESSAGE);
        return line;
      }),
    );
  };

  return {
    history: () => history,
    add(message, category = 'info') {
      history.push({ message, category });
      show();
    },
    clear() {
      history.length = 0;
      show();
    },
    refresh: show,
  };
}
