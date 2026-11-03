import ThorVG from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';
import playerIcon from '../assets/icons/cathelineau/swordman.svg?raw';
import { attackEnemy, createEnemy, type Enemy } from './enemy';
import { findPath } from './path';
import { createCharacter, createDummyEnemy, createHealthBar, createRoomView } from './render';
import { parseRoom, type Point } from './room';
import startRoom from './rooms/start.txt?raw';
import { playSplash } from './splash';

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

await playSplash(TVG, canvas);
document.querySelector('footer')!.hidden = false;

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

const enemies = room.monsters.map((position) => {
  const paint = createDummyEnemy(TVG);
  roomView.place(paint, position.x, position.y);

  const healthBar = createHealthBar(TVG);
  roomView.placeOverlay(healthBar.scene, position.x, position.y);

  return { enemy: createEnemy(position, healthBar), paint };
});

canvas.render();

window.addEventListener('resize', () => {
  canvas.resize(window.innerWidth, window.innerHeight);
  roomView.scene.translate(window.innerWidth / 2, window.innerHeight / 2);
  canvas.update().render();
});

const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas')!;

let path: Point[] = [];
let attackTarget: Enemy | null = null;
let isWalking = false;

function attack(enemy: Enemy) {
  attackEnemy(enemy);
  if (enemy.hp === 0) {
    const index = enemies.findIndex((entry) => entry.enemy === enemy);
    roomView.remove(enemies[index].paint);
    roomView.remove(enemy.healthBar.scene);
    enemies.splice(index, 1);
  }
  canvas.update().render();
}

function walk() {
  const next = path.shift();
  if (!next) {
    isWalking = false;
    if (attackTarget) {
      attack(attackTarget);
      attackTarget = null;
    }
    return;
  }

  isWalking = true;
  playerPosition = next;
  roomView.place(player, next.x, next.y);
  canvas.update().render();
  setTimeout(walk, STEP_INTERVAL_MS);
}

function occupiedTiles(except?: Enemy): Point[] {
  return enemies.filter(({ enemy }) => enemy !== except).map(({ enemy }) => enemy.position);
}

// Returns the tiles to walk through to stand next to an enemy.
function pathToAttack(enemy: Enemy): Point[] {
  const isAdjacent =
    Math.abs(enemy.position.x - playerPosition.x) <= 1 &&
    Math.abs(enemy.position.y - playerPosition.y) <= 1;
  return isAdjacent
    ? []
    : findPath(room, playerPosition, enemy.position, occupiedTiles(enemy)).slice(0, -1);
}

canvasElement.addEventListener('click', (event) => {
  const target = roomView.tileAt(
    (event.offsetX - window.innerWidth / 2) / zoom,
    (event.offsetY - window.innerHeight / 2) / zoom,
  );

  // The enemy's body is checked first, because it stands above the floor tile behind it.
  const clicked = enemies.find(
    ({ enemy, paint }) =>
      paint.intersects(event.offsetX * canvas.dpr, event.offsetY * canvas.dpr, 1, 1) ||
      (target && enemy.position.x === target.x && enemy.position.y === target.y),
  );

  if (clicked) {
    path = pathToAttack(clicked.enemy);
    attackTarget = clicked.enemy;
  } else if (target) {
    path = findPath(room, playerPosition, target, occupiedTiles());
    attackTarget = null;
  } else {
    return;
  }

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
