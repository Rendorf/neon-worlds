// Shared constants and deterministic helpers for every scene.
// Every animation is a function of loop time t in [0, LOOP). Anything periodic
// must complete an integer number of cycles per loop so the seam is invisible.

export const W = 480;
export const H = 270;
export const LOOP = 240; // seconds

export type Ctx = CanvasRenderingContext2D;
export type Rng = () => number;

/** Fractional position in a cycle that repeats `cycles` times per loop. */
export function phase(t: number, cycles: number): number {
  const p = (t / LOOP) * cycles;
  return p - Math.floor(p);
}

/** Sine wave that repeats `cycles` times per loop, in [-1, 1]. */
export function wave(t: number, cycles: number, offset = 0): number {
  return Math.sin((phase(t, cycles) + offset) * Math.PI * 2);
}

/** Integer counter in [0, perLoop) that advances perLoop times per loop. */
export function tick(t: number, perLoop: number): number {
  const v = Math.floor((t / LOOP) * perLoop);
  return ((v % perLoop) + perLoop) % perLoop;
}

/** Seeded PRNG (mulberry32). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash. */
export function seedFrom(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stateless hash of two integers to [0, 1). */
export function hash2(a: number, b: number): number {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export const randInt = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
export const randRange = (rng: Rng, lo: number, hi: number): number => lo + rng() * (hi - lo);
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ---------- colour ----------

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export function mix(a: string, b: string, k: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
