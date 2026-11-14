import { t } from './i18n';
import { TIMER_FRAME_COUNT } from './uiArt';

// Something the player can choose in a dialog, shown as a button.
export interface DialogAction {
  label: string;
  detail: string;
  // Why the action cannot be done now, shown instead of the detail, if there is a reason.
  blockedReason: string | null;
  run(): void;
  // A picture over the label, as SVG markup of art pixels.
  icon?: string;
}

// The most screen pixels an action's icon takes each way, and the most screen pixels to an art
// pixel. A picture of 32 art pixels, as the hero, gets 2 of them, as on the map, and a small one up
// to 4, as the 12 by 12 icons of the screen at their largest.
const ACTION_ICON_SIZE = 64;
const ACTION_ICON_MAX_SCALE = 4;

// Shows an icon at a whole number of screen pixels to an art pixel, so that its pixels stay square.
function actionIcon(svg: string): HTMLImageElement {
  const image = new Image();
  image.className = 'dialog-action-icon';
  image.alt = '';
  image.addEventListener('load', () => {
    const fit = Math.floor(ACTION_ICON_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
    const scale = Math.max(1, Math.min(ACTION_ICON_MAX_SCALE, fit));
    image.width = image.naturalWidth * scale;
    image.height = image.naturalHeight * scale;
  });
  image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return image;
}

// A line of a dialog that explains something shown with an icon, such as a button of the screen.
// The icon is the name of a custom property that uiArt.ts sets.
export interface DialogEntry {
  icon: string;
  text: string;
}

export interface DialogContent {
  title: string;
  text: string;
  entries?: DialogEntry[];
  actions: DialogAction[];
  // Opens the dialog this one came from, if there is one.
  onBack?: () => void;
  // Wider than the other windows, for a dialog of long lines.
  isWide?: boolean;
  // Lays the actions out in a grid of tiles, each an icon over its label.
  isGrid?: boolean;
  // How long the dialog ignores the close button and clicks outside it, for one that opens by
  // itself while the player may still be clicking at the game.
  closeDelayMs?: number;
}

export interface Dialog {
  open(content: DialogContent): void;
  close(): void;
  isOpen(): boolean;
}

// The window that opens when the hero uses a fixture, like the campfire, or for a guide. Choosing
// an action closes it.
export function createDialog(): Dialog {
  const overlay = document.querySelector<HTMLElement>('#dialog')!;
  const title = document.querySelector<HTMLElement>('#dialog-title')!;
  const text = document.querySelector<HTMLElement>('#dialog-text')!;
  const entryList = document.querySelector<HTMLElement>('#dialog-entries')!;
  const list = document.querySelector<HTMLElement>('#dialog-actions')!;
  const panel = document.querySelector<HTMLElement>('#dialog-panel')!;
  const closeButton = document.querySelector<HTMLButtonElement>('#dialog-close')!;
  let goBack: (() => void) | null = null;
  let isLocked = false;
  let lockTimer = 0;

  const unlock = () => {
    clearTimeout(lockTimer);
    isLocked = false;
    closeButton.disabled = false;
    closeButton.classList.remove('locked');
  };

  // The close button shows a timer that fills over the delay, and turns back into itself after it.
  const lock = (delayMs: number) => {
    isLocked = true;
    closeButton.disabled = true;
    closeButton.classList.add('locked');
    const start = performance.now();
    const step = () => {
      const frame = Math.floor(((performance.now() - start) / delayMs) * TIMER_FRAME_COUNT);
      if (frame >= TIMER_FRAME_COUNT) {
        unlock();
        return;
      }
      closeButton.style.setProperty('--timer-icon', `var(--icon-timer-${frame})`);
      lockTimer = window.setTimeout(step, delayMs / TIMER_FRAME_COUNT);
    };
    step();
  };

  const close = () => {
    unlock();
    overlay.hidden = true;
  };
  // A dialog opened from another one goes back to it instead of closing.
  const leave = () => {
    if (!isLocked) {
      goBack ? goBack() : close();
    }
  };

  closeButton.addEventListener('click', leave);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      leave();
    }
  });

  return {
    open(content) {
      unlock();
      if (content.closeDelayMs) {
        lock(content.closeDelayMs);
      }
      goBack = content.onBack ?? null;
      closeButton.classList.toggle('back', goBack !== null);
      closeButton.setAttribute('aria-label', t(goBack ? 'Back' : 'Close'));
      panel.classList.toggle('wide', content.isWide ?? false);
      list.classList.toggle('grid', content.isGrid ?? false);
      title.textContent = content.title;
      text.textContent = content.text;
      text.hidden = content.text === '';
      const entries = content.entries ?? [];
      entryList.hidden = entries.length === 0;
      entryList.replaceChildren(
        ...entries.map(({ icon, text: entryText }) => {
          const item = document.createElement('li');
          const iconFrame = document.createElement('span');
          iconFrame.className = 'dialog-entry-icon';
          iconFrame.style.setProperty('--entry-icon', `var(${icon})`);
          const note = document.createElement('span');
          note.textContent = entryText;
          item.append(iconFrame, note);
          return item;
        }),
      );
      list.replaceChildren(
        ...content.actions.map(({ label, detail, blockedReason, run, icon }) => {
          const button = document.createElement('button');
          button.className = 'dialog-action';
          if (icon) {
            button.append(actionIcon(icon));
          }
          const name = document.createElement('strong');
          name.textContent = label;
          button.append(name);
          // An action whose label says enough has no detail line.
          const noteText = blockedReason ?? detail;
          if (noteText !== '') {
            const note = document.createElement('span');
            note.textContent = noteText;
            button.append(note);
          }
          button.disabled = blockedReason !== null;
          button.addEventListener('click', () => {
            close();
            run();
          });
          return button;
        }),
      );
      overlay.hidden = false;
    },
    close,
    isOpen: () => !overlay.hidden,
  };
}
