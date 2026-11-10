// Something the hero can do at the campfire, shown as a button in its window.
export interface CampfireAction {
  label: string;
  detail: string;
  // Why the action cannot be done now, shown instead of the detail, if there is a reason.
  blockedReason: string | null;
  run(): void;
}

export interface CampfirePanel {
  open(actions: CampfireAction[]): void;
  close(): void;
}

// The window that opens when the hero uses the campfire. Choosing an action closes it.
export function createCampfirePanel(): CampfirePanel {
  const overlay = document.querySelector<HTMLElement>('#campfire')!;
  const list = document.querySelector<HTMLElement>('#campfire-actions')!;

  const close = () => {
    overlay.hidden = true;
  };

  document.querySelector('#campfire-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  return {
    open(actions) {
      list.replaceChildren(
        ...actions.map(({ label, detail, blockedReason, run }) => {
          const button = document.createElement('button');
          button.className = 'campfire-action';
          const title = document.createElement('strong');
          title.textContent = label;
          const note = document.createElement('span');
          note.textContent = blockedReason ?? detail;
          button.append(title, note);
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
