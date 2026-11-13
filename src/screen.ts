import type { Canvas } from '@thorvg/webcanvas';

// How many pixels of the screen one CSS pixel covers, as on a display scaled to 150%.
export const pixelRatio = () => window.devicePixelRatio || 1;

// Gives the canvas one pixel for each pixel of the screen. ThorVG's own scaling for such displays
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
