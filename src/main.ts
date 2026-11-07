import ThorVG, { type Paint } from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';
import heroIcon from '../assets/icons/cathelineau/swordman.svg?raw';
import { playAttackEffect } from './attackEffect';
import { createDamageNumbers } from './damageNumbers';
import { playBounce, playFrost, playShatter, playThrow } from './throwEffect';
import { THROWN, traceLine, type PathRule, type Trajectory } from './trajectory';
import {
  alertEnemy,
  ASLEEP_CHANCE,
  attackEnemy,
  chaser,
  createEnemy,
  damageEnemy,
  disturbEnemy,
  healEnemy,
  HERO_ACCURACY,
  HERO_EVASION,
  HERO_MAX_HP,
  pickEnemyKind,
  rollHit,
  type Enemy,
} from './enemy';
import { createHazardField, spreadArea } from './hazards';
import { createInventoryPanel } from './inventoryPanel';
import { createStatusBar } from './statusBar';
import {
  addItem,
  createStartingEquipment,
  equip,
  rollArmor,
  rollDamage,
  STARTING_STRENGTH,
  unequip,
  type Equipment,
  type EquipmentSlot,
  ITEMS,
  removeItem,
  type ItemContext,
  type ItemName,
  type ItemStack,
} from './items';
import { generateMap } from './mapgen';
import { createMessageLog } from './messageLog';
import { findPath } from './path';
import { createPotionLore, randomPotion } from './potions';
import { createRandom, normalIntRange, randomInt } from './random';
import {
  createCharacter,
  createDamageNumber,
  createEvadeText,
  createNoticeMark,
  createSleepMark,
  createStatusText,
  createSurpriseMark,
  createDummyEnemy,
  createEnemyHealthBar,
  createItemPaint,
  createHeroHealthBar,
  createRoomView,
  tileDistance,
  tintCharacter,
  type DamageTarget,
} from './render';
import { isAdjacent, isWalkable, type Point } from './room';
import {
  addStatus,
  hasStatus,
  isHelpless,
  tickStatuses,
  tintOf,
  type StatusName,
  type Statuses,
} from './status';
import { normalRooms, startRooms } from './roomSources';
import { playSplash } from './splash';
import { computeVision, DEFAULT_VIEW_DISTANCE } from './vision';

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

// Placeholder values for the hero's growth. Each level needs this much more experience than the
// one before, and a new level adds these to the hero's stats.
const EXPERIENCE_PER_LEVEL = 3;
const LEVEL_UP_HP = 5;
const LEVEL_UP_ACCURACY = 1;
const LEVEL_UP_EVASION = 1;

// Placeholder values. Fire sets a character burning for some turns, and burning and poison gas
// hurt by a roll in these ranges every turn. Paralyzing gas paralyzes for some turns after it.
const BURNING_TURNS = 4;
const BURN_DAMAGE: [min: number, max: number] = [1, 3];
const POISON_DAMAGE: [min: number, max: number] = [1, 3];
const PARALYZED_TURNS = 2;
// Placeholder value. How long each turn takes while the hero cannot act.
const HELPLESS_TURN_MS = 300;
// Placeholder values. How high a levitating hero floats, and how see-through an invisible
// hero and an enemy sensed by telepathy are drawn.
const LEVITATION_HEIGHT = 8;
const INVISIBLE_OPACITY = 110;
const SENSED_ENEMY_OPACITY = 150;

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
const statsLabel = document.querySelector<HTMLElement>('#stats')!;
const messageLog = createMessageLog(document.querySelector<HTMLElement>('#log')!);
const statusBar = createStatusBar(
  document.querySelector<HTMLElement>('#status')!,
  document.querySelector<HTMLElement>('#status-tooltip')!,
);

const renderCanvas = () => canvas.update().render();
const damageNumbers = createDamageNumbers(renderCanvas);

// The HUD is added after the map's scene, so a new level is still drawn below it.
const mapScene = new TVG.Scene();
canvas.add(mapScene);
const heroHealthBar = createHeroHealthBar(TVG, renderCanvas);
canvas.add(heroHealthBar.scene);

// A "seed" URL parameter repeats the same maps, for testing.
const fixedSeed = new URLSearchParams(location.search).get('seed');
const newRunSeed = () =>
  fixedSeed === null ? Math.floor(Math.random() * 2 ** 31) : Number(fixedSeed);

let runSeed = newRunSeed();
let floor = 1;
// For the summary shown when the hero dies.
let killCount = 0;
let turnCount = 0;

function createLevel() {
  const random = createRandom(runSeed + floor);
  const room = generateMap({
    startRooms,
    normalRooms,
    roomCount: randomInt(random, MIN_ROOMS, MAX_ROOMS),
    random,
  });

  const roomView = createRoomView(TVG, room);
  return {
    room,
    explored: room.tiles.map((row) => row.map(() => false)),
    inView: room.tiles.map((row) => row.map(() => false)),
    seenEnemies: new Set<Enemy>(),
    roomView,
    hazards: createHazardField(TVG, roomView, {
      isOpen: isOpenTile,
      isFlammable: isFlammableTile,
      burnUp: burnUpTile,
    }),
    hero: createCharacter(TVG, heroIcon),
    enemies: room.monsters.map((position) => {
      const kind = pickEnemyKind(random, floor);
      return createEnemy(
        kind,
        position,
        random() < ASLEEP_CHANCE,
        createDummyEnemy(TVG, kind),
        createEnemyHealthBar(TVG, renderCanvas),
        createSleepMark(TVG),
        chaser,
      );
    }),
  };
}

