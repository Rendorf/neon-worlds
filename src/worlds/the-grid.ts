import { W, H, type Ctx, phase, wave, tick, hash2, rgba, mix } from '../scene/core';
import { sky, rect, px, glow, haze, vgrad, beam, genRidge, twinkle, randInt, randRange } from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const HOR = 120; // horizon line
const VPX = 240; // vanishing point x
const F = H - HOR; // floor depth scale: screen y = HOR + F / z
const CYAN = '#2ee8ff';
const ORANGE = '#ff8a1e';
const RED = '#ff3b1f';

interface Tower {
  x: number;
  base: number;
  w: number;
  side: number;
  h: number;
  color: string;
  k: number;
}

interface Cycle {
  color: string;
  k: number;
  dir: number;
  y0: number;
  y1: number;
  near: boolean;
}

export const theGrid: WorldDef = {
  id: 'the-grid',
  name: 'The Grid',
  source: 'Tron and Tron: Legacy',
  creator: 'Steven Lisberger; Disney',
  tagline: 'Light cycles on the endless floor, the portal far off',
  era: 'Cycle 2010',
  hourOffset: 2,
  accent: '#00e5ff',
  accent2: '#ff8a1e',
  weathers: ['clear', 'data-rain'],
  music: STYLES.grid,
  ambience: [
    { id: 'drone', label: 'Grid hum', kind: 'griddrone', gain: 0.5 },
    { id: 'cycles', label: 'Light cycles', kind: 'sweep', gain: 0.6 },
    { id: 'pulse', label: 'Data pulse', kind: 'pulse', gain: 0.4 },
  ],
  create(rng) {
    const ridgeFar = genRidge(rng, 38, 0.5, 3);
    const ridgeNear = genRidge(rng, 20, 0.7, 2);

    // Wireframe data towers standing on the floor, all far behind the cycle lanes.
    const towers: Tower[] = [];
    for (let i = 0; i < 60 && towers.length < 15; i++) {
      const z = randRange(rng, 4.4, 11);
      const X = randRange(rng, -1.5, 1.5) * z;
      const sx = VPX + (X * F) / z;
      if (Math.abs(sx - VPX) < 34) continue;
      const base = HOR + F / z;
      const hw = randRange(rng, 1.6, 3.4);
      const h = Math.min((hw * F) / z, base - 40);
      const w = Math.max(3, Math.round((randRange(rng, 0.16, 0.3) * F) / z));
      if (towers.some((o) => Math.abs(o.x - sx) < (o.w + w) * 0.7 && Math.abs(o.base - base) < 6)) continue;
      towers.push({
        x: Math.round(sx - w / 2),
        base: Math.round(base),
        w,
        side: Math.max(1, Math.round(w * 0.35)) * (sx < VPX ? 1 : -1),
        h: Math.round(h),
        color: towers.length === 4 || towers.length === 11 ? ORANGE : towers.length % 3 === 1 ? '#d8fbff' : CYAN,
        k: randInt(rng, 6, 14),
      });
    }
    towers.sort((a, b) => a.base - b.base);

    const cycles: Cycle[] = [
      { color: ORANGE, k: 20, dir: -1, y0: 158, y1: 166, near: false },
      { color: CYAN, k: 24, dir: 1, y0: 188, y1: 176, near: true },
    ];

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#000000'], [0.65, '#010309'], [1, '#04141f']], HOR);
        // faint data-cloud bands in the void
        haze(ctx, 30, 60, '#0a2a3a', 0.25);
        haze(ctx, 70, 100, '#06202c', 0.3);

        // distant mountains: black bodies, thin dark-cyan outlines
        drawOutlineRidge(ctx, ridgeFar, HOR - 6, '#0b4452');
        drawOutlineRidge(ctx, ridgeNear, HOR - 1, '#126f80');

        // the floor
        rect(ctx, 0, HOR + 1, W, H - HOR - 1, '#000307');
        vgrad(ctx, 0, HOR + 1, W, 60, [[0, rgba('#00c8ff', 0.14)], [1, rgba('#00c8ff', 0)]]);
        // radial lines toward the vanishing point
        ctx.fillStyle = '#0fb8d0';
        for (let y = HOR + 1; y < H; y++) {
          const dy = y - HOR;
          ctx.globalAlpha = 0.03 + Math.pow(Math.min(1, (dy / F) * 1.5), 1.6) * 0.55;
          for (let i = -60; i <= 60; i++) {
            const x0 = VPX + (i * 30 * dy) / F;
            const x1 = VPX + (i * 30 * (dy + 1)) / F;
            const lo = Math.min(x0, x1);
            if (lo > W || Math.max(x0, x1) < 0) continue;
            ctx.fillRect(Math.round(lo), y, Math.max(1, Math.round(Math.abs(x1 - x0))), 1);
          }
        }
        // depth lines
        for (let z = 0.95; z < 60; z += 0.2) {
          const y = HOR + F / z;
          const next = HOR + F / (z + 0.2);
          if (y - next < 1.2) break;
          ctx.globalAlpha = 0.1 + Math.min(1, ((y - HOR) / F) * 1.5) * 0.45;
          rect(ctx, 0, Math.round(y), W, 1, '#0fb8d0');
        }
        ctx.globalAlpha = 1;

        // glowing horizon
        haze(ctx, HOR - 10, HOR + 10, '#00e5ff', 0.45);
        rect(ctx, 0, HOR, W, 1, '#bff8ff');
        glow(ctx, VPX, HOR, 90, '#5ff0ff', 0.25);

        // the portal, far beyond the floor
        rect(ctx, VPX, 46, 1, HOR - 46, rgba('#e8ffff', 0.12));
        glow(ctx, VPX, 46, 26, '#e8ffff', 0.35);

        for (const tw of towers) drawTower(ctx, tw);
      },
      drawFrame(ctx: Ctx, t: number) {
        twinkle(ctx, t, 41, 30, HOR - 30, '#2a6a7a');

        // portal pulse
        const pp = 0.5 + 0.5 * wave(t, 8);
        glow(ctx, VPX, 46, 10 + pp * 6, '#ffffff', 0.5 + pp * 0.3);
        px(ctx, VPX, 46, '#ffffff');

        // data running up the tower edges, rings sliding down the shafts
        for (let i = 0; i < towers.length; i++) {
          const tw = towers[i];
          const y = tw.base - phase(t, tw.k) * tw.h;
          const x = i % 2 ? tw.x : tw.x + tw.w - 1;
          px(ctx, x, y, '#ffffff');
          glow(ctx, x, y, 4, tw.color, 0.6);
          const ry = tw.base - tw.h + phase(t, tw.k + 3) * tw.h;
          ctx.globalAlpha = 0.5;
          rect(ctx, tw.x + 1, ry, tw.w - 2, 1, tw.color);
          ctx.globalAlpha = 1;
        }

        // scan pulse travelling toward the viewer
        for (let s = 0; s < 2; s++) {
          const p = (phase(t, 30) + s * 0.5) % 1;
          const z = 14 * (1 - p) + 0.9 * p;
          const y = HOR + F / z;
          if (y >= H) continue;
          const a = Math.min(1, p * 5) * 0.75;
          const th = Math.max(1, Math.round(2.5 / z));
          haze(ctx, y - 14 / z - 2, y + 14 / z + 2, '#00e5ff', a * 0.35);
          ctx.globalAlpha = a;
          rect(ctx, 0, y, W, th, '#9ff8ff');
          ctx.globalAlpha = 1;
        }

        // tiny far-away cycles near the horizon
        const farCols = [CYAN, ORANGE, '#ffe14a'];
        for (let i = 0; i < 3; i++) {
          const dir = i % 2 ? -1 : 1;
          const k = 6 + i * 3;
          const p = (phase(t, k) + hash2(i, 5)) % 1;
          const x = dir > 0 ? -40 + p * (W + 80) : W + 40 - p * (W + 80);
          const y = 126 + i * 5;
          hstreak(ctx, x, y, -dir * 26, farCols[i]);
          px(ctx, x, y, '#ffffff');
        }

        // the Recognizer crossing slowly
        const rx = W + 70 - phase(t, 2) * (W + 140);
        const ry = 58 + wave(t, 6) * 4;
        recognizer(ctx, rx, ry, t);

        // the two light cycles and their walls
        for (const c of cycles) drawCycle(ctx, c, t);
      },
    };
  },
};

