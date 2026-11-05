import { W, H, type Ctx, phase, wave, tick, hash2, rgba, mix } from '../scene/core';
import { sky, rect, px, glow, haze, disc, vgrad, reflect, ripples, randInt, randRange } from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const HOR = 160; // sea horizon
const CX = 240;
const ARC_A = 243; // the far side of the Orbital: an arch rising from both horizons
const ARC_B = 140;
const GSV_X = 228;
const GSV_Y = 50;
const GSV_LEN = 220;
const AURAS = ['#7fd8ff', '#b48cff', '#ff8ac8', '#ffd27a', '#7affc0', '#7fd8ff'];

interface Island {
  x: number;
  w: number;
  h: number;
  seed: number;
}

export const vavatch: WorldDef = {
  id: 'vavatch-orbital',
  name: 'Vavatch Orbital',
  source: 'Consider Phlebas (the Culture)',
  creator: 'Iain M. Banks',
  tagline: 'A ring-world afternoon under a ship the size of a city',
  era: '1331 CE',
  hourOffset: 3,
  accent: '#7fd8ff',
  accent2: '#ffd27a',
  weathers: ['terminator', 'clear', 'rain'],
  music: STYLES.vavatch,
  ambience: [
    { id: 'sea', label: 'Sea', kind: 'sea', gain: 0.6 },
    { id: 'birds', label: 'Seabirds', kind: 'birds', gain: 0.4 },
    { id: 'fields', label: 'Ship fields', kind: 'thrum', gain: 0.35 },
    { id: 'breeze', label: 'Breeze', kind: 'wind', gain: 0.3 },
  ],
  create(rng) {
    const islands: Island[] = [
      { x: 18, w: 140, h: 22, seed: randInt(rng, 1, 1e6) },
      { x: 250, w: 96, h: 16, seed: randInt(rng, 1, 1e6) },
      { x: 392, w: 70, h: 10, seed: randInt(rng, 1, 1e6) },
    ];
    // window lights that glow when night falls
    const lights: [number, number][] = [];
    const gsvLights: [number, number][] = [];
    for (let i = 0; i < 46; i++) gsvLights.push([randRange(rng, -GSV_LEN / 2 + 8, GSV_LEN / 2 - 8), randInt(rng, -2, 2)]);
    const clouds = Array.from({ length: 5 }, (_, i) => ({
      y: 84 + i * 13 + randInt(rng, -3, 3),
      r: randInt(rng, 4, 7),
      n: randInt(rng, 3, 5),
      off: rng(),
      k: 1 + (i % 2),
    }));

    return {
      drawStatic(ctx: Ctx) {
        const skyStops: [number, string][] = [[0, '#163a8a'], [0.45, '#3a72c4'], [0.8, '#8cc0ea'], [1, '#dcefff']];
        sky(ctx, skyStops, HOR);
        orbitalArch(ctx, rng, skyStops);
        // horizon glare
        haze(ctx, HOR - 26, HOR + 6, '#ffffff', 0.35);

        // sea
        vgrad(ctx, 0, HOR, W, H - HOR, [[0, '#4f8fcf'], [0.4, '#2a68aa'], [1, '#123e7a']]);

        lights.length = 0; // filled from the island geometry below
        for (const isl of islands) island(ctx, rng, isl, lights);
      },
      drawFrame(ctx: Ctx, t: number) {
        const night = 0.5 - 0.5 * Math.cos(phase(t, 1) * Math.PI * 2);

        // stars appear as the terminator passes
        if (night > 0.3) {
          for (let i = 0; i < 40; i++) {
            const x = Math.floor(hash2(i, 61) * W);
            const y = Math.floor(hash2(i, 62) * 70);
            ctx.globalAlpha = (night - 0.3) * (0.6 + 0.4 * wave(t, 30 + (i % 9), hash2(i, 63)));
            px(ctx, x, y, '#ffffff');
          }
          ctx.globalAlpha = 1;
        }

        // drifting clouds
        for (let i = 0; i < clouds.length; i++) {
          const c = clouds[i];
          const span = W + 120;
          const x = ((c.off + phase(t, c.k)) % 1) * span - 60;
          cloud(ctx, x, c.y, c.r, c.n, i);
        }

        // the General Systems Vehicle hangs above everything
        const gx = GSV_X + wave(t, 1) * 4;
        const gy = GSV_Y + wave(t, 2, 0.25) * 1.5;
        gsv(ctx, gx, gy, t, gsvLights, night);

        // shuttles rising from the islands to the ship (and one coming down)
        for (let i = 0; i < 3; i++) {
          const p = (phase(t, 6 + i * 2) + hash2(i, 71)) % 1;
          const up = i !== 2;
          const q = up ? p : 1 - p;
          const e = q * q * (3 - 2 * q);
          const sx = [70, 300, 420][i];
          const tx = gx + [-60, 20, 70][i];
          const x = sx + (tx - sx) * e;
          const y = HOR - 6 + (gy + 6 - (HOR - 6)) * e;
          const fade = Math.min(1, p * 8, (1 - p) * 8);
          ctx.globalAlpha = fade;
          glow(ctx, x, y, 6, '#bfe8ff', 0.5);
          rect(ctx, x - 2, y - 1, 4, 2, '#f8fbff');
          px(ctx, x - 2, y + 1, '#8aa0c0');
          for (let j = 1; j < 8; j++) {
            ctx.globalAlpha = fade * 0.3 * (1 - j / 8);
            px(ctx, x - ((tx - sx) / 140) * j * (up ? 1 : -1), y + j * 1.5 * (up ? 1 : -1), '#bfe8ff');
          }
          ctx.globalAlpha = 1;
        }

        // birds gliding over the water
        for (let i = 0; i < 5; i++) {
          const dir = i % 2 ? 1 : -1;
          const p = (phase(t, 2 + (i % 3)) + hash2(i, 81)) % 1;
          const x = dir > 0 ? -10 + p * (W + 20) : W + 10 - p * (W + 20);
          const y = 112 + i * 9 + wave(t, 12 + i, hash2(i, 82)) * 3;
          bird(ctx, x, y, tick(t, 480 + i * 40) % 3);
        }

        // island lights at dusk
        for (let i = 0; i < lights.length; i++) {
          const a = Math.max(0, night - 0.25 - hash2(i, 91) * 0.2) * 1.6;
          if (a <= 0) continue;
          ctx.globalAlpha = Math.min(1, a);
          glow(ctx, lights[i][0], lights[i][1], 4, '#ffd27a', 0.7);
          px(ctx, lights[i][0], lights[i][1], '#fff4d0');
        }
        ctx.globalAlpha = 1;

        // the sea mirrors it all
        reflect(ctx, HOR, t, 0.32, H - HOR);
        vgrad(ctx, 0, HOR, W, H - HOR, [[0, rgba('#5a9ad8', 0.15)], [1, rgba('#0e3a76', 0.55)]]);
        ripples(ctx, t, HOR + 2, H - 4, 70, '#eaf6ff', 5);

        // sailboats
        for (let i = 0; i < 3; i++) {
          const p = (phase(t, 1 + i) + hash2(i, 101)) % 1;
          const dir = i % 2 ? -1 : 1;
          const x = dir > 0 ? -12 + p * (W + 24) : W + 12 - p * (W + 24);
          sailboat(ctx, x, 172 + i * 9 + wave(t, 40 + i * 4) * 0.6, dir, 1 + (i === 2 ? 1 : 0));
        }

        // drones floating in coloured aura fields
        for (let i = 0; i < 6; i++) {
          const x = 40 + hash2(i, 111) * 400 + wave(t, 2 + (i % 3), hash2(i, 112)) * 26;
          const y = 96 + hash2(i, 113) * 80 + wave(t, 5 + (i % 4), hash2(i, 114)) * 6;
          const cp = (phase(t, 3 + (i % 4)) + hash2(i, 115)) % 1;
          const ci = Math.floor(cp * 5);
          const aura = mix(AURAS[ci], AURAS[ci + 1], cp * 5 - ci);
          drone(ctx, x, y, aura, y > 150);
        }
      },
    };
  },
};

