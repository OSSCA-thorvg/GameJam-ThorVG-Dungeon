import ThorVG, { type Paint } from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';
import heroIcon from '../assets/icons/cathelineau/swordman.svg?raw';
import { playAttackEffect } from './attackEffect';
import { createDamageNumbers } from './damageNumbers';
import { playArrow, playBounce, playFrost, playShatter, playThrow } from './throwEffect';
import { THROWN, traceLine, type PathRule, type Trajectory } from './trajectory';
import {
  alertEnemy,
  ASLEEP_CHANCE,
  attachBody,
  attackEnemy,
  bodySegment,
  centipede,
  CHARGE_DAMAGE,
  CHARGE_STUN_TURNS,
  centipedeStats,
  chaser,
  createCentipedeState,
  createEnemy,
  createNecromancerState,
  damageEnemy,
  disturbEnemy,
  healEnemy,
  HERO_ACCURACY,
  HERO_EVASION,
  ENEMY_KINDS,
  HERO_MAX_HP,
  archer,
  ghostStats,
  mimicStats,
  necromancer,
  necromancerStats,
  pickEnemyKind,
  rollHit,
  skeletonArcherStats,
  UNDEAD_KINDS,
  wholeOf,
  type Enemy,
  type UndeadKind,
} from './enemy';
import { createBossFloor, createNecromancerFloor } from './bossFloor';
import { showLaneWarning, type LaneWarning } from './laneWarning';
import {
  CAMPFIRE_ICON,
  COOK_TURNS,
  pickCampfireFloor,
  REST_HEAL_FRACTION,
  REST_TURNS,
} from './campfire';
import { createDialog } from './dialog';
import { createHazardField, spreadArea } from './hazards';
import { createHunger, hungerState, satisfyHunger, tickHunger } from './hunger';
import { createInventoryPanel } from './inventoryPanel';
import { loadSettings, saveSettings, uiScaleFor } from './settings';
import { createSettingsPanel } from './settingsPanel';
import { createStatusBar } from './statusBar';
import {
  accuracyFactor,
  addItem,
  canSurpriseAttack,
  createEmptyEquipment,
  createStartingEquipment,
  createStartingInventory,
  equip,
  evasionFactor,
  rollArmor,
  rollDamage,
  STARTING_STRENGTH,
  tooHeavyMessage,
  unequip,
  weaponReach,
  type Equipment,
  type EquipmentSlot,
  ITEMS,
  removeItem,
  type ItemContext,
  type ItemName,
  type ItemStack,
} from './items';
import { generateMap, pickItemTiles, type GeneratedMap } from './mapgen';
import {
  hasTraps,
  isWithin,
  NOTICE_CHANCE,
  ARROW_RANGE,
  TRAP_DAMAGE,
  TRAP_LABELS,
  trapCount,
  trapKinds,
  type Trap,
  type TrapKind,
} from './traps';
import { SEARCH_RADIUS } from './search';
import { playSearch } from './searchEffect';
import { createMessageLog } from './messageLog';
import { canReach, findPath } from './path';
import {
  CHEST_ICON,
  FOOD_PER_FLOOR,
  GOLD_ICON,
  GOLD_PILES_PER_FLOOR,
  hideInChests,
  MIMIC_ICON,
  pickMimicFloor,
  rollEquipment,
  rollGold,
  type GroundThing,
  type Loot,
} from './loot';
import {
  createPotionLore,
  FLOORS_PER_STAGE,
  ITEM_FLOORS_PER_STAGE,
  planStagePotions,
} from './potions';
import {
  createRandom,
  normalIntRange,
  pick,
  randomInt,
  roundRandomly,
  shuffle,
  type Random,
} from './random';
import {
  createCharacter,
  createDamageNumber,
  createEvadeText,
  createNoticeMark,
  createSleepMark,
  createStatusText,
  createSurpriseMark,
  createCentipedePart,
  createTargetedText,
  createTrapPaint,
  createCoffinPaint,
  createDummyEnemy,
  createEnemyHealthBar,
  createItemPaint,
  createHeroHealthBar,
  createRoomView,
  tileDistance,
  tintCharacter,
  type DamageTarget,
} from './render';
import { isAdjacent, isFixture, isWalkable, type Point } from './room';
import {
  addStatus,
  HARMFUL_STATUSES,
  hasStatus,
  isHelpless,
  poisonDamage,
  STATUS_LABELS,
  tickStatuses,
  tintOf,
  type StatusName,
  type Statuses,
} from './status';
import { campfireRoom, catacombRooms, normalRooms, startRooms } from './roomSources';
import { playSplash } from './splash';
import {
  createSurface,
  hasFinishedSurface,
  markSurfaceFinished,
  SIGN_ICON,
  type Sign,
} from './surface';
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
// Placeholder value. How likely fire is to burn the item it reaches in a burning hero's bag.
const BAG_BURN_CHANCE = 0.5;
// Placeholder value. How long each turn takes while the hero cannot act.
const HELPLESS_TURN_MS = 300;
// Placeholder value. How long an enemy waits before it strikes, after the blow that came before,
// such as the hero's.
const ENEMY_ATTACK_DELAY_MS = 150;
// Placeholder value. How long the hero flashes red when an arrow hits.
const HIT_FLASH_MS = 100;
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
const examineButton = document.querySelector<HTMLButtonElement>('#examine')!;
examineButton.hidden = false;

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

let settings = loadSettings();

// The CSS zooms the HTML by the UI scale. The hero health bar is on the canvas, so it is scaled
// here to stay under its text.
function applySettings() {
  const scale = uiScaleFor(settings, window.innerWidth);
  document.documentElement.style.setProperty('--ui-scale', String(scale));
  heroHealthBar.scene.scale(scale);
}

applySettings();
const settingsPanel = createSettingsPanel({
  getSettings: () => settings,
  onOpen() {
    stopWalking();
    cancelTargeting();
  },
  onChange(next) {
    settings = next;
    saveSettings(settings);
    applySettings();
    renderCanvas();
  },
});

// A "seed" URL parameter repeats the same maps, for testing.
const fixedSeed = new URLSearchParams(location.search).get('seed');
const newRunSeed = () =>
  fixedSeed === null ? Math.floor(Math.random() * 2 ** 31) : Number(fixedSeed);

let runSeed = newRunSeed();
// Floor 0 is the surface, where only the first run in a browser starts.
const firstFloor = () => (hasFinishedSurface() ? 1 : 0);
let floor = firstFloor();
// For the summary shown when the hero dies.
let killCount = 0;
let turnCount = 0;

// The current floor's stage, and its place in the stage, both counted from 0.
const currentStage = () => Math.floor((floor - 1) / FLOORS_PER_STAGE);
const floorInStage = () => (floor - 1) % FLOORS_PER_STAGE;

// What the floors of a stage hold. Each floor plans its stage again from the same seed, so the
// floors of a stage agree on the plan. Those seeds are below the run seed, which the floors' seeds
// are above.
function planStage(stage: number) {
  const random = createRandom(runSeed - 1 - stage);
  return {
    potions: planStagePotions(random),
    mimicFloor: pickMimicFloor(random),
    campfireFloor: pickCampfireFloor(random),
  };
}

// The loot lying on the current floor, none of it in chests yet, and whether the stage's mimic is
// on this floor.
function floorContents(random: Random): { loot: Loot[]; hasMimic: boolean } {
  const index = floorInStage();
  if (index >= ITEM_FLOORS_PER_STAGE) {
    return { loot: [], hasMimic: false };
  }
  const stage = currentStage();
  const plan = planStage(stage);
  const hasMimic = plan.mimicFloor === index;
  const items: ItemName[] = [
    ...plan.potions[index],
    ...Array<ItemName>(FOOD_PER_FLOOR).fill('travel-ration'),
    ...rollEquipment(random, stage),
  ];
  const loot = [
    ...items.map((name): Loot => ({ kind: 'item', name })),
    ...Array.from({ length: GOLD_PILES_PER_FLOOR }, (): Loot => ({
      kind: 'gold',
      amount: rollGold(random, floor),
    })),
  ];
  return { loot, hasMimic };
}

// A coffin on the second stage. Some hold an undead that bursts out when the hero comes near.
interface CoffinSpec {
  position: Point;
  kind: UndeadKind | null;
  // What wakes the undead in it: the hero coming near, or the necromancer.
  waker: 'hero' | 'boss';
}

interface Coffin extends CoffinSpec {
  paint: Paint | null;
}

// Placeholder values. How likely a coffin is to hold an undead, and how many a floor holds at most.
const AMBUSH_CHANCE = 0.2;
const MAX_AMBUSHES = 4;
// Placeholder value. How many of the places that enemies are put at random on the second stage
// hold a ghoul. The ghouls come mostly out of coffins, and the rest of the places hold a ghost.
const WANDERING_GHOUL_CHANCE = 0.3;
// How close the hero must come to a coffin in view, in tiles, for its undead to burst out.
const AMBUSH_DISTANCE = 1;

function coffinTiles(room: GeneratedMap): Point[] {
  const tiles: Point[] = [];
  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === 'coffin') {
        tiles.push({ x, y });
      }
    }),
  );
  return tiles;
}

// Picks the coffins of the floor that hold an undead, and which one.
function planCoffins(room: GeneratedMap, random: Random): CoffinSpec[] {
  const undead = Object.keys(UNDEAD_KINDS) as UndeadKind[];
  let holders = 0;
  return shuffle(random, coffinTiles(room)).map((position) => {
    const holds = holders < MAX_AMBUSHES && random() < AMBUSH_CHANCE;
    holders += holds ? 1 : 0;
    return { position, kind: holds ? pick(random, undead) : null, waker: 'hero' };
  });
}

