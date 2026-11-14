import { t } from './i18n';

// Something the player can choose in a dialog, shown as a button.
export interface DialogAction {
  label: string;
  detail: string;
  // Why the action cannot be done now, shown instead of the detail, if there is a reason.
  blockedReason: string | null;
  run(): void;
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
}

export interface Dialog {
  open(content: DialogContent): void;
  close(): void;
  isOpen(): boolean;
}

// The window that opens when the hero uses a fixture, like the campfire or a sign. Choosing an
// action closes it.
export function createDialog(): Dialog {
  const overlay = document.querySelector<HTMLElement>('#dialog')!;
  const title = document.querySelector<HTMLElement>('#dialog-title')!;
  const text = document.querySelector<HTMLElement>('#dialog-text')!;
  const entryList = document.querySelector<HTMLElement>('#dialog-entries')!;
  const list = document.querySelector<HTMLElement>('#dialog-actions')!;
  const panel = document.querySelector<HTMLElement>('#dialog-panel')!;
  const closeButton = document.querySelector<HTMLButtonElement>('#dialog-close')!;
  let goBack: (() => void) | null = null;

  const close = () => {
    overlay.hidden = true;
  };
  // A dialog opened from another one goes back to it instead of closing.
  const leave = () => (goBack ? goBack() : close());

  closeButton.addEventListener('click', leave);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      leave();
    }
  });

  return {
    open(content) {
      goBack = content.onBack ?? null;
      closeButton.classList.toggle('back', goBack !== null);
      closeButton.setAttribute('aria-label', t(goBack ? 'Back' : 'Close'));
      panel.classList.toggle('wide', content.isWide ?? false);
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
        ...content.actions.map(({ label, detail, blockedReason, run }) => {
          const button = document.createElement('button');
          button.className = 'dialog-action';
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
