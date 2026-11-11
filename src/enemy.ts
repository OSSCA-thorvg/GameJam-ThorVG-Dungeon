import type { Scene } from '@thorvg/webcanvas';
import { distancesFrom, findPath } from './path';
import type { Random } from './random';
import type { Loot } from './loot';
import type { HealthBar } from './render';
import { isAdjacent, isWalkable, type Point, type Room } from './room';
import { THROWN, traceLine } from './trajectory';
import type { Statuses } from './status';

// Placeholder value.
export const HERO_MAX_HP = 20;

// Same as the starting hero in Shattered Pixel Dungeon.
export const HERO_ACCURACY = 10;
export const HERO_EVASION = 5;

export type EnemyKind = 'weak' | 'medium' | 'strong';

export interface EnemyStats {
  // The name shown to the player.
  name: string;
  maxHp: number;
  damage: [min: number, max: number];
  accuracy: number;
  evasion: number;
  // How many times it acts in each turn.
  actions: number;
  // The experience the hero gets for defeating it.
  experience: number;
  // How likely it is to leave raw meat when it dies. Without it, it has no meat.
  meatChance?: number;
  // The share of the damage it deals to the hero that it heals itself by.
  lifesteal?: number;
  // Whether a bite that hits weakens the hero.
  weakens?: boolean;
}

// Same as the crab of Shattered Pixel Dungeon, which leaves mystery meat a sixth of the time. The
// dummies have it for now, standing in for enemies with flesh such as rats.
const MEAT_CHANCE = 1 / 6;

// An enemy that appears at random on the floors.
interface EnemyKindStats extends EnemyStats {
  // The first floor it appears on.
  firstFloor: number;
  // How often it appears, against the other kinds that can appear on a floor.
  weight: number;
}

// Placeholder values, worked out from how many hits the hero needs to defeat each enemy with the
// starting sword, about 2, 3 and 4.5, and how many hits each needs to defeat a hero with 20 HP in
// cloth armor, about 13, 8 and 13. The strong enemy lands its 13 hits in 6.5 turns, as it acts
// twice.
// The weak one has the accuracy and evasion of a rat in Shattered Pixel Dungeon.
export const ENEMY_KINDS: Record<EnemyKind, EnemyKindStats> = {
  weak: {
    name: 'small dummy',
    maxHp: 11,
    damage: [1, 4],
    accuracy: 8,
    evasion: 2,
    actions: 1,
    experience: 1,
    firstFloor: 1,
    weight: 3,
    meatChance: MEAT_CHANCE,
  },
  medium: {
    name: 'dummy',
    maxHp: 16,
    damage: [2, 5],
    accuracy: 9,
    evasion: 3,
    actions: 1,
    experience: 2,
    firstFloor: 2,
    weight: 2,
    meatChance: MEAT_CHANCE,
  },
  strong: {
    name: 'big dummy',
    maxHp: 25,
    damage: [1, 4],
    accuracy: 12,
    evasion: 6,
    actions: 2,
    experience: 4,
    firstFloor: 3,
    weight: 1,
    meatChance: MEAT_CHANCE,
  },
};

// Mimic.adjustStats(), attackSkill() and damageRoll() of Shattered Pixel Dungeon, whose level is
// the floor. A mimic gives no experience there either.
export function mimicStats(floor: number): EnemyStats {
  return {
    name: 'mimic',
    maxHp: (1 + floor) * 6,
    damage: [1 + floor, 2 + 2 * floor],
    accuracy: 6 + floor,
    evasion: 2 + Math.floor(floor / 2),
    actions: 1,
    experience: 0,
  };
}

// The undead that burst out of coffins on the second stage. Placeholder values. Each bite that
// hurts the hero heals them by a share of the damage, so the longer a fight goes, the longer it
// takes.
export type UndeadKind = 'ghoul';

export const UNDEAD_KINDS: Record<UndeadKind, EnemyStats> = {
  ghoul: {
    name: 'ghoul',
    maxHp: 22,
    damage: [3, 6],
    accuracy: 10,
    evasion: 4,
    actions: 1,
    experience: 5,
    lifesteal: 0.25,
  },
};

