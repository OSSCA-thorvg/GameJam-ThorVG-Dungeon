import { LANGUAGES, type Language } from './i18n';
import { availableUiScales, uiScaleFor, type Settings } from './settings';

export interface SettingsPanelOptions {
  getSettings(): Settings;
  onOpen(): void;
  onChange(settings: Settings): void;
}

export interface SettingsPanel {
  // Offers the UI scales that fit the window as it is now.
  refresh(): void;
  close(): void;
}

// The settings window, opened from the button at the top right.
export function createSettingsPanel({
  getSettings,
  onOpen,
  onChange,
}: SettingsPanelOptions): SettingsPanel {
  const button = document.querySelector<HTMLButtonElement>('#settings-button')!;
  const overlay = document.querySelector<HTMLElement>('#settings')!;
  const language = document.querySelector<HTMLSelectElement>('#language')!;
  const uiScale = document.querySelector<HTMLSelectElement>('#ui-scale')!;
  const sfxVolume = document.querySelector<HTMLInputElement>('#sfx-volume')!;
  const musicVolume = document.querySelector<HTMLInputElement>('#music-volume')!;
  const mute = document.querySelector<HTMLButtonElement>('#mute')!;

  language.replaceChildren(...LANGUAGES.map(({ code, name }) => new Option(name, code)));

  // How far a slider is filled, which the page's style sheet reads.
  const showFill = (slider: HTMLInputElement) =>
    slider.style.setProperty('--fill', `${slider.value}%`);

  const refresh = () => {
    language.value = getSettings().language;
    uiScale.replaceChildren(
      ...availableUiScales(window.innerWidth).map(
        (scale) => new Option(`${scale * 100}%`, String(scale)),
      ),
    );
    uiScale.value = String(uiScaleFor(getSettings(), window.innerWidth));
    sfxVolume.value = String(Math.round(getSettings().sfxVolume * 100));
    musicVolume.value = String(Math.round(getSettings().musicVolume * 100));
    showFill(sfxVolume);
    showFill(musicVolume);
    mute.setAttribute('aria-pressed', String(getSettings().muted));
  };

  language.addEventListener('change', () => {
    onChange({ ...getSettings(), language: language.value as Language });
    refresh();
  });
  uiScale.addEventListener('change', () => {
    onChange({ ...getSettings(), uiScale: Number(uiScale.value) });
  });
  sfxVolume.addEventListener('input', () => {
    showFill(sfxVolume);
    onChange({ ...getSettings(), sfxVolume: Number(sfxVolume.value) / 100 });
  });
  musicVolume.addEventListener('input', () => {
    showFill(musicVolume);
    onChange({ ...getSettings(), musicVolume: Number(musicVolume.value) / 100 });
  });

  mute.addEventListener('click', () => {
    onChange({ ...getSettings(), muted: !getSettings().muted });
    refresh();
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
  return { refresh, close };
}