// Placeholder values. How many coffins of the necromancer's room hold a ghoul, which is two for
// each of its three chants, and how many of them it wakes in a chant. The other coffins are
// empty, and look the same.
const GHOULS_IN_BOSS_COFFINS = 6;
const GHOULS_PER_CHANT = 2;

// Picks the coffins of the necromancer's room that hold a ghoul. Only the necromancer wakes them.
function planBossCoffins(room: GeneratedMap, random: Random): CoffinSpec[] {
  return shuffle(random, coffinTiles(room)).map((position, index) => ({
    position,
    kind: index < GHOULS_IN_BOSS_COFFINS ? 'ghoul' : null,
    waker: 'boss',
  }));
}

const SECOND_STAGE_STATS = {
  ghoul: UNDEAD_KINDS.ghoul,
  ghost: ghostStats,
  skeleton: skeletonArcherStats,
};

// What a place for an enemy holds on the second stage: a ghoul now and then, and else a ghost or a
// skeleton archer in equal shares.
function pickSecondStageKind(random: Random) {
  if (random() < WANDERING_GHOUL_CHANCE) {
    return 'ghoul' as const;
  }
  return random() < 0.5 ? ('ghost' as const) : ('skeleton' as const);
}

// A mimic in disguise, drawn as a chest on the floor is. It holds gold, one of the prizes
// Mimic.generatePrize() of Shattered Pixel Dungeon picks from.
function createMimic(position: Point, random: Random): Enemy {
  const look = new TVG.Scene();
  look.add(createItemPaint(TVG, CHEST_ICON));
  const mimic = createEnemy(
    mimicStats(floor),
    position,
    false,
    look,
    createEnemyHealthBar(TVG, renderCanvas),
    createSleepMark(TVG),
    chaser,
    { kind: 'gold', amount: rollGold(random, floor) },
  );
  mimic.state = 'disguised';
  return mimic;
}

// The giant centipede, from its head tile to its tail tile. It drops the key to the way down.
function createCentipede(tiles: Point[]): Enemy[] {
  const part = (tile: Point, isHead: boolean) =>
    createEnemy(
      centipedeStats,
      tile,
      false,
      createCentipedePart(TVG, isHead),
      createEnemyHealthBar(TVG, renderCanvas),
      createSleepMark(TVG),
      isHead ? centipede : bodySegment,
      isHead ? { kind: 'item', name: 'iron-key' } : null,
    );
  const [headTile, ...bodyTiles] = tiles;
  const head = part(headTile, true);
  const body = bodyTiles.map((tile) => part(tile, false));
  attachBody(head, body);
  // It always knows where the hero is, so it hunts from the start.
  head.centipede = createCentipedeState();
  head.state = 'hunting';
  return [head, ...body];
}

// The necromancer, which drops the key to the way down.
function createNecromancer(position: Point): Enemy {
  const enemy = createEnemy(
    necromancerStats,
    position,
    false,
    createDummyEnemy(TVG, 'necromancer'),
    createEnemyHealthBar(TVG, renderCanvas),
    createSleepMark(TVG),
    necromancer,
    { kind: 'item', name: 'iron-key' },
  );
  enemy.state = 'hunting';
  enemy.necromancer = createNecromancerState();
  return enemy;
}

function createLevel() {
  if (floor === FLOORS_PER_STAGE * 2) {
    const { map, boss } = createNecromancerFloor();
    const bossRandom = createRandom(runSeed + floor);
    const coffinSpecs = planBossCoffins(map, bossRandom);
    return finishLevel(map, [createNecromancer(boss)], [], [], [], coffinSpecs);
  }

  if (floor === FLOORS_PER_STAGE) {
    const { map, tiles } = createBossFloor();
    return finishLevel(map, createCentipede(tiles), [], []);
  }

  if (floor === 0) {
    const surface = createSurface();
    const floorItems = surface.items.map(({ name, position }) => ({
      thing: { kind: 'item', name } satisfies GroundThing,
      position,
    }));
    return finishLevel(surface.map, [], floorItems, surface.signs);
  }

  const random = createRandom(runSeed + floor);
  const hasCampfire = planStage(currentStage()).campfireFloor === floorInStage();
  const room = generateMap({
    startRooms,
    // The crypts with coffins only turn up on the second stage.
    normalRooms: currentStage() >= 1 ? [...normalRooms, ...catacombRooms] : normalRooms,
    specialRoom: hasCampfire ? campfireRoom : undefined,
    roomCount: randomInt(random, MIN_ROOMS, MAX_ROOMS),
    random,
  });

  // The second stage has enemies of its own, which are ghouls, ghosts, and skeleton archers, with
  // few ghouls wandering about, as most come out of coffins. The enemies of the first stage do not
  // turn up there.
  const enemies = room.monsters.map((position) => {
    const kind =
      currentStage() >= 1 ? pickSecondStageKind(random) : pickEnemyKind(random, floor);
    const stats =
      kind === 'ghoul' || kind === 'ghost' || kind === 'skeleton'
        ? SECOND_STAGE_STATS[kind]
        : ENEMY_KINDS[kind];
    const enemy = createEnemy(
      stats,
      position,
      random() < ASLEEP_CHANCE,
      createDummyEnemy(TVG, kind),
      createEnemyHealthBar(TVG, renderCanvas),
      createSleepMark(TVG),
      kind === 'skeleton' ? archer : chaser,
    );
    // A ghost floats for good, so the hazards of the floor do not touch it.
    if (kind === 'ghost') {
      enemy.statuses.levitating = Infinity;
    }
    return enemy;
  });
  const { loot, hasMimic } = floorContents(random);
  const itemCount = loot.length + (hasMimic ? 1 : 0);
  const numberOfTraps = hasTraps(currentStage(), floorInStage(), FLOORS_PER_STAGE)
    ? randomInt(random, ...trapCount(currentStage()))
    : 0;
  // The traps take the tiles after those of the items, so a floor without traps stays as it was.
  const picked = pickItemTiles(room, itemCount + numberOfTraps, random);
  const tiles = picked.slice(0, itemCount);
  const things = hideInChests(random, loot.slice(0, tiles.length));
  // The mimic takes a tile of its own, so it adds to the chests instead of replacing one.
  if (hasMimic && tiles.length > loot.length) {
    enemies.push(createMimic(tiles[loot.length], random));
  }
  const floorItems = things.map((thing, index) => ({ thing, position: tiles[index] }));
  const trapSpecs = picked
    .slice(itemCount)
    .map((position) => ({ position, kind: pick(random, trapKinds(currentStage())) }));
  return finishLevel(room, enemies, floorItems, [], trapSpecs, planCoffins(room, random));
}

function finishLevel(
  room: GeneratedMap,
  enemies: Enemy[],
  floorItems: { thing: GroundThing; position: Point }[],
  signs: Sign[],
  trapSpecs: { position: Point; kind: TrapKind }[] = [],
  coffinSpecs: CoffinSpec[] = [],
) {
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
    enemies,
    floorItems,
    signs,
    trapSpecs,
    coffinSpecs,
  };
}

let {
  room,
  explored,
  inView,
  seenEnemies,
  roomView,
  hazards,
  hero,
  enemies,
  floorItems,
  signs,
  trapSpecs,
  coffinSpecs,
} = createLevel();
let heroPosition = room.start;
let heroHp = HERO_MAX_HP;
let heroMaxHp = HERO_MAX_HP;
let heroLevel = 1;
let heroExperience = 0;
let heroStrength = STARTING_STRENGTH;
let heroGold = 0;
let heroStatuses: Statuses = {};
// Placeholder values. The touch of a ghost lowers the hero's strength by this much for this many
// turns, and another touch starts the turns again, so the strength never drops further.
const WEAKENED_STRENGTH = 1;
const WEAKENED_TURNS = 10;
// The hero's strength now. What gear asks for is measured against it.
const currentStrength = () =>
  heroStrength - (hasStatus(heroStatuses, 'weakened') ? WEAKENED_STRENGTH : 0);