function orbitalArch(ctx: Ctx, rng: () => number, skyStops: [number, string][]): void {
  // Terrain along the ring: long runs of sea, land, desert and cloud.
  const segs: string[] = [];
  const pal = ['#3f7fc0', '#3f7fc0', '#2f6aa8', '#6fa060', '#8ab070', '#c8b888', '#f0f4f8', '#4f9a7a'];
  while (segs.length < 480) {
    const c = pal[Math.floor(rng() * pal.length)];
    const run = 6 + Math.floor(rng() * 22);
    for (let i = 0; i < run; i++) segs.push(c);
  }
  const sideW = 20; // band width near the horizons
  const topW = 5; // band width at the apex
  const ai = ARC_A - sideW;
  const bi = ARC_B - topW;
  for (let y = HOR - ARC_B; y < HOR; y++) {
    const dy = HOR - y;
    const xo = ARC_A * Math.sqrt(Math.max(0, 1 - (dy / ARC_B) ** 2));
    const xi = dy < bi ? ai * Math.sqrt(Math.max(0, 1 - (dy / bi) ** 2)) : 0;
    const skyCol = skyAt(skyStops, y / HOR);
    const haze = 0.22 + 0.45 * (1 - dy / ARC_B) ** 2;
    for (const s of [-1, 1]) {
      const x0 = Math.round(CX + s * xi);
      const x1 = Math.round(CX + s * xo);
      const lo = Math.min(x0, x1);
      const hi = Math.max(x0, x1);
      for (let x = lo; x <= hi; x++) {
        if (x < 0 || x >= W) continue;
        const th = Math.atan2(dy / ARC_B, (x - CX) / ARC_A);
        const col = segs[Math.floor((th / Math.PI) * 479)];
        // the rim walls catch the light; the inner edge is a touch darker
        const outer = s < 0 ? x === lo : x === hi;
        const inner = s < 0 ? x === hi : x === lo;
        const c = outer ? '#f4f8ff' : inner ? mix(col, '#1a3a7a', 0.3) : col;
        ctx.globalAlpha = 0.9;
        px(ctx, x, y, mix(c, skyCol, haze));
      }
    }
  }
  ctx.globalAlpha = 1;
}