// The ghost of the second stage. Placeholder values. It floats, so it is hard to hit and the
// floor's hazards do not touch it, and its touch weakens the hero.
export const ghostStats: EnemyStats = {
  name: 'ghost',
  maxHp: 16,
  damage: [2, 5],
  accuracy: 11,
  evasion: 8,
  actions: 1,
  experience: 5,
  weakens: true,
};

// Placeholder values for the boss of the first stage. It takes about 8 hits from the starting
// sword, and its bite is far stronger than that of anything else on the floors. How long its body
// is depends on the boss room's template.
export const centipedeStats: EnemyStats = {
  name: 'giant centipede',
  maxHp: 90,
  damage: [6, 12],
  accuracy: 11,
  evasion: 3,
  actions: 1,
  experience: 10,
};

// Picks a kind of enemy that can appear on the floor, by weight.
export function pickEnemyKind(random: Random, floor: number): EnemyKind {
  const kinds = (Object.keys(ENEMY_KINDS) as EnemyKind[]).filter(
    (kind) => ENEMY_KINDS[kind].firstFloor <= floor,
  );
  const total = kinds.reduce((sum, kind) => sum + ENEMY_KINDS[kind].weight, 0);
  let roll = random() * total;
  for (const kind of kinds) {
    roll -= ENEMY_KINDS[kind].weight;
    if (roll < 0) {
      return kind;
    }
  }
  return kinds[kinds.length - 1];
}

// Each side rolls from 0 up to its value, and the attack hits unless the evasion roll is higher,
// as in Char.hit() of Shattered Pixel Dungeon. Every roll is independent of earlier ones.
export function rollHit(accuracy: number, evasion: number): boolean {
  return Math.random() * accuracy >= Math.random() * evasion;
}

// The hero has no stealth yet. It starts at 0 in Shattered Pixel Dungeon as well.
const HERO_STEALTH = 0;
// Placeholder value. Shattered Pixel Dungeon divides the distance by 2, so a wandering enemy
// notices for sure only within 2 tiles. Dividing by 4 makes that 4 tiles, and 50% at 8 tiles.
const DETECTION_DISTANCE_DIVISOR = 4;
// Placeholder values. How likely an enemy is to start the floor asleep, and how likely a sleeping
// enemy is to wake up on each turn that it could see the hero within a few tiles. Walking up to a
// sleeping enemy from that far and attacking it leaves it asleep about half the time.
// In Shattered Pixel Dungeon every enemy starts asleep, and the chance to wake depends on distance.
export const ASLEEP_CHANCE = 0.5;
const WAKE_DISTANCE = 3;
const WAKE_CHANCE = 0.2;
// Placeholder values. How likely an enemy that lost the hero is to look ahead along the way the
// hero was going, instead of going back to wandering, and how many steps ahead it looks.
const SEARCH_CHANCE = 0.5;
const SEARCH_STEPS = 6;
// Placeholder value. How many random tiles a wandering enemy tries before it waits a turn.
const WANDER_TRIES = 10;

export type EnemyAction =
  | { type: 'wait' }
  | { type: 'move'; to: Point }
  | { type: 'attack' }
  // An arrow at the hero from where the enemy stands, which needs a clear line of sight.
  | { type: 'shoot' }
  // The necromancer begins a chant over two coffins, which the hero can see and cannot hurt it
  // during, then raises what is in them, then ends the chant when the hero has dealt with them.
  | { type: 'chant' }
  | { type: 'raise' }
  | { type: 'unshield' }
  // The necromancer gathers dark magic for a cone of tiles, which the hero can see and leave.
  | { type: 'gather'; tiles: Point[]; direction: Point }
  // The cone strikes the hero if they are still in it.
  | { type: 'cone'; tiles: Point[] }
  // The giant centipede rears up to charge down a line of tiles, which the hero can see and leave.
  | { type: 'windup'; lane: Point[]; direction: Point }
  // It charges along the path. It hits the hero standing at the end of it, or else crashes.
  | { type: 'charge'; path: Point[]; hitsHero: boolean };

export interface EnemyContext {
  room: Room;
  hero: Point;
  // Whether the enemy can see the hero now.
  canSeeHero: boolean;
  // Tiles held by the other enemies.
  occupied: Point[];
  // Whether the necromancer has two coffins to raise ghouls from.
  canSummon?: boolean;
  // How many of the ghouls that the necromancer raised are still alive.
  summonsAlive?: number;
}