function drawOutlineRidge(ctx: Ctx, heights: number[], baseY: number, color: string): void {
  let prev = Math.round(baseY - heights[0]);
  for (let x = 0; x < W; x++) {
    const top = Math.round(baseY - heights[x]);
    rect(ctx, x, top, 1, HOR - top, '#000000');
    const lo = Math.min(top, prev);
    const hi = Math.max(top, prev);
    rect(ctx, x, lo, 1, hi - lo + 1, color);
    // faint contour inside the mountain
    if (x % 3 === 0 && top + 5 < HOR) px(ctx, x, top + 5, rgba(color, 0.35));
    prev = top;
  }
}

function drawTower(ctx: Ctx, tw: Tower): void {
  const top = tw.base - tw.h;
  const sideX = tw.side > 0 ? tw.x + tw.w : tw.x + tw.side;
  const sw = Math.abs(tw.side);
  // body
  rect(ctx, tw.x, top, tw.w, tw.h, '#00060a');
  rect(ctx, sideX, top + 1, sw, tw.h - 1, '#000306');
  // floors
  ctx.globalAlpha = 0.28;
  for (let y = top + 4; y < tw.base - 1; y += 4) {
    rect(ctx, tw.x + 1, y, tw.w - 2, 1, tw.color);
    rect(ctx, sideX, y + 1, sw, 1, mix(tw.color, '#000000', 0.5));
  }
  ctx.globalAlpha = 1;
  // glowing edges
  glow(ctx, tw.x + tw.w / 2, top, tw.w + 4, tw.color, 0.2);
  rect(ctx, tw.x, top, 1, tw.h, tw.color);
  rect(ctx, tw.x + tw.w - 1, top, 1, tw.h, tw.color);
  rect(ctx, tw.x, top, tw.w, 1, mix(tw.color, '#ffffff', 0.5));
  ctx.globalAlpha = 0.55;
  rect(ctx, tw.side > 0 ? sideX + sw - 1 : sideX, top + 1, 1, tw.h - 1, tw.color);
  rect(ctx, sideX, top + 1, sw, 1, tw.color);
  ctx.globalAlpha = 1;
  // reflection on the glossy floor
  ctx.globalAlpha = 0.18;
  rect(ctx, tw.x, tw.base, 1, Math.round(tw.h * 0.25), tw.color);
  rect(ctx, tw.x + tw.w - 1, tw.base, 1, Math.round(tw.h * 0.25), tw.color);
  ctx.globalAlpha = 1;
}

