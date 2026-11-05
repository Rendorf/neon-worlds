import { W, H, type Ctx, type Rng, phase, wave, tick, hash2, rgba, randInt } from '../scene/core';
import { sky, stars, rect, px, glow, beam, haze, vgrad, genRidge, twinkle, lane } from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const HORIZON = 162;
const CITY = 188; // front row of buildings stands here
const WALL_END = 345; // the Shield Wall ends here; open desert to the east

const MOON = { x: 396, y: 58, r: 17 };
const MOON2 = { x: 338, y: 34, r: 6 };

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
const smooth = (u: number): number => {
  const v = clamp01(u);
  return v * v * (3 - 2 * v);
};

interface Dune {
  base: number;
  a1: number;
  f1: number;
  p1: number;
  a2: number;
  f2: number;
  p2: number;
  lit: string;
  mid: string;
  dark: string;
  crest: string;
}

const duneTop = (d: Dune, x: number): number => d.base + d.a1 * Math.sin(x * d.f1 + d.p1) + d.a2 * Math.sin(x * d.f2 + d.p2);

/** Is (u, v) inside the kangaroo-mouse shadow? Coordinates relative to the moon centre. */
function mouseAt(u: number, v: number, tail: [number, number][]): boolean {
  const ell = (cx: number, cy: number, rx: number, ry: number) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
  if (ell(1, 3, 5.5, 4)) return true; // body
  if (ell(-5, -0.5, 3, 2.8)) return true; // head
  if (ell(-8, 0.5, 1.6, 1.2)) return true; // snout
  if (ell(-4.2, -5.2, 1.3, 2.8)) return true; // ear
  if (ell(3.5, 7.4, 4.2, 1.2)) return true; // hind foot
  if (ell(-2.5, 6.5, 0.8, 1.6)) return true; // fore paw
  if (ell(12.6, -8.6, 1.6, 1.6)) return true; // tail tuft
  for (const [x, y] of tail) if ((u - x) ** 2 + (v - y) ** 2 <= 0.5) return true;
  return false;
}

/** A dragonfly-winged ornithopter. dir 1 = moving right, s = pixel scale. */
function thopter(ctx: Ctx, x: number, y: number, dir: number, s: number, t: number, seed: number, lamp: boolean): void {
  const R = (lx: number, ly: number, w: number, h: number, c: string) =>
    rect(ctx, dir > 0 ? x + lx * s : x - (lx + w) * s, y + ly * s, w * s, h * s, c);
  const body = '#2c2634';
  R(-11, 1, 7, 1, body); // tail boom
  R(-12, -1, 2, 3, body); // tail fin
  R(-4, 0, 9, 3, body);
  R(-3, -1, 6, 1, '#3c3446');
  R(3, 0, 3, 2, '#8ea6c8'); // canopy
  R(5, 1, 1, 1, '#ffd890');
  R(-3, 4, 8, 1, body); // skids
  R(-2, 3, 1, 1, body);
  R(3, 3, 1, 1, body);
  // wings: four blades, flapping through four frames, with a faint motion ghost
  const angles = [-0.65, 0, 0.5, 0];
  const f = (tick(t, 4800) + seed) % 4;
  for (const [fi, alpha] of [[(f + 2) % 4, 0.18], [f, 0.8]] as [number, number][]) {
    const a = angles[fi];
    ctx.globalAlpha = alpha;
    for (const [root, sgn] of [[1, 1], [-2, -1]] as [number, number][]) {
      for (let k = 1; k <= 8; k++) R(Math.round(root + sgn * k * Math.cos(a)), Math.round(k * Math.sin(a) * 0.8), 1, 1, '#b4acc6');
    }
  }
  ctx.globalAlpha = 1;
  const nav = tick(t, 240) % 2 === seed % 2;
  if (nav) {
    R(-12, -1, 1, 1, '#ff4a3a');
    glow(ctx, dir > 0 ? x - 12 * s : x + 12 * s, y - s, 4 * s, '#ff4a3a', 0.5);
  }
  if (lamp) beam(ctx, x + dir * 3 * s, y + 4 * s, Math.PI / 2 - dir * 0.35, 90, 0.1, '#fff0c8', 0.09);
}

interface Block {
  x: number;
  w: number;
  top: number;
  base: number;
  trap: number;
  dome: number;
  wins: [number, number][];
}

