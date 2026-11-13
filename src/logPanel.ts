import { translate } from './i18n';
import { colorOf, type LoggedMessage } from './messageLog';

export interface LogPanelOptions {
  getMessages(): readonly LoggedMessage[];
  onOpen(): void;
}

// The window with every message of the run, opened from the Log button. It opens at the newest.
export function createLogPanel({ getMessages, onOpen }: LogPanelOptions): void {
  const button = document.querySelector<HTMLButtonElement>('#log-button')!;
  const overlay = document.querySelector<HTMLElement>('#log-window')!;
  const lines = document.querySelector<HTMLElement>('#log-lines')!;

  const close = () => {
    overlay.hidden = true;
  };

  button.addEventListener('click', () => {
    onOpen();
    lines.replaceChildren(
      ...getMessages().map(({ message, category }) => {
        const line = document.createElement('div');
        line.textContent = translate(message);
        line.style.color = colorOf(category);
        return line;
      }),
    );
    overlay.hidden = false;
    lines.scrollTop = lines.scrollHeight;
  });
  document.querySelector('#log-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  button.hidden = false;
}