// Decides what an enemy does on its turn. New enemy types add a new behavior.
export type EnemyBehavior = (enemy: Enemy, context: EnemyContext) => EnemyAction;

export interface Enemy {
  stats: EnemyStats;
  position: Point;
  hp: number;
  // A sleeping enemy stays where it is. A wandering enemy walks to random places. A hunting one
  // goes after the hero, or after where it last saw the hero, as the Sleeping, Wandering and
  // Hunting states of Shattered Pixel Dungeon. A disguised one, a mimic, passes for a chest and
  // does nothing until it is found out.
  state: 'disguised' | 'sleeping' | 'wandering' | 'hunting';
  // Where the enemy is going.
  target: Point | null;
  // Where the enemy last saw the hero, and the way the hero was moving then.
  lastSeen: Point | null;
  heading: Point | null;
  // Whether the enemy already looked ahead for the hero since it lost sight of them.
  hasSearched: boolean;
  // Whether the enemy saw the hero at the start of its last turn. As in Shattered Pixel Dungeon,
  // an enemy that did not is surprised by the hero's attack, such as one that just came through
  // a door.
  hasSeenHero: boolean;
  statuses: Statuses;
  paint: Scene;
  healthBar: HealthBar;
  // Shown over the enemy while it sleeps.
  sleepMark: Scene;
  behavior: EnemyBehavior;
  // Left where the enemy dies.
  loot: Loot | null;
  // For an enemy with a long body, such as the giant centipede: the segments that follow it, from
  // the one behind its head to the tail. Each segment is an enemy of its own, so it blocks the way
  // and can be pointed at, but it only repeats what happens to the enemy it belongs to.
  followers: Enemy[];
  // Set on a segment: the enemy whose body it is.
  owner: Enemy | null;
  // Set on the head of a giant centipede: what it is up to.
  centipede: CentipedeState | null;
  necromancer: NecromancerState | null;
}

// The direction a rearing centipede charges in, until it charges, and the turns until it can rear
// up again.
export interface CentipedeState {
  direction: Point | null;
  cooldown: number;
}

export const createCentipedeState = (): CentipedeState => ({
  direction: null,
  cooldown: 0,
});

// Placeholder values for the charge of the giant centipede. It can charge again after this many of
// its turns, its charge hurts this much, and the crash that ends a charge stuns it for this many
// turns. Its bite is as strong, so meeting its head head-on is the thing to avoid.
export const CHARGE_COOLDOWN = 8;
export const CHARGE_DAMAGE: [min: number, max: number] = [9, 13];
export const CHARGE_STUN_TURNS = 3;

const isSameTile = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

// Wandering.detectionChance of Shattered Pixel Dungeon, 1 in (distance / 2 + stealth), with a
// larger divisor. A diagonal step counts as one.
function detectionChance(enemy: Point, hero: Point): number {
  const distance = Math.max(Math.abs(enemy.x - hero.x), Math.abs(enemy.y - hero.y));
  return 1 / (distance / DETECTION_DISTANCE_DIVISOR + HERO_STEALTH);
}

function stepToward(room: Room, from: Point, to: Point, blocked: Point[]): EnemyAction {
  const path = findPath(room, from, to, blocked);
  return path.length > 0 ? { type: 'move', to: path[0] } : { type: 'wait' };
}

function randomDestination(room: Room, from: Point, blocked: Point[]): Point | null {
  const tiles = room.tiles.flatMap((row, y) =>
    row.flatMap((_, x) => (isWalkable(room, x, y) ? [{ x, y }] : [])),
  );
  for (let attempt = 0; attempt < WANDER_TRIES; attempt++) {
    const tile = tiles[Math.floor(Math.random() * tiles.length)];
    if (!isSameTile(tile, from) && findPath(room, from, tile, blocked).length > 0) {
      return tile;
    }
  }
  return null;
}

// Guesses where the hero went after going out of sight: the tile farthest along the way they were
// moving, within a few steps of where they were last seen.
function guessHeroTile(room: Room, lastSeen: Point, heading: Point): Point | null {
  const distances = distancesFrom(room, lastSeen);
  let best: Point | null = null;
  let bestProgress = 0;
  distances.forEach((row, y) =>
    row.forEach((distance, x) => {
      const progress = (x - lastSeen.x) * heading.x + (y - lastSeen.y) * heading.y;
      if (distance > 0 && distance <= SEARCH_STEPS && progress > bestProgress) {
        best = { x, y };
        bestProgress = progress;
      }
    }),
  );
  return best;
}