let heroHunger = createHunger();
// Whether a hasted hero already took the first of their two actions in this turn.
let hasActedOnce = false;
// Whether the hero was hasted when the action in progress began. Haste speeds up the actions that
// follow the one that gave it, and the enemy that already acted in the first half of a hasted turn.
let wasHasted = false;
// Enemies that already used their action in the turn about to run, like a mimic that bit the hero
// opening it, or an undead that burst out of its coffin.
const skippingThisTurn = new Set<Enemy>();
// Arrows of traps in flight. What an arrow hits is settled when it lands, so the next action waits
// for it. The epoch tells arrows of an earlier floor or run, which hit nothing.
let arrowsInFlight = 0;
let arrowWaiters: (() => void)[] = [];
let epoch = 0;
let potionLore = createPotionLore(createRandom(runSeed));
// How far the hero can see, in tiles. An effect that changes it should call updateVision().
let heroViewDistance = DEFAULT_VIEW_DISTANCE;
// What the current vision was computed from, to skip computing it when nothing changed.
let visionState = '';
let path: Point[] = [];
let attackTarget: Enemy | null = null;
// A closed chest or the campfire that the hero walks to, to use it from a tile next to it.
let useTarget: Point | null = null;
// What the hero is doing at the campfire for some turns, or null.
let campfireTask: { verb: string } | null = null;
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
// On the surface the hero starts with nothing, and picks up the starting gear lying there.
const startingInventory = () => (floor === 0 ? [] : createStartingInventory());
const startingEquipment = () => (floor === 0 ? createEmptyEquipment() : createStartingEquipment());
let inventory: ItemStack[] = startingInventory();
let equipment: Equipment = startingEquipment();
let groundItems: { thing: GroundThing; position: Point; paint: Paint }[] = [];
let traps: Trap[] = [];
let coffins: Coffin[] = [];
// The coffins that the necromancer chants over, until it raises what is in them, and the ghouls it
// raised.
let chantedCoffins: Coffin[] = [];
const summonedGhouls = new Set<Enemy>();

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
    satisfyHunger(amount) {
      satisfyHunger(heroHunger, amount);
      showHeroStats();
    },
    log: (message) => messageLog.add(message),
    // Fire and frost also reach a closed door, without going through it.
    areaAround: (tile, steps) => spreadArea(tile, steps, isOpenTile, isFlammableTile),
    // Fire catches whoever stands in it at once, but does not burn on water, which puts out whoever
    // it caught after one burn.
    setFire(tiles, turns) {
      hazards.setFire(
        tiles.filter(({ x, y }) => room.tiles[y][x] !== 'water'),
        turns,
      );
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

// Shallow water wets a character standing in it, but not a levitating one.
function isInWater(position: Point, statuses: Statuses): boolean {
  return room.tiles[position.y][position.x] === 'water' && !hasStatus(statuses, 'levitating');
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

// Water puts out a burning character that stands in it. It comes after the burn of the turn, so a
// character that steps into water or is set alight there still takes that one burn.
function putOutBurningInWater() {
  if (heroHp > 0 && hasStatus(heroStatuses, 'burning') && isInWater(heroPosition, heroStatuses)) {
    delete heroStatuses.burning;
    messageLog.add('The water puts out the fire.');
    updateHeroLook();
  }
  for (const enemy of enemies) {
    if (
      enemy.hp > 0 &&
      hasStatus(enemy.statuses, 'burning') &&
      isInWater(enemy.position, enemy.statuses)
    ) {
      delete enemy.statuses.burning;
      showEnemy(enemy);
    }
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
// A harmful effect gives a disguised mimic away, as a negative buff does in Shattered Pixel
// Dungeon.
function addEnemyStatus(enemy: Enemy, name: StatusName, turns: number) {
  if (HARMFUL_STATUSES.includes(name)) {
    if (isShielded(enemy)) {
      return;
    }
    revealMimic(enemy);
  }
  if (!hasStatus(enemy.statuses, name) && seenEnemies.has(enemy)) {
    showStatusText(enemy.position, name);
  }
  addStatus(enemy.statuses, name, turns);
  disturbEnemy(enemy);
  showEnemy(enemy);
}

const heroAccuracy = () =>
  (HERO_ACCURACY + (heroLevel - 1) * LEVEL_UP_ACCURACY) *
  accuracyFactor(equipment, currentStrength());
const heroEvasion = () =>
  (HERO_EVASION + (heroLevel - 1) * LEVEL_UP_EVASION) * evasionFactor(equipment, currentStrength());
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
  const strength = `Str ${currentStrength()}`;
  statsLabel.textContent = `Lv ${heroLevel} · ${experience} · ${strength} · ${heroGold}G`;
  statusBar.show(heroStatuses, heroHunger);
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
  getStrength: currentStrength,
  describeItem(name) {
    const look = potionLore.lookOf(name);
    const blockedReason = look.isKnown
      ? (ITEMS[name].blockedReason?.(createItemContext()) ?? null)
      : null;
    const tooHeavy = tooHeavyMessage(name, currentStrength());
    const description = tooHeavy ? `${look.description} ${tooHeavy}` : look.description;
    return { ...look, description, blockedReason };
  },
  onOpen() {
    stopWalking();
    stopCampfireTask();
    cancelTargeting();
  },
  onUse: useItem,
  onEquip: equipItem,
  onUnequip: unequipItem,
  onThrow: throwItem,
  onDrop: dropFromBag,
});

const dialog = createDialog();

// Choosing a tile for an action, like the CellSelector of Shattered Pixel Dungeon. While this is
// set, a press on a tile picks the target instead of walking there.
interface TargetRequest {
  prompt: string;
  canPick(tile: Point): boolean;
  onSelect(tile: Point): void;
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

// The enemy that the hero can target on a tile. A shielded enemy cannot be targeted, as if the tile
// were a wall.
function targetableEnemyAt(tile: Point) {
  const enemy = enemyAt(tile);
  return enemy && !isShielded(enemy) ? enemy : undefined;
}

function itemsAt({ x, y }: Point) {
  return groundItems.filter(({ position }) => position.x === x && position.y === y);
}

function updateCursorTile() {
  const tile = mousePosition && tileUnder(mousePosition);
  if (targeting) {
    return previewTarget(tile);
  }
  if (tile && targetableEnemyAt(tile)) {
    return roomView.setCursorTile(tile, 'enemy');
  }
  const hasItem =
    tile && (itemsAt(tile).length > 0 || hasChest(tile) || isUsedFromBeside(tile));
  return roomView.setCursorTile(tile, hasItem ? 'item' : 'floor');
}

// What the hero uses from a tile next to it without stepping on it: a fixture or a locked door.
function isUsedFromBeside({ x, y }: Point): boolean {
  return isFixture(room, x, y) || room.tiles[y]?.[x] === 'locked-door';
}

// A locked door opens with an iron key, which stays in the lock. Unlocking takes a turn.
function unlockDoorAt(tile: Point) {
  if (!inventory.some(({ name }) => name === 'iron-key')) {
    messageLog.add('The door is locked. You need a key to open it.');
    return;
  }
  removeItem(inventory, 'iron-key');
  inventoryPanel.refresh();
  room.tiles[tile.y][tile.x] = 'door';
  roomView.unlockDoor(tile);
  messageLog.add('You unlocked the door with the iron key.');
  passTurn(() => {});
}

function isCampfire({ x, y }: Point): boolean {
  return room.tiles[y]?.[x] === 'campfire';
}

function signAt(tile: Point): Sign | undefined {
  return signs.find(({ position }) => isSameTile(position, tile));
}

function readSign(sign: Sign) {
  dialog.open({ title: 'Sign', text: sign.text, actions: [] });
}

function isEnemyInCampfireRoom(): boolean {
  return enemies.some(
    ({ position, state }) =>
      state !== 'disguised' && room.specialRoom.some((tile) => isSameTile(tile, position)),
  );
}

function dropItem(name: ItemName, position: Point) {
  dropThing({ kind: 'item', name }, position);
}

function dropThing(thing: GroundThing, position: Point) {
  const icon =
    thing.kind === 'item'
      ? potionLore.lookOf(thing.name).icon
      : thing.kind === 'gold'
        ? GOLD_ICON
        : CHEST_ICON;
  const paint = createItemPaint(TVG, icon);
  roomView.place(paint, position.x, position.y);
  groundItems.push({ thing, position, paint });
  enterDoor(position);
}

function removeFromGround(item: (typeof groundItems)[number]) {
  roomView.remove(item.paint);
  groundItems.splice(groundItems.indexOf(item), 1);
}

// Closed chests, counting a disguised mimic, which passes for one.
function chestTiles(): Point[] {
  return [
    ...groundItems.filter(({ thing }) => thing.kind === 'chest').map(({ position }) => position),
    ...enemies.filter(({ state }) => state === 'disguised').map(({ position }) => position),
  ];
}

function hasChest(tile: Point): boolean {
  return chestTiles().some((chest) => isSameTile(chest, tile));
}

// Opens the chests on a tile next to the hero, leaving what was in them lying there, as Heap.open()
// of Shattered Pixel Dungeon. It takes a turn, as Key.TIME_TO_UNLOCK does there.
function openChests(tile: Point) {
  for (const item of itemsAt(tile)) {
    if (item.thing.kind === 'chest') {
      removeFromGround(item);
      dropThing(item.thing.contents, tile);
    }
  }
  renderCanvas();
  const mimic = disguisedMimicAt(tile);
  if (!mimic) {
    passTurn(() => {});
    return;
  }
  // As Mimic.interact() of Shattered Pixel Dungeon, the mimic bites the hero who tries to open
  // it, and that bite is its action for the turn.
  revealMimic(mimic);
  playEnemyAttack(mimic, () => passTurn(() => {}, mimic), { isAmbush: true });
}

function disguisedMimicAt(tile: Point): Enemy | undefined {
  return enemies.find((enemy) => enemy.state === 'disguised' && isSameTile(enemy.position, tile));
}

// A disguised mimic shows what it is, as Mimic.stopHiding() of Shattered Pixel Dungeon. That
// happens when the hero tries to open it, or when anything harms it. It hunts the hero who sees it.
function revealMimic(enemy: Enemy) {
  if (enemy.state !== 'disguised') {
    return;
  }
  roomView.remove(enemy.paint);
  enemy.paint = createCharacter(TVG, MIMIC_ICON);
  enemy.state = 'wandering';
  if (isInView(enemy.position)) {
    alertEnemy(enemy, heroPosition);
    enemy.hasSeenHero = true;
    messageLog.add('The chest bares its teeth. It was a mimic!');
  }
  updateVision();
  showEnemy(enemy);
}

// Returns whether anything was picked up. Chests stay until they are opened.
function pickUpItems(tile: Point): boolean {
  let hasPickedUp = false;
  for (const item of itemsAt(tile)) {
    const { thing } = item;
    if (thing.kind === 'gold') {
      heroGold += thing.amount;
      removeFromGround(item);
      hasPickedUp = true;
      messageLog.add(`You picked up ${thing.amount} gold.`);
    } else if (thing.kind === 'item') {
      if (addItem(inventory, thing.name)) {
        removeFromGround(item);
        hasPickedUp = true;
        // Same wording as you_now_have of Hero in Shattered Pixel Dungeon.
        messageLog.add(`You picked up: ${potionLore.lookOf(thing.name).displayName}.`);
      } else {
        playBounce(roomView, item.paint, tile, renderCanvas);
      }
    }
  }
  inventoryPanel.refresh();
  showHeroStats();
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
  if (isExplored(room.stairs)) {
    roomView.revealStairs();
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
    // An invisible enemy is not seen, so the cursor and clicks treat its tile as empty. A disguised
    // mimic is seen as a chest.
    const isSeen =
      isInView(enemy.position) &&
      !hasStatus(enemy.statuses, 'invisible') &&
      enemy.state !== 'disguised';
    if (isSeen === seenEnemies.has(enemy)) {
      continue;
    }
    if (isSeen) {
      seenEnemies.add(enemy);
      // A new enemy stops the walk, so the player can decide again.
      stopWalking();
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
  // A disguised mimic stays drawn, as a chest on the floor does, so it never vanishes out of view.
  if (enemy.state === 'disguised') {
    roomView.place(enemy.paint, x, y);
    return;
  }
  tintCharacter(enemy.paint, tintOf(enemy.statuses));
  if (seenEnemies.has(enemy)) {
    enemy.paint.opacity(255);
    roomView.place(enemy.paint, x, y);
    nudgeEnemy(enemy, enemy.position, { x: 0, y: 0 });
    // A segment shows no health bar, because the head's bar is the health of the whole body.
    if (!enemy.owner) {
      roomView.placeOverlay(enemy.healthBar.scene, x, y);
    }
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
  traps = trapSpecs.map(({ position, kind }) => ({ position, kind, state: 'hidden', paint: null }));
  coffins = coffinSpecs.map((spec) => ({ ...spec, paint: null }));
  chantedCoffins = [];
  summonedGhouls.clear();
  stopWalking();
  isWalkingToStairs = false;
  isWalking = false;
  isGameOver = false;
  finishAttackEffect = null;
  epoch++;
  arrowsInFlight = 0;
  arrowWaiters = [];

  roomView.scene.scale(zoom);
  mapScene.add(roomView.scene);

  openDoors = new Set();
  for (const enemy of enemies) {
    enterDoor(enemy.position);
    showEnemy(enemy);
  }
  for (const { thing, position } of floorItems) {
    dropThing(thing, position);
  }
  room.tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === 'campfire' || tile === 'sign') {
        const icon = tile === 'campfire' ? CAMPFIRE_ICON : SIGN_ICON;
        roomView.place(createItemPaint(TVG, icon), x, y);
      }
    }),
  );
  coffins.forEach(showCoffin);
  // The hero arrives by steps from the floor above, except on the surface.
  if (floor > 0) {
    roomView.markEntrance(room.start);
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
  floorLabel.textContent = floor === 0 ? 'Surface' : `Floor ${floor}`;
  canvas.update().render();
}

// Items left on the stairs block them, so the hero has to clear them first.
function canGoDownStairs() {
  return isSameTile(heroPosition, room.stairs) && itemsAt(room.stairs).length === 0;
}

// Going down from the surface finishes it, so the next runs in this browser start on floor 1.
function goDownStairs() {
  const wasSurface = floor === 0;
  floor++;
  replaceLevel();
  if (wasSurface) {
    markSurfaceFinished();
    messageLog.add('You went down into the dungeon.');
  } else {
    messageLog.add('You went down to the next floor.');
  }
}

function replaceLevel() {
  stopChargeWarning();
  damageNumbers.clear();
  mapScene.remove(roomView.scene);
  ({
    room,
    explored,
    inView,
    seenEnemies,
    roomView,
    hazards,
    hero,
    enemies,
    floorItems,
    signs,
    trapSpecs,
    coffinSpecs,
  } = createLevel());
  startLevel();
}

// The first line of a run.
const greet = () =>
  messageLog.add(
    floor === 0 ? 'You arrived at the entrance of the dungeon.' : 'You entered an unknown dungeon.',
  );

startLevel();
greet();

window.addEventListener('resize', () => {
  canvas.resize(window.innerWidth, window.innerHeight);
  applySettings();
  settingsPanel.refresh();
  applyCamera();
  canvas.update().render();
});

const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas')!;

// The line that a rearing centipede is about to charge down, while it is shown.
let chargeWarning: LaneWarning | null = null;

function stopChargeWarning() {
  chargeWarning?.stop();
  chargeWarning = null;
}

// The centipede marks the hero as its target and shows the line it will charge down. The hero has
// this turn to leave that line.
function startChargeWarning(lane: Point[], direction: Point) {
  stopChargeWarning();
  chargeWarning = showLaneWarning(TVG, roomView, lane, direction, renderCanvas);
  damageNumbers.show(roomView, createTargetedText(TVG), heroPosition);
  messageLog.add('The giant centipede rears up and targets you!');
  stopWalking();
}

// Placeholder value. How long the centipede takes for each tile of its charge.
const CHARGE_STEP_MS = 55;

// Charges the centipede down a path, one tile after another, with its body trailing behind. At the
// end it either hits the hero, who stood in the line, or crashes and is stunned, head and body.
// A new input of the player finishes the charge at once.
function playCharge(enemy: Enemy, path: Point[], hitsHero: boolean, onDone: () => void) {
  const tiles = [...path];
  let timer = 0;
  let isDone = false;

  const finish = () => {
    if (isDone) {
      return;
    }
    isDone = true;
    clearTimeout(timer);
    finishAttackEffect = null;
    for (const tile of tiles.splice(0)) {
      moveEnemy(enemy, tile);
    }

    if (hitsHero) {
      messageLog.add('The giant centipede slams into you!');
      const damage = normalIntRange(Math.random, ...CHARGE_DAMAGE);
      damageHero(Math.max(0, damage - rollArmor(equipment, currentStrength())));
      showHeroStats();
      stopWalking();
      if (heroHp === 0) {
        endGame();
      }
    } else {
      messageLog.add('The giant centipede crashes headfirst into the wall! It is stunned!');
      addEnemyStatus(enemy, 'stunned', CHARGE_STUN_TURNS);
      for (const segment of enemy.followers) {
        addStatus(segment.statuses, 'stunned', CHARGE_STUN_TURNS);
        showEnemy(segment);
      }
    }
    canvas.update().render();
    onDone();
  };

  const step = () => {
    const tile = tiles.shift();
    if (!tile) {
      finish();
      return;
    }
    moveEnemy(enemy, tile);
    renderCanvas();
    timer = window.setTimeout(step, CHARGE_STEP_MS);
  };

  finishAttackEffect = finish;
  step();
}

// Moves an enemy to a tile. Its body follows, each segment into the tile the one before it left, so
// the tail is the only place that is freed.
function moveEnemy(enemy: Enemy, tile: Point) {
  const trail = [enemy.position, ...enemy.followers.map(({ position }) => position)];
  placeEnemy(enemy, tile);
  enemy.followers.forEach((segment, index) => placeEnemy(segment, trail[index]));
  triggerTrapUnder(enemy);
}

function occupiedTiles(except?: Enemy): Point[] {
  return enemies.filter((enemy) => enemy !== except).map((enemy) => enemy.position);
}

// The tiles the hero's paths go around: closed chests, traps that are known, and the enemies the
// hero has seen, so that the paths cannot reveal unseen ones. A path may end on `end`, so whatever
// is there is left out, which makes a walk to a known trap step onto it.
function heroObstacles(end?: Point): Point[] {
  const knownTraps = traps.filter(({ state }) => state === 'known').map(({ position }) => position);
  const tiles = [...[...seenEnemies].map((enemy) => enemy.position), ...chestTiles(), ...knownTraps];
  return tiles.filter((tile) => !isSameTile(tile, end ?? null));
}

function trapAt(tile: Point): Trap | undefined {
  return traps.find(({ position }) => isSameTile(position, tile));
}

// Draws the plate of a trap that is known or spent.
function showTrap(trap: Trap) {
  if (trap.paint) {
    roomView.remove(trap.paint);
  }
  trap.paint = trap.state === 'hidden' ? null : createTrapPaint(TVG, trap.kind, trap.state);
  if (trap.paint) {
    roomView.placeOnFloor(trap.paint, trap.position.x, trap.position.y);
  }
}

// Finding a trap stops the walk, so the hero does not go on along a path that was chosen blind.
function findTrap(trap: Trap) {
  trap.state = 'known';
  showTrap(trap);
  messageLog.add(`You found ${TRAP_LABELS[trap.kind]}.`);
  stopWalking();
}

// After each action, the hero may find a hidden trap on a tile next to them.
function noticeTraps() {
  for (const trap of traps) {
    if (
      trap.state === 'hidden' &&
      isWithin(trap.position, heroPosition, 1) &&
      Math.random() < NOTICE_CHANCE
    ) {
      findTrap(trap);
    }
  }
}

// A search finds every hidden trap in reach, even behind a wall.
function searchArea() {
  const hidden = traps.filter(
    ({ state, position }) => state === 'hidden' && isWithin(position, heroPosition, SEARCH_RADIUS),
  );
  hidden.forEach(findTrap);
  if (hidden.length === 0) {
    messageLog.add('You search the area and find nothing.');
  }
}

// A search lights the area around the hero, and finds what is hidden there once the light has
// passed. It takes a turn.
function startSearch() {
  stopWalking();
  const tiles: Point[] = [];
  for (let dy = -SEARCH_RADIUS; dy <= SEARCH_RADIUS; dy++) {
    for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
      const tile = { x: heroPosition.x + dx, y: heroPosition.y + dy };
      const kind = room.tiles[tile.y]?.[tile.x] ?? 'void';
      if ((dx !== 0 || dy !== 0) && kind !== 'void') {
        tiles.push(tile);
      }
    }
  }
  finishAttackEffect = playSearch({
    TVG,
    view: roomView,
    center: heroPosition,
    tiles,
    render: renderCanvas,
    onEnd() {
      finishAttackEffect = null;
      searchArea();
      passTurn(() => {});
    },
  });
}

// What sets a trap off: the hero or an enemy stepping on it, or a thrown item landing on it.
type TrapTrigger = 'hero' | 'item' | Enemy;

// What an arrow trap shoots: the hero, or an enemy.
type ArrowTarget = 'hero' | Enemy;

// The character nearest to an arrow trap within its range that nothing blocks the way to. It may be
// the hero or an enemy, and is the one standing on the trap when someone stepped on it.
function arrowTarget(from: Point): ArrowTarget | null {
  const candidates: { who: ArrowTarget; position: Point }[] = [
    { who: 'hero', position: heroPosition },
    ...enemies
      .filter((enemy) => enemy.state !== 'disguised' && !isShielded(enemy))
      .map((enemy) => ({ who: enemy, position: enemy.position })),
  ];
  const distance = ({ position }: { position: Point }) =>
    Math.max(Math.abs(position.x - from.x), Math.abs(position.y - from.y));
  const isClear = ({ position }: { position: Point }) =>
    isSameTile(traceTo(position, THROWN, false, from).end, position);
  return (
    candidates
      .filter(({ position }) => isWithin(from, position, ARROW_RANGE))
      .sort((a, b) => distance(a) - distance(b))
      .find(isClear)?.who ?? null
  );
}

// Runs what comes next once no arrow is in flight.
function afterArrows(next: () => void) {
  if (arrowsInFlight === 0) {
    next();
  } else {
    arrowWaiters.push(next);
  }
}

// What an arrow does when it lands. The target is hit even if it has moved on, as the arrow cannot
// miss.
function landArrow(target: ArrowTarget, damage: number) {
  if (target === 'hero') {
    if (!isGameOver) {
      messageLog.add('An arrow hits you!');
      damageHero(damage);
    }
    return;
  }
  if (enemies.includes(target)) {
    hurtEnemy(target, damage);
    if (target.hp === 0) {
      killEnemy(target);
    }
  }
}

// Flies an arrow between two tiles and runs what it does once it lands. The action that shot it is
// not over until then, so the next action waits for it.
function launchArrow(from: Point, to: Point, onLand: () => void) {
  const shotInEpoch = epoch;
  arrowsInFlight++;
  playArrow(TVG, roomView, from, to, renderCanvas, () => {
    if (shotInEpoch !== epoch) {
      return;
    }
    onLand();
    arrowsInFlight--;
    if (arrowsInFlight === 0) {
      const waiters = arrowWaiters;
      arrowWaiters = [];
      waiters.forEach((next) => next());
    }
  });
}

// Shoots an arrow from a trap at the hero or an enemy. The action that set the trap off is not over
// until the arrow lands, so the turn goes on after that.
function shootArrow(from: Point, target: ArrowTarget, damage: number) {
  const to = target === 'hero' ? heroPosition : target.position;
  launchArrow(from, to, () => landArrow(target, damage));
}

// A trap goes off once. Spikes hurt whoever stepped on them. An arrow is shot at the nearest
// character within its range, so it hits whoever stepped on the trap, and when a thrown item set it
// off, whoever is nearest, if anyone is in range. The log tells of what happens in view only, so it
// does not give away what happens elsewhere.
function setOffTrap(trap: Trap, by: TrapTrigger) {
  trap.state = 'spent';
  showTrap(trap);
  const isHero = by === 'hero';
  if (isHero) {
    stopWalking();
  }
  const tellsOf = isHero || isInView(trap.position);
  const lead = isHero
    ? 'You stepped on a plate!'
    : by === 'item'
      ? 'Something set off a plate!'
      : `The ${by.stats.name} stepped on a plate!`;
  const damage = normalIntRange(Math.random, ...TRAP_DAMAGE[trap.kind]);
  const hurtSteppingEnemy = () => {
    if (typeof by === 'object') {
      hurtEnemy(by, damage);
    }
  };

  if (trap.kind === 'spike') {
    if (tellsOf) {
      messageLog.add(`${lead} Spikes jab up out of the floor!`);
    }
    if (isHero) {
      damageHero(damage);
    }
    hurtSteppingEnemy();
    return;
  }

  const target = arrowTarget(trap.position);
  if (tellsOf) {
    messageLog.add(
      target
        ? `${lead} An arrow shoots out of the floor!`
        : `${lead} An arrow shoots out of the floor and finds no one.`,
    );
  }
  if (target) {
    if (target === 'hero') {
      stopWalking();
    }
    shootArrow(trap.position, target, damage);
  }
}

// The hero stepping on a trap, but a levitating hero floats over it.
function triggerTrapAt(tile: Point) {
  const trap = trapAt(tile);
  if (trap && trap.state !== 'spent' && !hasStatus(heroStatuses, 'levitating')) {
    setOffTrap(trap, 'hero');
  }
}

// An enemy stepping on a trap, which it does only when the trap is hidden, as it goes around the
// ones that are known. A levitating enemy floats over it.
function triggerTrapUnder(enemy: Enemy) {
  const trap = trapAt(enemy.position);
  if (trap && trap.state !== 'spent' && !hasStatus(enemy.statuses, 'levitating')) {
    setOffTrap(trap, enemy);
  }
}

// The tiles that enemies go around, which are the traps the hero has found.
const knownTrapTiles = () =>
  traps.filter(({ state }) => state === 'known').map(({ position }) => position);

function showCoffin(coffin: Coffin) {
  if (coffin.paint) {
    roomView.remove(coffin.paint);
  }
  coffin.paint = createCoffinPaint(TVG, chantedCoffins.includes(coffin));
  roomView.place(coffin.paint, coffin.position.x, coffin.position.y);
}

// The undead in a coffin smashes out of it. The coffin is gone then, so it does not block the way
// any more. When the hero woke it, bursting out is its action for the turn about to run, so the
// hero has a turn to react.
function smashCoffin(coffin: Coffin, skipsTurn: boolean): Enemy | null {
  if (!coffin.kind) {
    return null;
  }
  const { position } = coffin;
  if (coffin.paint) {
    roomView.remove(coffin.paint);
  }
  coffins.splice(coffins.indexOf(coffin), 1);
  room.tiles[position.y][position.x] = 'floor';
  // The coffin may have blocked the view or the way, so the vision must be computed again.
  visionState = '';
  const enemy = createEnemy(
    UNDEAD_KINDS[coffin.kind],
    position,
    false,
    createDummyEnemy(TVG, coffin.kind),
    createEnemyHealthBar(TVG, renderCanvas),
    createSleepMark(TVG),
    chaser,
  );
  enemies.push(enemy);
  alertEnemy(enemy, heroPosition);
  enemy.hasSeenHero = true;
  placeEnemy(enemy, position);
  if (skipsTurn) {
    skippingThisTurn.add(enemy);
  }
  messageLog.add(`A ${enemy.stats.name} smashes its way out of a coffin!`);
  damageNumbers.show(roomView, createNoticeMark(TVG), position);
  stopWalking();
  return enemy;
}

// An undead smashes out of each coffin that holds one when the hero comes near it in view.
function wakeCoffins() {
  for (const coffin of [...coffins]) {
    const isNear = isWithin(coffin.position, heroPosition, AMBUSH_DISTANCE);
    if (coffin.waker === 'hero' && coffin.kind && isNear && isInView(coffin.position)) {
      smashCoffin(coffin, true);
    }
  }
}

// The coffins of the necromancer's room that hold a ghoul, which only it can wake.
const summonableCoffins = () =>
  coffins.filter(({ kind, waker }) => kind !== null && waker === 'boss');

// Whether the necromancer has the coffins to raise ghouls from.
const canSummon = () => summonableCoffins().length >= GHOULS_PER_CHANT;

// What keeps an enemy from being hurt or targeted, like a wall in front of it.
const isShielded = (enemy: Enemy) => hasStatus(enemy.statuses, 'shielded');

// A bite that hurts the hero heals the enemies that live off it, by a share of the damage. A share
// of a few points rounds up or down by chance, so over many bites it is the share.
function healFromBite(enemy: Enemy, dealt: number) {
  const whole = wholeOf(enemy);
  const heal = roundRandomly(Math.random, dealt * (enemy.stats.lifesteal ?? 0));
  if (heal > 0 && whole.hp < whole.stats.maxHp) {
    healEnemy(enemy, heal);
    if (seenEnemies.has(whole)) {
      showDamage(heal, enemy.position, 'heal');
    }
  }
}

function showDamage(amount: number, tile: Point, target: DamageTarget) {
  damageNumbers.show(roomView, createDamageNumber(TVG, amount, target), tile);
}

function endGame() {
  isGameOver = true;
  roomView.remove(hero);
  // The hero can die to the enemy turn after changing equipment, while the bag is open.
  inventoryPanel.close();

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
  revealMimic(enemy);
  damageEnemy(enemy, amount);
  if (seenEnemies.has(enemy)) {
    showDamage(amount, enemy.position, 'enemy');
  }
}

// The log only tells of an enemy in view, so it does not give away the others. An invisible enemy in
// view is named too, so the player learns what it was.
function killEnemy(part: Enemy) {
  // Defeating a segment defeats the whole enemy, and its other segments go with it. They all have
  // the same health, so each one may be reported dead, but the enemy is only defeated once.
  const enemy = wholeOf(part);
  if (!enemies.includes(enemy)) {
    return;
  }
  stopChargeWarning();
  if ([enemy, ...enemy.followers].some(({ position }) => isInView(position))) {
    messageLog.add(`You defeated the ${enemy.stats.name}.`);
  }
  for (const piece of [enemy, ...enemy.followers]) {
    roomView.remove(piece.paint);
    roomView.remove(piece.healthBar.scene);
    roomView.remove(piece.sleepMark);
    enemies.splice(enemies.indexOf(piece), 1);
    seenEnemies.delete(piece);
  }
  killCount++;
  if (enemy.loot) {
    dropThing(enemy.loot, enemy.position);
  }
  if (Math.random() < (enemy.stats.meatChance ?? 0)) {
    dropItem('raw-meat', enemy.position);
  }
  gainExperience(enemy.stats.experience);
  updateVision();
}

// A hit on the hero. The armor takes away part of it, as in Char.attack() of Shattered Pixel
// Dungeon, and what the enemy does besides the damage follows from it.
function hitHero(enemy: Enemy, damage: number) {
  const armor = rollArmor(equipment, currentStrength());
  const dealt = Math.min(heroHp, Math.max(0, damage - armor));
  damageHero(dealt);
  healFromBite(enemy, dealt);
  if (enemy.stats.weakens) {
    addHeroStatus('weakened', WEAKENED_TURNS);
  }
  showHeroStats();
}

// An enemy shoots an arrow at the hero. As with a blow, it hits unless the hero's evasion roll is
// higher, and a paralyzed or frozen hero cannot evade. The turn goes on once the arrow lands.
function shootAtHero(enemy: Enemy) {
  const isHit = isHelpless(heroStatuses) || rollHit(enemy.stats.accuracy, heroEvasion());
  const damage = normalIntRange(Math.random, ...enemy.stats.damage);
  launchArrow(enemy.position, heroPosition, () => {
    if (isHit) {
      hitHero(enemy, damage);
      hero.resetEffects();
      hero.fillEffect(220, 60, 60, 255);
      renderCanvas();
      setTimeout(() => {
        tintCharacter(hero, tintOf(heroStatuses));
        renderCanvas();
      }, HIT_FLASH_MS);
    } else {
      damageNumbers.show(roomView, createEvadeText(TVG), heroPosition);
    }
    // Being shot stops the walk, even by a miss, so the player can decide again.
    stopWalking();
  });
}

// A paralyzed or frozen hero cannot evade. An ambush always hits for the most damage, as a hidden
// Mimic attacks in Shattered Pixel Dungeon.
function playEnemyAttack(enemy: Enemy, onDone: () => void, { isAmbush = false } = {}) {
  const attackerTile = enemy.position;
  const isHit =
    isAmbush || isHelpless(heroStatuses) || rollHit(enemy.stats.accuracy, heroEvasion());
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
        const damage = isAmbush
          ? enemy.stats.damage[1]
          : normalIntRange(Math.random, ...enemy.stats.damage);
        hitHero(enemy, damage);
      } else {
        damageNumbers.show(roomView, createEvadeText(TVG), heroPosition);
      }
      // Being attacked stops the walk, even by a miss, so the player can decide again.
      stopWalking();
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

// Ends one action of the hero, once what the action set going has landed. What the action itself
// did is settled by now, so the hero may have died of it, which ends the game before the enemies
// act. Then the hero may find a trap next to them. A hasted hero takes two actions in each turn of
// the enemies, but only an action that began hasted counts as half of one, not the one that gave
// the haste. An enemy that already acted in this turn, like a mimic that bit the hero opening it,
// waits, even when that was in the first half of a hasted turn.
function passTurn(onDone: () => void, hasActed?: Enemy) {
  afterArrows(() => {
    if (heroHp === 0 && !isGameOver) {
      endGame();
    }
    if (isGameOver) {
      canvas.update().render();
      onDone();
      return;
    }
    noticeTraps();
    wakeCoffins();
    if (hasActed) {
      skippingThisTurn.add(hasActed);
    }
    if (wasHasted && hasStatus(heroStatuses, 'haste') && !hasActedOnce) {
      hasActedOnce = true;
      canvas.update().render();
      onDone();
      return;
    }
    hasActedOnce = false;
    runEnemyTurn(onDone);
  });
}

// Sight goes both ways, unless the hero is invisible.
function canEnemySeeHero(enemy: Enemy) {
  return isInView(enemy.position) && !hasStatus(heroStatuses, 'invisible');
}

// Poison and burning hurt the characters that have them, and burning in the bag's items too.
function applyStatusDamage() {
  const poison = poisonDamage(heroStatuses);
  if (poison > 0) {
    damageHero(poison);
  }
  if (hasStatus(heroStatuses, 'burning')) {
    damageHero(normalIntRange(Math.random, ...BURN_DAMAGE));
    burnItemInBag();
  }
  for (const enemy of enemies) {
    if (hasStatus(enemy.statuses, 'burning')) {
      hurtEnemy(enemy, normalIntRange(Math.random, ...BURN_DAMAGE));
    }
  }
}

// Fire sets alight whoever stands in it, poison gas hurts, paralyzing gas paralyzes, and fire cooks
// raw meat. Water puts out those that burn in it.
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
  cookMeatOnFloor(isOnFire);

  for (const enemy of enemies) {
    const enemyHazards = hazards.kindsAt(enemy.position);
    if (enemyHazards.includes('paralysis')) {
      addEnemyStatus(enemy, 'paralyzed', PARALYZED_TURNS);
    }
    if (enemyHazards.includes('poison')) {
      hurtEnemy(enemy, normalIntRange(Math.random, ...POISON_DAMAGE));
    }
  }
  putOutBurningInWater();
}

// Turns one of an item in the bag into another item, which drops at the hero's feet when the bag
// has no room for it.
function replaceInBag(name: ItemName, into: ItemName) {
  removeItem(inventory, name);
  if (!addItem(inventory, into)) {
    dropItem(into, heroPosition);
  }
  inventoryPanel.refresh();
}

// Each turn the hero burns, the fire reaches one random kind of item in the bag that can burn, as
// in Burning.act() of Shattered Pixel Dungeon, and may burn one of them.
function burnItemInBag() {
  const burnable = inventory.filter(({ name }) => ITEMS[name].burnsInto !== undefined);
  if (burnable.length === 0 || Math.random() >= BAG_BURN_CHANCE) {
    return;
  }
  const { name } = pick(Math.random, burnable);
  const into = ITEMS[name].burnsInto;
  const nameOf = (item: ItemName) => potionLore.lookOf(item).displayName.toLowerCase();
  if (into) {
    replaceInBag(name, into);
    messageLog.add(`The flames turned your ${nameOf(name)} into ${nameOf(into)}.`);
  } else {
    removeItem(inventory, name);
    inventoryPanel.refresh();
    messageLog.add(`The flames burned up your ${nameOf(name)}.`);
  }
}

// Fire cooks raw meat lying in it, as Heap.burn() of Shattered Pixel Dungeon.
function cookMeatOnFloor(isOnFire: (tile: Point) => boolean) {
  const cooked = groundItems.filter(
    ({ thing, position }) =>
      thing.kind === 'item' && thing.name === 'raw-meat' && isOnFire(position),
  );
  for (const item of cooked) {
    removeFromGround(item);
    dropItem('cooked-meat', item.position);
  }
  if (cooked.some(({ position }) => isInView(position))) {
    messageLog.add('The fire cooked the raw meat on the floor.');
  }
}

// Hunger grows by a turn. Starving hurts, and starting to starve stops a walk.
function feelHunger() {
  const before = hungerState(heroHunger);
  const damage = tickHunger(heroHunger, heroMaxHp);
  const after = hungerState(heroHunger);
  if (after !== before && after === 'hungry') {
    messageLog.add('You are getting hungry.');
  }
  if (after !== before && after === 'starving') {
    messageLog.add('You are starving! You will keep losing HP until you eat.');
    stopWalking();
  }
  if (damage > 0) {
    damageHero(damage);
  }
}

// The end of a turn, after every enemy acted. First what is already on the characters acts: poison
// and burning hurt, by what they have left, so they hurt before they wear off, whether the action
// of the hero, an enemy, or the fire of the last turn put them there. Then every effect wears off
// by one turn. What the hazards put on the characters now only starts to act in the next turn, so
// it lasts as long as the same effect from an action. Last, fire burns down, the dead go, and the
// hero gets hungrier. While the hero cannot act, the next turn follows by itself.
function endTurn(onDone: () => void) {
  if (isGameOver) {
    canvas.update().render();
    onDone();
    return;
  }

  applyStatusDamage();
  const hasteLeft = heroStatuses.haste;
  tickStatuses(heroStatuses);
  // The action that gave the haste was not hasted, so that turn does not count against it.
  if (!wasHasted && hasteLeft !== undefined) {
    heroStatuses.haste = hasteLeft;
  }
  for (const enemy of enemies) {
    tickStatuses(enemy.statuses);
  }
  hazards.spreadGas();
  applyHazards();
  hazards.burnDown();
  for (const enemy of enemies.filter(({ hp }) => hp === 0)) {
    killEnemy(enemy);
  }
  feelHunger();
  updateHeroLook();
  if (heroHp === 0) {
    endGame();
  }
  wasHasted = hasStatus(heroStatuses, 'haste');
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
  const waiting = enemies
    .filter((enemy) => !skippingThisTurn.has(enemy))
    .flatMap((enemy) => {
      const actions = enemy.stats.actions * (hasStatus(enemy.statuses, 'haste') ? 2 : 1);
      return Array<Enemy>(actions).fill(enemy);
    });
  skippingThisTurn.clear();

  const actNext = () => {
    // The next enemy acts once what the last one did has landed, and not if that ended the hero.
    if (arrowsInFlight > 0) {
      afterArrows(actNext);
      return;
    }
    if (heroHp === 0 && !isGameOver) {
      endGame();
    }
    const enemy = waiting.shift();
    if (!enemy || isGameOver) {
      endTurn(onDone);
      return;
    }

    const wasHunting = enemy.state === 'hunting';
    const canSeeHero = canEnemySeeHero(enemy);
    // A sleeping enemy does not watch the hero, so the hero's attack surprises it.
    enemy.hasSeenHero = canSeeHero && enemy.state !== 'sleeping';
    // An enemy that a trap or a fire ended in this turn does not act any more.
    if (isHelpless(enemy.statuses) || enemy.hp === 0) {
      actNext();
      return;
    }
    const action = enemy.behavior(enemy, {
      room,
      hero: heroPosition,
      canSeeHero,
      occupied: [...occupiedTiles(enemy), ...chestTiles(), ...knownTrapTiles()],
      canSummon: canSummon(),
      summonsAlive: [...summonedGhouls].filter((ghoul) => enemies.includes(ghoul)).length,
    });

    // Shown where the enemy ends its turn, so the mark does not stay behind when it moves.
    const showNoticeMark = () => {
      if (!wasHunting && enemy.state === 'hunting') {
        damageNumbers.show(roomView, createNoticeMark(TVG), enemy.position);
      }
    };

    switch (action.type) {
      case 'move':
        moveEnemy(enemy, action.to);
        showNoticeMark();
        actNext();
        break;
      case 'attack':
        showEnemy(enemy);
        showNoticeMark();
        // A pause after the previous blow, so that the blows can be told apart. Input waits too.
        finishAttackEffect = () => undefined;
        setTimeout(() => {
          finishAttackEffect = null;
          playEnemyAttack(enemy, actNext);
        }, ENEMY_ATTACK_DELAY_MS);
        break;
      case 'shoot':
        showEnemy(enemy);
        showNoticeMark();
        // The same pause as before a blow, with input waiting too.
        finishAttackEffect = () => undefined;
        setTimeout(() => {
          finishAttackEffect = null;
          shootAtHero(enemy);
          actNext();
        }, ENEMY_ATTACK_DELAY_MS);
        break;
      case 'chant': {
        // The necromancer stands behind a shield, and the coffins it chants over turn red.
        chantedCoffins = shuffle(Math.random, summonableCoffins()).slice(0, GHOULS_PER_CHANT);
        chantedCoffins.forEach(showCoffin);
        addEnemyStatus(enemy, 'shielded', Infinity);
        if (isInView(enemy.position)) {
          messageLog.add('The necromancer begins to chant an unknown spell!');
        }
        actNext();
        break;
      }
      case 'raise': {
        const raised = chantedCoffins.filter((coffin) => coffins.includes(coffin));
        chantedCoffins = [];
        for (const coffin of raised) {
          const ghoul = smashCoffin(coffin, false);
          if (ghoul) {
            summonedGhouls.add(ghoul);
          }
        }
        actNext();
        break;
      }
      case 'unshield':
        delete enemy.statuses.shielded;
        showEnemy(enemy);
        if (isInView(enemy.position)) {
          messageLog.add('The shield around the necromancer fades!');
        }
        actNext();
        break;
      case 'wait':
        // It may have woken up.
        showEnemy(enemy);
        showNoticeMark();
        actNext();
        break;
      case 'windup':
        showEnemy(enemy);
        startChargeWarning(action.lane, action.direction);
        actNext();
        break;
      case 'charge':
        stopChargeWarning();
        playCharge(enemy, action.path, action.hitsHero, actNext);
        break;
    }
  };

  actNext();
}

function playHeroAttack(enemy: Enemy) {
  const attackerTile = heroPosition;
  // A surprised enemy cannot evade, and neither can a paralyzed or frozen one.
  const isSurprise = !enemy.hasSeenHero && canSurpriseAttack(equipment, currentStrength());
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

  // An enemy farther away than the next tile gets the same lunge as one on the next tile.
  const steps = Math.max(
    Math.abs(enemy.position.x - attackerTile.x),
    Math.abs(enemy.position.y - attackerTile.y),
  );

  finishAttackEffect = playAttackEffect({
    lunge: scalePoint(tileDistance(attackerTile, enemy.position), LUNGE_DISTANCE / steps),
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
        const damage = rollDamage(equipment, currentStrength(), isSurprise);
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

// Whether the hero's weapon reaches an enemy from where the hero stands. Walls, closed doors, and
// other enemies in between block it.
function canHeroReach(enemy: Enemy): boolean {
  const isOpen = (tile: Point) =>
    isOpenTile(tile) && !enemies.some(({ position }) => isSameTile(position, tile));
  return canReach(heroPosition, enemy.position, weaponReach(equipment), isOpen);
}

// Returns the tiles to walk through to stand next to a tile.
function pathNextTo(tile: Point): Point[] {
  return findPath(room, heroPosition, tile, heroObstacles(tile), isExplored).slice(0, -1);
}

// Returns the tiles to walk through to stand next to an enemy, or none when the weapon already
// reaches it. The walk asks again on every step, so it stops as soon as the weapon reaches.
function pathToAttack(enemy: Enemy): Point[] {
  return canHeroReach(enemy) ? [] : pathNextTo(enemy.position);
}

// Returns the tiles to walk through to stand next to a chest, a fixture, or a locked door, or none
// when the hero already does. Nothing can step on a fixture or a locked door, so the walk goes to
// the nearest tile beside it.
function pathToUse(tile: Point): Point[] {
  if (isAdjacent(tile, heroPosition)) {
    return [];
  }
  if (isWalkable(room, tile.x, tile.y)) {
    return pathNextTo(tile);
  }
  let best: Point[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const beside = { x: tile.x + dx, y: tile.y + dy };
      const candidate = findPath(room, heroPosition, beside, heroObstacles(), isExplored);
      if (candidate.length > 0 && (best.length === 0 || candidate.length < best.length)) {
        best = candidate;
      }
    }
  }
  return best;
}

function walk() {
  if (isGameOver) {
    return;
  }

  // The target may have moved out of view on its turn.
  if (attackTarget && !seenEnemies.has(attackTarget)) {
    stopWalking();
  }

  // The target may have moved on its turn.
  if (attackTarget) {
    path = pathToAttack(attackTarget);
  }

  const next = path.shift();
  if (!next) {
    isWalking = false;
    if (attackTarget && canHeroReach(attackTarget)) {
      playHeroAttack(attackTarget);
    } else if (useTarget && isAdjacent(useTarget, heroPosition)) {
      const sign = signAt(useTarget);
      if (sign) {
        readSign(sign);
      } else if (room.tiles[useTarget.y][useTarget.x] === 'locked-door') {
        unlockDoorAt(useTarget);
      } else if (isCampfire(useTarget)) {
        openCampfire();
      } else {
        openChests(useTarget);
      }
    }
    attackTarget = null;
    useTarget = null;
    return;
  }

  // An enemy may have stepped onto the path. An unseen one on the tile the player chose is
  // attacked, because the player meant to step there.
  const blocker = enemies.find(({ position }) => isSameTile(position, next));
  if (blocker) {
    const isChosenTile = path.length === 0 && !attackTarget && !useTarget;
    stopWalking();
    isWalking = false;
    if (isChosenTile && !seenEnemies.has(blocker) && !isShielded(blocker)) {
      playHeroAttack(blocker);
    }
    return;
  }

  isWalking = true;
  // Seeing a new enemy on this step empties the path, which must not count as arriving.
  const hasArrived = path.length === 0;
  placeHero(next);
  triggerTrapAt(next);
  // As in Shattered Pixel Dungeon, items are only picked up on the tile the player chose.
  const hasPickedUp = hasArrived && !attackTarget && !useTarget && pickUpItems(next);

  if (hasArrived && isWalkingToStairs && !hasPickedUp && canGoDownStairs()) {
    goDownStairs();
    return;
  }

  passTurn(() => setTimeout(walk, STEP_INTERVAL_MS));
}

// A paralyzed or frozen hero cannot act until the turns pass by themselves. While an attack or a
// throw plays, input waits, so every hit can be seen before the next action.
function cannotAct() {
  return (
    isGameOver || isHelpless(heroStatuses) || finishAttackEffect !== null || arrowsInFlight > 0
  );
}

// A closed door stops what flies through it. With `landsOnDoor`, what is thrown at the door itself
// falls on it, which opens it.
function traceTo(
  target: Point,
  rule: PathRule,
  landsOnDoor = false,
  from = heroPosition,
): Trajectory {
  return traceLine(from, target, rule, {
    isBlocked({ x, y }) {
      const tile = room.tiles[y]?.[x] ?? 'void';
      const isTarget = x === target.x && y === target.y;
      // A fixture stops what is thrown at it, so nothing lands in the campfire.
      return (
        tile === 'wall' ||
        tile === 'void' ||
        tile === 'locked-door' ||
        tile === 'coffin' ||
        isFixture(room, x, y) ||
        enemies.some((enemy) => isShielded(enemy) && isSameTile(enemy.position, { x, y })) ||
        (tile === 'door' && !openDoors.has(y * room.width + x) && !(landsOnDoor && isTarget))
      );
    },
    hasCharacter: (tile) => enemies.some(({ position }) => isSameTile(position, tile)),
  });
}

function canTarget(tile: Point | null): tile is Point {
  return tile !== null && targeting !== null && targeting.request.canPick(tile);
}

// While examining, the second press of the button searches.
function showExamineLabel() {
  examineButton.textContent = targeting?.request === EXAMINE_REQUEST ? 'Search' : 'Examine';
}

function requestTarget(request: TargetRequest) {
  stopWalking();
  targeting = { request, preview: null };
  showExamineLabel();
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
  showExamineLabel();
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
  cancelTargeting();
  request.onSelect(tile);
}

// Whether the hero still has somewhere to go. isWalking alone also covers the pause after the last
// step, when a press should already count as a new order.
function isOnTheWay() {
  return isWalking && (path.length > 0 || attackTarget !== null || useTarget !== null);
}

function pressTileAt(position: Point, isMouse: boolean) {
  if (cannotAct()) {
    return;
  }

  // A press anywhere stops a walk or a task at the campfire, and does nothing else, even off the
  // map.
  if (isOnTheWay()) {
    stopWalking();
    return;
  }
  if (campfireTask) {
    stopCampfireTask();
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

  const clicked = targetableEnemyAt(target);
  // A click on the stairs goes down on arrival, but a click on an item lying there is for the item.
  isWalkingToStairs = !clicked && isStairs && itemsAt(target).length === 0;

  stopWalking();
  if (clicked) {
    path = pathToAttack(clicked);
    attackTarget = clicked;
  } else if (isExplored(target) && (hasChest(target) || isUsedFromBeside(target))) {
    path = pathToUse(target);
    useTarget = target;
  } else {
    path = findPath(room, heroPosition, target, heroObstacles(target), isExplored);
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
  useTarget = null;
}

// Takes an item out of the bag before an action with it, and ends the panel and any walk.
function takeFromBag(name: ItemName): boolean {
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
    canPick: isInView,
    onSelect(tile) {
      const { end } = traceTo(tile, THROWN, !ITEMS[name].potion);
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
          const trap = trapAt(end);
          if (trap && trap.state !== 'spent') {
            setOffTrap(trap, 'item');
          }
          updateVision();
          passTurn(() => {});
        },
      });
    },
  });
}

