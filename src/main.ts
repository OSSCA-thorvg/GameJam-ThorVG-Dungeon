import ThorVG, { type Paint } from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';
import playerIcon from '../assets/icons/cathelineau/swordman.svg?raw';
import { playAttackEffect } from './attackEffect';
import { createDamageNumbers } from './damageNumbers';
import {
  attackEnemy,
  chasePlayer,
  createEnemy,
  ENEMY_ATTACK_DAMAGE,
  PLAYER_MAX_HP,
  type Enemy,
} from './enemy';
import { createInventoryPanel } from './inventoryPanel';
import {
  addItem,
  ITEMS,
  removeItem,
  type ItemContext,
  type ItemKind,
  type ItemStack,
} from './items';
import { generateMap } from './mapgen';
import { findPath } from './path';
import { createRandom, randomInt } from './random';
import {
  createCharacter,
  createDamageNumber,
  createDummyEnemy,
  createEnemyHealthBar,
  createItemPaint,
  createPlayerHealthBar,
  createRoomView,
  tileDistance,
  type DamageTarget,
} from './render';
import { isAdjacent, type Point } from './room';
import { normalRooms, startRooms } from './roomSources';
import { playSplash } from './splash';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Same as DEFAULT_MOVE_INTERVAL in Shattered Pixel Dungeon.
const STEP_INTERVAL_MS = 100;

// How far an attacker moves toward its target, as a fraction of the distance between tiles.
const LUNGE_DISTANCE = 0.5;

// Placeholder values for the size of a floor.
const MIN_ROOMS = 10;
const MAX_ROOMS = 14;

// Same as the panFollow intensity in HeroSprite.move() of Shattered Pixel Dungeon.
const CAMERA_FOLLOW_INTENSITY = 20;
// Placeholder value. How long the clock on the wait button is shown.
const WAIT_EFFECT_MS = 450;
// Placeholder value. A press that moves this many pixels drags the camera instead of clicking.
const CAMERA_DRAG_THRESHOLD = 8;
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

const waitButton = document.querySelector<HTMLButtonElement>('#wait')!;
waitButton.hidden = false;

const gameOverScreen = document.querySelector<HTMLElement>('#game-over')!;
const floorLabel = document.querySelector<HTMLElement>('#floor')!;
const hpLabel = document.querySelector<HTMLElement>('#hp')!;

const renderCanvas = () => canvas.update().render();
const damageNumbers = createDamageNumbers(renderCanvas);

// The HUD is added after the map's scene, so a new level is still drawn below it.
const mapScene = new TVG.Scene();
canvas.add(mapScene);
const playerHealthBar = createPlayerHealthBar(TVG, renderCanvas);
canvas.add(playerHealthBar.scene);

// A "seed" URL parameter repeats the same maps, for testing.
const fixedSeed = new URLSearchParams(location.search).get('seed');
const newRunSeed = () =>
  fixedSeed === null ? Math.floor(Math.random() * 2 ** 31) : Number(fixedSeed);

let runSeed = newRunSeed();
let floor = 1;

function createLevel() {
  const random = createRandom(runSeed + floor);
  const room = generateMap({
    startRooms,
    normalRooms,
    roomCount: randomInt(random, MIN_ROOMS, MAX_ROOMS),
    random,
  });

  return {
    room,
    roomView: createRoomView(TVG, room),
    player: createCharacter(TVG, playerIcon),
    enemies: room.monsters.map((position) =>
      createEnemy(
        position,
        createDummyEnemy(TVG),
        createEnemyHealthBar(TVG, renderCanvas),
        chasePlayer,
      ),
    ),
  };
}

let { room, roomView, player, enemies } = createLevel();
let playerPosition = room.start;
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
// Stays null for touch input, which has no cursor.
let mousePosition: Point | null = null;
let cameraDrag: { pointerId: number; start: Point; last: Point; isDragging: boolean } | null = null;
const activePointers = new Map<number, Point>();
let inventory: ItemStack[] = [];
let groundItems: { kind: ItemKind; position: Point; paint: Paint }[] = [];

