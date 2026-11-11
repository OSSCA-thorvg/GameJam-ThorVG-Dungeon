import type { Canvas, ThorVGNamespace } from '@thorvg/webcanvas';
import splashJson from '../assets/splash/powred.by.thorvg.1.json?raw';

// Longest frame time that counts toward playback, so the splash still plays in full
// after the browser pauses requestAnimationFrame in a background tab.
const MAX_FRAME_TIME_MS = 100;

// Plays the ThorVG splash once and resolves when it ends.
export async function playSplash(TVG: ThorVGNamespace, canvas: Canvas): Promise<void> {
  const animation = new TVG.LottieAnimation();
  const picture = animation.picture!;
  animation.load(splashJson);

  const { width, height } = picture.size();
  const { totalFrames, fps } = animation.info()!;

  const fitToWindow = () => {
    const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
    picture.size(width * scale, height * scale);
    picture.translate(
      (window.innerWidth - width * scale) / 2,
      (window.innerHeight - height * scale) / 2,
    );
  };

  const onResize = () => {
    canvas.resize(window.innerWidth, window.innerHeight);
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

  document.body.style.background = '';
  window.removeEventListener('resize', onResize);
  canvas.remove(picture);
  animation.dispose();
  canvas.update().render();
}