// Tells what is on a tile, in the order GameScene.examineCell() of Shattered Pixel Dungeon looks:
// a character, then what lies there, then the tile itself. On the hero's own tile it skips the
// hero, whom the HUD already shows. Examining takes no turn.
function examine(tile: Point) {
  for (const line of describeTile(tile)) {
    messageLog.add(line);
  }
}

function describeTile(tile: Point): string[] {
  const enemy = enemyAt(tile);
  if (enemy) {
    return [describeEnemy(enemy)];
  }
  if (disguisedMimicAt(tile)) {
    // Examining gives a mimic away, as it does in Shattered Pixel Dungeon.
    return ['A chest. Its latch twitches now and then. Opening it could be dangerous.'];
  }
  const things = itemsAt(tile);
  if (things.length > 0) {
    return things.map(({ thing }) => describeThing(thing));
  }
  const trap = trapAt(tile);
  if (trap?.state === 'known') {
    return [
      trap.kind === 'arrow'
        ? 'An arrow trap. When it is activated, it shoots the nearest character within ' +
          `${ARROW_RANGE} tiles.`
        : 'A spike trap. When it is activated, it hurts whoever stands on it.',
    ];
  }
  if (trap?.state === 'spent') {
    return ['A plate that has already gone off.'];
  }
  return [describeTerrain(tile)];
}

