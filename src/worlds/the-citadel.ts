import { W, H, type Ctx, type Rng, phase, wave, tick, hash2, rgba, randInt } from '../scene/core';
import { sky, rect, px, glow, haze, vgrad, disc, lane } from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const HORIZON = 176;
const BASE = 190; // the towers and the crowd stand here
const CASCADE_K = 3; // water releases per loop (80 s apart)
const OPEN = 18; // seconds the valves stay open
const FALL_SPEED = 70; // px per second
const OUTLETS: [number, number][] = [[200, 104], [222, 112]];
const CROWD_CX = 211;

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
const smooth = (u: number): number => {
  const v = clamp01(u);
  return v * v * (3 - 2 * v);
};

interface Row {
  y: number;
  l: number;
  r: number;
}
interface Tower {
  top: number;
  rows: Row[];
  seed: number;
}

function genTower(rng: Rng, x0: number, x1: number, top: number): Tower {
  const rows: Row[] = [];
  let nl = 0;
  let nr = 0;
  let dl = 0;
  let dr = 0;
  let ledge = 0;
  for (let y = top; y <= BASE; y++) {
    dl = (dl + (rng() - 0.5) * 0.7) * 0.85;
    dr = (dr + (rng() - 0.5) * 0.7) * 0.85;
    nl = (nl + dl) * 0.97;
    nr = (nr + dr) * 0.97;
    if (ledge > 0) ledge--;
    else if (rng() < 0.035) ledge = randInt(rng, 2, 5);
    const widen = (y - top) * 0.05 + (ledge ? 2 : 0);
    const cap = y - top < 3 ? 3 - (y - top) : 0;
    rows.push({ y, l: Math.round(x0 - widen + nl + cap), r: Math.round(x1 + widen + nr - cap) });
  }
  return { top, rows, seed: Math.floor(rng() * 1e6) };
}

function drawTower(ctx: Ctx, rng: Rng, tw: Tower): void {
  // scree at the foot
  const foot = tw.rows[tw.rows.length - 1];
  for (let y = BASE - 14; y <= BASE + 2; y++) {
    const k = (y - (BASE - 14)) * 0.9;
    const l = foot.l - k;
    const r = foot.r + k;
    rect(ctx, l, y, r - l, 1, '#7a4026');
    rect(ctx, l + (r - l) * 0.55, y, (r - l) * 0.45, 1, '#a25a32');
  }
  for (const { y, l, r } of tw.rows) {
    const w = r - l;
    rect(ctx, l, y, w, 1, '#5a2e22');
    rect(ctx, l + Math.round(w * 0.3), y, Math.round(w * 0.25), 1, '#7e4228');
    rect(ctx, l + Math.round(w * 0.55), y, w - Math.round(w * 0.55), 1, '#a4582e');
    px(ctx, r - 1, y, '#e0904a');
    if ((y + tw.seed) % 7 === 0) rect(ctx, l, y, w, 1, rgba('#2a1008', 0.25));
  }
  // cracks and openings
  for (let i = 0; i < 6; i++) {
    const row = tw.rows[8 + Math.floor(rng() * (tw.rows.length - 30))];
    const x = row.l + 3 + Math.floor(rng() * Math.max(1, row.r - row.l - 6));
    rect(ctx, x, row.y, 1, 4 + Math.floor(rng() * 10), rgba('#2a1008', 0.35));
  }
  for (let i = 0; i < 9; i++) {
    const row = tw.rows[12 + Math.floor(rng() * (tw.rows.length - 30))];
    const x = row.l + 3 + Math.floor(rng() * Math.max(1, row.r - row.l - 7));
    const lit = rng() < 0.4;
    rect(ctx, x, row.y, 2, 3, lit ? '#ffb060' : '#2a140e');
    if (lit) glow(ctx, x + 1, row.y + 1, 4, '#ffb060', 0.3);
  }
  // hanging gardens on top
  const t0 = tw.rows[0];
  const t4 = tw.rows[4];
  for (let x = t4.l - 2; x <= t4.r + 2; x += 3) {
    disc(ctx, x, tw.top + 1 + Math.floor(rng() * 3), 2 + Math.floor(rng() * 2), rng() < 0.5 ? '#3a6a2a' : '#2e5a24');
  }
  for (let x = t0.l; x <= t0.r; x += 4) disc(ctx, x, tw.top - 1, 1 + Math.floor(rng() * 2), '#6aa03a');
  for (let x = t4.l - 1; x <= t4.r + 1; x++) {
    if (rng() < 0.45) {
      const len = 2 + Math.floor(rng() * 16);
      rect(ctx, x, tw.top + 3, 1, len, rng() < 0.6 ? '#3a6a2a' : '#5a8a32');
      if (rng() < 0.3) px(ctx, x, tw.top + 3 + len, '#8ac04a');
    }
  }
  for (let x = t0.l + 2; x < t0.r; x += 5) px(ctx, x, tw.top - 2, '#a8d860');
}

