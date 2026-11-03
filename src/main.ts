import ThorVG from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';
import playerIcon from '../assets/icons/cathelineau/swordman.svg?raw';
import { playAttackEffect } from './attackEffect';
import {
  attackEnemy,
  chasePlayer,
  createEnemy,
  ENEMY_ATTACK_DAMAGE,
  PLAYER_MAX_HP,
  type Enemy,
} from './enemy';
import { findPath } from './path';
import {
  createCharacter,
  createDummyEnemy,
  createHealthBar,
  createRoomView,
  tileDistance,
} from './render';
import { isAdjacent, parseRoom, type Point } from './room';
import startRoom from './rooms/start.txt?raw';
import { playSplash } from './splash';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Same as DEFAULT_MOVE_INTERVAL in Shattered Pixel Dungeon.
const STEP_INTERVAL_MS = 100;

// How far an attacker moves toward its target, as a fraction of the distance between tiles.
const LUNGE_DISTANCE = 0.5;

// Same as the panFollow intensity in HeroSprite.move() of Shattered Pixel Dungeon.
const CAMERA_FOLLOW_INTENSITY = 20;
// The camera snaps to its target below this distance, which is too small to see.
const CAMERA_SETTLE_DISTANCE = 0.1;

const scalePoint = (point: Point, factor: number): Point => ({
  x: point.x * factor,
  y: point.y * factor,
});

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
const playerStart = room.start;

const gameOverScreen = document.querySelector<HTMLElement>('#game-over')!;

const renderCanvas = () => canvas.update().render();

function createLevel() {
  return {
    roomView: createRoomView(TVG, room),
    player: createCharacter(TVG, playerIcon),
    playerHealthBar: createHealthBar(TVG, renderCanvas),
    enemies: room.monsters.map((position) =>
      createEnemy(
        position,
        createDummyEnemy(TVG),
        createHealthBar(TVG, renderCanvas),
        chasePlayer,
      ),
    ),
  };
}

let { roomView, player, playerHealthBar, enemies } = createLevel();
let playerPosition = playerStart;
let playerHp = PLAYER_MAX_HP;
let path: Point[] = [];
let attackTarget: Enemy | null = null;
let isWalking = false;
let isGameOver = false;
let finishAttackEffect: (() => void) | null = null;
let zoom = 1;
let cameraFocus: Point = { x: 0, y: 0 };
let cameraShake: Point = { x: 0, y: 0 };
let cameraFrame = 0;

// Keeps the camera focus at the center of the window.
function applyCamera() {
  roomView.scene.translate(
    window.innerWidth / 2 - cameraFocus.x * zoom + cameraShake.x,
    window.innerHeight / 2 - cameraFocus.y * zoom + cameraShake.y,
  );
}

// Moves the camera toward the player by a part of the remaining distance each frame.
function followPlayer() {
  if (cameraFrame) {
    return;
  }

  let lastTime: number | null = null;

  const step = (time: number) => {
    const target = roomView.tileCenter(playerPosition);
    const amount =
      lastTime === null ? 0 : Math.min(1, ((time - lastTime) / 1000) * CAMERA_FOLLOW_INTENSITY);
    lastTime = time;

    cameraFocus = {
      x: cameraFocus.x + (target.x - cameraFocus.x) * amount,
      y: cameraFocus.y + (target.y - cameraFocus.y) * amount,
    };

    const isSettled =
      Math.hypot(target.x - cameraFocus.x, target.y - cameraFocus.y) < CAMERA_SETTLE_DISTANCE;
    if (isSettled) {
      cameraFocus = target;
    }

    applyCamera();
    canvas.update().render();
    cameraFrame = isSettled ? 0 : requestAnimationFrame(step);
  };

  cameraFrame = requestAnimationFrame(step);
}

function placePlayer(tile: Point) {
  playerPosition = tile;
  roomView.place(player, tile.x, tile.y);
  roomView.placeOverlay(playerHealthBar.scene, tile.x, tile.y);
  followPlayer();
}

function placeEnemy(enemy: Enemy, tile: Point) {
  enemy.position = tile;
  roomView.place(enemy.paint, tile.x, tile.y);
  roomView.placeOverlay(enemy.healthBar.scene, tile.x, tile.y);
}

// Sets up the current level's scene and state for a new attempt.
function startLevel() {
  playerHp = PLAYER_MAX_HP;
  path = [];
  attackTarget = null;
  isWalking = false;
  isGameOver = false;
  finishAttackEffect = null;

  roomView.scene.scale(zoom);
  canvas.add(roomView.scene);

  placePlayer(playerStart);
  playerHealthBar.show(1);
  for (const enemy of enemies) {
    placeEnemy(enemy, enemy.position);
  }

  // A new attempt starts with the camera already on the player.
  cancelAnimationFrame(cameraFrame);
  cameraFrame = 0;
  cameraFocus = roomView.tileCenter(playerStart);
  cameraShake = { x: 0, y: 0 };
  applyCamera();

  gameOverScreen.hidden = true;
  canvas.update().render();
}

startLevel();

window.addEventListener('resize', () => {
  canvas.resize(window.innerWidth, window.innerHeight);
  applyCamera();
  canvas.update().render();
});

const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas')!;

function occupiedTiles(except?: Enemy): Point[] {
  return enemies.filter((enemy) => enemy !== except).map((enemy) => enemy.position);
}

function endGame() {
  isGameOver = true;
  roomView.remove(player);
  roomView.remove(playerHealthBar.scene);
  gameOverScreen.hidden = false;
}