// A body segment is part of the enemy it belongs to, so what happens to it happens to the whole.
export const wholeOf = (enemy: Enemy): Enemy => enemy.owner ?? enemy;

// Every segment shows the health of the whole enemy, so a hit on any of them can end it.
function syncBody(whole: Enemy): void {
  for (const segment of whole.followers) {
    segment.hp = whole.hp;
  }
}

export function alertEnemy(part: Enemy, hero: Point): void {
  const enemy = wholeOf(part);
  if (enemy.lastSeen && !isSameTile(enemy.lastSeen, hero)) {
    enemy.heading = { x: hero.x - enemy.lastSeen.x, y: hero.y - enemy.lastSeen.y };
  }
  enemy.state = 'hunting';
  enemy.target = hero;
  enemy.lastSeen = hero;
  enemy.hasSearched = false;
}

// Wanders until it notices the hero in view, then chases. When it loses sight of the hero,
// it goes to where it last saw them, which takes it through a door the hero was seen using.
// From there it either looks ahead along the hero's way or goes back to wandering.
export const chaser: EnemyBehavior = (enemy, { room, hero, canSeeHero, occupied }) => {
  const blocked = [...occupied, hero];

  if (enemy.state === 'disguised') {
    return { type: 'wait' };
  }

  // A sleeping enemy only wakes when it sees the hero close by. Waking up takes its turn.
  if (enemy.state === 'sleeping') {
    const distance = Math.max(
      Math.abs(enemy.position.x - hero.x),
      Math.abs(enemy.position.y - hero.y),
    );
    if (canSeeHero && distance <= WAKE_DISTANCE && Math.random() < WAKE_CHANCE) {
      alertEnemy(enemy, hero);
      enemy.hasSeenHero = true;
    }
    return { type: 'wait' };
  }

  const noticesHero =
    canSeeHero &&
    (enemy.state === 'hunting' || Math.random() < detectionChance(enemy.position, hero));
  if (noticesHero) {
    alertEnemy(enemy, hero);
    return isAdjacent(enemy.position, hero)
      ? { type: 'attack' }
      : stepToward(room, enemy.position, hero, occupied);
  }

  if (enemy.state === 'hunting') {
    if (enemy.target && !isSameTile(enemy.position, enemy.target)) {
      const action = stepToward(room, enemy.position, enemy.target, blocked);
      if (action.type === 'move') {
        return action;
      }
    }
    const guess =
      !enemy.hasSearched && enemy.lastSeen && enemy.heading && Math.random() < SEARCH_CHANCE
        ? guessHeroTile(room, enemy.lastSeen, enemy.heading)
        : null;
    if (guess) {
      enemy.hasSearched = true;
      enemy.target = guess;
      return stepToward(room, enemy.position, guess, blocked);
    }
    enemy.state = 'wandering';
    enemy.target = null;
  }

  if (!enemy.target || isSameTile(enemy.position, enemy.target)) {
    enemy.target = randomDestination(room, enemy.position, blocked);
  }
  const action = enemy.target ? stepToward(room, enemy.position, enemy.target, blocked) : null;
  if (!action || action.type === 'wait') {
    enemy.target = null;
    return { type: 'wait' };
  }
  return action;
};

// The giant centipede only moves along these, so its body never has a gap the hero can squeeze
// through, between two segments that touch only at a corner.
const NEIGHBORS: Point[] = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
];

// How many tiles can be reached from a tile without crossing a blocked one, counted up to a limit.
function openArea(room: Room, from: Point, blocked: Point[], limit: number): number {
  const key = ({ x, y }: Point) => y * room.width + x;
  const seen = new Set([key(from)]);
  const queue = [from];
  for (let head = 0; head < queue.length && seen.size < limit; head++) {
    for (const step of NEIGHBORS) {
      const next = { x: queue[head].x + step.x, y: queue[head].y + step.y };
      if (
        isWalkable(room, next.x, next.y) &&
        !seen.has(key(next)) &&
        !blocked.some((tile) => isSameTile(tile, next))
      ) {
        seen.add(key(next));
        queue.push(next);
      }
    }
  }
  return seen.size;
}

