// Placeholder value. How long the menu stays empty after the splash, before it fades in.
const FADE_DELAY_MS = 200;

// Shows the main menu and resolves when the player presses Play. The menu is only a start screen,
// so it opens the settings window through the button that already does.
export function showMainMenu(openSettings: () => void): Promise<void> {
  const menu = document.querySelector<HTMLElement>('#main-menu')!;
  const play = document.querySelector<HTMLButtonElement>('#menu-play')!;
  menu.classList.add('faded');
  menu.hidden = false;
  play.focus();
  setTimeout(() => menu.classList.remove('faded'), FADE_DELAY_MS);
  document.querySelector('#menu-settings')!.addEventListener('click', openSettings);
  return new Promise((resolve) => {
    play.addEventListener(
      'click',
      () => {
        menu.hidden = true;
        resolve();
      },
      { once: true },
    );
  });
}
