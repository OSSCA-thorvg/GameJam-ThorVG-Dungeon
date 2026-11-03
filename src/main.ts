import ThorVG from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';
import playerIcon from '../assets/icons/cathelineau/swordman.svg?raw';
import { findPath } from './path';
import { createCharacter, createRoomView } from './render';
import { parseRoom, type Point } from './room';
import startRoom from './rooms/start.txt?raw';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Same as DEFAULT_MOVE_INTERVAL in Shattered Pixel Dungeon.
const STEP_INTERVAL_MS = 100;

// Without locateFile, the package fetches the WASM file from unpkg.
const TVG = await ThorVG.init({ renderer: 'gl', locateFile: () => wasmUrl });
const canvas = new TVG.Canvas('#canvas', {
  width: window.innerWidth,
  height: window.innerHeight,
});

const room = parseRoom(startRoom);
if (!room.start) {
  throw new Error('The start room needs a "@" tile');
}

const roomView = createRoomView(TVG, room);
roomView.scene.translate(window.innerWidth / 2, window.innerHeight / 2);
canvas.add(roomView.scene);

const player = createCharacter(TVG, playerIcon);
let playerPosition = room.start;
roomView.place(player, playerPosition.x, playerPosition.y);

canvas.render();

window.addEventListener('resize', () => {
  canvas.resize(window.innerWidth, window.innerHeight);
  roomView.scene.translate(window.innerWidth / 2, window.innerHeight / 2);
  canvas.update().render();
});

const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas')!;

let path: Point[] = [];
let isWalking = false;

function walk() {
  const next = path.shift();
  if (!next) {
    isWalking = false;
    return;
  }

  isWalking = true;
  playerPosition = next;
  roomView.place(player, next.x, next.y);
  canvas.update().render();
  setTimeout(walk, STEP_INTERVAL_MS);
}

canvasElement.addEventListener('click', (event) => {
  const target = roomView.tileAt(
    (event.offsetX - window.innerWidth / 2) / zoom,
    (event.offsetY - window.innerHeight / 2) / zoom,
  );
  if (!target) {
    return;
  }

  path = findPath(room, playerPosition, target);
  if (!isWalking) {
    walk();
  }
});

// Same wheel sensitivity as defaultWheelDelta in d3-zoom.
function wheelExponent(event: WheelEvent): number {
  const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
  return -event.deltaY * unit * (event.ctrlKey ? 10 : 1);
}

let zoom = 1;

canvasElement.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * 2 ** wheelExponent(event)));
    roomView.scene.scale(zoom);
    canvas.update().render();
  },
  { passive: false },
);