const ENEMY_STATES: Record<Enemy['state'], string> = {
  disguised: 'is pretending to be a chest',
  sleeping: 'is asleep',
  wandering: 'is wandering',
  hunting: 'is hunting you',
};

function describeEnemy(part: Enemy): string {
  const enemy = wholeOf(part);
  const effects = (Object.keys(STATUS_LABELS) as StatusName[])
    .filter((name) => hasStatus(enemy.statuses, name))
    .map((name) => STATUS_LABELS[name]);
  const state = `The ${enemy.stats.name} ${ENEMY_STATES[enemy.state]}.`;
  return effects.length > 0 ? `${state} Effects: ${effects.join(', ')}.` : state;
}

function describeThing(thing: GroundThing): string {
  switch (thing.kind) {
    case 'item': {
      const look = potionLore.lookOf(thing.name);
      return `${look.displayName}: ${look.description}`;
    }
    case 'gold':
      return `${thing.amount} gold.`;
    case 'chest':
      return 'A chest. Open it from a tile next to it.';
  }
}

function describeTerrain({ x, y }: Point): string {
  switch (room.tiles[y][x]) {
    case 'wall':
      return 'A wall.';
    case 'door':
      return openDoors.has(y * room.width + x) ? 'An open door.' : 'A closed door.';
    case 'locked-door':
      return 'A locked door. A key would open it.';
    case 'stairs':
      return 'Stairs down to the next floor.';
    case 'campfire':
      return 'A campfire. From a tile next to it, you can rest or cook raw meat.';
    case 'sign':
      return `A sign. It reads: "${signAt({ x, y })?.text ?? ''}"`;
    case 'water':
      return 'Shallow water. It puts out the fire on whoever stands in it.';
    case 'coffin':
      return 'A wooden coffin.';
    default:
      return floor > 0 && isSameTile({ x, y }, room.start)
        ? 'The stairs you came down. There is no way back up.'
        : 'The floor.';
  }
}