function createItemContext(): ItemContext {
  return {
    hp: playerHp,
    maxHp: PLAYER_MAX_HP,
    heal(amount) {
      playerHp = Math.min(PLAYER_MAX_HP, playerHp + amount);
      showPlayerHp();
    },
  };
}

const inventoryPanel = createInventoryPanel({
  getStacks: () => inventory,
  getItemContext: createItemContext,
  onOpen: stopWalking,
  onUse: useItem,
});
let pinch: { center: Point; distance: number } | null = null;

function screenToScene({ x, y }: Point): Point {
  return {
    x: (x - window.innerWidth / 2) / zoom + cameraFocus.x,
    y: (y - window.innerHeight / 2) / zoom + cameraFocus.y,
  };
}

function tileUnder(position: Point) {
  const { x, y } = screenToScene(position);
  return roomView.tileAt(x, y);
}

function setZoom(value: number) {
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  roomView.scene.scale(zoom);
}

function enemyAt({ x, y }: Point) {
  return enemies.find(({ position }) => position.x === x && position.y === y);
}

function itemsAt({ x, y }: Point) {
  return groundItems.filter(({ position }) => position.x === x && position.y === y);
}

function updateCursorTile() {
  const tile = mousePosition && tileUnder(mousePosition);
  if (tile && enemyAt(tile)) {
    return roomView.setCursorTile(tile, 'enemy');
  }
  return roomView.setCursorTile(tile, tile && itemsAt(tile).length > 0 ? 'item' : 'floor');
}

function dropItem(kind: ItemKind, position: Point) {
  const paint = createItemPaint(TVG, ITEMS[kind].icon);
  roomView.place(paint, position.x, position.y);
  groundItems.push({ kind, position, paint });
}

function pickUpItems(tile: Point) {
  for (const item of itemsAt(tile)) {
    if (addItem(inventory, item.kind)) {
      roomView.remove(item.paint);
      groundItems.splice(groundItems.indexOf(item), 1);
    }
  }
  inventoryPanel.refresh();
}

// Keeps the camera focus at the center of the window.
function applyCamera() {
  roomView.scene.translate(
    window.innerWidth / 2 - cameraFocus.x * zoom + cameraShake.x,
    window.innerHeight / 2 - cameraFocus.y * zoom + cameraShake.y,
  );
  updateCursorTile();
}

