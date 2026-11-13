import type { Scene, Shape, ThorVGNamespace } from '@thorvg/webcanvas';
import { FONT_BOLD } from './fonts';
import { t } from './i18n';
import { createPixelSprite } from './pixelSprite';
import type { Point } from './room';
import { ART_PIXEL } from './tileArt';
import { HUD_ICONS, HUD_PALETTE } from './uiArt';

type Color = [r: number, g: number, b: number];

// Where the hero health bar is, which render.ts draws, and what goes on and under it, in screen
// pixels at UI scale 1. The text is 22 pixels, which is Galmuri11 at twice its own size.
export const BAR_LEFT = 12;
export const BAR_TOP = 12;
// The bar is 102 by 14 art pixels with its rim.
const BAR_WIDTH = 102 * ART_PIXEL;
const BAR_HEIGHT = 14 * ART_PIXEL;
// The experience bar is 102 by 4 art pixels with its rim, just under the health bar.
const XP_TOP = BAR_TOP + BAR_HEIGHT + 2 * ART_PIXEL;
const XP_INSIDE = 100;
const XP_ROWS: Color[] = [
  [154, 180, 244],
  [90, 120, 208],
];
// The line under it: the level, then the gold and the strength, each after its 12 by 12 icon. Each
// part has a place of its own, wide enough for its longest text.
const STATS_TOP = XP_TOP + 6 * ART_PIXEL;
const TEXT_SIZE = 22;
const ICON_SIZE = 12 * ART_PIXEL;
const LEVEL_LEFT = BAR_LEFT;
const COIN_LEFT = BAR_LEFT + 88;
const STRENGTH_LEFT = BAR_LEFT + 168;
const ICON_GAP = 4;

const INK: Color = [21, 22, 28];
const EMPTY: Color = [35, 35, 43];
const TEXT_COLOR: Color = [255, 255, 255];
const GOLD_COLOR: Color = [244, 216, 120];

export interface HudStats {
  level: number;
  experience: number;
  needed: number;
  gold: number;
  strength: number;
}

export interface Hud {
  scene: Scene;
  // The health, on the health bar.
  setHealth(health: number, maxHealth: number): void;
  // The experience bar and the line under it, in the language now on.
  setStats(stats: HudStats): void;
}

// Text with a dark rim one art pixel wide, made of eight dark copies around it. ThorVG's own
// outline is not used, because its GL renderer now and then draws outlined text as a hole.
function createRimmedText(
  TVG: ThorVGNamespace,
  scene: Scene,
  at: Point,
  align: [x: number, y: number],
  color: Color,
) {
  const offsets = [-1, 0, 1].flatMap((x) => [-1, 0, 1].map((y) => ({ x, y })));
  const copies = [
    ...offsets.filter(({ x, y }) => x !== 0 || y !== 0).map((offset) => ({ offset, fill: INK })),
    { offset: { x: 0, y: 0 }, fill: color },
  ].map(({ offset, fill }) => {
    const text = new TVG.Text();
    text
      .font(FONT_BOLD)
      .fontSize(TEXT_SIZE)
      .fill(...fill)
      .align(...align)
      .translate(at.x + offset.x * ART_PIXEL, at.y + offset.y * ART_PIXEL);
    scene.add(text);
    return text;
  });
  return (value: string) => {
    for (const copy of copies) {
      copy.text(value);
    }
  };
}

// The text and bars at the top left of the screen, drawn by ThorVG so that nothing on it can be
// selected or falls out of line with the health bar, and so that it takes the UI scale with the bar.
export function createHud(TVG: ThorVGNamespace, render: () => void): Hud {
  const scene = new TVG.Scene();

  const xpFrame = new TVG.Shape();
  xpFrame.appendRect(BAR_LEFT, XP_TOP, (XP_INSIDE + 2) * ART_PIXEL, 4 * ART_PIXEL);
  xpFrame.fill(...INK);
  const xpEmpty = new TVG.Shape();
  xpEmpty.appendRect(BAR_LEFT + ART_PIXEL, XP_TOP + ART_PIXEL, XP_INSIDE * ART_PIXEL, 2 * ART_PIXEL);
  xpEmpty.fill(...EMPTY);
  scene.add(xpFrame);
  scene.add(xpEmpty);
  const xpRows: Shape[] = XP_ROWS.map(() => {
    const shape = new TVG.Shape();
    scene.add(shape);
    return shape;
  });

  const icon = (rows: string[], left: number) =>
    createPixelSprite(TVG, rows, HUD_PALETTE, {
      x: left + ICON_SIZE / 2,
      y: STATS_TOP + TEXT_SIZE / 2 + ICON_SIZE / 2,
    });
  scene.add(icon(HUD_ICONS.coin, COIN_LEFT));
  scene.add(icon(HUD_ICONS.strength, STRENGTH_LEFT));

  const setHealthText = createRimmedText(
    TVG,
    scene,
    { x: BAR_LEFT + BAR_WIDTH / 2, y: BAR_TOP + BAR_HEIGHT / 2 },
    [0.5, 0.5],
    TEXT_COLOR,
  );
  const textAt = (left: number) => ({ x: left, y: STATS_TOP + TEXT_SIZE / 2 });
  const setLevelText = createRimmedText(TVG, scene, textAt(LEVEL_LEFT), [0, 0.5], TEXT_COLOR);
  const afterIcon = (left: number) => textAt(left + ICON_SIZE + ICON_GAP);
  const setGoldText = createRimmedText(TVG, scene, afterIcon(COIN_LEFT), [0, 0.5], GOLD_COLOR);
  const setStrengthText = createRimmedText(
    TVG,
    scene,
    afterIcon(STRENGTH_LEFT),
    [0, 0.5],
    TEXT_COLOR,
  );

  return {
    scene,
    setHealth(value, maxValue) {
      setHealthText(`${value}/${maxValue}`);
      render();
    },
    setStats({ level, experience, needed, gold, strength }) {
      const width = Math.round((XP_INSIDE * Math.min(experience, needed)) / needed);
      xpRows.forEach((shape, row) => {
        shape.reset();
        if (width > 0) {
          shape.appendRect(
            BAR_LEFT + ART_PIXEL,
            XP_TOP + (1 + row) * ART_PIXEL,
            width * ART_PIXEL,
            ART_PIXEL,
          );
        }
        shape.fill(...XP_ROWS[row]);
      });
      setLevelText(t('Lv {level}', { level }));
      setGoldText(String(gold));
      setStrengthText(String(strength));
      render();
    },
  };
}