// The way from one tile to another, if they are on a line along a row or a column.
function straightDirection(from: Point, to: Point): Point | null {
  if (from.x === to.x && from.y !== to.y) {
    return { x: 0, y: Math.sign(to.y - from.y) };
  }
  if (from.y === to.y && from.x !== to.x) {
    return { x: Math.sign(to.x - from.x), y: 0 };
  }
  return null;
}

// The tiles in a line from a tile, in a direction, up to the first one that is not free.
function freeLine(room: Room, from: Point, direction: Point, blocked: Point[]): Point[] {
  const line: Point[] = [];
  for (let tile = from; ; ) {
    tile = { x: tile.x + direction.x, y: tile.y + direction.y };
    if (!isWalkable(room, tile.x, tile.y) || blocked.some((other) => isSameTile(other, tile))) {
      return line;
    }
    line.push(tile);
  }
}

// The skeleton archer of the second stage. Placeholder values. It is frail, and shoots from afar.
export const skeletonArcherStats: EnemyStats = {
  name: 'skeleton archer',
  maxHp: 12,
  damage: [3, 5],
  accuracy: 11,
  evasion: 4,
  actions: 1,
  experience: 5,
};

// Placeholder value. How far, in tiles, an archer that has noticed the hero shoots from.
const ARCHER_RANGE = 6;

// An archer that has noticed the hero and sees them within its range stops and shoots, even from
// the next tile. Otherwise it goes after the hero like any enemy, which is also how it notices the
// hero.
export const archer: EnemyBehavior = (enemy, context) => {
  const { hero, canSeeHero } = context;
  const distance = Math.max(
    Math.abs(enemy.position.x - hero.x),
    Math.abs(enemy.position.y - hero.y),
  );
  if (enemy.state === 'hunting' && canSeeHero && distance <= ARCHER_RANGE) {
    alertEnemy(enemy, hero);
    return { type: 'shoot' };
  }
  const action = chaser(enemy, context);
  return action.type === 'attack' ? { type: 'shoot' } : action;
};

// How many chants the necromancer has begun, whether one is going on, and whether it has raised
// what is in the coffins yet. Also the cone it is gathering, the turns until it strikes, and the
// turns until it can gather another.
export interface NecromancerState {
  chants: number;
  isChanting: boolean;
  hasRaised: boolean;
  cone: Point[] | null;
  coneTurns: number;
  coneCooldown: number;
}

// Placeholder values. The turns before its first cone and between cones, and how many turns the
// hero has from the sight of the cone to the strike.
const FIRST_CONE_TURNS = 3;
const CONE_COOLDOWN = 5;
const CONE_WARNING_TURNS = 2;

export const createNecromancerState = (): NecromancerState => ({
  chants: 0,
  isChanting: false,
  hasRaised: false,
  cone: null,
  coneTurns: 0,
  coneCooldown: FIRST_CONE_TURNS,
});

// The necromancer of the second stage. Placeholder values. It shoots from afar, sweeps a cone of
// dark magic over the hero when they come near, and when it is hurt enough it chants, which wakes
// the ghouls in two of the coffins of its room.
export const necromancerStats: EnemyStats = {
  name: 'necromancer',
  maxHp: 90,
  damage: [3, 6],
  accuracy: 12,
  evasion: 3,
  actions: 1,
  experience: 20,
};

// Placeholder values. How far it shoots from, the shares of its health at which it chants, and how
// far and how wide its cone reaches, as the half of the angle.
const NECROMANCER_RANGE = 7;
const CHANT_AT = [0.75, 0.5, 0.25];
const CONE_RANGE = 5;
const CONE_HALF_ANGLE = (30 * Math.PI) / 180;

