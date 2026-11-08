import { availableUiScales, uiScaleFor, type Settings } from './settings';

export interface SettingsPanelOptions {
  getSettings(): Settings;
  onOpen(): void;
  onChange(settings: Settings): void;
}

export interface SettingsPanel {
  // Offers the UI scales that fit the window as it is now.
  refresh(): void;
}

// The settings window, opened from the button at the top right.
export function createSettingsPanel({
  getSettings,
  onOpen,
  onChange,
}: SettingsPanelOptions): SettingsPanel {
  const button = document.querySelector<HTMLButtonElement>('#settings-button')!;
  const overlay = document.querySelector<HTMLElement>('#settings')!;
  const uiScale = document.querySelector<HTMLSelectElement>('#ui-scale')!;

  const refresh = () => {
    uiScale.replaceChildren(
      ...availableUiScales(window.innerWidth).map(
        (scale) => new Option(`${scale * 100}%`, String(scale)),
      ),
    );
    uiScale.value = String(uiScaleFor(getSettings(), window.innerWidth));
  };

  uiScale.addEventListener('change', () => {
    onChange({ ...getSettings(), uiScale: Number(uiScale.value) });
  });

  const close = () => {
    overlay.hidden = true;
  };

  button.addEventListener('click', () => {
    onOpen();
    refresh();
    overlay.hidden = false;
  });
  document.querySelector('#settings-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  button.hidden = false;
  return { refresh };
}