let { room, explored, inView, seenEnemies, roomView, hazards, hero, enemies } = createLevel();
let heroPosition = room.start;
let heroHp = HERO_MAX_HP;
let heroMaxHp = HERO_MAX_HP;
let heroLevel = 1;
let heroExperience = 0;
let heroStrength = STARTING_STRENGTH;
let heroStatuses: Statuses = {};
// Whether a hasted hero already took the first of their two actions in this turn.
let hasActedOnce = false;
let potionLore = createPotionLore(createRandom(runSeed));
// How far the hero can see, in tiles. An effect that changes it should call updateVision().
let heroViewDistance = DEFAULT_VIEW_DISTANCE;
// What the current vision was computed from, to skip computing it when nothing changed.
let visionState = '';
let path: Point[] = [];
let attackTarget: Enemy | null = null;
// Whether the player clicked the stairs, as opposed to the walk merely ending on them.
let isWalkingToStairs = false;
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
let equipment: Equipment = createStartingEquipment();
let groundItems: { name: ItemName; position: Point; paint: Paint }[] = [];

function createItemContext(): ItemContext {
  return {
    hp: heroHp,
    maxHp: heroMaxHp,
    heal(amount) {
      heroHp = Math.min(heroMaxHp, heroHp + amount);
      showHeroHp();
    },
    addStatus: addHeroStatus,
    gainStrength() {
      heroStrength++;
      showHeroStats();
    },
    gainLevel: levelUp,
    // Fire and frost also reach a closed door, without going through it.
    areaAround: (tile, steps) => spreadArea(tile, steps, isOpenTile, isFlammableTile),
    // Fire catches whoever stands in it at once.
    setFire(tiles, turns) {
      hazards.setFire(tiles, turns);
      setAlight(tiles);
    },
    // Paralyzing gas paralyzes whoever it lands on at once. Gas does the rest of its harm at the end
    // of each turn, after it spreads.
    releaseGas(kind, tile, amount) {
      hazards.releaseGas(kind, tile, amount);
      if (kind === 'paralysis') {
        addStatusOn([tile], 'paralyzed', PARALYZED_TURNS);
      }
    },
    freeze(tiles, turns) {
      playFrost(TVG, roomView, tiles, renderCanvas);
      hazards.putOutFire(tiles);
      addStatusOn(tiles, 'frozen', turns);
    },
  };
}

function addStatusOn(tiles: Point[], name: StatusName, turns: number) {
  if (tiles.some((tile) => isSameTile(tile, heroPosition))) {
    addHeroStatus(name, turns);
  }
  for (const enemy of enemies) {
    if (tiles.some((tile) => isSameTile(tile, enemy.position))) {
      addEnemyStatus(enemy, name, turns);
    }
  }
}

// Gas and fire spread over walkable tiles, through open doors but not closed ones.
function isOpenTile({ x, y }: Point): boolean {
  const isClosedDoor = room.tiles[y]?.[x] === 'door' && !openDoors.has(y * room.width + x);
  return isWalkable(room, x, y) && !isClosedDoor;
}

// Wooden things burn. For now, doors are the only ones.
function isFlammableTile({ x, y }: Point): boolean {
  return room.tiles[y]?.[x] === 'door';
}

// A door that burns down leaves an open doorway.
function burnUpTile(tile: Point) {
  room.tiles[tile.y][tile.x] = 'floor';
  openDoors.delete(tile.y * room.width + tile.x);
  roomView.burnDoor(tile);
  // The door is gone, so the vision must be computed again even if nothing else changed.
  visionState = '';
  updateVision();
}

// Sets burning the characters on the tiles, except levitating ones.
function setAlight(tiles: Point[]) {
  const isOn = (position: Point) => tiles.some((tile) => isSameTile(tile, position));
  if (isOn(heroPosition) && !hasStatus(heroStatuses, 'levitating')) {
    addHeroStatus('burning', BURNING_TURNS);
  }
  const isBurnable = ({ position, statuses }: Enemy) =>
    isOn(position) && !hasStatus(statuses, 'levitating');
  for (const enemy of enemies.filter(isBurnable)) {
    addEnemyStatus(enemy, 'burning', BURNING_TURNS);
  }
}

// A new effect shows its name over the character. One that only lasts longer does not.
function showStatusText(tile: Point, name: StatusName) {
  damageNumbers.show(roomView, createStatusText(TVG, name), tile);
}

function addHeroStatus(name: StatusName, turns: number) {
  if (!hasStatus(heroStatuses, name)) {
    showStatusText(heroPosition, name);
  }
  addStatus(heroStatuses, name, turns);
  if (isHelpless(heroStatuses)) {
    stopWalking();
  }
  updateHeroLook();
}

// The name shows only over an enemy in view, so it does not give away the others.
function addEnemyStatus(enemy: Enemy, name: StatusName, turns: number) {
  if (!hasStatus(enemy.statuses, name) && seenEnemies.has(enemy)) {
    showStatusText(enemy.position, name);
  }
  addStatus(enemy.statuses, name, turns);
  disturbEnemy(enemy);
  showEnemy(enemy);
}

const heroAccuracy = () => HERO_ACCURACY + (heroLevel - 1) * LEVEL_UP_ACCURACY;
const heroEvasion = () => HERO_EVASION + (heroLevel - 1) * LEVEL_UP_EVASION;
const experienceToLevelUp = () => heroLevel * EXPERIENCE_PER_LEVEL;

