import { W, H, type Ctx, phase, wave, tick, hash2, randInt } from '../scene/core';
import {
  sky, rect, px, glow, beam, haze, line, genSkyline, drawBuildings, pickBlinkers, blink, vsign, flicker, glyphs,
  crowd, reflect, ripples, lane,
} from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const BASE = 184; // canal-side street level
const CANAL = 188; // waterline
const DECK = 150; // train bridge deck top

// the rooftop where the cloaked figure stands
const ROOF = { x: 92, w: 34, top: 76 };
const ROOF_B = { x: ROOF.x, w: ROOF.w, top: ROOF.top + 14 };
const FIG_X = ROOF.x + 22;
const FIG_Y = ROOF.top - 14;
const FIG = [
  '..##..',
  '..##..',
  '.####.',
  '######',
  '#.##.#',
  '#.##.#',
  '..##..',
  '.####.',
  '.#..#.',
  '.#..#.',
  '.#..#.',
  '.#..#.',
  '.#..#.',
  '##..##',
];
const FIG_CELLS: [number, number, boolean][] = [];
FIG.forEach((row, r) => {
  for (let c = 0; c < row.length; c++) {
    if (row[c] !== '#') continue;
    const at = (rr: number, cc: number) => FIG[rr]?.[cc] === '#';
    const edge = !at(r - 1, c) || !at(r + 1, c) || !at(r, c - 1) || !at(r, c + 1);
    FIG_CELLS.push([c, r, edge]);
  }
});

const CRANES = [{ x: 404, top: 70 }, { x: 446, top: 82 }];
const PIERS = [36, 132, 228, 324, 420];
const BOATS = [
  { y: 198, k: 1, off: 0.1, dir: 1 },
  { y: 210, k: 2, off: 0.55, dir: -1 },
  { y: 226, k: 1, off: 0.8, dir: -1 },
];
const SIGN_COLS = ['#3dffc8', '#ff4f8a', '#ffb347', '#c8ff6a', '#e8fff8'];

