import { drawTitle, TITLE_SCALE } from './titleArt';

// Placeholder value. How long the menu stays empty after the splash, before it fades in.
const FADE_DELAY_MS = 200;

export type MenuChoice = 'new' | 'continue';

export interface MainMenu {
  // Shows the menu, with Continue when there is a saved game, and resolves with what the player
  // chose.
  show(canContinue: boolean): Promise<MenuChoice>;
}

// The start screen, which also comes back when the player leaves a run. It opens the settings
// window through the button that already does.
export function createMainMenu(openSettings: () => void): MainMenu {
  const menu = document.querySelector<HTMLElement>('#main-menu')!;
  const play = document.querySelector<HTMLButtonElement>('#menu-play')!;
  const resume = document.querySelector<HTMLButtonElement>('#menu-continue')!;
  let choose: ((choice: MenuChoice) => void) | null = null;

  const pick = (choice: MenuChoice) => {
    menu.hidden = true;
    document.body.classList.remove('menu-open');
    choose?.(choice);
    choose = null;
  };
  play.addEventListener('click', () => pick('new'));
  resume.addEventListener('click', () => pick('continue'));
  document.querySelector('#menu-settings')!.addEventListener('click', openSettings);

  // The title is text until its picture is drawn, which waits for the font.
  const title = menu.querySelector<HTMLElement>('h1')!;
  void drawTitle().then(({ svg, width, height }) => {
    const image = new Image(width * TITLE_SCALE, height * TITLE_SCALE);
    image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    image.alt = title.textContent ?? '';
    title.replaceChildren(image);
  });

  return {
    show(canContinue) {
      // A hidden page shows the menu at once, as its fade would only play once the page shows
      // again.
      if (!document.hidden) {
        menu.classList.add('faded');
        setTimeout(() => menu.classList.remove('faded'), FADE_DELAY_MS);
      }
      resume.hidden = !canContinue;
      menu.hidden = false;
      document.body.classList.add('menu-open');
      return new Promise((resolve) => {
        choose = resolve;
      });
    },
  };
}