/** War rig, cars, bikes and the rolling stage. y = wheel line, facing right. */
function vehicle(ctx: Ctx, kind: string, x: number, y: number): void {
  const dark = '#2a2220';
  switch (kind) {
    case 'rig':
      rect(ctx, x - 24, y - 6, 15, 4, '#8a8a8e');
      rect(ctx, x - 24, y - 6, 15, 1, '#d8d8d4');
      rect(ctx, x - 8, y - 4, 2, 2, dark);
      rect(ctx, x - 6, y - 7, 7, 5, dark);
      rect(ctx, x - 3, y - 6, 3, 2, '#6a7a7a');
      rect(ctx, x + 1, y - 4, 2, 2, '#4a4040');
      rect(ctx, x - 7, y - 10, 1, 3, '#5a5450');
      rect(ctx, x - 5, y - 10, 1, 3, '#5a5450');
      for (const wx of [-22, -18, -13, -4, 0]) rect(ctx, x + wx, y - 2, 2, 2, '#141010');
      break;
    case 'doof':
      rect(ctx, x - 10, y - 5, 15, 3, '#4a2e24');
      rect(ctx, x - 9, y - 12, 8, 7, '#161212');
      for (let i = 0; i < 4; i++) px(ctx, x - 8 + (i % 2) * 3, y - 11 + Math.floor(i / 2) * 3, '#6a6460');
      rect(ctx, x + 1, y - 10, 1, 5, '#c83a2a');
      px(ctx, x + 1, y - 11, '#e8d0b0');
      rect(ctx, x + 2, y - 9, 2, 1, '#c8c0b0');
      rect(ctx, x - 8, y - 2, 2, 2, '#141010');
      rect(ctx, x + 2, y - 2, 2, 2, '#141010');
      break;
    case 'car':
      rect(ctx, x - 5, y - 3, 11, 2, '#6a3e26');
      rect(ctx, x - 2, y - 5, 5, 2, '#4a2e22');
      px(ctx, x + 6, y - 3, '#c8c0b0');
      rect(ctx, x - 4, y - 1, 2, 1, '#141010');
      rect(ctx, x + 3, y - 1, 2, 1, '#141010');
      break;
    default:
      rect(ctx, x - 2, y - 3, 5, 1, '#3a2a22');
      rect(ctx, x, y - 6, 1, 3, '#d8d0c0');
      px(ctx, x - 2, y - 1, '#141010');
      px(ctx, x + 2, y - 1, '#141010');
  }
}

const CONVOY: [string, number][] = [
  ['rig', 0], ['car', 34], ['bike', 48], ['doof', 64], ['car', 90], ['bike', 104], ['car', 120], ['bike', 136], ['bike', 146],
];