export const niihama: WorldDef = {
  id: 'niihama',
  name: 'Niihama',
  source: 'Ghost in the Shell (1995)',
  creator: "Masamune Shirow; Mamoru Oshii's film",
  tagline: 'Rain on the canals, a ghost on the rooftops',
  era: '2029',
  hourOffset: 1,
  accent: '#3dffc8',
  accent2: '#ff4f8a',
  weathers: ['rain', 'clear', 'smog'],
  music: STYLES.niihama,
  ambience: [
    { id: 'water', label: 'Canal water', kind: 'water', gain: 0.5 },
    { id: 'train', label: 'Elevated train', kind: 'train', gain: 0.45 },
    { id: 'market', label: 'Market crowd', kind: 'crowd', gain: 0.4 },
    { id: 'neon', label: 'Neon hum', kind: 'hum', gain: 0.3 },
  ],
  create(rng) {
    const far = genSkyline(rng, { baseY: BASE, minW: 8, maxW: 18, minH: 70, maxH: 140, antennaChance: 0.35, stepChance: 0.2 });
    const mid = genSkyline(rng, { baseY: BASE, minW: 14, maxW: 30, minH: 32, maxH: 92, gap: 1, antennaChance: 0.2, stepChance: 0.15 });
    const blinkers = pickBlinkers(rng, mid, DECK - 10, 50);
    const signs: { x: number; y: number; n: number; color: string; seed: number; bad: boolean }[] = [];
    for (const b of [...mid, ROOF_B]) {
      for (let k = 0; k < (b.w > 22 ? 2 : 1); k++) {
        if (rng() > 0.85) continue;
        let n = randInt(rng, 3, 7);
        const room = Math.floor((DECK - 12 - b.top - 3) / 6);
        n = Math.min(n, room);
        if (n < 2) continue;
        signs.push({
          x: b.x + randInt(rng, 1, Math.max(1, b.w - 5)),
          y: randInt(rng, b.top + 3, DECK - 12 - n * 6),
          n,
          color: SIGN_COLS[randInt(rng, 0, SIGN_COLS.length - 1)],
          seed: randInt(rng, 1, 1e6),
          bad: rng() < 0.2,
        });
      }
    }
    const farSigns = far.filter(() => rng() < 0.5).map((b) => ({
      x: b.x + randInt(rng, 1, Math.max(1, b.w - 4)),
      y: b.top + randInt(rng, 4, 30),
      n: randInt(rng, 3, 8),
      color: SIGN_COLS[randInt(rng, 0, SIGN_COLS.length - 1)],
      seed: randInt(rng, 1, 1e6),
    }));
    const boards = mid.filter((b) => b.top < DECK - 22 && rng() < 0.6).map((b) => ({
      x: b.x + randInt(rng, 0, Math.max(0, b.w - 14)),
      y: Math.min(b.top + randInt(rng, 4, 30), DECK - 18),
      n: randInt(rng, 3, 5),
      color: SIGN_COLS[randInt(rng, 0, SIGN_COLS.length - 1)],
      seed: randInt(rng, 1, 1e6),
    })).filter((b) => b.y + 6 < DECK - 11);
    const shacks = Array.from({ length: 12 }, (_, i) => ({
      x: i * 40 + randInt(rng, 0, 10),
      w: randInt(rng, 18, 30),
      h: randInt(rng, 9, 16),
      lit: rng() < 0.7,
    }));

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#07110f'], [0.4, '#0f2622'], [0.8, '#1c4038'], [1, '#2a5a4c']], BASE);
        // low overcast, lit from below
        for (let i = 0; i < 70; i++) glow(ctx, rng() * W, 10 + rng() * 70, 20 + rng() * 40, '#3a7a68', 0.08);
        haze(ctx, 60, 140, '#4aa088', 0.12);

        // harbour cranes far right
        for (const c of CRANES) {
          rect(ctx, c.x, c.top + 10, 2, BASE - c.top - 10, '#16302a');
          rect(ctx, c.x + 18, c.top + 10, 2, BASE - c.top - 10, '#16302a');
          rect(ctx, c.x, c.top + 24, 20, 2, '#16302a');
          rect(ctx, c.x - 40, c.top + 8, 76, 2, '#16302a');
          line(ctx, c.x + 9, c.top - 6, c.x - 38, c.top + 8, '#16302a');
          line(ctx, c.x + 9, c.top - 6, c.x + 34, c.top + 8, '#16302a');
          rect(ctx, c.x + 8, c.top - 6, 2, 16, '#16302a');
        }

        drawBuildings(ctx, far, BASE, '#14302a', '#1e4038', { colors: ['#7affd0', '#d8ffe8'], density: 0.16, cellW: 3, cellH: 4 });
        for (const s of farSigns) {
          glow(ctx, s.x + 1.5, s.y + s.n * 3, s.n * 3, s.color, 0.12);
          ctx.globalAlpha = 0.45;
          glyphs(ctx, s.seed, s.x, s.y, s.n, s.color, true);
          ctx.globalAlpha = 1;
        }
        haze(ctx, 70, 180, '#2a6a58', 0.25);
        drawBuildings(ctx, mid, BASE, '#0a1816', '#183430', { colors: ['#d8ffe8', '#ffd890', '#7affd0', '#ffb0c8'], density: 0.45, cellW: 3, cellH: 3 });

        // the rooftop of the tower the figure stands on
        rect(ctx, ROOF.x, ROOF.top, ROOF.w, BASE - ROOF.top, '#091513');
        rect(ctx, ROOF.x, ROOF.top, ROOF.w, 1, '#2a4a44');
        rect(ctx, ROOF.x + 3, ROOF.top - 6, 8, 6, '#091513');
        rect(ctx, ROOF.x + 5, ROOF.top - 12, 1, 6, '#091513');
        for (let y = ROOF.top + 4; y < DECK; y += 4) {
          for (let x = ROOF.x + 2; x < ROOF.x + ROOF.w - 2; x += 3) {
            const v = hash2(x, y * 3);
            if (v < 0.4) px(ctx, x, y, v < 0.1 ? '#ffd890' : '#7affd0');
          }
        }

        // air-con boxes and pipes
        for (const b of mid) {
          for (let y = b.top + 8; y < DECK; y += 14) {
            if (hash2(b.seed, y) < 0.5) rect(ctx, b.x + (hash2(y, b.seed) < 0.5 ? -2 : b.w - 2), y, 4, 3, '#1e2e2c');
          }
        }

        // canal-side shacks and the quay
        for (const s of shacks) {
          rect(ctx, s.x, BASE - s.h, s.w, s.h, '#0c1a17');
          rect(ctx, s.x - 1, BASE - s.h - 1, s.w + 2, 1, '#26403a');
          if (s.lit) {
            rect(ctx, s.x + 3, BASE - s.h + 3, s.w - 6, s.h - 5, '#5a4a20');
            glow(ctx, s.x + s.w / 2, BASE - s.h / 2, s.w * 0.7, '#ffb347', 0.18);
          }
        }

        // the train viaduct
        rect(ctx, 0, DECK, W, 8, '#122220');
        rect(ctx, 0, DECK, W, 1, '#2e4642');
        rect(ctx, 0, DECK - 1, W, 1, '#3a5450');
        for (let x = 0; x < W; x += 6) px(ctx, x, DECK + 4, '#0a1614');
        for (const x of PIERS) {
          rect(ctx, x, DECK + 8, 8, CANAL - DECK - 8, '#0c1816');
          rect(ctx, x, DECK + 8, 1, CANAL - DECK - 8, '#1e3430');
        }
        for (let i = 0; i < PIERS.length - 1; i++) {
          line(ctx, PIERS[i] + 8, DECK + 8, PIERS[i + 1], DECK + 22, '#10201d');
          line(ctx, PIERS[i] + 8, DECK + 22, PIERS[i + 1], DECK + 8, '#10201d');
        }
        for (let x = 4; x < W; x += 16) rect(ctx, x, DECK - 9, 1, 8, '#1e3430');
        rect(ctx, 0, DECK - 9, W, 1, '#1e3430');

        rect(ctx, 0, BASE, W, CANAL - BASE, '#1a2826');
        rect(ctx, 0, BASE, W, 1, '#34504a');
        rect(ctx, 0, CANAL, W, H - CANAL, '#04110e');
      },

      drawFrame(ctx: Ctx, t: number) {
        // overcast drifting
        for (let i = 0; i < 6; i++) {
          const x = ((hash2(i, 61) + phase(t, 1 + (i % 2))) % 1) * (W + 160) - 80;
          glow(ctx, x, 20 + hash2(i, 62) * 50, 50 + hash2(i, 63) * 30, '#5aa890', 0.08);
        }

        // harbour crane lights
        for (let i = 0; i < CRANES.length; i++) {
          const c = CRANES[i];
          const on = (tick(t, 240) + i) % 2;
          px(ctx, c.x + 9, c.top - 7, on ? '#ff3a3a' : '#3a1010');
          px(ctx, c.x - 40, c.top + 8, on ? '#3a1010' : '#ff3a3a');
          if (on) glow(ctx, c.x + 9, c.top - 7, 5, '#ff3a3a', 0.55);
        }

        // a tiltrotor hanging over the district
        const hx = 230 + wave(t, 2) * 70;
        const hy = 44 + wave(t, 6) * 4;
        beam(ctx, hx, hy + 3, Math.PI / 2 + wave(t, 5, 0.2) * 0.4, 150, 0.06, '#d8fff4', 0.12);
        rect(ctx, hx - 6, hy - 1, 12, 3, '#0e1c1a');
        rect(ctx, hx + 6, hy, 8, 1, '#0e1c1a');
        const spin = tick(t, 4800) % 2;
        rect(ctx, hx - 9 - (spin ? 2 : 0), hy - 3, spin ? 6 : 3, 1, '#2e4a44');
        rect(ctx, hx + 6, hy - 3, spin ? 6 : 3, 1, '#2e4a44');
        px(ctx, hx - 6, hy + 1, tick(t, 480) % 2 ? '#ff3a3a' : '#40ff90');

        blink(ctx, blinkers, t, '#d8ffe8', '#0a1816', 9);

        for (const s of signs) vsign(ctx, s.x, s.y, s.n, s.color, flicker(t, s.seed, s.bad ? 0.25 : 0.02), s.seed);
        for (const b of boards) {
          const on = flicker(t, b.seed, 0.03);
          rect(ctx, b.x - 1, b.y - 1, b.n * 4 + 1, 7, '#050c0b');
          if (on) glow(ctx, b.x + b.n * 2, b.y + 2, b.n * 4, b.color, 0.2);
          ctx.globalAlpha = on ? 1 : 0.25;
          glyphs(ctx, b.seed, b.x, b.y, b.n, b.color, false);
          ctx.globalAlpha = 1;
        }

        ghost(ctx, t);
        train(ctx, t);

        reflect(ctx, CANAL, t, 0.45, H - CANAL, '#03140f');
        ripples(ctx, t, CANAL + 3, H - 4, 34, '#7affd0');

        // people on the quay
        crowd(ctx, t, 17, 12, BASE - 1, ['#06100e', '#0e1c1a', '#14241f']);

        // boats with lanterns
        BOATS.forEach((b, i) => {
          const x = lane(t, b.k, b.off, b.dir, W + 80);
          const y = b.y + Math.round(wave(t, 20 + i * 3, i * 0.3));
          const lx = x + (b.dir > 0 ? -6 : 6);
          ctx.globalAlpha = 0.4;
          for (let j = 0; j < 4; j++) {
            const w = 2 + Math.round(1.5 * (1 + wave(t, 30 + j * 5, j * 0.25 + i)));
            rect(ctx, lx - w / 2, y + 3 + j * 3, w, 1, '#ffb347');
          }
          ctx.globalAlpha = 1;
          rect(ctx, x - 8, y - 2, 16, 2, '#0a1412');
          rect(ctx, x - 6, y, 12, 1, '#0a1412');
          rect(ctx, x - 3, y - 6, 7, 4, '#13201e');
          rect(ctx, x - 3, y - 6, 7, 1, '#2a3e3a');
          rect(ctx, x + (b.dir > 0 ? 4 : -6), y - 8, 2, 6, '#0a1412');
          rect(ctx, lx, y - 10, 1, 8, '#0a1412');
          const flick = 0.6 + 0.4 * flicker(t, i + 70, 0.08);
          glow(ctx, lx, y - 11, 10, '#ff9a30', 0.55 * flick);
          rect(ctx, lx - 1, y - 12, 2, 2, '#ffcf70');
        });
      },
    };
  },
};

