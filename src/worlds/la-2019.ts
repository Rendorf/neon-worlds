import { W, H, type Ctx, phase, wave, tick, hash2, randInt, rgba, mix } from '../scene/core';
import {
  sky, rect, px, glow, beam, haze, disc, poly, genSkyline, drawBuildings, neonText, textWidth, vsign, flicker,
  crowd, reflect, lane, glyphs,
} from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const HORIZON = 200;
const STREET = 214;

interface Pyramid { cx: number; half: number; h: number; seed: number }
const PYRAMIDS: Pyramid[] = [
  { cx: 448, half: 62, h: 96, seed: 31 },
  { cx: 330, half: 90, h: 132, seed: 17 },
];
const BIG = PYRAMIDS[1];

const FLARES = [
  { x: 22, top: 122, k: 7, off: 0.1 },
  { x: 54, top: 100, k: 9, off: 0.55 },
  { x: 88, top: 130, k: 11, off: 0.3 },
];

const TOWER = { x: 152, w: 58, top: 50 };
const SCREEN = { x: 160, y: 70, w: 42, h: 60 };

const STALLS = [
  { x: 112, w: 36, awn: ['#7a2a1a', '#c8a050'] },
  { x: 166, w: 30, awn: ['#1a4a5a', '#d0d0c0'] },
  { x: 222, w: 46, awn: ['#8a1a2a', '#e0c070'] },
  { x: 296, w: 32, awn: ['#3a2a5a', '#c08040'] },
  { x: 356, w: 40, awn: ['#6a3a10', '#e8d090'] },
  { x: 420, w: 36, awn: ['#1a3a2a', '#c0c0a0'] },
];
const STEAM_X = [128, 245, 378];

const UMBRELLA = ['#6ae0ff', '#ff5a8a', '#b8ff7a', '#ffd06a', '#ff8a3a'];