const EXAMINE_REQUEST: TargetRequest = {
  prompt: 'Examine which tile?',
  canPick: isExplored,
  onSelect: examine,
};

// Opens the campfire's window. Opening it takes no turn.
function openCampfire() {
  const enemyNearby = isEnemyInCampfireRoom() ? 'Not while an enemy is in the room.' : null;
  const rawMeat = inventory.find(({ name }) => name === 'raw-meat')?.count ?? 0;
  const heal = Math.round(heroMaxHp * REST_HEAL_FRACTION);
  const cookTime = COOK_TURNS === 1 ? 'one turn' : `${COOK_TURNS} turns`;
  dialog.open({
    title: 'Campfire',
    text: 'A warm fire crackles here. You can rest by it, or cook raw meat over it.',
    actions: [
      {
        label: 'Rest',
        detail: `Recover ${heal} HP over ${REST_TURNS} turns.`,
        blockedReason: enemyNearby ?? (heroHp >= heroMaxHp ? 'Your HP is already full.' : null),
        run: rest,
      },
      {
        label: 'Cook raw meat',
        detail: `Cook one piece in ${cookTime}. You have ${rawMeat}.`,
        blockedReason: enemyNearby ?? (rawMeat === 0 ? 'You have no raw meat.' : null),
        run: cookMeat,
      },
    ],
  });
}