/** Horizontal streak ending at x with a fading tail of length len (negative = tail to the left). */
function hstreak(ctx: Ctx, x: number, y: number, len: number, color: string): void {
  const x0 = len < 0 ? x + len : x;
  const g = ctx.createLinearGradient(x + len, 0, x, 0);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(1, rgba(color, 0.9));
  ctx.fillStyle = g;
  ctx.fillRect(Math.round(x0), Math.round(y), Math.abs(len), 1);
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, edge: string): void {
  rect(ctx, x, y, w, h, '#060000');
  rect(ctx, x, y, w, 1, edge);
  rect(ctx, x, y + h - 1, w, 1, edge);
  rect(ctx, x, y, 1, h, edge);
  rect(ctx, x + w - 1, y, 1, h, edge);
}

function recognizer(ctx: Ctx, cx: number, cy: number, t: number): void {
  if (cx < -100 || cx > W + 100) return;
  const S = 1.4;
  const b = (x: number, y: number, w: number, h: number) => box(ctx, cx + x * S, cy + y * S, w * S, h * S, RED);
  const sweep = Math.PI / 2 + wave(t, 12) * 0.3;
  beam(ctx, cx, cy + 12 * S, sweep, 120, 0.15, RED, 0.18);
  glow(ctx, cx, cy + 10 * S, 64, RED, 0.12);
  const dim = mix(RED, '#000000', 0.45);
  for (const s of [-1, 1]) {
    // legs, stepping outward toward the feet
    b(s * 37 - 5, 6, 10, 18);
    b(s * 39 - 5, 23, 10, 15);
    b(s * 41 - 6, 37, 12, 3);
    // shoulders
    b(s * 36 - 8, -2, 16, 10);
    rect(ctx, cx + s * 37 * S, cy + 9 * S, 1, 13 * S, dim);
    rect(ctx, cx + s * 39 * S, cy + 26 * S, 1, 10 * S, dim);
  }
  // the beam across the top
  b(-30, 1, 60, 6);
  rect(ctx, cx - 28 * S, cy + 3.5 * S, 56 * S, 1, dim);
  // head with a visor slot
  b(-10, -6, 20, 17);
  rect(ctx, cx - 7 * S, cy + 3 * S, 14 * S, 2, '#ffb08a');
  glow(ctx, cx, cy + 4 * S, 12, '#ff6a3a', 0.5);
  // nav lights
  if (tick(t, 160) % 2) {
    px(ctx, cx - 43 * S, cy + 39 * S, '#ffd0b0');
    px(ctx, cx + 43 * S, cy + 39 * S, '#ffd0b0');
  }
}

