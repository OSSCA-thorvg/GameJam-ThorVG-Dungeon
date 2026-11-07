// Placeholder values. How many recent messages stay on the screen, and how much fainter each older
// message is than the one after it.
const VISIBLE_MESSAGES = 6;
const FADE_PER_MESSAGE = 0.15;

// The messages about what happened in the game, with the newest at the bottom.
export interface MessageLog {
  add(text: string): void;
  clear(): void;
}

export function createMessageLog(element: HTMLElement): MessageLog {
  return {
    add(text) {
      const line = document.createElement('div');
      line.textContent = text;
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
      element.replaceChildren();
    },
  };
}
