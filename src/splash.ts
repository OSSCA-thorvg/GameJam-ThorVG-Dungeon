import type { Canvas, ThorVGNamespace } from '@thorvg/webcanvas';
import splashJson from '../assets/splash/powred.by.thorvg.1.json?raw';
import { fitCanvas, pixelRatio } from './screen';

// Longest frame time that counts toward playback, so the splash still plays in full
// after the browser pauses requestAnimationFrame in a background tab.
const MAX_FRAME_TIME_MS = 100;

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

  await new Promise<void>((resolve) => {
    let frame = 0;
    let lastTime = performance.now();

    const step = (time: number) => {
      frame += (Math.min(time - lastTime, MAX_FRAME_TIME_MS) / 1000) * fps;
      lastTime = time;
      if (frame >= totalFrames) {
        resolve();
        return;
      }
      animation.frame(frame);
      canvas.update().render();
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });

  // The last frame fades out to the black behind it, so the screen does not cut to the next one.
  const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas')!;
  canvasElement.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
  canvasElement.style.opacity = '0';
  await new Promise((resolve) => setTimeout(resolve, FADE_OUT_MS));

  window.removeEventListener('resize', onResize);
  canvas.remove(picture);
  animation.dispose();
  canvas.update().render();
  canvasElement.style.transition = '';
  canvasElement.style.opacity = '';
  document.body.style.background = '';
}