export const la2019: WorldDef = {
  id: 'la-2019',
  name: 'Los Angeles 2019',
  source: 'Blade Runner (1982)',
  creator: 'Ridley Scott, after Philip K. Dick',
  tagline: 'Fire over the refineries, rain on the market',
  era: '2019',
  hourOffset: 2,
  accent: '#ff8a3a',
  accent2: '#4ab0ff',
  weathers: ['rain', 'smog', 'clear'],
  music: STYLES.la2019,
  ambience: [
    { id: 'spinners', label: 'Spinner traffic', kind: 'speeders', gain: 0.45 },
    { id: 'blimp', label: 'Advertising blimp', kind: 'thrum', gain: 0.4 },
    { id: 'steam', label: 'Market steam', kind: 'steam', gain: 0.35 },
    { id: 'ads', label: 'Ad chatter', kind: 'chatter', gain: 0.5 },
    { id: 'market', label: 'Street market', kind: 'crowd', gain: 0.4 },
  ],
  create(rng) {
    const far = genSkyline(rng, { baseY: HORIZON, minW: 8, maxW: 20, minH: 14, maxH: 46, antennaChance: 0.3 });
    const mid = genSkyline(rng, { baseY: STREET, x0: 100, minW: 16, maxW: 34, minH: 20, maxH: 46, gap: 1, stepChance: 0.25 });

    // lit pyramid windows that blink
    const pyrBlink: [number, number][] = [];
    for (let i = 0; i < 46; i++) {
      const p = PYRAMIDS[i % 3 === 0 ? 0 : 1];
      const steps = Math.floor(p.h / 4);
      const s = randInt(rng, 0, steps - 4);
      const hw = Math.round(p.half * (1 - s / steps)) - 4;
      pyrBlink.push([p.cx - hw + randInt(rng, 0, hw) * 2, HORIZON - (s + 1) * 4 + 2]);
    }
    const signs = mid.filter((b) => b.x > 215 && rng() < 0.55).map((b) => ({
      x: b.x + randInt(rng, 2, Math.max(2, b.w - 6)),
      y: b.top + randInt(rng, 4, 8),
      n: randInt(rng, 2, 4),
      color: ['#ff3a6a', '#4ad0ff', '#ffb03a', '#c07aff'][randInt(rng, 0, 3)],
      seed: randInt(rng, 1, 1e6),
      bad: rng() < 0.25,
    }));

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#120a08'], [0.35, '#2c1910'], [0.72, '#653619'], [1, '#a65826']], HORIZON);
        haze(ctx, 20, 90, '#7a4a2a', 0.18);
        haze(ctx, 130, 210, '#e07a34', 0.22);
        drawBuildings(ctx, far, HORIZON, '#2a1810', '#3a2214', { colors: ['#ffb050', '#c87830'], density: 0.14, cellW: 3, cellH: 4 });

        for (const p of PYRAMIDS) drawPyramid(ctx, p);

        // refinery at the left
        rect(ctx, 0, 176, 118, HORIZON - 176, '#120a07');
        for (const [tx, tw, th] of [[4, 14, 18], [34, 18, 22], [70, 12, 14], [96, 16, 20]]) {
          rect(ctx, tx, HORIZON - th, tw, th, '#1a100a');
          disc(ctx, tx + tw / 2, HORIZON - th, tw / 2, '#1a100a');
          rect(ctx, tx + 1, HORIZON - th, 1, th, '#3a2414');
        }
        for (let y = 182; y < HORIZON; y += 5) rect(ctx, 0, y, 118, 1, '#24160d');
        for (const f of FLARES) {
          rect(ctx, f.x - 2, f.top, 4, HORIZON - f.top, '#140c08');
          rect(ctx, f.x - 2, f.top, 1, HORIZON - f.top, '#3a2414');
          rect(ctx, f.x - 4, f.top + 12, 8, 2, '#1e120a');
          for (let y = f.top + 18; y < HORIZON - 4; y += 6) {
            rect(ctx, f.x - 4, y, 8, 1, '#1e120a');
            px(ctx, f.x - 3, y + 3, '#1e120a');
            px(ctx, f.x + 2, y + 3, '#1e120a');
          }
          px(ctx, f.x + 2, f.top + 30, '#ffb050');
        }
        for (let i = 0; i < 14; i++) px(ctx, 4 + ((i * 37) % 112), 180 + ((i * 13) % 18), '#ffb050');

        // the video-wall tower
        const { x, w, top } = TOWER;
        rect(ctx, x, top, w, HORIZON - top, '#170e0a');
        rect(ctx, x + 8, top - 10, w - 16, 10, '#170e0a');
        rect(ctx, x + w / 2, top - 22, 1, 12, '#170e0a');
        rect(ctx, x, top, 1, HORIZON - top, '#3a2416');
        rect(ctx, SCREEN.x - 2, SCREEN.y - 2, SCREEN.w + 4, SCREEN.h + 4, '#050303');
        for (let yy = SCREEN.y + SCREEN.h + 6; yy < HORIZON - 4; yy += 4) {
          for (let xx = x + 3; xx < x + w - 3; xx += 4) if (hash2(xx, yy) < 0.3) rect(ctx, xx, yy, 2, 1, '#c87830');
        }

        drawBuildings(ctx, mid, STREET, '#110a07', '#24160e', { colors: ['#ffb050', '#ffe0a0', '#ff6a3a'], density: 0.35, cellW: 3, cellH: 4, winW: 2 });

        // market stalls
        for (const s of STALLS) {
          glow(ctx, s.x + s.w / 2, STREET - 10, s.w * 0.8, '#ff9a40', 0.25);
          rect(ctx, s.x + 2, STREET - 17, s.w - 4, 10, '#3a2010');
          for (let k = 0; k < s.w; k += 4) rect(ctx, s.x + k, STREET - 21, 2, 4, s.awn[0]);
          for (let k = 2; k < s.w; k += 4) rect(ctx, s.x + k, STREET - 21, 2, 4, s.awn[1]);
          rect(ctx, s.x - 1, STREET - 17, s.w + 2, 1, '#120a06');
          rect(ctx, s.x + 1, STREET - 17, 1, 17, '#120a06');
          rect(ctx, s.x + s.w - 2, STREET - 17, 1, 17, '#120a06');
          rect(ctx, s.x + 3, STREET - 8, s.w - 6, 8, '#1c110a');
          rect(ctx, s.x + 3, STREET - 8, s.w - 6, 1, '#5a3a1e');
          for (let k = 6; k < s.w - 6; k += 7) rect(ctx, s.x + k, STREET - 12, 3, 3, '#8a5a2a');
        }

        // wet street
        rect(ctx, 0, STREET, W, H - STREET, '#0d0806');
        rect(ctx, 0, STREET, W, 1, '#3a2416');
        for (let xx = 0; xx < W; xx += 30) rect(ctx, xx, 248, 14, 1, '#24160e');
      },

      drawFrame(ctx: Ctx, t: number) {
        // flare stacks: pilot flames and periodic bursts
        FLARES.forEach((f, i) => flare(ctx, f.x, f.top, t, f.k, f.off, i * 97 + 5));

        // pyramid life: apex glow, lifts on the faces, blinking windows
        for (const p of PYRAMIDS) {
          const top = HORIZON - p.h;
          glow(ctx, p.cx, top, 18, '#ffd08a', 0.22 + 0.1 * wave(t, 30, p.seed * 0.01));
          px(ctx, p.cx, top - 9, tick(t, 240) % 2 ? '#ff4030' : '#401008');
        }
        for (let j = 0; j < 3; j++) {
          const q = phase(t, 8 + j * 3);
          const side = j === 1 ? 1 : -1;
          const lx = BIG.cx + side * (BIG.half - 8) * (1 - q) + side * 2;
          const ly = HORIZON - 4 - q * (BIG.h - 10);
          px(ctx, lx, ly, '#fff6d8');
          glow(ctx, lx, ly, 4, '#ffe0a0', 0.5);
        }
        for (let i = 0; i < pyrBlink.length; i++) {
          const on = hash2(i + 3, tick(t, 120 + (i % 4) * 40)) > 0.5;
          px(ctx, pyrBlink[i][0], pyrBlink[i][1], on ? '#fff0c0' : '#1d130d');
        }

        videoWall(ctx, t);

        // spinners
        for (let i = 0; i < 9; i++) {
          const dir = i % 2 ? 1 : -1;
          const k = 2 + (i % 4);
          const x = lane(t, k, hash2(i, 5), dir, W + 80);
          const y = 46 + ((i * 23) % 120) + wave(t, 3 + (i % 5), hash2(i, 6)) * 8;
          spinner(ctx, x, y, dir, t, i, 1);
        }
        // a police spinner crossing low and close
        const sx = lane(t, 3, 0.62, 1, W + 140);
        spinner(ctx, sx, 160 + wave(t, 6) * 10, 1, t, 3, 2);

        // the blimp, once per loop
        const bx = lane(t, 1, 0.35, -1, W + 240);
        blimp(ctx, bx, 58 + wave(t, 5) * 3, t);

        // signs over the market
        for (const s of signs) vsign(ctx, s.x, s.y, s.n, s.color, flicker(t, s.seed, s.bad ? 0.25 : 0.02), s.seed);
        const nx = 226;
        const ny = STREET - 32;
        rect(ctx, nx - 3, ny - 3, textWidth('NOODLES') + 6, 11, '#0a0505');
        neonText(ctx, 'NOODLES', nx, ny, '#ff3a5a', flicker(t, 41, 0.05));
        rect(ctx, 352, STREET - 30, textWidth('BAR') + 6, 11, '#0a0505');
        neonText(ctx, 'BAR', 355, STREET - 27, '#4ad0ff', flicker(t, 77, 0.03));
        vsign(ctx, 276, STREET - 52, 4, '#ffb03a', flicker(t, 12, 0.04), 812);

        // stall lamps sway
        for (let i = 0; i < STALLS.length; i++) {
          const s = STALLS[i];
          const lx = s.x + s.w / 2 + wave(t, 40 + i * 4, i * 0.2) * 1.2;
          px(ctx, lx, STREET - 15, '#ffe8b0');
          glow(ctx, lx, STREET - 14, 7, '#ffb050', 0.45 * flicker(t, i + 300, 0.04));
        }

        // steam
        for (let s = 0; s < STEAM_X.length; s++) {
          for (let j = 0; j < 4; j++) {
            const p = (phase(t, 30 + s * 7) + j / 4) % 1;
            const yy = STREET - 12 - p * 36;
            const xx = STEAM_X[s] + Math.sin((p * 2 + s) * Math.PI) * 4 + p * 7;
            glow(ctx, xx, yy, 4 + p * 10, '#d8cfc4', 0.32 * (1 - p));
          }
        }

        reflect(ctx, STREET + 1, t, 0.3, H - STREET - 1, '#0a0604');

        // pedestrians with light-shaft umbrellas
        crowd(ctx, t, 21, 16, STREET - 3, ['#0b0705', '#1a110c', '#231710'], (x, y, i) => {
          if (hash2(i, 41) < 0.3) return;
          const c = UMBRELLA[i % UMBRELLA.length];
          rect(ctx, x - 3, y - 12, 8, 1, '#1e1a18');
          rect(ctx, x - 2, y - 13, 6, 1, '#1e1a18');
          px(ctx, x - 3, y - 12, c);
          px(ctx, x + 4, y - 12, c);
          rect(ctx, x + 2, y - 11, 1, 6, c);
          glow(ctx, x + 2, y - 8, 6, c, 0.5);
        });

        // puddle glints
        for (let i = 0; i < 10; i++) {
          ctx.globalAlpha = 0.3 + 0.3 * wave(t, 36 + i, hash2(i, 2));
          rect(ctx, hash2(i, 13) * W, 222 + hash2(i, 14) * 40, 5 + hash2(i, 15) * 9, 1, ['#ff8a3a', '#4ad0ff', '#ff3a6a'][i % 3]);
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

function drawPyramid(ctx: Ctx, p: Pyramid): void {
  const steps = Math.floor(p.h / 4);
  for (let i = 0; i < steps; i++) {
    const hw = Math.max(3, Math.round(p.half * (1 - i / steps)));
    const y = HORIZON - (i + 1) * 4;
    rect(ctx, p.cx - hw, y, hw * 2, 4, '#1c120c');
    rect(ctx, p.cx - hw, y, hw * 2, 1, '#3a2517');
    rect(ctx, p.cx - hw, y, 2, 4, '#2e1d12');
    for (let x = p.cx - hw + 3; x < p.cx + hw - 3; x += 2) {
      const band = hash2(p.seed, Math.floor((x - p.cx + 400) / 9)) > 0.62;
      const v = hash2(p.seed + i * 13, x);
      if (v > (band ? 0.8 : 0.32)) continue;
      px(ctx, x, y + 2, v < 0.06 ? '#fff2c8' : v < 0.22 ? '#ffb454' : '#a8622a');
    }
  }
  const top = HORIZON - steps * 4;
  rect(ctx, p.cx - 4, top - 3, 8, 3, '#1c120c');
  rect(ctx, p.cx, top - 8, 1, 5, '#1c120c');
}

function flare(ctx: Ctx, x: number, y: number, t: number, k: number, off: number, seed: number): void {
  const p = (phase(t, k) + off) % 1;
  const burst = p < 0.12 ? Math.sin((p / 0.12) * Math.PI) : 0;
  const tk = tick(t, 1440);
  const fh = 4 + hash2(seed, tk) * 3 + burst * 40;
  const fw = 2 + burst * 5;
  glow(ctx, x, y - fh * 0.4, 12 + burst * 80, '#ff7a1a', 0.3 + burst * 0.3);
  for (let j = 0; j < fh; j += 2) {
    const q = j / fh;
    const w = Math.max(1, Math.round(fw * (1 - q * 0.8) + (hash2(seed + j, tk) - 0.5) * 2));
    const sway = Math.round(Math.sin(q * 3 + phase(t, 120) * Math.PI * 2) * q * 3);
    const c = q < 0.2 ? '#fff6d0' : q < 0.45 ? '#ffd040' : q < 0.75 ? '#ff7a1a' : '#b8280e';
    rect(ctx, x - w / 2 + sway, y - j - 2, w, 2, c);
  }
}

function spinner(ctx: Ctx, x: number, y: number, dir: number, t: number, i: number, s: number): void {
  rect(ctx, x - 4 * s, y, 9 * s, 2 * s, '#221c1e');
  rect(ctx, x - 2 * s, y - s, 5 * s, s, '#3a3236');
  const front = dir > 0 ? x + 4 * s : x - 4 * s;
  px(ctx, front, y, '#fff2d0');
  beam(ctx, front, y + 1, dir > 0 ? 0.3 : Math.PI - 0.3, 30 * s, 0.09, '#fff2d0', 0.14);
  px(ctx, dir > 0 ? x - 4 * s : x + 4 * s, y + s, '#ff4a2a');
  const ph = (tick(t, 1200) + i) % 3;
  if (ph < 2) {
    const c = ph === 0 ? '#3a7aff' : '#ff2a3a';
    px(ctx, x, y - s - 1, c);
    glow(ctx, x, y - s - 1, 5 * s, c, 0.6);
  }
}

function blimp(ctx: Ctx, x: number, y: number, t: number): void {
  for (let i = 0; i < 2; i++) {
    const a = Math.PI / 2 + wave(t, 7 + i * 2, i * 0.4) * 0.45;
    beam(ctx, x - 12 + i * 24, y + 9, a, 170, 0.05, '#fff0d0', 0.13);
  }
  const rx = 36;
  const ry = 9;
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(1 - (dy / ry) ** 2));
    rect(ctx, x - hw, y + dy, hw * 2, 1, dy < -5 ? '#3a302a' : dy < 4 ? '#2a221e' : '#1a1512');
  }
  poly(ctx, [x + 26, y - 4, x + 40, y - 13, x + 43, y - 13, x + 38, y - 2], '#1e1814');
  poly(ctx, [x + 26, y + 4, x + 40, y + 12, x + 43, y + 12, x + 38, y + 2], '#1e1814');
  rect(ctx, x - 10, y + 8, 20, 3, '#141010');
  // ad panel
  const tk = tick(t, 80);
  const col = ['#ff9a3a', '#ff3a6a', '#4ad0ff', '#ffe08a'][tk % 4];
  rect(ctx, x - 21, y - 5, 35, 10, '#0a0606');
  glow(ctx, x - 3, y, 26, col, 0.3);
  glyphs(ctx, 500 + tk, x - 18, y - 2, 8, col, false);
  ctx.globalAlpha = 0.25;
  rect(ctx, x - 21, y - 5 + (tick(t, 960) % 10), 35, 1, '#ffffff');
  ctx.globalAlpha = 1;
  const on = tick(t, 240) % 2;
  px(ctx, x - 36, y, on ? '#ff3030' : '#3a0a0a');
  px(ctx, x + 42, y - 13, on ? '#3a0a0a' : '#40ff60');
  if (on) glow(ctx, x - 36, y, 5, '#ff3030', 0.6);
}

function videoWall(ctx: Ctx, t: number): void {
  const { x, y, w, h } = SCREEN;
  const mode = tick(t, 16) % 4; // 15 s per programme; the last is a glyph advert
  const bg = mix('#0e3440', '#3a0e2c', 0.5 + 0.5 * wave(t, 4));
  glow(ctx, x + w / 2, y + h / 2, 64, mode === 3 ? '#ff3a6a' : '#ffb07a', 0.2);
  rect(ctx, x, y, w, h, bg);
  if (mode < 3) {
    face(ctx, x + w / 2 + Math.round(wave(t, 6) * 2), y + 32, t);
  } else {
    for (let c = 0; c < 6; c++) {
      const col = c % 2 ? '#ffe08a' : '#ff5a8a';
      glyphs(ctx, 900 + c * 17 + tick(t, 60), x + 3 + c * 7, y + 4 + ((tick(t, 480) + c * 3) % 6), 8, col, true);
    }
  }
  ctx.globalAlpha = 0.18;
  for (let yy = y; yy < y + h; yy += 2) rect(ctx, x, yy, w, 1, '#000000');
  ctx.globalAlpha = 1;
  rect(ctx, x, y + Math.floor(phase(t, 40) * h), w, 2, rgba('#ffffff', 0.1));
}

function face(ctx: Ctx, cx: number, cy: number, t: number): void {
  const hair = '#140a0c';
  // kimono
  rect(ctx, cx - 16, cy + 18, 32, 10, '#8a1a2a');
  poly(ctx, [cx - 6, cy + 18, cx, cy + 27, cx + 6, cy + 18], '#f0e4d8');
  rect(ctx, cx - 3, cy + 12, 7, 7, '#e8ccb4');
  // hair back and bun
  rect(ctx, cx - 14, cy - 20, 28, 30, hair);
  disc(ctx, cx, cy - 22, 7, hair);
  rect(ctx, cx + 4, cy - 30, 1, 9, '#d0a040');
  rect(ctx, cx - 6, cy - 29, 1, 7, '#d0a040');
  // face oval
  const rx = 10;
  const ry = 14;
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(1 - (dy / ry) ** 2));
    rect(ctx, cx - hw, cy + dy, hw * 2 + 1, 1, dy > 6 ? '#e6c8b0' : '#f2dcc8');
  }
  rect(ctx, cx - 11, cy - 15, 23, 5, hair);
  // eyes, with an occasional double blink
  const bp = phase(t, 40);
  const closed = bp < 0.02 || (bp > 0.05 && bp < 0.065);
  for (const s of [-1, 1]) {
    const ex = cx + s * 5 - 1;
    const ey = cy - 4;
    rect(ctx, ex - 1, ey - 2, 4, 1, '#3a1a1a');
    if (closed) {
      rect(ctx, ex - 1, ey + 1, 4, 1, '#3a2020');
    } else {
      rect(ctx, ex - 1, ey - 1, 4, 1, '#c04a6a');
      rect(ctx, ex - 1, ey, 4, 2, '#140808');
      px(ctx, ex + 1, ey, '#ffffff');
    }
  }
  // lips, parting now and then
  const lp = phase(t, 12);
  const open = lp > 0.4 && lp < 0.5;
  rect(ctx, cx - 3, cy + 6, 7, 1, '#e0142e');
  rect(ctx, cx - 2, cy + 7, 5, 1, open ? '#3a0008' : '#b00a20');
  if (open) rect(ctx, cx - 2, cy + 8, 5, 1, '#e0142e');
  ctx.globalAlpha = 0.35;
  rect(ctx, cx - 8, cy + 2, 3, 2, '#ff6a7a');
  rect(ctx, cx + 6, cy + 2, 3, 2, '#ff6a7a');
  ctx.globalAlpha = 1;
}
