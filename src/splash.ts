import type { Canvas, ThorVGNamespace } from '@thorvg/webcanvas';
import splashJson from '../assets/splash/powred.by.thorvg.1.json?raw';
import { fitCanvas, pixelRatio } from './screen';

// Placeholder value. How long the last frame fades out to the black behind it.
const FADE_OUT_MS = 500;

// Plays the ThorVG splash once and resolves when it ends.
export async function playSplash(TVG: ThorVGNamespace, canvas: Canvas): Promise<void> {
  const animation = new TVG.LottieAnimation();
  const picture = animation.picture!;
  animation.load(splashJson);

  const { width, height } = picture.size();
  const { totalFrames, fps } = animation.info()!;

  const fitToWindow = () => {
    const screenWidth = window.innerWidth * pixelRatio();
    const screenHeight = window.innerHeight * pixelRatio();
    const scale = Math.min(screenWidth / width, screenHeight / height);
    picture.size(width * scale, height * scale);
    picture.translate((screenWidth - width * scale) / 2, (screenHeight - height * scale) / 2);
  };

  const onResize = () => {
    fitCanvas(canvas);
    fitToWindow();
  };

  fitToWindow();
  canvas.add(picture);
  window.addEventListener('resize', onResize);
  document.body.style.background = 'black';

  // The browser stops calling requestAnimationFrame while the page is hidden, so the frames only
  // draw the splash, and a timer ends it on time. A page shown again after that finds the splash
  // over.
  await new Promise<void>((resolve) => {
    const startTime = performance.now();
    let frameRequest = 0;
    const step = (time: number) => {
      animation.frame(Math.min(((time - startTime) / 1000) * fps, totalFrames - 1));
      canvas.update().render();
      frameRequest = requestAnimationFrame(step);
    };
    frameRequest = requestAnimationFrame(step);
    setTimeout(
      () => {
        cancelAnimationFrame(frameRequest);
        resolve();
      },
      (totalFrames / fps) * 1000,
    );
  });

  // The last frame fades out to the black behind it, so the screen does not cut to the next one.
  // A hidden page skips the fade, which would only play once the page shows again.
  const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas')!;
  if (!document.hidden) {
    canvasElement.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
    canvasElement.style.opacity = '0';
    await new Promise((resolve) => setTimeout(resolve, FADE_OUT_MS));
  }

  window.removeEventListener('resize', onResize);
  canvas.remove(picture);
  animation.dispose();
  canvas.update().render();
  canvasElement.style.transition = '';
  canvasElement.style.opacity = '';
  document.body.style.background = '';
}
