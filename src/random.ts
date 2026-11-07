export type Random = () => number;

// mulberry32 from https://github.com/bryc/code/blob/master/jshash/PRNGs.md
export function createRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: Random, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)];
}

export function shuffle<T>(random: Random, list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Random.NormalIntRange of Shattered Pixel Dungeon. It averages two rolls, so values near the middle
// come up more often than the ends. Both ends are included.
export function normalIntRange(random: Random, min: number, max: number): number {
  return min + Math.floor(((random() + random()) * (max - min + 1)) / 2);
}

// Both ends are included.
export function randomInt(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}
