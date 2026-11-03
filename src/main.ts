import ThorVG from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';
import { createRoomScene } from './render';
import { parseRoom } from './room';
import startRoom from './rooms/start.txt?raw';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Without locateFile, the package fetches the WASM file from unpkg.
const TVG = await ThorVG.init({ renderer: 'gl', locateFile: () => wasmUrl });
const canvas = new TVG.Canvas('#canvas', {
  width: window.innerWidth,
  height: window.innerHeight,
});

const roomScene = createRoomScene(TVG, parseRoom(startRoom));
roomScene.translate(window.innerWidth / 2, window.innerHeight / 2);
canvas.add(roomScene);
canvas.render();

window.addEventListener('resize', () => {
  canvas.resize(window.innerWidth, window.innerHeight);
  roomScene.translate(window.innerWidth / 2, window.innerHeight / 2);
  canvas.update().render();
});

// Same wheel sensitivity as defaultWheelDelta in d3-zoom.
function wheelExponent(event: WheelEvent): number {
  const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
  return -event.deltaY * unit * (event.ctrlKey ? 10 : 1);
}

let zoom = 1;

document.querySelector<HTMLCanvasElement>('#canvas')!.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * 2 ** wheelExponent(event)));
    roomScene.scale(zoom);
    canvas.update().render();
  },
  { passive: false },
);