// Spends some turns at the campfire, one after another. onTurn runs on each turn and returns
// whether the task is already done. An enemy coming into the campfire room stops the task, and so
// does any press of the player.
function spendCampfireTurns(
  verb: string,
  turns: number,
  onTurn: () => boolean,
  onDone: () => void,
) {
  if (cannotAct()) {
    return;
  }
  stopWalking();
  const task = { verb };
  campfireTask = task;
  let turnsLeft = turns;
  let isDone = false;
  const next = () => {
    if (campfireTask !== task || isGameOver) {
      return;
    }
    if (isEnemyInCampfireRoom()) {
      campfireTask = null;
      messageLog.add(`An enemy came into the room! You stopped ${verb}.`);
      return;
    }
    if (isDone || turnsLeft === 0) {
      campfireTask = null;
      onDone();
      return;
    }
    turnsLeft--;
    isDone = onTurn();
    passTurn(() => setTimeout(next, STEP_INTERVAL_MS));
  };
  next();
}

function stopCampfireTask() {
  if (campfireTask) {
    messageLog.add(`You stopped ${campfireTask.verb}.`);
    campfireTask = null;
  }
}

// The healing is spread over the turns of the rest, so a rest cut short heals part of it. A rest
// ends early once the HP is full.
function rest() {
  const total = Math.round(heroMaxHp * REST_HEAL_FRACTION);
  let turn = 0;
  messageLog.add('You sit down by the fire to rest.');
  spendCampfireTurns(
    'resting',
    REST_TURNS,
    () => {
      turn++;
      const amount =
        Math.floor((total * turn) / REST_TURNS) - Math.floor((total * (turn - 1)) / REST_TURNS);
      heroHp = Math.min(heroMaxHp, heroHp + amount);
      showHeroHp();
      return heroHp >= heroMaxHp;
    },
    () => {
      messageLog.add('You feel rested.');
      openCampfire();
    },
  );
}