function levelUp() {
  heroLevel++;
  heroMaxHp += LEVEL_UP_HP;
  heroHp += LEVEL_UP_HP;
  showHeroHp();
  showHeroStats();
  messageLog.add('Level up! Your max HP, accuracy, and evasion went up.');
}

function gainExperience(amount: number) {
  heroExperience += amount;
  while (heroExperience >= experienceToLevelUp()) {
    heroExperience -= experienceToLevelUp();
    levelUp();
  }
  showHeroStats();
}

function showHeroStats() {
  const experience = `XP ${heroExperience}/${experienceToLevelUp()}`;
  // Strength shows once it differs from where it started.
  const strength = heroStrength !== STARTING_STRENGTH ? ` · Str ${heroStrength}` : '';
  statsLabel.textContent = `Lv ${heroLevel} · ${experience}${strength}`;
  statusBar.show(heroStatuses);
}

// A levitating character floats above its tile.
function nudgeHero(tile: Point, offset: Point) {
  const lift = hasStatus(heroStatuses, 'levitating') ? LEVITATION_HEIGHT : 0;
  roomView.nudge(hero, tile, { x: offset.x, y: offset.y - lift });
}

function nudgeEnemy(enemy: Enemy, tile: Point, offset: Point) {
  const lift = hasStatus(enemy.statuses, 'levitating') ? LEVITATION_HEIGHT : 0;
  roomView.nudge(enemy.paint, tile, { x: offset.x, y: offset.y - lift });
}

// Shows the hero's effects: their colors, and the enemies sensed by telepathy.
function updateHeroLook() {
  tintCharacter(hero, tintOf(heroStatuses));
  hero.opacity(hasStatus(heroStatuses, 'invisible') ? INVISIBLE_OPACITY : 255);
  nudgeHero(heroPosition, { x: 0, y: 0 });
  updateVision();
  for (const enemy of enemies) {
    showEnemy(enemy);
  }
  showHeroStats();
}

const inventoryPanel = createInventoryPanel({
  getStacks: () => inventory,
  getEquipment: () => equipment,
  describeItem(name) {
    const look = potionLore.lookOf(name);
    const blockedReason = look.isKnown
      ? (ITEMS[name].blockedReason?.(createItemContext()) ?? null)
      : null;
    return { ...look, blockedReason };
  },
  onOpen() {
    stopWalking();
    cancelTargeting();
  },
  onUse: useItem,
  onEquip: equipItem,
  onUnequip: unequipItem,
  onThrow: throwItem,
  onDrop: dropFromBag,
});

// Choosing a tile for an action, like the CellSelector of Shattered Pixel Dungeon. While this is
// set, a press on a tile picks the target instead of walking there.
interface TargetRequest {
  prompt: string;
  rule: PathRule;
  onSelect(trajectory: Trajectory): void;
}

let targeting: { request: TargetRequest; preview: Point | null } | null = null;
const targetPrompt = document.querySelector<HTMLElement>('#target-prompt')!;
let pinch: { center: Point; distance: number } | null = null;

function screenToScene({ x, y }: Point): Point {
  return {
    x: (x - window.innerWidth / 2) / zoom + cameraFocus.x,
    y: (y - window.innerHeight / 2) / zoom + cameraFocus.y,
  };
}

function isExplored({ x, y }: Point) {
  return explored[y]?.[x] === true;
}

function isInView({ x, y }: Point) {
  return inView[y]?.[x] === true;
}

// Returns the explored tile under a screen position. Unexplored tiles cannot be pointed at.
function tileUnder(position: Point) {
  const { x, y } = screenToScene(position);
  const tile = roomView.tileAt(x, y);
  return tile && isExplored(tile) ? tile : null;
}

function setZoom(value: number) {
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  roomView.scene.scale(zoom);
}

// Only finds enemies in view, so pointing at a tile cannot reveal the others.
function enemyAt({ x, y }: Point) {
  return [...seenEnemies].find(({ position }) => position.x === x && position.y === y);
}

function itemsAt({ x, y }: Point) {
  return groundItems.filter(({ position }) => position.x === x && position.y === y);
}

function updateCursorTile() {
  const tile = mousePosition && tileUnder(mousePosition);
  if (targeting) {
    return previewTarget(tile);
  }
  if (tile && enemyAt(tile)) {
    return roomView.setCursorTile(tile, 'enemy');
  }
  return roomView.setCursorTile(tile, tile && itemsAt(tile).length > 0 ? 'item' : 'floor');
}

function dropItem(name: ItemName, position: Point) {
  const paint = createItemPaint(TVG, potionLore.lookOf(name).icon);
  roomView.place(paint, position.x, position.y);
  groundItems.push({ name, position, paint });
  enterDoor(position);
}

// Returns whether anything was picked up.
function pickUpItems(tile: Point): boolean {
  let hasPickedUp = false;
  for (const item of itemsAt(tile)) {
    if (addItem(inventory, item.name)) {
      roomView.remove(item.paint);
      groundItems.splice(groundItems.indexOf(item), 1);
      hasPickedUp = true;
    } else {
      playBounce(roomView, item.paint, tile, renderCanvas);
    }
  }
  inventoryPanel.refresh();
  return hasPickedUp;
}

// Keeps the camera focus at the center of the window.
function applyCamera() {
  roomView.scene.translate(
    window.innerWidth / 2 - cameraFocus.x * zoom + cameraShake.x,
    window.innerHeight / 2 - cameraFocus.y * zoom + cameraShake.y,
  );
  updateCursorTile();
}