function genBlocks(rng: Rng, base: number, minH: number, maxH: number, skip?: [number, number]): Block[] {
  const out: Block[] = [];
  let x = -4 + Math.floor(rng() * 6);
  while (x < WALL_END - 20) {
    const w = randInt(rng, 16, 38);
    const h = randInt(rng, minH, maxH);
    if (!skip || x + w < skip[0] || x > skip[1]) {
      const top = base - h;
      const wins: [number, number][] = [];
      const n = randInt(rng, 0, 3);
      for (let i = 0; i < n; i++) wins.push([x + 2 + Math.floor(rng() * (w - 4)), top + 3 + Math.floor(rng() * Math.max(1, h - 6))]);
      out.push({ x, w, top, base, trap: rng() < 0.3 ? randInt(rng, 7, 14) : 0, dome: rng() < 0.2 ? randInt(rng, 3, 6) : 0, wins });
    }
    x += w + (rng() < 0.3 ? randInt(rng, 1, 3) : 0);
  }
  return out;
}

function drawBlocks(ctx: Ctx, bs: Block[], body: string, side: string, rim: string): void {
  for (const b of bs) {
    const h = b.base - b.top;
    rect(ctx, b.x, b.top, b.w, h, body);
    rect(ctx, b.x - 1, b.base - 3, b.w + 2, 3, body); // battered footing
    rect(ctx, b.x + b.w - 3, b.top, 3, h, side);
    rect(ctx, b.x + 1, b.top - 1, b.w - 2, 1, body); // parapet
    rect(ctx, b.x + 1, b.top - 1, b.w - 2, 1, rgba(rim, 0.5));
    if (b.trap) {
      const tx = b.x + Math.floor(b.w / 3);
      rect(ctx, tx, b.top - b.trap, 4, b.trap, body);
      rect(ctx, tx - 1, b.top - b.trap - 1, 6, 2, body);
      rect(ctx, tx + 3, b.top - b.trap, 1, b.trap, side);
      px(ctx, tx + 1, b.top - b.trap + 2, '#120c18');
    }
    if (b.dome) {
      const dx = b.x + Math.floor((b.w * 2) / 3);
      for (let dy = 0; dy < b.dome; dy++) {
        const half = Math.round(Math.sqrt(b.dome * b.dome - dy * dy));
        rect(ctx, dx - half, b.top - 1 - dy, half * 2 + 1, 1, body);
      }
      px(ctx, dx + 1, b.top - b.dome, rim);
    }
    for (const [wx, wy] of b.wins) {
      rect(ctx, wx, wy, 1, 2, '#ffb060');
      glow(ctx, wx, wy + 1, 4, '#ffb060', 0.25);
    }
  }
}