/** Thermoptic camouflage: a refracting shape that shimmers in, half solidifies and fades. */
function ghost(ctx: Ctx, t: number): void {
  const p = phase(t, 4);
  const v = p < 0.05 ? 0 : p < 0.12 ? (p - 0.05) / 0.07 : p < 0.42 ? 1 : p < 0.5 ? (0.5 - p) / 0.08 : 0;
  if (v <= 0) return;
  const solid = p > 0.2 && p < 0.32 ? Math.sin(((p - 0.2) / 0.12) * Math.PI) * 0.85 : 0;
  const tk = tick(t, 600);
  // refraction: the background inside the body shifts
  ctx.save();
  ctx.beginPath();
  for (const [c, r] of FIG_CELLS) ctx.rect(FIG_X + c, FIG_Y + r, 1, 1);
  ctx.clip();
  ctx.globalAlpha = v * 0.9;
  const dx = (tk % 3) - 1 || 2;
  ctx.drawImage(ctx.canvas, FIG_X - 4, FIG_Y - 4, 14, 22, FIG_X - 4 + dx, FIG_Y - 4 + 2, 14, 22);
  ctx.globalAlpha = v * 0.12 + solid;
  rect(ctx, FIG_X, FIG_Y, 6, 14, solid > 0.3 ? '#0a1412' : '#bfffe8');
  ctx.restore();
  // shimmering edges
  for (let i = 0; i < FIG_CELLS.length; i++) {
    const [c, r, edge] = FIG_CELLS[i];
    if (!edge) continue;
    const h = hash2(i, tk);
    ctx.globalAlpha = v * (0.12 + 0.5 * h) * (1 - solid * 0.6);
    px(ctx, FIG_X + c + (h > 0.85 ? 1 : 0), FIG_Y + r, '#d8fff4');
  }
  ctx.globalAlpha = 1;
  if (hash2(tk, 5) < 0.15) px(ctx, FIG_X + Math.floor(hash2(tk, 6) * 6), FIG_Y + Math.floor(hash2(tk, 7) * 14), '#ffffff');
}