export const citadel: WorldDef = {
  id: 'the-citadel',
  name: 'The Citadel',
  source: 'Mad Max: Fury Road',
  creator: 'George Miller',
  tagline: 'Water for the wretched, fire on the Fury Road',
  era: 'Year 45 after the Fall',
  hourOffset: 2,
  accent: '#ff8a2a',
  accent2: '#2ab4b8',
  weathers: ['clear', 'dust-storm', 'sandstorm'],
  music: STYLES.citadel,
  ambience: [
    { id: 'engines', label: 'War rigs', kind: 'engine', gain: 0.5 },
    { id: 'wind', label: 'Wasteland wind', kind: 'wind', gain: 0.4 },
    { id: 'chains', label: 'Lifts and pulleys', kind: 'chains', gain: 0.35 },
    { id: 'crowd', label: 'The wretched', kind: 'crowd', gain: 0.45 },
    { id: 'water', label: 'Aqua Cola', kind: 'water', gain: 0.4 },
  ],
  create(rng) {
    const towers = [genTower(rng, 112, 146, 78), genTower(rng, 186, 236, 56), genTower(rng, 272, 302, 86)];
    // gaps between the towers, used to hide the convoy behind them
    const gaps: [number, number][] = [];
    let gx = 0;
    for (const tw of towers) {
      const near = tw.rows.filter((r) => r.y >= 140 && r.y <= HORIZON + 2);
      const l = Math.min(...near.map((r) => r.l));
      const r = Math.max(...near.map((r) => r.r));
      gaps.push([gx, l]);
      gx = r;
    }
    gaps.push([gx, W]);
    const crowd = Array.from({ length: 96 }, () => {
      const x = 146 + Math.pow(rng(), 1) * 134;
      return {
        x,
        y: BASE - 3 + Math.floor(rng() * 11),
        h: rng(),
        kid: rng() < 0.15,
        bowl: rng() < 0.25,
        c: ['#3a2a22', '#4a3428', '#2a1e1a', '#5a4436', '#6a5a4a'][Math.floor(rng() * 5)],
      };
    }).sort((a, b) => a.y - b.y);
    const clouds = Array.from({ length: 4 }, (_, i) => ({ x: rng() * (W + 160), y: 64 + i * 13 + rng() * 6, w: 40 + rng() * 70 }));

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#0a4a5a'], [0.35, '#13707e'], [0.65, '#3a9a9a'], [0.85, '#a8b890'], [1, '#f0c070']], HORIZON);
        glow(ctx, 412, 152, 110, '#ffb050', 0.38);
        glow(ctx, 412, 152, 34, '#fff0c0', 0.6);
        disc(ctx, 412, 152, 10, '#fff4d0');
        // far mesas in the haze
        const mesa = (x0: number, x1: number, h: number) => {
          for (let x = x0; x < x1; x++) {
            const e = Math.min(x - x0, x1 - x, 6);
            const top = HORIZON - Math.round(h * Math.min(1, e / 6)) - (hash2(x, 7) < 0.3 ? 1 : 0);
            rect(ctx, x, top, 1, HORIZON - top, '#b48a6c');
          }
        };
        mesa(4, 70, 12);
        mesa(44, 96, 7);
        mesa(318, 368, 9);
        mesa(440, 486, 14);
        // the desert
        vgrad(ctx, 0, HORIZON, W, H - HORIZON, [[0, '#e8a050'], [0.15, '#d48440'], [0.5, '#b0602c'], [1, '#6a3418']]);
        haze(ctx, HORIZON - 12, HORIZON + 10, '#ffd090', 0.35);
        for (let i = 0; i < 14; i++) {
          const y = HORIZON + 3 + Math.round(Math.pow(i / 14, 1.5) * 90);
          ctx.globalAlpha = 0.25;
          for (let x = 0; x < W; x += 2) if (hash2(x >> 3, i) < 0.6) rect(ctx, x, y + Math.round(Math.sin(x * 0.03 + i) * 1.5), 2, 1, i % 2 ? '#f0b060' : '#8a4422');
          ctx.globalAlpha = 1;
        }
        // tyre tracks to the gate
        for (let y = HORIZON + 2; y < H; y++) {
          const u = (y - HORIZON) / (H - HORIZON);
          ctx.globalAlpha = 0.25;
          px(ctx, CROWD_CX - 70 * u - 20 * u * u, y, '#6a3418');
          px(ctx, CROWD_CX + 90 * u + 30 * u * u, y, '#6a3418');
          ctx.globalAlpha = 1;
        }
        // rocks
        for (let i = 0; i < 40; i++) {
          const y = HORIZON + 8 + Math.pow(rng(), 0.7) * (H - HORIZON - 8);
          const s = 1 + Math.floor(((y - HORIZON) / 90) * 3);
          const x = rng() * W;
          rect(ctx, x, y, s * 2, s, '#5a2e18');
          rect(ctx, x + s, y - 1, s, 1, '#c0703a');
        }

        // cables between the towers
        const cable = (x0: number, y0: number, x1: number, y1: number, sag: number) => {
          for (let x = x0; x <= x1; x++) {
            const u = (x - x0) / (x1 - x0);
            px(ctx, x, y0 + (y1 - y0) * u + sag * 4 * u * (1 - u), '#3a2418');
          }
        };
        for (const tw of towers) drawTower(ctx, rng, tw);
        cable(146, 84, 186, 66, 6);
        cable(146, 96, 186, 92, 4);
        cable(236, 72, 272, 90, 5);
        cable(236, 120, 300, 186, 8);

        // pipes on the Mother tower, ending in the outlets
        for (const [ox, oy] of OUTLETS) {
          rect(ctx, ox - 1, 64, 3, oy - 64, '#6a645c');
          rect(ctx, ox + 1, 64, 1, oy - 64, '#b0a690');
          for (let y = 70; y < oy; y += 11) rect(ctx, ox - 2, y, 5, 2, '#4a443e');
          rect(ctx, ox - 3, oy, 7, 3, '#7a7268');
          rect(ctx, ox - 2, oy + 3, 5, 1, '#3a3430');
        }
        for (const x of [128, 140, 280, 292]) {
          const tw = x < 200 ? towers[0] : towers[2];
          rect(ctx, x, tw.top + 8, 1, BASE - tw.top - 20, rgba('#5a5450', 0.8));
        }
        // lift ropes and pulley arms
        for (const [x, y0] of [[149, 80], [265, 88], [239, 64]] as [number, number][]) {
          rect(ctx, x, y0, 1, BASE - y0 - 2, '#2e2018');
          rect(ctx, x + 4, y0, 1, BASE - y0 - 2, '#2e2018');
          rect(ctx, x - 3, y0 - 2, 10, 2, '#3a2a20');
        }
        // the boom on top of the Mother tower
        rect(ctx, 228, 52, 26, 2, '#4a3a2e');
        rect(ctx, 230, 48, 1, 4, '#4a3a2e');
        for (let i = 0; i < 24; i += 3) px(ctx, 231 + i, 51 - Math.floor(i / 8), '#4a3a2e');
        // gate platform at the foot
        rect(ctx, 190, BASE - 10, 44, 3, '#4a3426');
        rect(ctx, 192, BASE - 7, 2, 7, '#3a2a20');
        rect(ctx, 230, BASE - 7, 2, 7, '#3a2a20');
      },

      drawFrame(ctx: Ctx, t: number) {
        // drifting high cloud
        for (const c of clouds) {
          const span = W + 160;
          const x = ((c.x + phase(t, 1) * span) % span) - 80;
          ctx.globalAlpha = 0.3;
          rect(ctx, x, c.y, c.w, 1, '#f8c890');
          rect(ctx, x + 8, c.y + 1, c.w - 20, 1, '#e89a78');
        }
        ctx.globalAlpha = 1;

        // birds circling the Mother tower
        for (let i = 0; i < 7; i++) {
          const dir = i % 2 ? 1 : -1;
          const a = (phase(t, 5 + (i % 4)) * dir + hash2(i, 51)) * Math.PI * 2;
          const bx = 211 + Math.cos(a) * (24 + i * 8);
          const by = 40 - i * 2 + Math.sin(a) * (6 + i * 1.5);
          const up = (tick(t, 720) + i) % 3 === 0;
          const c = Math.sin(a) < 0 ? '#3a4a4a' : '#24160f';
          rect(ctx, bx - 1, by, 3, 1, c);
          px(ctx, bx - 2, by + (up ? -1 : 1), c);
          px(ctx, bx + 2, by + (up ? -1 : 1), c);
        }

        // smoke from a vent on the left tower
        for (let i = 0; i < 8; i++) {
          const q = (phase(t, 12) + i / 8) % 1;
          glow(ctx, 112 - q * 22 + wave(t, 24, i * 0.13) * 2, 104 - q * 44, 3 + q * 9, '#6a5a50', 0.28 * (1 - q));
        }

        // the convoy on the horizon, hidden behind the towers
        ctx.save();
        ctx.beginPath();
        for (const [a, b] of gaps) ctx.rect(a, 0, b - a, HORIZON + 4);
        ctx.clip();
        const lead = lane(t, 2, 0.2, 1, W + 300);
        for (let i = 0; i < CONVOY.length; i++) {
          const [kind, off] = CONVOY[i];
          const x = Math.round(lead - off);
          if (x < -12 || x - 90 > W) continue;
          const y = HORIZON - (hash2(i, tick(t, 960)) < 0.25 ? 1 : 0);
          const back = kind === 'rig' ? 24 : kind === 'doof' ? 10 : 5;
          for (let j = 10; j >= 1; j--) {
            const dx = x - back - j * 7;
            const dy = y - 2 - j * 1.9 + wave(t, 30, j * 0.1 + i * 0.3) * 0.8;
            const r = 3 + j * 2;
            const col = j < 3 ? '#a8703e' : '#c88a58';
            glow(ctx, dx, dy, r, col, 0.5 * (1 - j / 11));
            ctx.globalAlpha = 0.28 * (1 - j / 11);
            rect(ctx, dx - r * 0.6, dy - r * 0.3, r * 1.2, r * 0.6, col);
            ctx.globalAlpha = 1;
          }
          vehicle(ctx, kind, x, y);
          if (kind === 'rig') {
            for (let s = 0; s < 4; s++) {
              const q = (phase(t, 120) + s / 4) % 1;
              ctx.globalAlpha = 0.5 * (1 - q);
              rect(ctx, x - 6 - q * 8, y - 11 - q * 6, 2, 1, '#2a2420');
            }
            ctx.globalAlpha = 1;
          }
          if (kind === 'doof') {
            const pp = phase(t, 160);
            if (pp < 0.45 && hash2(tick(t, 160), 77) < 0.6) {
              const L = Math.sin((pp / 0.45) * Math.PI) * 8;
              const fx = x + 4;
              const fy = y - 9;
              glow(ctx, fx + L / 2, fy - L * 0.3, 6 + L, '#ff8a2a', 0.55);
              const cols = ['#fff6c0', '#ffd040', '#ff8a20', '#e04010'];
              for (let k = 0; k < L; k++) rect(ctx, fx + k, fy - k * 0.5, 1 + (k > 2 ? 1 : 0), 1, cols[Math.min(3, Math.floor((k / Math.max(L, 1)) * 4))]);
            }
          }
        }
        ctx.restore();

        // heat shimmer over the horizon
        const c = ctx.canvas;
        for (let y = HORIZON - 12; y < HORIZON + 4; y++) {
          const off = Math.round(wave(t, 160, y * 0.17) * 1.2);
          if (off) ctx.drawImage(c, 0, y, W, 1, off, y, W, 1);
        }

        // lifts riding up and down
        const lifts: [number, number, number, number, number][] = [[149, 82, 4, 0, 0], [265, 90, 3, 0.3, 1], [239, 66, 5, 0.6, 2]];
        for (const [x, y0, k, off, n] of lifts) {
          const span = BASE - y0 - 12;
          const u = 0.5 - 0.5 * wave(t, k, off);
          const py = y0 + 4 + u * span;
          const cy = y0 + 4 + (1 - u) * span;
          rect(ctx, x - 3, py, 8, 2, '#4a3426');
          rect(ctx, x - 1, py - 3, 1, 3, '#2a1a14');
          if (n !== 1) rect(ctx, x + 2, py - 2, 2, 2, '#6a5a4a');
          rect(ctx, x + 3, cy, 3, 4, '#3a3430');
          const sp = tick(t, 960 / (n + 1)) % 2;
          px(ctx, x + (sp ? 0 : 4), y0 - 2, '#8a7a68');
        }
        // chain from the boom
        const sa = wave(t, 12) * 0.12;
        for (let k = 0; k < 18; k++) px(ctx, 253 + Math.sin(sa) * k, 54 + Math.cos(sa) * k, '#3a2e26');
        rect(ctx, 251 + Math.sin(sa) * 18, 72, 4, 4, '#4a3a2e');

        // the water: valves open three times a loop
        const u = phase(t, CASCADE_K) * (240 / CASCADE_K);
        const wet = u < OPEN ? smooth(u / 4) : 1 - smooth((u - OPEN) / 25);
        const pull = u < OPEN ? smooth(u / 3) : 1 - smooth((u - OPEN) / 8);
        if (wet > 0.01) {
          ctx.globalAlpha = 0.55 * wet;
          rect(ctx, CROWD_CX - 6 - 26 * wet, BASE, 12 + 52 * wet, 2, '#6ab0d8');
          rect(ctx, CROWD_CX - 3 - 18 * wet, BASE, 6 + 36 * wet, 1, '#c8ecff');
          ctx.globalAlpha = 1;
        }
        if (u < OPEN + 2) {
          const amp = smooth(u / 1.5);
          const shift = tick(t, 4800);
          const cols = ['#ffffff', '#bfe6ff', '#7ac0ec'];
          for (const [ox, oy] of OUTLETS) {
            const ground = BASE - 1;
            const head = Math.min(ground, oy + 3 + u * FALL_SPEED);
            const tail = u > OPEN ? oy + 3 + (u - OPEN) * FALL_SPEED : oy + 3;
            if (tail >= ground) continue;
            glow(ctx, ox, oy + 4, 6, '#dff4ff', 0.45 * amp);
            for (let i = 0; i < 5; i++) {
              ctx.globalAlpha = (i === 0 || i === 4 ? 0.55 : 0.9) * Math.max(0.3, amp);
              for (let y = Math.floor(tail / 3) * 3; y < head; y += 3) {
                const d = y - oy;
                const x = ox + (i - 2) * 1.1 * amp * (1 + d / 50) + Math.sin(d * 0.3 + i) * 0.5;
                const ci = (((Math.floor(y / 3) - shift + i) % 3) + 3) % 3;
                rect(ctx, x, Math.max(y, tail), 1, 3, cols[ci]);
              }
            }
            ctx.globalAlpha = 1;
            if (head >= ground && tail < ground) {
              glow(ctx, ox, ground - 2, 18, '#cfeeff', 0.45 * amp);
              for (let i = 0; i < 14; i++) {
                const q = (phase(t, 120 + (i % 5)) + hash2(i, ox)) % 1;
                const dx = (hash2(i, 61) - 0.5) * 28 * q;
                ctx.globalAlpha = 0.8 * (1 - q) * amp;
                px(ctx, ox + dx, ground - Math.sin(q * Math.PI) * (4 + hash2(i, 62) * 8), '#e8f8ff');
              }
              ctx.globalAlpha = 1;
            }
          }
        }

        // the wretched, crowding in when the water comes
        const arms = tick(t, 480) % 2;
        for (let i = 0; i < crowd.length; i++) {
          const p = crowd[i];
          const x = Math.round(p.x + (CROWD_CX - p.x) * pull * 0.35 + wave(t, 40 + (i % 9), p.h) * 0.8);
          const y = p.y;
          const tall = p.kid ? 2 : 3;
          rect(ctx, x, y - tall, 1, tall, p.c);
          px(ctx, x, y - tall - 1, '#8a6a52');
          if (pull > 0.1 && p.h < 0.6) {
            const up = (arms + i) % 2;
            px(ctx, x - 1, y - tall - 1 - up, p.c);
            px(ctx, x + 1, y - tall - 1 - (1 - up), p.c);
            if (p.bowl) px(ctx, x + 1, y - tall - 3, '#9a9a96');
          } else if (p.bowl) {
            px(ctx, x + 1, y - tall, '#9a9a96');
          }
        }
      },
    };
  },
};
