import type { Scene, ThorVGNamespace } from '@thorvg/webcanvas';
import { FONT_BOLD } from './fonts';

// Where the hero health bar is, which render.ts draws, and the numbers that go on and under it. The
// text is 22 pixels, which is Galmuri11 at twice its own size. It has no outline: ThorVG's GL
// renderer now and then draws outlined text as a hole through what is under it.
const BAR_LEFT = 12;
const BAR_TOP = 12;
const BAR_WIDTH = 200;
const BAR_HEIGHT = 23;
const STATS_TOP = 41;
const TEXT_SIZE = 22;

export interface Hud {
  scene: Scene;
  // The health, on the health bar.
  setHealth(health: number, maxHealth: number): void;
  // The line of numbers under the health bar.
  setStats(text: string): void;
}

// The text at the top left of the screen, drawn by ThorVG so that nothing on it can be selected or
// falls out of line with the health bar, and so that it takes the UI scale with the bar.
export function createHud(TVG: ThorVGNamespace, render: () => void): Hud {
  const health = new TVG.Text();
  health
    .font(FONT_BOLD)
    .fontSize(TEXT_SIZE)
    .fill(255, 255, 255)
    .align(0.5, 0.5)
    .translate(BAR_LEFT + BAR_WIDTH / 2, BAR_TOP + BAR_HEIGHT / 2);

  const stats = new TVG.Text();
  stats
    .font(FONT_BOLD)
    .fontSize(TEXT_SIZE)
    .fill(200, 202, 210)
    .align(0, 0)
    .translate(BAR_LEFT, STATS_TOP);

  const scene = new TVG.Scene();
  scene.add(health);
  scene.add(stats);

  return {
    scene,
    setHealth(value, maxValue) {
      health.text(`${value}/${maxValue}`);
      render();
    },
    setStats(text) {
      stats.text(text);
      render();
    },
  };
}
