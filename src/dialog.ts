// Something the player can choose in a dialog, shown as a button.
export interface DialogAction {
  label: string;
  detail: string;
  // Why the action cannot be done now, shown instead of the detail, if there is a reason.
  blockedReason: string | null;
  run(): void;
}

export interface DialogContent {
  title: string;
  text: string;
  actions: DialogAction[];
}

export interface Dialog {
  open(content: DialogContent): void;
  close(): void;
}

// The window that opens when the hero uses a fixture, like the campfire or a sign. Choosing an
// action closes it.
export function createDialog(): Dialog {
  const overlay = document.querySelector<HTMLElement>('#dialog')!;
  const title = document.querySelector<HTMLElement>('#dialog-title')!;
  const text = document.querySelector<HTMLElement>('#dialog-text')!;
  const list = document.querySelector<HTMLElement>('#dialog-actions')!;

  const close = () => {
    overlay.hidden = true;
  };

  document.querySelector('#dialog-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  return {
    open(content) {
      title.textContent = content.title;
      text.textContent = content.text;
      list.replaceChildren(
        ...content.actions.map(({ label, detail, blockedReason, run }) => {
          const button = document.createElement('button');
          button.className = 'dialog-action';
          const name = document.createElement('strong');
          name.textContent = label;
          const note = document.createElement('span');
          note.textContent = blockedReason ?? detail;
          button.append(name, note);
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
  };
}