// Light cycle sprites, facing right. c = colour, w = white-hot, k = dark hull.
const NEAR_SPRITE = [
  '.....kkkk.....',
  '...ckkkkkkcc..',
  '.cckkkkkkkkkcc',
  'cwkkcccccckkwc',
  'ckkkc....ckkkc',
  '.ccc......ccc.',
];
const FAR_SPRITE = [
  '...kkc...',
  '.ckkkkkkc',
  'cwkcccckw',
  '.cc...cc.',
];

function sprite(ctx: Ctx, rows: string[], x: number, y: number, dir: number, color: string, sc: number): void {
  const w = rows[0].length;
  const hgt = rows.length;
  for (let r = 0; r < hgt; r++) {
    for (let c = 0; c < w; c++) {
      const ch = rows[r][dir > 0 ? c : w - 1 - c];
      if (ch === '.') continue;
      rect(ctx, x + (c - Math.floor(w / 2)) * sc, y + (r - hgt) * sc, sc, sc, ch === 'c' ? color : ch === 'w' ? '#ffffff' : '#05080c');
    }
  }
}

/** Where a cycle is, `back` px of path behind its head. Each crossing makes one 90-degree turn at a hashed x. */
function cyclePos(c: Cycle, t: number, back: number): { x: number; y: number; ok: boolean } {
  const n = tick(t, c.k);
  const p = phase(t, c.k);
  const start = c.dir > 0 ? -60 : W + 60;
  const end = c.dir > 0 ? W + 200 : -200;
  const turnX = c.dir > 0 ? 110 + hash2(n, c.k) * 250 : W - 110 - hash2(n, c.k) * 250;
  const a = Math.abs(turnX - start);
  const b = Math.abs(c.y1 - c.y0) * 3; // depth moves look slower on screen
  const L = a + b + Math.abs(end - turnX);
  const d = p * L - back;
  if (d < 0) return { x: 0, y: 0, ok: false };
  if (d < a) return { x: start + c.dir * d, y: c.y0, ok: true };
  if (d < a + b) return { x: turnX, y: c.y0 + Math.sign(c.y1 - c.y0) * ((d - a) / 3), ok: true };
  return { x: turnX + c.dir * (d - a - b), y: c.y1, ok: true };
}

function drawCycle(ctx: Ctx, c: Cycle, t: number): void {
  const head = cyclePos(c, t, 0);
  const wallH = c.near ? 9 : 4;
  const N = c.near ? 100 : 70;
  const bright = mix(c.color, '#ffffff', 0.6);
  // the light wall, fading toward its tail
  for (let j = 1; j < N; j++) {
    const s = cyclePos(c, t, j * 2);
    if (!s.ok) break;
    if (s.x < -2 || s.x > W + 2) continue;
    const a = Math.pow(1 - j / N, 1.3);
    ctx.globalAlpha = a * 0.8;
    rect(ctx, s.x, s.y - wallH, 2, wallH, c.color);
    if (c.near) rect(ctx, s.x, s.y - wallH + 3, 2, 1, bright);
    ctx.globalAlpha = a;
    rect(ctx, s.x, s.y - wallH, 2, 1, bright);
    ctx.globalAlpha = a * 0.22;
    rect(ctx, s.x, s.y, 2, wallH - 1, c.color);
  }
  ctx.globalAlpha = 1;
  if (head.x < -20 || head.x > W + 20) return;
  glow(ctx, head.x, head.y - (c.near ? 6 : 3), c.near ? 26 : 12, c.color, 0.45);
  sprite(ctx, c.near ? NEAR_SPRITE : FAR_SPRITE, head.x, head.y, c.dir, c.color, c.near ? 2 : 1);
}