// Moves the camera toward the hero by a part of the remaining distance each frame.
// Only hero movement calls this, so attacks leave the camera where the player dragged it.
function followHero() {
  if (cameraFrame || cameraDrag?.isDragging || pinch) {
    return;
  }

  let lastTime: number | null = null;

  const step = (time: number) => {
    const target = roomView.tileCenter(heroPosition);
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

function showHeroHp(options?: { jump: boolean }) {
  heroHealthBar.show(heroHp / heroMaxHp, options);
  hpLabel.textContent = `${heroHp}/${heroMaxHp}`;
}

// Computes what the hero sees, and shows it on the map.
function lookAround(openDoors: Point[]) {
  const vision = computeVision(room, heroPosition, heroViewDistance, openDoors);

  inView = room.tiles.map((row) => row.map(() => false));
  for (const { x, y } of vision.tiles) {
    inView[y][x] = true;
    explored[y][x] = true;
  }

  roomView.setOpenDoors(openDoors);
  roomView.setLight({
    center: heroPosition,
    radius: vision.radius,
    outline: vision.outline,
    tiles: vision.tiles,
  });
}

// Looks from the hero's tile again. Call this when the hero, an enemy, or the view distance
// changes, because an enemy standing on a door also opens the view through it.
function updateVision() {
  const doors = [...openDoors]
    .sort((a, b) => a - b)
    .map((key) => ({ x: key % room.width, y: Math.floor(key / room.width) }));
  const state = JSON.stringify([heroPosition, heroViewDistance, doors]);
  if (state !== visionState) {
    visionState = state;
    lookAround(doors);
  }

  for (const enemy of enemies) {
    // An invisible enemy is not seen, so the cursor and clicks treat its tile as empty.
    const isSeen = isInView(enemy.position) && !hasStatus(enemy.statuses, 'invisible');
    if (isSeen === seenEnemies.has(enemy)) {
      continue;
    }
    if (isSeen) {
      seenEnemies.add(enemy);
      // A new enemy stops the walk, so the player can decide again.
      path = [];
      attackTarget = null;
    } else {
      seenEnemies.delete(enemy);
    }
    showEnemy(enemy);
  }

  updateCursorTile();
}

// A door opens when something enters it, and closes only when a character walks out of it and
// nothing is left on it. So a door stays open when a monster dies on it.
let openDoors = new Set<number>();

function isSameTile(a: Point | null, b: Point | null) {
  return a !== null && b !== null && a.x === b.x && a.y === b.y;
}

function enterDoor(tile: Point) {
  if (room.tiles[tile.y][tile.x] === 'door') {
    openDoors.add(tile.y * room.width + tile.x);
  }
}

function leaveDoor(tile: Point) {
  const isHeld =
    isSameTile(heroPosition, tile) ||
    enemies.some(({ position }) => isSameTile(position, tile)) ||
    itemsAt(tile).length > 0;
  if (!isHeld) {
    openDoors.delete(tile.y * room.width + tile.x);
  }
}

function placeHero(tile: Point) {
  const previous = heroPosition;
  heroPosition = tile;
  leaveDoor(previous);
  enterDoor(tile);
  roomView.place(hero, tile.x, tile.y);
  nudgeHero(tile, { x: 0, y: 0 });
  updateVision();
  roomView.cutAwayWalls(tile);
  followHero();
}

// Draws an enemy while it is in view, or while the hero senses it by telepathy.
function showEnemy(enemy: Enemy) {
  const { x, y } = enemy.position;
  tintCharacter(enemy.paint, tintOf(enemy.statuses));
  if (seenEnemies.has(enemy)) {
    enemy.paint.opacity(255);
    roomView.place(enemy.paint, x, y);
    nudgeEnemy(enemy, enemy.position, { x: 0, y: 0 });
    roomView.placeOverlay(enemy.healthBar.scene, x, y);
  } else if (hasStatus(heroStatuses, 'telepathy')) {
    // Drawn above the darkness, so it shows through walls.
    enemy.paint.opacity(SENSED_ENEMY_OPACITY);
    roomView.placeOverlay(enemy.paint, x, y);
    nudgeEnemy(enemy, enemy.position, { x: 0, y: 0 });
    roomView.remove(enemy.healthBar.scene);
  } else {
    roomView.remove(enemy.paint);
    roomView.remove(enemy.healthBar.scene);
  }
  if (seenEnemies.has(enemy) && enemy.state === 'sleeping') {
    roomView.placeOverlay(enemy.sleepMark, x, y);
  } else {
    roomView.remove(enemy.sleepMark);
  }
}

function placeEnemy(enemy: Enemy, tile: Point) {
  const previous = enemy.position;
  enemy.position = tile;
  leaveDoor(previous);
  enterDoor(tile);
  updateVision();
  showEnemy(enemy);
}

// Sets up the current level's scene and state.
function startLevel() {
  visionState = '';
  groundItems = [];
  path = [];
  attackTarget = null;
  isWalkingToStairs = false;
  isWalking = false;
  isGameOver = false;
  finishAttackEffect = null;

  roomView.scene.scale(zoom);
  mapScene.add(roomView.scene);

  openDoors = new Set();
  for (const enemy of enemies) {
    enterDoor(enemy.position);
  }
  heroPosition = room.start;
  placeHero(room.start);
  // The hero is drawn anew on each level, so the effects on them are shown again.
  updateHeroLook();
  showHeroHp({ jump: true });

  // A new level starts with the camera already on the hero.
  cancelAnimationFrame(cameraFrame);
  cameraFrame = 0;
  cameraFocus = roomView.tileCenter(room.start);
  cameraShake = { x: 0, y: 0 };
  applyCamera();

  gameOverScreen.hidden = true;
  floorLabel.textContent = `Floor ${floor}`;
  canvas.update().render();
}

// Items left on the stairs block them, so the hero has to clear them first.
function canGoDownStairs() {
  return isSameTile(heroPosition, room.stairs) && itemsAt(room.stairs).length === 0;
}

function goDownStairs() {
  floor++;
  replaceLevel();
  messageLog.add('You went down to the next floor.');
}

function replaceLevel() {
  damageNumbers.clear();
  mapScene.remove(roomView.scene);
  ({ room, explored, inView, seenEnemies, roomView, hazards, hero, enemies } = createLevel());
  startLevel();
}

startLevel();
messageLog.add('You entered an unknown dungeon.');

window.addEventListener('resize', () => {
  canvas.resize(window.innerWidth, window.innerHeight);
  applyCamera();
  canvas.update().render();
});

const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas')!;

function occupiedTiles(except?: Enemy): Point[] {
  return enemies.filter((enemy) => enemy !== except).map((enemy) => enemy.position);
}

// The tiles the hero knows are taken, so the hero's paths cannot reveal unseen enemies.
function seenEnemyTiles(except?: Enemy): Point[] {
  return [...seenEnemies].filter((enemy) => enemy !== except).map((enemy) => enemy.position);
}

function showDamage(amount: number, tile: Point, target: DamageTarget) {
  damageNumbers.show(roomView, createDamageNumber(TVG, amount, target), tile);
}

function endGame() {
  isGameOver = true;
  roomView.remove(hero);

  const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;
  document.querySelector('#run-stats')!.replaceChildren(
    ...[
      `Reached floor ${floor}`,
      `Defeated ${plural(killCount, 'enemy', 'enemies')}`,
      `Lasted ${plural(turnCount, 'turn', 'turns')}`,
    ].map((text) => {
      const line = document.createElement('li');
      line.textContent = text;
      return line;
    }),
  );
  gameOverScreen.hidden = false;
}

// Damage breaks the ice of a frozen hero.
function damageHero(amount: number) {
  heroHp = Math.max(0, heroHp - amount);
  delete heroStatuses.frozen;
  showHeroHp();
  showDamage(amount, heroPosition, 'hero');
}

// The number is only shown for an enemy in view, so it does not give away the others.
function hurtEnemy(enemy: Enemy, amount: number) {
  damageEnemy(enemy, amount);
  if (seenEnemies.has(enemy)) {
    showDamage(amount, enemy.position, 'enemy');
  }
}

// The log only tells of an enemy in view, so it does not give away the others. An invisible enemy in
// view is named too, so the player learns what it was.
function killEnemy(enemy: Enemy) {
  if (isInView(enemy.position)) {
    messageLog.add(`You defeated the ${enemy.stats.name}.`);
  }
  roomView.remove(enemy.paint);
  roomView.remove(enemy.healthBar.scene);
  roomView.remove(enemy.sleepMark);
  enemies.splice(enemies.indexOf(enemy), 1);
  killCount++;
  seenEnemies.delete(enemy);
  dropItem(randomPotion(Math.random), enemy.position);
  gainExperience(enemy.stats.experience);
  updateVision();
}

// A paralyzed or frozen hero cannot evade.
function playEnemyAttack(enemy: Enemy, onDone: () => void) {
  const attackerTile = enemy.position;
  const isHit = isHelpless(heroStatuses) || rollHit(enemy.stats.accuracy, heroEvasion());
  if (!seenEnemies.has(enemy)) {
    messageLog.add('Something unseen attacked you.');
  }

  finishAttackEffect = playAttackEffect({
    lunge: scalePoint(tileDistance(attackerTile, heroPosition), LUNGE_DISTANCE),
    isMiss: !isHit,
    moveAttacker: (offset) => nudgeEnemy(enemy, attackerTile, offset),
    moveTarget: (offset) => nudgeHero(heroPosition, offset),
    flashTarget: (isFlashing) => {
      if (isFlashing) {
        hero.resetEffects();
        hero.fillEffect(220, 60, 60, 255);
      } else {
        tintCharacter(hero, tintOf(heroStatuses));
      }
    },
    shake: (offset) => {
      cameraShake = offset;
      applyCamera();
    },
    render: () => canvas.update().render(),
    onHit: () => {
      if (isHit) {
        // The armor takes away part of the hit, as in Char.attack() of Shattered Pixel Dungeon.
        const damage = normalIntRange(Math.random, ...enemy.stats.damage);
        damageHero(Math.max(0, damage - rollArmor(equipment)));
        showHeroStats();
      } else {
        damageNumbers.show(roomView, createEvadeText(TVG), heroPosition);
      }
      // Being attacked stops the walk, even by a miss, so the player can decide again.
      path = [];
      attackTarget = null;
    },
    onEnd: () => {
      finishAttackEffect = null;
      if (heroHp === 0) {
        endGame();
      }
      onDone();
    },
  });
}

// Ends one action of the hero. A hasted hero takes two actions in each turn of the enemies.
function passTurn(onDone: () => void) {
  if (hasStatus(heroStatuses, 'haste') && !hasActedOnce) {
    hasActedOnce = true;
    canvas.update().render();
    onDone();
    return;
  }
  hasActedOnce = false;
  runEnemyTurn(onDone);
}

// Sight goes both ways, unless the hero is invisible.
function canEnemySeeHero(enemy: Enemy) {
  return isInView(enemy.position) && !hasStatus(heroStatuses, 'invisible');
}

// Fire sets alight whoever stands in it, poison gas hurts, and paralyzing gas paralyzes. Then
// burning hurts.
function applyHazards() {
  const isOnFire = (tile: Point) => hazards.kindsAt(tile).includes('fire');
  setAlight([heroPosition, ...enemies.map(({ position }) => position)].filter(isOnFire));

  const heroHazards = hazards.kindsAt(heroPosition);
  if (heroHazards.includes('paralysis')) {
    addHeroStatus('paralyzed', PARALYZED_TURNS);
  }
  if (heroHazards.includes('poison')) {
    damageHero(normalIntRange(Math.random, ...POISON_DAMAGE));
  }
  if (hasStatus(heroStatuses, 'burning')) {
    damageHero(normalIntRange(Math.random, ...BURN_DAMAGE));
  }

  for (const enemy of enemies) {
    const enemyHazards = hazards.kindsAt(enemy.position);
    if (enemyHazards.includes('paralysis')) {
      addEnemyStatus(enemy, 'paralyzed', PARALYZED_TURNS);
    }
    if (enemyHazards.includes('poison')) {
      hurtEnemy(enemy, normalIntRange(Math.random, ...POISON_DAMAGE));
    }
    if (hasStatus(enemy.statuses, 'burning')) {
      hurtEnemy(enemy, normalIntRange(Math.random, ...BURN_DAMAGE));
    }
  }
}

// The end of a turn, after every enemy acted. Effects wear off and gas spreads, then fire and gas
// do their harm, and then fire burns down.
// While the hero cannot act, the next turn follows by itself.
function endTurn(onDone: () => void) {
  if (isGameOver) {
    canvas.update().render();
    onDone();
    return;
  }

  tickStatuses(heroStatuses);
  for (const enemy of enemies) {
    tickStatuses(enemy.statuses);
  }
  hazards.spreadGas();
  applyHazards();
  hazards.burnDown();
  for (const enemy of enemies.filter(({ hp }) => hp === 0)) {
    killEnemy(enemy);
  }
  updateHeroLook();
  if (heroHp === 0) {
    endGame();
  }
  canvas.update().render();

  if (!isGameOver && isHelpless(heroStatuses)) {
    setTimeout(() => runEnemyTurn(onDone), HELPLESS_TURN_MS);
    return;
  }
  onDone();
}

// Lets each enemy act once, one after another, then ends the turn.
// Every action of the hero ends with this, so it also counts the hero's turns.
function runEnemyTurn(onDone: () => void) {
  turnCount++;
  // An enemy that acts more than once does so in a row. Haste doubles that.
  const waiting = enemies.flatMap((enemy) => {
    const actions = enemy.stats.actions * (hasStatus(enemy.statuses, 'haste') ? 2 : 1);
    return Array<Enemy>(actions).fill(enemy);
  });

  const actNext = () => {
    const enemy = waiting.shift();
    if (!enemy || isGameOver) {
      endTurn(onDone);
      return;
    }

    const wasHunting = enemy.state === 'hunting';
    const canSeeHero = canEnemySeeHero(enemy);
    // A sleeping enemy does not watch the hero, so the hero's attack surprises it.
    enemy.hasSeenHero = canSeeHero && enemy.state !== 'sleeping';
    if (isHelpless(enemy.statuses)) {
      actNext();
      return;
    }
    const action = enemy.behavior(enemy, {
      room,
      hero: heroPosition,
      canSeeHero,
      occupied: occupiedTiles(enemy),
    });

    // Shown where the enemy ends its turn, so the mark does not stay behind when it moves.
    const showNoticeMark = () => {
      if (!wasHunting && enemy.state === 'hunting') {
        damageNumbers.show(roomView, createNoticeMark(TVG), enemy.position);
      }
    };

    switch (action.type) {
      case 'move':
        placeEnemy(enemy, action.to);
        showNoticeMark();
        actNext();
        break;
      case 'attack':
        showEnemy(enemy);
        showNoticeMark();
        playEnemyAttack(enemy, actNext);
        break;
      case 'wait':
        // It may have woken up.
        showEnemy(enemy);
        showNoticeMark();
        actNext();
        break;
    }
  };

  actNext();
}

function playHeroAttack(enemy: Enemy) {
  const attackerTile = heroPosition;
  // A surprised enemy cannot evade, and neither can a paralyzed or frozen one.
  const isSurprise = !enemy.hasSeenHero;
  const isHit =
    isSurprise || isHelpless(enemy.statuses) || rollHit(heroAccuracy(), enemy.stats.evasion);
  // Attacking ends invisibility.
  if (hasStatus(heroStatuses, 'invisible')) {
    delete heroStatuses.invisible;
    updateHeroLook();
  }
  if (!seenEnemies.has(enemy)) {
    messageLog.add('You attacked an unseen enemy.');
  }

  finishAttackEffect = playAttackEffect({
    lunge: scalePoint(tileDistance(attackerTile, enemy.position), LUNGE_DISTANCE),
    isMiss: !isHit,
    moveAttacker: (offset) => nudgeHero(attackerTile, offset),
    moveTarget: (offset) => nudgeEnemy(enemy, enemy.position, offset),
    flashTarget: (isFlashing) => {
      if (isFlashing) {
        enemy.paint.resetEffects();
        enemy.paint.fillEffect(255, 255, 255, 255);
      } else {
        tintCharacter(enemy.paint, tintOf(enemy.statuses));
      }
    },
    render: () => canvas.update().render(),
    onHit: () => {
      if (isHit) {
        if (isSurprise) {
          damageNumbers.show(roomView, createSurpriseMark(TVG), enemy.position);
        }
        const damage = rollDamage(equipment, heroStrength);
        attackEnemy(enemy, heroPosition, damage);
        roomView.remove(enemy.sleepMark);
        showDamage(damage, enemy.position, 'enemy');
      } else {
        alertEnemy(enemy, heroPosition);
        roomView.remove(enemy.sleepMark);
        damageNumbers.show(roomView, createEvadeText(TVG), enemy.position);
      }
    },
    onEnd: () => {
      finishAttackEffect = null;
      if (enemy.hp === 0) {
        killEnemy(enemy);
      }
      passTurn(() => {});
    },
  });
}

// Returns the tiles to walk through to stand next to an enemy.
function pathToAttack(enemy: Enemy): Point[] {
  return isAdjacent(enemy.position, heroPosition)
    ? []
    : findPath(room, heroPosition, enemy.position, seenEnemyTiles(enemy), isExplored).slice(0, -1);
}

function walk() {
  if (isGameOver) {
    return;
  }

  // The target may have moved out of view on its turn.
  if (attackTarget && !seenEnemies.has(attackTarget)) {
    path = [];
    attackTarget = null;
  }

  // The target may have moved on its turn.
  if (attackTarget) {
    path = pathToAttack(attackTarget);
  }

  const next = path.shift();
  if (!next) {
    isWalking = false;
    if (attackTarget && isAdjacent(attackTarget.position, heroPosition)) {
      playHeroAttack(attackTarget);
    }
    attackTarget = null;
    return;
  }

  // An enemy may have stepped onto the path. An unseen one on the tile the player chose is
  // attacked, because the player meant to step there.
  const blocker = enemies.find(({ position }) => isSameTile(position, next));
  if (blocker) {
    const isChosenTile = path.length === 0 && !attackTarget;
    path = [];
    attackTarget = null;
    isWalking = false;
    if (isChosenTile && !seenEnemies.has(blocker)) {
      playHeroAttack(blocker);
    }
    return;
  }

  isWalking = true;
  // Seeing a new enemy on this step empties the path, which must not count as arriving.
  const hasArrived = path.length === 0;
  placeHero(next);
  // As in Shattered Pixel Dungeon, items are only picked up on the tile the player chose.
  const hasPickedUp = hasArrived && !attackTarget && pickUpItems(next);

  if (hasArrived && isWalkingToStairs && !hasPickedUp && canGoDownStairs()) {
    goDownStairs();
    return;
  }

  passTurn(() => setTimeout(walk, STEP_INTERVAL_MS));
}

// A paralyzed or frozen hero cannot act until the turns pass by themselves.
function cannotAct() {
  return isGameOver || isHelpless(heroStatuses);
}

// A new input ends the running effects, so they never delay play.
function finishRunningEffects() {
  while (finishAttackEffect) {
    finishAttackEffect();
  }
}

function traceTo(target: Point, rule: PathRule): Trajectory {
  return traceLine(heroPosition, target, rule, {
    isBlocked({ x, y }) {
      const tile = room.tiles[y]?.[x] ?? 'void';
      return (
        tile === 'wall' ||
        tile === 'void' ||
        (tile === 'door' && !openDoors.has(y * room.width + x))
      );
    },
    hasCharacter: (tile) => enemies.some(({ position }) => isSameTile(position, tile)),
  });
}

function canTarget(tile: Point | null): tile is Point {
  return tile !== null && isInView(tile);
}

function requestTarget(request: TargetRequest) {
  stopWalking();
  targeting = { request, preview: null };
  document.querySelector('#target-prompt-text')!.textContent = request.prompt;
  targetPrompt.hidden = false;
  updateCursorTile();
  renderCanvas();
}

function cancelTargeting() {
  if (!targeting) {
    return;
  }
  targeting = null;
  targetPrompt.hidden = true;
  updateCursorTile();
  renderCanvas();
}

// Outlines the tile that would be picked. Returns whether anything changed.
function previewTarget(tile: Point | null): boolean {
  if (!targeting) {
    return false;
  }
  targeting.preview = canTarget(tile) ? tile : null;
  return roomView.setCursorTile(targeting.preview, 'target');
}

// A mouse picks the tile on the first click, because hovering already outlined it.
// A touch has no hover, so its first tap outlines the tile and a second tap on it picks it.
function pressTarget(tile: Point, isMouse: boolean) {
  if (!targeting || !canTarget(tile)) {
    return;
  }
  if (!isMouse && !isSameTile(tile, targeting.preview)) {
    previewTarget(tile);
    renderCanvas();
    return;
  }
  const { request } = targeting;
  const trajectory = traceTo(tile, request.rule);
  cancelTargeting();
  request.onSelect(trajectory);
}

function pressTileAt(position: Point, isMouse: boolean) {
  finishRunningEffects();
  if (cannotAct()) {
    return;
  }

  const target = tileUnder(position);
  if (!target) {
    return;
  }

  if (targeting) {
    pressTarget(target, isMouse);
    return;
  }

  const isStairs = isSameTile(target, room.stairs);

  // A click on the hero's own tile picks up what lies there. Only a click that picks up nothing
  // goes down the stairs, so one click never does both.
  if (isSameTile(target, heroPosition)) {
    if (!pickUpItems(target) && canGoDownStairs()) {
      goDownStairs();
      return;
    }
    updateCursorTile();
    renderCanvas();
    return;
  }

  const clicked = enemyAt(target);
  // A click on the stairs goes down on arrival, but a click on an item lying there is for the item.
  isWalkingToStairs = !clicked && isStairs && itemsAt(target).length === 0;

  if (clicked) {
    path = pathToAttack(clicked);
    attackTarget = clicked;
  } else {
    path = findPath(room, heroPosition, target, seenEnemyTiles(), isExplored);
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

function stopFollowingHero() {
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
    stopFollowingHero();
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
    stopFollowingHero();
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
    pressTileAt({ x: event.offsetX, y: event.offsetY }, event.pointerType === 'mouse');
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

// Takes an item out of the bag before an action with it, and ends the panel and any walk.
function takeFromBag(name: ItemName): boolean {
  finishRunningEffects();
  if (cannotAct()) {
    return false;
  }
  stopWalking();
  removeItem(inventory, name);
  inventoryPanel.refresh();
  inventoryPanel.close();
  return true;
}

function dropFromBag(name: ItemName) {
  if (takeFromBag(name)) {
    dropItem(name, heroPosition);
    updateVision();
    passTurn(() => {});
  }
}

// A potion breaks where it lands. A harmful one has its effect there, which tells the player what it
// is when they see it.
function shatterPotion(name: ItemName, tile: Point) {
  const { color } = potionLore.lookOf(name);
  const { shatter } = ITEMS[name];
  if (color) {
    playShatter(TVG, roomView, tile, color, renderCanvas);
  }
  if (shatter) {
    shatter(createItemContext(), tile);
    if (isInView(tile)) {
      potionLore.identify(name);
    }
    return;
  }

  // A helpful potion only affects an enemy it hits. The player learns what it is by seeing that.
  const { enemyEffect } = ITEMS[name];
  const enemy = enemyEffect && enemies.find(({ position }) => isSameTile(position, tile));
  if (!enemy) {
    messageLog.add("The potion's flask broke, but nothing happened.");
    return;
  }
  // Checked before the effect, because the hero still sees an enemy turn invisible.
  const isSeen = seenEnemies.has(enemy);
  if (enemyEffect.heal) {
    healEnemy(enemy, enemyEffect.heal);
  }
  if (enemyEffect.status) {
    addEnemyStatus(enemy, enemyEffect.status.name, enemyEffect.status.turns);
  }
  updateVision();
  showEnemy(enemy);
  if (isSeen) {
    messageLog.add(enemyEffect.message(enemy.stats.name));
    potionLore.identify(name);
  } else {
    messageLog.add("The potion's flask broke, but nothing happened.");
  }
}

function throwItem(name: ItemName) {
  inventoryPanel.close();
  requestTarget({
    prompt: `Throw the ${potionLore.lookOf(name).displayName.toLowerCase()} where?`,
    rule: THROWN,
    onSelect({ end }) {
      if (!takeFromBag(name)) {
        return;
      }
      finishAttackEffect = playThrow({
        view: roomView,
        paint: createItemPaint(TVG, potionLore.lookOf(name).icon),
        from: heroPosition,
        to: end,
        render: renderCanvas,
        onLand() {
          finishAttackEffect = null;
          if (ITEMS[name].potion) {
            shatterPotion(name, end);
          } else {
            dropItem(name, end);
          }
          updateVision();
          passTurn(() => {});
        },
      });
    },
  });
}

// Equipping or taking off an item takes a turn, as in Shattered Pixel Dungeon.
function changeEquipment(change: () => boolean) {
  finishRunningEffects();
  if (cannotAct()) {
    return;
  }
  stopWalking();
  if (change()) {
    inventoryPanel.refresh();
    inventoryPanel.close();
    passTurn(() => {});
  }
}

function equipItem(name: ItemName) {
  changeEquipment(() => equip(equipment, inventory, name));
}

function unequipItem(slot: EquipmentSlot) {
  changeEquipment(() => unequip(equipment, inventory, slot));
}

// Drinking a potion tells the player what it is. A harmful one breaks at the hero's feet.
function useItem(name: ItemName) {
  finishRunningEffects();
  const { use, shatter, drinkMessage } = ITEMS[name];
  if (cannotAct() || (!use && !shatter)) {
    return;
  }
  if (drinkMessage) {
    messageLog.add(drinkMessage);
  }

  stopWalking();
  removeItem(inventory, name);
  potionLore.identify(name);
  inventoryPanel.refresh();
  inventoryPanel.close();
  if (shatter) {
    shatterPotion(name, heroPosition);
  } else {
    use?.(createItemContext());
  }
  updateVision();
  passTurn(() => {});
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
  if (cannotAct()) {
    return;
  }

  // While choosing a target, the button only stops choosing.
  if (targeting) {
    cancelTargeting();
    return;
  }

  // While walking, the button stops the walk instead of spending another turn.
  if (isWalking) {
    stopWalking();
    return;
  }

  playWaitEffect();
  passTurn(() => {});
});

document.querySelector('#target-cancel')!.addEventListener('click', cancelTargeting);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    cancelTargeting();
  }
});

document.querySelector('#restart')!.addEventListener('click', () => {
  cancelTargeting();
  runSeed = newRunSeed();
  floor = 1;
  heroHp = HERO_MAX_HP;
  heroMaxHp = HERO_MAX_HP;
  heroLevel = 1;
  heroExperience = 0;
  heroStrength = STARTING_STRENGTH;
  heroStatuses = {};
  hasActedOnce = false;
  potionLore = createPotionLore(createRandom(runSeed));
  killCount = 0;
  turnCount = 0;
  inventory = [];
  equipment = createStartingEquipment();
  inventoryPanel.refresh();
  replaceLevel();
  messageLog.clear();
  messageLog.add('You entered an unknown dungeon.');
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