// The tiles of a cone that opens from a tile toward another, as far as the dark magic reaches and
// nothing solid is in the way. The cone is as wide as its angle makes it, so it is narrow near the
// necromancer and wide far from it.
function coneTiles(room: Room, from: Point, toward: Point): Point[] {
  const aim = Math.atan2(toward.y - from.y, toward.x - from.x);
  const isSolid = ({ x, y }: Point) => {
    const tile = room.tiles[y]?.[x] ?? 'void';
    return tile === 'wall' || tile === 'void' || tile === 'locked-door';
  };
  const tiles: Point[] = [];
  for (let dy = -CONE_RANGE; dy <= CONE_RANGE; dy++) {
    for (let dx = -CONE_RANGE; dx <= CONE_RANGE; dx++) {
      const tile = { x: from.x + dx, y: from.y + dy };
      const distance = Math.hypot(dx, dy);
      if ((dx === 0 && dy === 0) || distance > CONE_RANGE + 0.5 || isSolid(tile)) {
        continue;
      }
      const off = Math.atan2(dy, dx) - aim;
      const angle = Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
      const world = { isBlocked: isSolid, hasCharacter: () => false };
      const reaches = isSameTile(traceLine(from, tile, THROWN, world).end, tile);
      if (angle <= CONE_HALF_ANGLE && reaches) {
        tiles.push(tile);
      }
    }
  }
  return tiles;
}

// Between chants it shoots at the hero from where it stands, and goes after them when it cannot see
// them. When the hero is near it gathers a cone of dark magic, which shows for a couple of turns
// and then strikes whoever is still in it. At each share of its health it chants: it stands still
// behind a shield, so nothing can hurt it, a turn later the ghouls come out of two coffins, and
// when the hero has dealt with them the shield falls.
export const necromancer: EnemyBehavior = (enemy, context) => {
  const state = enemy.necromancer!;
  const { room, hero, canSeeHero, occupied } = context;
  if (state.isChanting) {
    if (!state.hasRaised) {
      state.hasRaised = true;
      return { type: 'raise' };
    }
    if ((context.summonsAlive ?? 0) === 0) {
      state.isChanting = false;
      return { type: 'unshield' };
    }
    return { type: 'wait' };
  }
  if (state.cone) {
    state.coneTurns--;
    if (state.coneTurns > 0) {
      return { type: 'wait' };
    }
    const tiles = state.cone;
    state.cone = null;
    state.coneCooldown = CONE_COOLDOWN;
    return { type: 'cone', tiles };
  }
  const next = CHANT_AT[state.chants];
  if (next !== undefined && enemy.hp <= enemy.stats.maxHp * next && context.canSummon) {
    state.chants++;
    state.isChanting = true;
    state.hasRaised = false;
    return { type: 'chant' };
  }

  const distance = Math.max(
    Math.abs(enemy.position.x - hero.x),
    Math.abs(enemy.position.y - hero.y),
  );
  if (state.coneCooldown > 0) {
    state.coneCooldown--;
  } else if (canSeeHero && distance <= CONE_RANGE) {
    const tiles = coneTiles(room, enemy.position, hero);
    const length = Math.hypot(hero.x - enemy.position.x, hero.y - enemy.position.y);
    state.cone = tiles;
    state.coneTurns = CONE_WARNING_TURNS;
    const direction = {
      x: (hero.x - enemy.position.x) / length,
      y: (hero.y - enemy.position.y) / length,
    };
    return { type: 'gather', tiles, direction };
  }
  if (canSeeHero && distance <= NECROMANCER_RANGE) {
    return { type: 'shoot' };
  }
  return stepToward(room, enemy.position, hero, occupied);
};

