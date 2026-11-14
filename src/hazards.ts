import type { ThorVGNamespace } from '@thorvg/webcanvas';
import { createMovingFloorEffect, type MovingEffect } from './effectArt';
import type { GasKind, HazardKind, RoomView } from './render';
import type { Point } from './room';

// Placeholder value. Fire fades out over its last turns.
const FIRE_FADE_TURNS = 3;
// Placeholder value. How long a flammable tile burns after fire spreads to it.
const CATCH_FIRE_TURNS = 4;
// Placeholder values. Gas this thick is drawn at full strength, and the thinnest gas at this
// fraction of it.
const THICK_GAS = 20;
const THINNEST_GAS_OPACITY = 0.3;

const GAS_KINDS: readonly GasKind[] = ['poison', 'paralysis'];

const NEIGHBORS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

// The tiles within some steps of a center, going through the tiles that isOpen accepts and
// stepping diagonally past walls as characters do. A tile that canReach accepts is reached but not
// passed through, like a closed door that fire burns.
export function spreadArea(
  center: Point,
  steps: number,
  isOpen: (tile: Point) => boolean,
  canReach: (tile: Point) => boolean = isOpen,
): Point[] {
  const key = ({ x, y }: Point) => `${x},${y}`;
  const reached = new Map([[key(center), center]]);
  let edge = [center];
  for (let step = 0; step < steps; step++) {
    const next: Point[] = [];
    for (const from of edge) {
      for (const { x: dx, y: dy } of NEIGHBORS) {
        const tile = { x: from.x + dx, y: from.y + dy };
        if (reached.has(key(tile))) {
          continue;
        }
        if (isOpen(tile)) {
          reached.set(key(tile), tile);
          next.push(tile);
        } else if (canReach(tile)) {
          reached.set(key(tile), tile);
        }
      }
    }
    edge = next;
  }
  return [...reached.values()];
}

// Fire burning on tiles, and gas spreading over them.
export interface HazardField {
  // Sets the tiles on fire for some turns. A tile already burning keeps the longer time.
  setFire(tiles: Point[], turns: number): void;
  putOutFire(tiles: Point[]): void;
  // Adds gas on a tile, which spreads from there over the next turns.
  releaseGas(kind: GasKind, tile: Point, amount: number): void;
  kindsAt(tile: Point): HazardKind[];
  // Gas spreads and thins by one turn.
  spreadGas(): void;
  // Fire burns down by one turn.
  burnDown(): void;
  // Stops the fire and gas from moving, when the floor is left.
  stop(): void;
  // What burns and lies where, to be put back with setFire() and releaseGas().
  snapshot(): HazardSnapshot;
}

export interface HazardSnapshot {
  fires: { tile: Point; turns: number }[];
  gases: { kind: GasKind; tile: Point; amount: number }[];
}

export interface HazardWorld {
  // Gas spreads over these tiles.
  isOpen(tile: Point): boolean;
  // Fire spreads to these tiles from the tiles around them.
  isFlammable(tile: Point): boolean;
  // Called when fire on a flammable tile burns out, which destroys what was there.
  burnUp(tile: Point): void;
  // Draws the canvas again, as the fire and gas move.
  render(): void;
}