function skyAt(stops: [number, string][], k: number): string {
  for (let i = 1; i < stops.length; i++) {
    if (k <= stops[i][0]) {
      const f = (k - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return mix(stops[i - 1][1], stops[i][1], Math.max(0, Math.min(1, f)));
    }
  }
  return stops[stops.length - 1][1];
}

function island(ctx: Ctx, rng: () => number, isl: Island, lights: [number, number][]): void {
  const { x, w, h } = isl;
  const cx = x + w / 2;
  // land: a soft hill with a beach
  for (let i = 0; i < w; i++) {
    const u = (i / w) * 2 - 1;
    const top = HOR - Math.round(h * Math.pow(1 - u * u, 0.7));
    rect(ctx, x + i, top, 1, HOR - top, i < w * 0.55 ? '#4f9258' : '#3f8050');
    if (top < HOR - 1) px(ctx, x + i, top, '#7cbc70');
  }
  rect(ctx, x - 4, HOR - 1, w + 8, 1, '#efe2bc');
  // gardens
  for (let i = 0; i < w / 5; i++) {
    const gx = x + 6 + rng() * (w - 12);
    const u = ((gx - x) / w) * 2 - 1;
    const gy = HOR - h * Math.pow(1 - u * u, 0.7) + 2 + rng() * 4;
    disc(ctx, gx, gy, randInt(rng, 1, 3), rng() < 0.5 ? '#2f6e44' : '#3c8a4c');
    if (rng() < 0.4) px(ctx, gx + 1, gy - 1, ['#ff9ac0', '#ffe080', '#c8a0ff'][randInt(rng, 0, 2)]);
  }
  const white = '#f6f8fb';
  const shade = '#c6d0de';
  const ground = (bx: number) => {
    const u = ((bx - x) / w) * 2 - 1;
    return Math.round(HOR - h * Math.pow(1 - Math.min(1, u * u), 0.7)) + 2;
  };
  const scale = h / 22;
  // a slender spire with a bulb
  const sx = cx - w * 0.18;
  const sTop = ground(sx) - Math.round(46 * scale);
  for (let y = sTop; y < ground(sx); y++) {
    const f = (y - sTop) / (ground(sx) - sTop);
    const half = Math.max(0.5, 0.6 + f * f * 3 * scale);
    rect(ctx, sx - half, y, half * 2, 1, white);
    px(ctx, sx + half - 1, y, shade);
  }
  disc(ctx, sx, sTop + 6 * scale, Math.max(2, Math.round(3 * scale)), white);
  px(ctx, sx + 1, sTop + 6 * scale, '#9ac8f0');
  lights.push([Math.round(sx), Math.round(sTop + 6 * scale)]);
  // terraced shells
  const tx = cx + w * 0.12;
  const tg = ground(tx);
  for (let k = 0; k < 3; k++) {
    const rw = Math.round((16 - k * 4) * scale) + 2;
    const rh = Math.round((7 - k) * scale) + 1;
    const by = tg - k * Math.round(6 * scale);
    for (let dy = 0; dy < rh; dy++) {
      const half = Math.round(rw * Math.sqrt(1 - (dy / rh) ** 2));
      rect(ctx, tx - half, by - dy, half * 2, 1, dy === 0 ? shade : white);
    }
    for (let i = -rw + 3; i < rw - 2; i += 4) lights.push([Math.round(tx + i), by - 1]);
  }
  // a sweeping arch bridge to the sea
  const ax0 = x + w * 0.62;
  const ax1 = x + w + 14 * scale;
  for (let ax = ax0; ax < ax1; ax++) {
    const u = (ax - ax0) / (ax1 - ax0);
    const ay = ground(ax0) - Math.sin(u * Math.PI) * 14 * scale;
    rect(ctx, ax, ay, 1, 2, white);
  }
  // a small dome
  const dx = x + w * 0.3;
  const dr = Math.max(2, Math.round(6 * scale));
  for (let dy = 0; dy < dr; dy++) {
    const half = Math.round(dr * Math.sqrt(1 - (dy / dr) ** 2));
    rect(ctx, dx - half, ground(dx) - dy, half * 2, 1, white);
  }
  rect(ctx, dx, ground(dx) - dr - 2, 1, 2, white);
  lights.push([Math.round(dx), ground(dx) - 1]);
}

function cloud(ctx: Ctx, x: number, y: number, r: number, n: number, seed: number): void {
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * r * 1.3;
    const rr = Math.max(2, r - Math.abs(i - (n - 1) / 2) * 1.5 + (hash2(seed, i) > 0.5 ? 1 : 0));
    disc(ctx, x + ox, y - rr * 0.4, rr, '#f8fbff');
  }
  rect(ctx, x - (n * r * 1.3) / 2, y, n * r * 1.3, 2, '#d4e4f4');
  ctx.globalAlpha = 1;
}