/** Elevated train: eight crossings per loop, alternating direction. */
function train(ctx: Ctx, t: number): void {
  const p = phase(t, 8);
  if (p > 0.25) return;
  const q = p / 0.25;
  const dir = tick(t, 8) % 2 ? 1 : -1;
  const cars = 5;
  const len = cars * 31;
  const head = dir > 0 ? -20 + q * (W + len + 40) : W + 20 - q * (W + len + 40);
  const y = DECK - 9;
  for (let k = 0; k < cars; k++) {
    const x0 = dir > 0 ? head - (k + 1) * 31 : head + k * 31;
    if (x0 > W + 2 || x0 + 30 < -2) continue;
    rect(ctx, x0, y, 30, 8, '#1a2a28');
    rect(ctx, x0, y, 30, 1, '#3a5450');
    rect(ctx, x0, y + 6, 30, 1, '#0c1614');
    glow(ctx, x0 + 15, y + 3, 22, '#c8ffe0', 0.14);
    for (let w = 0; w < 5; w++) {
      const lit = hash2(k * 7 + w, tick(t, 8)) > 0.2;
      rect(ctx, x0 + 3 + w * 5 + (w > 2 ? 1 : 0), y + 2, 3, 3, lit ? (w % 2 ? '#e8ffd0' : '#ffe0a0') : '#203430');
      if (lit && hash2(w, k + tick(t, 8)) < 0.3) px(ctx, x0 + 4 + w * 5 + (w > 2 ? 1 : 0), y + 3, '#2a3a36');
    }
    // pantograph, with the odd spark
    rect(ctx, x0 + 13, y - 3, 1, 3, '#2a3a36');
    rect(ctx, x0 + 11, y - 3, 5, 1, '#2a3a36');
    if (hash2(k, tick(t, 960)) < 0.06) {
      px(ctx, x0 + 13, y - 4, '#e0f8ff');
      glow(ctx, x0 + 13, y - 4, 10, '#9ad8ff', 0.7);
    }
  }
  px(ctx, head, y + 4, '#fff6d8');
  beam(ctx, head, y + 4, dir > 0 ? 0 : Math.PI, 50, 0.08, '#fff6d8', 0.2);
  const tail = dir > 0 ? head - len : head + len;
  px(ctx, tail, y + 4, '#ff3030');
  glow(ctx, tail, y + 4, 5, '#ff3030', 0.5);
}