// A piece of meat cooks only when its turns finish without a stop.
function cookMeat() {
  spendCampfireTurns(
    'cooking',
    COOK_TURNS,
    () => false,
    () => {
      if (inventory.some(({ name }) => name === 'raw-meat')) {
        replaceInBag('raw-meat', 'cooked-meat');
        messageLog.add('The raw meat is cooked through.');
      }
      openCampfire();
    },
  );
}

// Equipping or taking off an item takes a turn, as in Shattered Pixel Dungeon.
function changeEquipment(change: () => boolean) {
  if (cannotAct()) {
    return;
  }
  stopWalking();
  // The bag stays open, so that more equipment can be changed in a row.
  if (change()) {
    inventoryPanel.refresh();
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
  const { use, shatter, useMessage } = ITEMS[name];
  if (cannotAct() || (!use && !shatter)) {
    return;
  }
  if (useMessage) {
    messageLog.add(useMessage);
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

// A second press while choosing a tile to examine stops choosing and searches the area, which takes
// a turn.
examineButton.addEventListener('click', () => {
  if (cannotAct()) {
    return;
  }
  if (campfireTask) {
    stopCampfireTask();
    return;
  }
  if (targeting?.request === EXAMINE_REQUEST) {
    cancelTargeting();
    startSearch();
    return;
  }
  inventoryPanel.close();
  requestTarget(EXAMINE_REQUEST);
});

waitButton.addEventListener('click', () => {
  if (cannotAct()) {
    return;
  }

  // While choosing a target, the button only stops choosing.
  if (targeting) {
    cancelTargeting();
    return;
  }

  // While walking or busy at the campfire, the button stops that instead of spending another turn.
  if (isWalking) {
    stopWalking();
    return;
  }
  if (campfireTask) {
    stopCampfireTask();
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
  campfireTask = null;
  dialog.close();
  runSeed = newRunSeed();
  floor = firstFloor();
  heroHp = HERO_MAX_HP;
  heroMaxHp = HERO_MAX_HP;
  heroLevel = 1;
  heroExperience = 0;
  heroStrength = STARTING_STRENGTH;
  heroGold = 0;
  heroStatuses = {};
  heroHunger = createHunger();
  hasActedOnce = false;
  wasHasted = false;
  skippingThisTurn.clear();
  potionLore = createPotionLore(createRandom(runSeed));
  killCount = 0;
  turnCount = 0;
  inventory = startingInventory();
  equipment = startingEquipment();
  inventoryPanel.refresh();
  replaceLevel();
  messageLog.clear();
  greet();
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