// The giant centipede always knows where the hero is. It moves one tile a turn along rows and
// columns, and bites hard when the hero is next to its head. With the hero in a line along a row or a column
// and nothing between them, it rears up for a turn, which fixes the direction and shows the line,
// and then charges down that line. The hero can step out of the line. The charge ends in a hit on
// whoever is in the way, or else in a crash, which leaves it stunned. After that it needs a while
// before it can rear up again.
//
// It never steps where its body is, except onto its tail's tile, which the tail leaves as the head
// moves. It also avoids steps into a pocket too small to hold its body, where it would trap itself,
// and when its own body is in the way of the hero it uncoils toward the open.
export const centipede: EnemyBehavior = (enemy, { room, hero, occupied }) => {
  const brain = enemy.centipede!;
  brain.cooldown = Math.max(0, brain.cooldown - 1);

  const head = enemy.position;
  const tail = enemy.followers[enemy.followers.length - 1]?.position;
  const others = tail ? occupied.filter((tile) => !isSameTile(tile, tail)) : occupied;

  if (brain.direction) {
    const direction = brain.direction;
    brain.direction = null;
    brain.cooldown = CHARGE_COOLDOWN;
    // The hero standing in the line stops the charge with a hit.
    const line = freeLine(room, head, direction, others);
    const heroIndex = line.findIndex((tile) => isSameTile(tile, hero));
    const hitsHero = heroIndex >= 0;
    return { type: 'charge', path: hitsHero ? line.slice(0, heroIndex) : line, hitsHero };
  }

  if (isAdjacent(head, hero)) {
    return { type: 'attack' };
  }

  const direction = straightDirection(head, hero);
  if (direction && brain.cooldown === 0) {
    const lane = freeLine(room, head, direction, others);
    if (lane.some((tile) => isSameTile(tile, hero))) {
      brain.direction = direction;
      return { type: 'windup', lane, direction };
    }
  }

  const needed = enemy.followers.length + 2;
  const blocked = [...others, hero, head];
  const roomAt = (tile: Point) => openArea(room, tile, blocked, needed);
  const [next] = findPath(room, head, hero, others, () => true, false);
  if (next && roomAt(next) >= needed) {
    return { type: 'move', to: next };
  }

  let best: { tile: Point; area: number; distance: number } | null = null;
  for (const step of NEIGHBORS) {
    const tile = { x: head.x + step.x, y: head.y + step.y };
    if (!isWalkable(room, tile.x, tile.y) || blocked.some((other) => isSameTile(other, tile))) {
      continue;
    }
    const area = roomAt(tile);
    const distance = Math.abs(tile.x - hero.x) + Math.abs(tile.y - hero.y);
    if (!best || area > best.area || (area === best.area && distance < best.distance)) {
      best = { tile, area, distance };
    }
  }
  return best ? { type: 'move', to: best.tile } : { type: 'wait' };
};

// A body segment never acts. It follows the head, which the game moves.
export const bodySegment: EnemyBehavior = () => ({ type: 'wait' });

export function createEnemy(
  stats: EnemyStats,
  position: Point,
  isAsleep: boolean,
  paint: Scene,
  healthBar: HealthBar,
  sleepMark: Scene,
  behavior: EnemyBehavior,
  loot: Loot | null = null,
): Enemy {
  return {
    stats,
    position,
    hp: stats.maxHp,
    state: isAsleep ? 'sleeping' : 'wandering',
    target: null,
    lastSeen: null,
    heading: null,
    hasSearched: false,
    hasSeenHero: false,
    statuses: {},
    paint,
    healthBar,
    sleepMark,
    behavior,
    loot,
    followers: [],
    owner: null,
    centipede: null,
    necromancer: null,
  };
}

// Joins segments to a head, so that they follow it and share its fate.
export function attachBody(head: Enemy, segments: Enemy[]): void {
  head.followers = segments;
  for (const segment of segments) {
    segment.owner = head;
  }
}

// Anything that happens to a sleeping enemy wakes it, but it does not know where the hero is.
export function disturbEnemy(part: Enemy): void {
  const enemy = wholeOf(part);
  if (enemy.state === 'sleeping') {
    enemy.state = 'wandering';
  }
}

// Damage breaks the ice of a frozen enemy.
export function damageEnemy(part: Enemy, damage: number): void {
  const enemy = wholeOf(part);
  // A shield keeps anything from hurting what is behind it.
  if ((enemy.statuses.shielded ?? 0) > 0) {
    return;
  }
  disturbEnemy(enemy);
  enemy.hp = Math.max(0, enemy.hp - damage);
  syncBody(enemy);
  enemy.healthBar.show(enemy.hp / enemy.stats.maxHp);
  delete enemy.statuses.frozen;
}

export function healEnemy(part: Enemy, amount: number): void {
  const enemy = wholeOf(part);
  disturbEnemy(enemy);
  enemy.hp = Math.min(enemy.stats.maxHp, enemy.hp + amount);
  syncBody(enemy);
  enemy.healthBar.show(enemy.hp / enemy.stats.maxHp);
}

// Being attacked makes the enemy hunt the hero.
export function attackEnemy(enemy: Enemy, hero: Point, damage: number): void {
  alertEnemy(enemy, hero);
  damageEnemy(enemy, damage);
}