export const arrakeen: WorldDef = {
  id: 'arrakeen',
  name: 'Arrakeen',
  source: 'Dune',
  creator: 'Frank Herbert',
  tagline: 'Two moons over the spice, and something beneath',
  era: '10191 AG',
  hourOffset: 3,
  accent: '#ff9a3c',
  accent2: '#5a7cff',
  weathers: ['clear', 'sandstorm'],
  music: STYLES.arrakeen,
  ambience: [
    { id: 'wind', label: 'Desert wind', kind: 'wind', gain: 0.5 },
    { id: 'sand', label: 'Hissing sand', kind: 'sand', gain: 0.35 },
    { id: 'thopters', label: 'Ornithopters', kind: 'wings', gain: 0.45 },
    { id: 'worm', label: 'Shai-Hulud', kind: 'rumble', gain: 0.4 },
  ],
  create(rng) {
    const wall = genRidge(rng, 30, 1.2, 1);
    const farDunes = genRidge(rng, 5, 0.25, 5);
    const back = genBlocks(rng, CITY - 5, 12, 26);
    const front = genBlocks(rng, CITY, 6, 14, [204, 262]);
    const dunes: Dune[] = [
      { base: 197, a1: 5, f1: 0.021, p1: rng() * 6, a2: 2.5, f2: 0.057, p2: rng() * 6, lit: '#a8684c', mid: '#5e3838', dark: '#2e2238', crest: '#d09068' },
      { base: 216, a1: 8, f1: 0.016, p1: rng() * 6, a2: 3.5, f2: 0.043, p2: rng() * 6, lit: '#8a5442', mid: '#4a2c34', dark: '#241a30', crest: '#b47a58' },
      { base: 242, a1: 10, f1: 0.012, p1: rng() * 6, a2: 4, f2: 0.035, p2: rng() * 6, lit: '#6a4036', mid: '#36202e', dark: '#1a1226', crest: '#8e5a44' },
    ];
    const crests = Array.from({ length: 16 }, (_, i) => {
      const d = dunes[i % 2];
      const x = Math.floor(rng() * W);
      return { x, y: duneTop(d, x), h: rng(), k: 20 + (i % 9) };
    });
    const allWins = [...back, ...front].flatMap((b) => b.wins);
    const blinkers = allWins.filter(() => rng() < 0.5).slice(0, 14);
    const tail: [number, number][] = [];
    for (let s = 0; s <= 1; s += 0.04) tail.push([6 + 6 * s, 4.5 - 12 * s + 2 * s * s]);
    const craters = Array.from({ length: 7 }, () => ({ x: (rng() - 0.5) * 26, y: (rng() - 0.5) * 26, r: 1 + rng() * 2.2 }));

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#07061c'], [0.4, '#14113a'], [0.7, '#2e1f4a'], [0.88, '#6a3448'], [1, '#c0643a']], HORIZON);
        stars(ctx, rng, 160, 140, ['#ffffff', '#ffe8c8', '#c8d0ff']);
        // moons
        glow(ctx, MOON.x, MOON.y, 70, '#ffe2b0', 0.16);
        glow(ctx, MOON2.x, MOON2.y, 22, '#d8e0ff', 0.14);
        for (let v = -MOON.r; v <= MOON.r; v++) {
          for (let u = -MOON.r; u <= MOON.r; u++) {
            const d = Math.sqrt(u * u + v * v);
            if (d > MOON.r) continue;
            let c = d > MOON.r - 1.5 ? '#cfbe9c' : u + v > 14 ? '#ddcca8' : '#eadcbc';
            for (const k of craters) if ((u - k.x) ** 2 + (v - k.y) ** 2 <= k.r * k.r) c = '#d6c6a4';
            if (mouseAt(u, v - 1, tail)) c = '#bba886';
            px(ctx, MOON.x + u, MOON.y + v, c);
          }
        }
        for (let v = -MOON2.r; v <= MOON2.r; v++) {
          for (let u = -MOON2.r; u <= MOON2.r; u++) {
            const d = Math.sqrt(u * u + v * v);
            if (d > MOON2.r) continue;
            px(ctx, MOON2.x + u, MOON2.y + v, u - v > 5 ? '#a8aec4' : d > MOON2.r - 1 ? '#bcc2d6' : '#d6dcea');
          }
        }

        // distant desert and the open erg to the east
        vgrad(ctx, 0, HORIZON, W, CITY - HORIZON + 4, [[0, '#7a4038'], [0.5, '#4e2c34'], [1, '#3a2230']]);
        for (let x = 0; x < W; x++) {
          const top = Math.round(HORIZON + 4 - farDunes[x]);
          rect(ctx, x, top, 1, 2, x % 7 < 4 ? '#94584a' : '#7a4840');
          rect(ctx, x, top + 2, 1, 4, '#5e3638');
        }
        haze(ctx, 128, 196, '#e07a3a', 0.26);

        // the Shield Wall
        for (let x = 0; x < WALL_END; x++) {
          const taper = clamp01((WALL_END - x) / 60);
          const h = (8 + wall[x]) * Math.sqrt(taper);
          const top = Math.round(HORIZON + 6 - h);
          rect(ctx, x, top, 1, CITY - top, '#1c1326');
          const next = (8 + wall[x + 1]) * Math.sqrt(clamp01((WALL_END - x - 1) / 60));
          if (h > next + 0.25) rect(ctx, x, top, 1, 3, '#3e2a42');
          else if (x % 5 === 0) px(ctx, x, top, '#2e2034');
        }
        haze(ctx, HORIZON - 4, CITY, '#c0603a', 0.14);

        // Arrakeen: massive low blocks, the Residency in their midst
        drawBlocks(ctx, back, '#251a2e', '#33253c', '#5a4258');
        const res = '#21172a';
        const rside = '#3a2a40';
        const tiers: [number, number, number, number][] = [[192, 154, 80, 34], [204, 140, 56, 14], [218, 126, 28, 14], [229, 108, 6, 18]];
        for (const [x, y, w, h] of tiers) {
          rect(ctx, x, y, w, h, res);
          rect(ctx, x - 1, y + h - 2, w + 2, 2, res);
          rect(ctx, x + w - 4, y, 4, h, rside);
          rect(ctx, x, y, w, 1, '#56405a');
        }
        rect(ctx, 231, 100, 1, 8, res);
        for (let x = 196; x < 268; x += 6) {
          const lit = hash2(x, 3) < 0.35;
          rect(ctx, x, 162, 2, 1, lit ? '#ffb868' : '#140e1a');
          if (hash2(x, 4) < 0.25) rect(ctx, x + 2, 172, 2, 1, '#ffa050');
        }
        for (let x = 208; x < 256; x += 5) rect(ctx, x, 146, 2, 1, hash2(x, 5) < 0.4 ? '#ffc070' : '#140e1a');
        rect(ctx, 222, 131, 20, 2, '#ffb060');
        glow(ctx, 232, 132, 18, '#ffb060', 0.2);
        rect(ctx, 226, 180, 12, 8, '#140e1a');
        glow(ctx, 232, 184, 10, '#ff9a4a', 0.25);
        drawBlocks(ctx, front, '#1e1526', '#2e2236', '#4e3a52');
        // the city steps down into the open desert
        for (const [x, w, h] of [[WALL_END - 6, 14, 9], [WALL_END + 8, 11, 6], [WALL_END + 20, 8, 4]] as [number, number, number][]) {
          rect(ctx, x, CITY - h, w, h, '#1e1526');
          rect(ctx, x + w - 2, CITY - h, 2, h, '#2e2236');
          rect(ctx, x, CITY - h - 1, w, 1, rgba('#4e3a52', 0.6));
        }
        px(ctx, WALL_END + 12, CITY - 4, '#ffb060');
        glow(ctx, WALL_END + 12, CITY - 4, 4, '#ffb060', 0.3);
        vgrad(ctx, 0, CITY, W, 16, [[0, '#2e1e2c'], [0.4, '#4a2c34'], [1, '#5a3436']]);
        rect(ctx, 0, CITY, W, 1, '#1e1424');

        // foreground dunes: moonlit faces, indigo shadows, ripple lines
        for (const d of dunes) {
          for (let x = 0; x < W; x++) {
            const top = Math.round(duneTop(d, x));
            const slope = duneTop(d, x + 1) - duneTop(d, x);
            const sh = Math.max(-1, Math.min(1, slope * 5));
            rect(ctx, x, top, 1, H - top, d.mid);
            if (sh > 0.05) vgrad(ctx, x, top, 1, 18, [[0, rgba(d.lit, sh)], [1, rgba(d.lit, 0)]]);
            else if (sh < -0.05) vgrad(ctx, x, top, 1, 14, [[0, rgba(d.dark, -sh)], [1, rgba(d.dark, 0)]]);
            px(ctx, x, top, d.crest);
            if (sh > 0.3) px(ctx, x, top + 1, rgba(d.crest, 0.5));
            for (let k = 1; k <= 7; k++) {
              const ry = top + k * 3 + Math.round(Math.sin(x * 0.22 + k * 1.7) * 0.8);
              if (hash2(x >> 2, k * 13 + d.base) < 0.55) {
                ctx.globalAlpha = 0.3;
                px(ctx, x, ry, sh > 0 ? d.crest : '#1a1020');
                ctx.globalAlpha = 1;
              }
            }
          }
        }
      },

      drawFrame(ctx: Ctx, t: number) {
        twinkle(ctx, t, 17, 22, 120, '#fff4e0');

        // slow dust banks drifting across the city
        for (let i = 0; i < 3; i++) {
          const x = ((phase(t, 1) + i / 3) % 1) * (W + 200) - 100;
          glow(ctx, x, 182 + i * 4, 70, '#c8743a', 0.07);
        }

        // Shai-Hulud: a travelling bulge in the open erg, three times a loop
        const wp = phase(t, 3);
        if (wp < 0.45) {
          const s = wp / 0.45;
          const env = smooth(s / 0.12) * smooth((1 - s) / 0.15);
          const wx = 492 - s * 150;
          const wy = 171 + s * 3;
          glow(ctx, wx, wy - 8, 34, '#d89a60', 0.28 * env);
          for (let j = 1; j <= 32; j++) {
            const tx = wx + 17 + j * 2;
            if (tx > W) break;
            ctx.globalAlpha = (1 - j / 33) * 0.55 * env;
            rect(ctx, tx, wy - 1 + Math.round(Math.sin(j * 0.8 + wx * 0.1) * 0.6), 2, 1, '#b07a58');
          }
          ctx.globalAlpha = 1;
          for (let dx = -18; dx <= 18; dx++) {
            const c = Math.cos(((dx / 18) * Math.PI) / 2);
            const h = env * 8 * Math.pow(c, 0.8) * (dx < 0 ? 1 : 0.85 + 0.15 * c);
            if (h < 0.5) continue;
            rect(ctx, wx + dx, wy - h, 1, h + 1, dx < 0 ? '#7a4a3e' : '#8e5a46');
            px(ctx, wx + dx, wy - h, '#c08660');
          }
          for (let i = 0; i < 40; i++) {
            const q = (phase(t, 60 + (i % 7)) + hash2(i, 1)) % 1;
            const hx = hash2(i, 2);
            ctx.globalAlpha = env * (1 - q) * 0.7;
            rect(ctx, wx - 10 + hx * 22 + q * 14, wy - 4 - Math.sin(q * Math.PI) * (8 + hx * 16), 1 + (i % 3 === 0 ? 1 : 0), 1, hash2(i, 3) < 0.5 ? '#e0b080' : '#c08060');
          }
          ctx.globalAlpha = 1;
        }

        // city life: a few windows going on and off, the Residency beacon
        for (let i = 0; i < blinkers.length; i++) {
          const [x, y] = blinkers[i];
          if (hash2(i + 5, tick(t, 40 + (i % 4) * 20)) < 0.35) rect(ctx, x, y, 1, 2, '#1a1220');
        }
        if (tick(t, 240) % 2 === 0) {
          px(ctx, 231, 99, '#ff4a3a');
          glow(ctx, 231, 99, 6, '#ff4a3a', 0.6);
        }
        const chase = tick(t, 480) % 4;
        for (let i = 0; i < 4; i++) {
          const x = 206 + i * 16;
          px(ctx, x, 139, i === chase ? '#fff0b0' : '#6a4a30');
          if (i === chase) glow(ctx, x, 139, 4, '#ffe0a0', 0.5);
        }

        // ornithopters
        thopter(ctx, lane(t, 1, 0.3, 1, W + 60), 70 + wave(t, 8) * 2, 1, 1, t, 1, false);
        const hx = 232 + wave(t, 4) * 46;
        thopter(ctx, hx, 98 + wave(t, 10, 0.2) * 5, wave(t, 4, 0.25) >= 0 ? 1 : -1, 1, t, 2, false);
        thopter(ctx, lane(t, 3, 0.6, 1), 120 + wave(t, 12, 0.3) * 3, 1, 1, t, 3, false);
        thopter(ctx, lane(t, 2, 0.15, -1, W + 80), 88 + wave(t, 10) * 4, -1, 2, t, 0, true);

        // sand blown off the crests
        for (let i = 0; i < crests.length; i++) {
          const c = crests[i];
          const q = (phase(t, c.k) + c.h) % 1;
          if (q > 0.6) continue;
          const u = q / 0.6;
          ctx.globalAlpha = (1 - u) * 0.5;
          for (let j = 0; j < 4; j++) px(ctx, c.x - u * 24 - j * 2, c.y - 1 - u * 4 - (j % 2), '#d8a878');
        }
        ctx.globalAlpha = 1;

        // drifting spice motes
        for (let i = 0; i < 46; i++) {
          const span = W + 40;
          const x = ((hash2(i, 41) * span + phase(t, 1 + (i % 3)) * span) % span) - 20;
          const y = 110 + hash2(i, 42) * 150 + wave(t, 6 + (i % 5), hash2(i, 43)) * 6;
          const a = 0.35 + 0.35 * wave(t, 30 + (i % 11), hash2(i, 44));
          const c = i % 2 ? '#ffb050' : '#ff8a2a';
          if (i % 3 === 0) glow(ctx, x, y, 3, c, 0.35 * a);
          ctx.globalAlpha = a;
          px(ctx, x, y, c);
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