export function createHazardField(
  TVG: ThorVGNamespace,
  view: RoomView,
  { isOpen, isFlammable, burnUp, render }: HazardWorld,
): HazardField {
  const key = ({ x, y }: Point) => `${x},${y}`;
  const fires = new Map<string, { tile: Point; turns: number; effect: MovingEffect }>();
  const gases: Record<GasKind, Map<string, { tile: Point; amount: number }>> = {
    poison: new Map(),
    paralysis: new Map(),
  };
  const gasPaints: Record<GasKind, Map<string, MovingEffect>> = {
    poison: new Map(),
    paralysis: new Map(),
  };

  // The fire and gas move for as long as any lies on the floor.
  let frame = 0;
  const move = (time: number) => {
    const effects = [
      ...[...fires.values()].map(({ effect }) => effect),
      ...GAS_KINDS.flatMap((kind) => [...gasPaints[kind].values()]),
    ];
    if (effects.length === 0) {
      frame = 0;
      return;
    }
    let hasChanged = false;
    for (const effect of effects) {
      hasChanged = effect.showAt(time) || hasChanged;
    }
    if (hasChanged) {
      render();
    }
    frame = requestAnimationFrame(move);
  };
  const startMoving = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(move);
    }
  };

  const fadeFire = (fire: { turns: number; effect: MovingEffect }) => {
    fire.effect.paint.opacity(Math.round(255 * Math.min(1, fire.turns / FIRE_FADE_TURNS)));
  };

  // Draws each tile of a gas by how thick the gas is there.
  const drawGas = (kind: GasKind) => {
    const paints = gasPaints[kind];
    for (const [name, effect] of paints) {
      if (!gases[kind].has(name)) {
        view.remove(effect.paint);
        paints.delete(name);
      }
    }
    for (const [name, { tile, amount }] of gases[kind]) {
      let effect = paints.get(name);
      if (!effect) {
        effect = createMovingFloorEffect(TVG, kind);
        view.placeOnFloor(effect.paint, tile.x, tile.y);
        paints.set(name, effect);
      }
      const thickness = Math.min(1, amount / THICK_GAS);
      const opacity = THINNEST_GAS_OPACITY + (1 - THINNEST_GAS_OPACITY) * thickness;
      effect.paint.opacity(Math.round(255 * opacity));
    }
    startMoving();
  };

  // Each tile becomes the average of itself and the open tiles around it, less 1, as in
  // Blob.evolve() of Shattered Pixel Dungeon. That uses the 4 tiles beside a tile, but this uses all
  // 8, as characters also step diagonally.
  const spread = (kind: GasKind) => {
    const current = gases[kind];
    const openAround = (tile: Point) =>
      NEIGHBORS.map(({ x, y }) => ({ x: tile.x + x, y: tile.y + y })).filter(isOpen);

    const reached = new Map<string, Point>();
    for (const { tile } of current.values()) {
      for (const next of [tile, ...openAround(tile)]) {
        reached.set(key(next), next);
      }
    }

    const spreadOut = new Map<string, { tile: Point; amount: number }>();
    for (const [name, tile] of reached) {
      // A door may have closed on the gas.
      if (!isOpen(tile)) {
        continue;
      }
      const around = openAround(tile);
      const sum = [tile, ...around].reduce(
        (total, next) => total + (current.get(key(next))?.amount ?? 0),
        0,
      );
      const amount = Math.floor(sum / (around.length + 1)) - 1;
      if (amount > 0) {
        spreadOut.set(name, { tile, amount });
      }
    }
    gases[kind] = spreadOut;
  };

  const setFire = (tiles: Point[], turns: number) => {
    for (const tile of tiles) {
      let fire = fires.get(key(tile));
      if (!fire) {
        const effect = createMovingFloorEffect(TVG, 'fire');
        view.placeOnFloor(effect.paint, tile.x, tile.y);
        fire = { tile, turns: 0, effect };
        fires.set(key(tile), fire);
      }
      fire.turns = Math.max(fire.turns, turns);
      fadeFire(fire);
    }
    startMoving();
  };

  return {
    setFire,
    putOutFire(tiles) {
      for (const tile of tiles) {
        const fire = fires.get(key(tile));
        if (fire) {
          view.remove(fire.effect.paint);
          fires.delete(key(tile));
        }
      }
    },
    releaseGas(kind, tile, amount) {
      const total = (gases[kind].get(key(tile))?.amount ?? 0) + amount;
      gases[kind].set(key(tile), { tile, amount: total });
      drawGas(kind);
    },
    kindsAt(tile) {
      const kinds: HazardKind[] = fires.has(key(tile)) ? ['fire'] : [];
      return [...kinds, ...GAS_KINDS.filter((kind) => gases[kind].has(key(tile)))];
    },
    spreadGas() {
      for (const kind of GAS_KINDS) {
        spread(kind);
        drawGas(kind);
      }
    },
    // Fire spreads to the flammable tiles around it, and a flammable tile burns up when its fire
    // goes out, as in Fire.evolve() of Shattered Pixel Dungeon.
    burnDown() {
      const catching = new Map<string, Point>();
      for (const { tile } of fires.values()) {
        for (const { x, y } of NEIGHBORS) {
          const next = { x: tile.x + x, y: tile.y + y };
          if (isFlammable(next) && !fires.has(key(next))) {
            catching.set(key(next), next);
          }
        }
      }

      for (const [name, fire] of fires) {
        fire.turns--;
        if (fire.turns > 0) {
          fadeFire(fire);
        } else {
          view.remove(fire.effect.paint);
          fires.delete(name);
          if (isFlammable(fire.tile)) {
            burnUp(fire.tile);
          }
        }
      }
      setFire([...catching.values()], CATCH_FIRE_TURNS);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      fires.clear();
      for (const kind of GAS_KINDS) {
        gasPaints[kind].clear();
      }
    },
    snapshot() {
      return {
        fires: [...fires.values()].map(({ tile, turns }) => ({ tile, turns })),
        gases: GAS_KINDS.flatMap((kind) =>
          [...gases[kind].values()].map(({ tile, amount }) => ({ kind, tile, amount })),
        ),
      };
    },
  };
}