// Moves the camera toward the player by a part of the remaining distance each frame.
// Only player movement calls this, so attacks leave the camera where the player dragged it.
function followPlayer() {
  if (cameraFrame || cameraDrag?.isDragging || pinch) {
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

function showPlayerHp(options?: { jump: boolean }) {
  playerHealthBar.show(playerHp / PLAYER_MAX_HP, options);
  hpLabel.textContent = `${playerHp}/${PLAYER_MAX_HP}`;
}

function placePlayer(tile: Point) {
  playerPosition = tile;
  roomView.place(player, tile.x, tile.y);
  roomView.cutAwayWalls(tile);
  followPlayer();
}

function placeEnemy(enemy: Enemy, tile: Point) {
  enemy.position = tile;
  roomView.place(enemy.paint, tile.x, tile.y);
  roomView.placeOverlay(enemy.healthBar.scene, tile.x, tile.y);
  updateCursorTile();
}

// Sets up the current level's scene and state.
function startLevel() {
  groundItems = [];
  path = [];
  attackTarget = null;
  isWalking = false;
  isGameOver = false;
  finishAttackEffect = null;

  roomView.scene.scale(zoom);
  mapScene.add(roomView.scene);

  placePlayer(room.start);
  showPlayerHp({ jump: true });
  for (const enemy of enemies) {
    placeEnemy(enemy, enemy.position);
  }

  // A new level starts with the camera already on the player.
  cancelAnimationFrame(cameraFrame);
  cameraFrame = 0;
  cameraFocus = roomView.tileCenter(room.start);
  cameraShake = { x: 0, y: 0 };
  applyCamera();

  gameOverScreen.hidden = true;
  floorLabel.textContent = `Floor ${floor}`;
  canvas.update().render();
}

function replaceLevel() {
  damageNumbers.clear();
  mapScene.remove(roomView.scene);
  ({ room, roomView, player, enemies } = createLevel());
  startLevel();
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

function showDamage(amount: number, tile: Point, target: DamageTarget) {
  damageNumbers.show(roomView, createDamageNumber(TVG, amount, target), tile);
}

function endGame() {
  isGameOver = true;
  roomView.remove(player);
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
      showPlayerHp();
      showDamage(ENEMY_ATTACK_DAMAGE, playerPosition, 'player');
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
    onHit: () => showDamage(attackEnemy(enemy), enemy.position, 'enemy'),
    onEnd: () => {
      finishAttackEffect = null;
      if (enemy.hp === 0) {
        roomView.remove(enemy.paint);
        roomView.remove(enemy.healthBar.scene);
        enemies.splice(enemies.indexOf(enemy), 1);
        dropItem('healing-potion', enemy.position);
        updateCursorTile();
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
  pickUpItems(next);

  // The stairs only work as a destination, so paths can cross them.
  if (path.length === 0 && next.x === room.stairs.x && next.y === room.stairs.y) {
    floor++;
    replaceLevel();
    return;
  }

  runEnemyTurn(() => setTimeout(walk, STEP_INTERVAL_MS));
}

// A new input ends the running effects, so they never delay play.
function finishRunningEffects() {
  while (finishAttackEffect) {
    finishAttackEffect();
  }
}

function pressTileAt(position: Point) {
  finishRunningEffects();
  if (isGameOver) {
    return;
  }

  const target = tileUnder(position);
  if (!target) {
    return;
  }

  const clicked = enemyAt(target);

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
}

// Keeps the camera focus inside the map, so the map cannot be dragged out of sight.
function clampToMap({ x, y }: Point): Point {
  const left = roomView.tileCenter({ x: 0, y: room.height - 1 }).x;
  const right = roomView.tileCenter({ x: room.width - 1, y: 0 }).x;
  const top = roomView.tileCenter({ x: 0, y: 0 }).y;
  const bottom = roomView.tileCenter({ x: room.width - 1, y: room.height - 1 }).y;
  return {
    x: Math.min(right, Math.max(left, x)),
    y: Math.min(bottom, Math.max(top, y)),
  };
}

function stopFollowingPlayer() {
  cancelAnimationFrame(cameraFrame);
  cameraFrame = 0;
}

function dragCamera(position: Point) {
  if (!cameraDrag) {
    return;
  }

  if (!cameraDrag.isDragging) {
    const distance = Math.hypot(position.x - cameraDrag.start.x, position.y - cameraDrag.start.y);
    if (distance < CAMERA_DRAG_THRESHOLD) {
      return;
    }
    cameraDrag.isDragging = true;
    cameraDrag.last = position;
    stopFollowingPlayer();
  }

  cameraFocus = clampToMap({
    x: cameraFocus.x - (position.x - cameraDrag.last.x) / zoom,
    y: cameraFocus.y - (position.y - cameraDrag.last.y) / zoom,
  });
  cameraDrag.last = position;
  applyCamera();
  renderCanvas();
}

function measurePinch() {
  const [a, b] = activePointers.values();
  return {
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.hypot(a.x - b.x, a.y - b.y),
  };
}

// Keeps the point of the map between the fingers under them while zooming.
function pinchCamera() {
  if (!pinch) {
    return;
  }

  const current = measurePinch();
  const anchor = screenToScene(pinch.center);
  if (pinch.distance > 0) {
    setZoom((zoom * current.distance) / pinch.distance);
  }
  cameraFocus = clampToMap({
    x: anchor.x - (current.center.x - window.innerWidth / 2) / zoom,
    y: anchor.y - (current.center.y - window.innerHeight / 2) / zoom,
  });
  pinch = current;
  applyCamera();
  renderCanvas();
}

function releasePointer(pointerId: number) {
  activePointers.delete(pointerId);
  if (activePointers.size < 2) {
    pinch = null;
  }
}

canvasElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return;
  }
  const position = { x: event.offsetX, y: event.offsetY };
  canvasElement.setPointerCapture(event.pointerId);
  activePointers.set(event.pointerId, position);

  if (activePointers.size === 1) {
    cameraDrag = { pointerId: event.pointerId, start: position, last: position, isDragging: false };
  } else if (activePointers.size === 2) {
    // A second finger makes this a pinch, so the touch no longer drags or presses a tile.
    cameraDrag = null;
    pinch = measurePinch();
    stopFollowingPlayer();
  }
});

// Handled here instead of in a click event, because a browser can skip the click on a tap.
canvasElement.addEventListener('pointerup', (event) => {
  releasePointer(event.pointerId);
  if (cameraDrag?.pointerId !== event.pointerId) {
    return;
  }
  const wasDragging = cameraDrag.isDragging;
  cameraDrag = null;
  if (!wasDragging) {
    pressTileAt({ x: event.offsetX, y: event.offsetY });
  }
});

canvasElement.addEventListener('pointercancel', (event) => {
  releasePointer(event.pointerId);
  if (cameraDrag?.pointerId === event.pointerId) {
    cameraDrag = null;
  }
});

canvasElement.addEventListener('pointermove', (event) => {
  const position = { x: event.offsetX, y: event.offsetY };
  if (activePointers.has(event.pointerId)) {
    activePointers.set(event.pointerId, position);
  }
  if (pinch) {
    pinchCamera();
  } else if (cameraDrag?.pointerId === event.pointerId) {
    dragCamera(position);
  }
  mousePosition = event.pointerType === 'mouse' ? position : null;
  if (updateCursorTile()) {
    renderCanvas();
  }
});

canvasElement.addEventListener('pointerleave', () => {
  mousePosition = null;
  if (updateCursorTile()) {
    renderCanvas();
  }
});

function stopWalking() {
  path = [];
  attackTarget = null;
}

function useItem(kind: ItemKind) {
  finishRunningEffects();
  if (isGameOver) {
    return;
  }

  stopWalking();
  ITEMS[kind].use(createItemContext());
  removeItem(inventory, kind);
  inventoryPanel.refresh();
  inventoryPanel.close();
  runEnemyTurn(() => {});
}

function playWaitEffect() {
  const timing = { duration: WAIT_EFFECT_MS };
  const spin = (selector: string, degrees: number) =>
    document
      .querySelector(selector)!
      .animate({ transform: ['rotate(0deg)', `rotate(${degrees}deg)`] }, timing);

  spin('#wait-minute-hand', 360);
  spin('#wait-hour-hand', 30);
  document
    .querySelector('#wait-clock')!
    .animate({ opacity: [0, 1, 1, 0], offset: [0, 0.15, 0.75, 1] }, timing);
  document
    .querySelector('#wait-label')!
    .animate({ opacity: [1, 0, 0, 1], offset: [0, 0.15, 0.75, 1] }, timing);
}

waitButton.addEventListener('click', () => {
  finishRunningEffects();
  if (isGameOver) {
    return;
  }

  // While walking, the button stops the walk instead of spending another turn.
  if (isWalking) {
    stopWalking();
    return;
  }

  playWaitEffect();
  runEnemyTurn(() => {});
});

document.querySelector('#restart')!.addEventListener('click', () => {
  runSeed = newRunSeed();
  floor = 1;
  playerHp = PLAYER_MAX_HP;
  inventory = [];
  inventoryPanel.refresh();
  replaceLevel();
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
    setZoom(zoom * 2 ** wheelExponent(event));
    applyCamera();
    canvas.update().render();
  },
  { passive: false },
);