function gsv(ctx: Ctx, x: number, y: number, t: number, lights: [number, number][], night: number): void {
  const half = GSV_LEN / 2;
  glow(ctx, x, y, half * 0.8, '#bfe8ff', 0.16);
  // the hull: long, slightly bulging, rounded at both ends
  for (let i = -6; i <= 6; i++) {
    const f = Math.abs(i) / 6.5;
    const len = half * Math.sqrt(1 - f * f * f);
    const col = i < -3 ? '#f4f8fc' : i < 1 ? '#e2e8f0' : i < 4 ? '#b8c2d2' : '#97a3b8';
    rect(ctx, x - len, y + i, len * 2, 1, col);
  }
  // hull plates, effector blisters and bays
  for (let i = -half + 14; i < half - 14; i += 18) rect(ctx, x + i, y - 5, 1, 4, '#cdd6e2');
  rect(ctx, x - half * 0.55, y + 6, 34, 2, '#7d8aa2');
  rect(ctx, x + half * 0.15, y + 6, 26, 2, '#7d8aa2');
  rect(ctx, x - 8, y + 6, 10, 3, '#6a7690');
  for (let i = -half + 20; i < half - 20; i += 26) rect(ctx, x + i, y + 1, 6, 1, '#7a8aa4');
  // running lights along the hull
  for (let i = 0; i < lights.length; i++) {
    const on = hash2(i, tick(t, 120)) > 0.3;
    if (!on) continue;
    ctx.globalAlpha = 0.5 + night * 0.5;
    px(ctx, x + lights[i][0], y + lights[i][1], i % 5 ? '#fff4d8' : '#7fd8ff');
  }
  ctx.globalAlpha = 1;
  // the field shimmer around the ship
  const s = 0.5 + 0.5 * wave(t, 16);
  ctx.globalAlpha = 0.25 + s * 0.2;
  rect(ctx, x - half * 0.9, y - 9, GSV_LEN * 0.9, 1, '#bfe8ff');
  rect(ctx, x - half * 0.9, y + 9, GSV_LEN * 0.9, 1, '#bfe8ff');
  ctx.globalAlpha = 1;
}

