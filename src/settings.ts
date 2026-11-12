// What the player sets in the settings window. It stays in this browser between runs.
export interface Settings {
  // How many times larger everything but the map is drawn.
  uiScale: number;
  // How loud the sound effects and the music are, from 0 to 1.
  sfxVolume: number;
  musicVolume: number;
}

// The steps of display scaling in Windows, from 100% to 200%.
const UI_SCALES = [1, 1.25, 1.5, 1.75, 2];

// A heuristic, not a measurement of the UI: at 100% the UI was seen to fit a 360px wide phone
// screen. A UI scale is offered only when the window keeps that much width for the UI. Change this
// when the UI no longer fits in 360px.
const MIN_UI_WIDTH = 360;

export function availableUiScales(windowWidth: number): number[] {
  return UI_SCALES.filter((scale) => scale === 1 || windowWidth / scale >= MIN_UI_WIDTH);
}

// The UI scale in use: the chosen one, or the largest available while the window is too narrow for
// the chosen one.
export function uiScaleFor(settings: Settings, windowWidth: number): number {
  const available = availableUiScales(windowWidth);
  return available.includes(settings.uiScale) ? settings.uiScale : available[available.length - 1];
}

// The sounds were judged by ear at full volume, so that is the default.
const DEFAULT_SETTINGS: Settings = { uiScale: 1, sfxVolume: 1, musicVolume: 1 };
const STORAGE_KEY = 'thorvg-dungeon.settings';

// Storage can be blocked, as in a private window. Then the defaults stand in.
export function loadSettings(): Settings {
  try {
    const saved: Partial<Settings> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const uiScale = Number(saved.uiScale);
    // A missing value is not 0, so the volume falls back to the default.
    const volumeOf = (value: unknown, fallback: number) =>
      value === undefined || !(Number(value) >= 0 && Number(value) <= 1) ? fallback : Number(value);
    return {
      uiScale: UI_SCALES.includes(uiScale) ? uiScale : DEFAULT_SETTINGS.uiScale,
      sfxVolume: volumeOf(saved.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
      musicVolume: volumeOf(saved.musicVolume, DEFAULT_SETTINGS.musicVolume),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// When storage is blocked, the settings last only until the page closes.
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Nothing else can keep them.
  }
}