function playEnemyAttack(enemy: Enemy, onDone: () => void) {
  const attackerTile = enemy.position;

  finishAttackEffect = playAttackEffect({
    lunge: scalePoint(tileDistance(attackerTile, playerPosition), LUNGE_DISTANCE),
    moveAttacker: (offset) => roomView.nudge(enemy.paint, attackerTile, offset),
    moveTarget: (offset) => roomView.nudge(player, playerPosition, offset),
    flashTarget: (isFlashing) => {
      player.resetEffects();
      if (isFlashing) {
        player.fillEffect(220, 60, 60, 255);
      }
    },
    shake: (offset) => {
      cameraShake = offset;
      applyCamera();
    },
    render: () => canvas.update().render(),
    onHit: () => {
      playerHp = Math.max(0, playerHp - ENEMY_ATTACK_DAMAGE);
      playerHealthBar.show(playerHp / PLAYER_MAX_HP);
      // Being hit stops the walk, so the player can decide again.
      path = [];
      attackTarget = null;
    },
    onEnd: () => {
      finishAttackEffect = null;
      if (playerHp === 0) {
        endGame();
      }
      onDone();
    },
  });
}

// Lets each enemy act once, one after another.
function runEnemyTurn(onDone: () => void) {
  const waiting = [...enemies];

  const actNext = () => {
    const enemy = waiting.shift();
    if (!enemy || isGameOver) {
      canvas.update().render();
      onDone();
      return;
    }

    const action = enemy.behavior(enemy, {
      room,
      player: playerPosition,
      occupied: occupiedTiles(enemy),
    });

    switch (action.type) {
      case 'move':
        placeEnemy(enemy, action.to);
        actNext();
        break;
      case 'attack':
        playEnemyAttack(enemy, actNext);
        break;
      case 'wait':
        actNext();
        break;
    }
  };

  actNext();
}

function playPlayerAttack(enemy: Enemy) {
  const attackerTile = playerPosition;

  finishAttackEffect = playAttackEffect({
    lunge: scalePoint(tileDistance(attackerTile, enemy.position), LUNGE_DISTANCE),
    moveAttacker: (offset) => roomView.nudge(player, attackerTile, offset),
    moveTarget: (offset) => roomView.nudge(enemy.paint, enemy.position, offset),
    flashTarget: (isFlashing) => {
      enemy.paint.resetEffects();
      if (isFlashing) {
        enemy.paint.fillEffect(255, 255, 255, 255);
      }
    },
    render: () => canvas.update().render(),
    onHit: () => attackEnemy(enemy),
    onEnd: () => {
      finishAttackEffect = null;
      if (enemy.hp === 0) {
        roomView.remove(enemy.paint);
        roomView.remove(enemy.healthBar.scene);
        enemies.splice(enemies.indexOf(enemy), 1);
      }
      runEnemyTurn(() => {});
    },
  });
}

// Returns the tiles to walk through to stand next to an enemy.
function pathToAttack(enemy: Enemy): Point[] {
  return isAdjacent(enemy.position, playerPosition)
    ? []
    : findPath(room, playerPosition, enemy.position, occupiedTiles(enemy)).slice(0, -1);
}

function walk() {
  if (isGameOver) {
    return;
  }

  // The target may have moved on its turn.
  if (attackTarget) {
    path = pathToAttack(attackTarget);
  }

  const next = path.shift();
  if (!next) {
    isWalking = false;
    if (attackTarget && isAdjacent(attackTarget.position, playerPosition)) {
      playPlayerAttack(attackTarget);
    }
    attackTarget = null;
    return;
  }

  // An enemy may have stepped onto the path.
  if (occupiedTiles().some((tile) => tile.x === next.x && tile.y === next.y)) {
    path = [];
    attackTarget = null;
    isWalking = false;
    return;
  }

  isWalking = true;
  placePlayer(next);
  runEnemyTurn(() => setTimeout(walk, STEP_INTERVAL_MS));
}

canvasElement.addEventListener('click', (event) => {
  // A new input ends the running effects, so they never delay play.
  while (finishAttackEffect) {
    finishAttackEffect();
  }
  if (isGameOver) {
    return;
  }

  const target = roomView.tileAt(
    (event.offsetX - window.innerWidth / 2) / zoom + cameraFocus.x,
    (event.offsetY - window.innerHeight / 2) / zoom + cameraFocus.y,
  );
  if (!target) {
    return;
  }

  const clicked = enemies.find(
    (enemy) => enemy.position.x === target.x && enemy.position.y === target.y,
  );

  if (clicked) {
    path = pathToAttack(clicked);
    attackTarget = clicked;
  } else {
    path = findPath(room, playerPosition, target, occupiedTiles());
    attackTarget = null;
  }

  if (!isWalking) {
    walk();
  }
});

document.querySelector('#restart')!.addEventListener('click', () => {
  canvas.remove(roomView.scene);
  ({ roomView, player, playerHealthBar, enemies } = createLevel());
  startLevel();
});

// Same wheel sensitivity as defaultWheelDelta in d3-zoom.
function wheelExponent(event: WheelEvent): number {
  const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
  return -event.deltaY * unit * (event.ctrlKey ? 10 : 1);
}

canvasElement.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * 2 ** wheelExponent(event)));
    roomView.scene.scale(zoom);
    applyCamera();
    canvas.update().render();
  },
  { passive: false },
);
