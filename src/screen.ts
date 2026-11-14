import type { Canvas } from '@thorvg/webcanvas';

// The most canvas pixels to a CSS pixel. A phone covers a CSS pixel with 3 or more screen pixels,
// which makes a canvas 9 times as large, and the blur and the masks of the light cost by its size.
// In a headless test at the size of a phone, a frame took about 550 ms at 3, 200 ms at 2, and
// stayed under the 16 ms of the test's pacing at 1.5 and below. The browser scales the canvas up.
const MAX_PIXEL_RATIO = 1;

// How many pixels of the canvas one CSS pixel covers, as on a display scaled to 150%.
export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

// Gives the canvas one pixel for each pixel of the screen, up to the cap. ThorVG's own scaling for such displays
// draws fewer pixels than the screen has, 1 + 0.75 × (ratio - 1), and the browser then blurs them
// up to the screen, which smears pixel art and text. So that scaling is turned off where the canvas
// is made, and what is drawn on it is scaled by pixelRatio() instead.
export function fitCanvas(canvas: Canvas) {
  const ratio = pixelRatio();
  canvas.resize(Math.round(window.innerWidth * ratio), Math.round(window.innerHeight * ratio));
  const element = document.querySelector<HTMLCanvasElement>('#canvas')!;
  element.style.width = `${window.innerWidth}px`;
  element.style.height = `${window.innerHeight}px`;
}