function bird(ctx: Ctx, x: number, y: number, frame: number): void {
  const c = '#2a3a56';
  px(ctx, x, y, c);
  if (frame === 0) {
    px(ctx, x - 1, y - 1, c);
    px(ctx, x + 1, y - 1, c);
    px(ctx, x - 2, y - 1, c);
    px(ctx, x + 2, y - 1, c);
  } else if (frame === 1) {
    px(ctx, x - 1, y - 1, c);
    px(ctx, x + 1, y - 1, c);
    px(ctx, x - 2, y - 2, c);
    px(ctx, x + 2, y - 2, c);
  } else {
    px(ctx, x - 1, y, c);
    px(ctx, x + 1, y, c);
    px(ctx, x - 2, y + 1, c);
    px(ctx, x + 2, y + 1, c);
  }
}

function sailboat(ctx: Ctx, x: number, y: number, dir: number, s: number): void {
  rect(ctx, x - 4 * s, y, 8 * s, s, '#3a4a6a');
  rect(ctx, x - 3 * s, y + s, 6 * s, s, '#2a3a5a');
  for (let i = 0; i < 6 * s; i++) {
    const wdt = Math.max(1, Math.round((i / (6 * s)) * 4 * s));
    rect(ctx, dir > 0 ? x - wdt : x, y - 6 * s + i, wdt, 1, '#ffffff');
  }
  rect(ctx, x, y - 7 * s, 1, 7 * s, '#5a6a8a');
}

function drone(ctx: Ctx, x: number, y: number, aura: string, big: boolean): void {
  const s = big ? 2 : 1;
  glow(ctx, x, y, 12 * s, aura, 0.45);
  glow(ctx, x, y, 5 * s, aura, 0.7);
  // a small rounded casing, lit from above
  rect(ctx, x - 2 * s, y - s, 4 * s, 2 * s, '#e4e8ee');
  rect(ctx, x - s, y - 2 * s, 2 * s, s, '#f8fbff');
  rect(ctx, x - 2 * s, y + s - 1, 4 * s, 1, '#8a94a8');
  px(ctx, x + (big ? 1 : 0), y, aura);
}
