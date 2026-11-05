import { W, H, type Ctx, phase, wave, tick, hash2, randInt, rgba } from '../scene/core';
import {
  sky, stars, rect, px, glow, beam, genSkyline, drawBuildings, pickBlinkers, blink, neonText, vsign, flicker,
  flyer, car, crowd, reflect, lane, textWidth, haze,
} from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const HORIZON = 200;
const STREET = 224;
const ROAD = 232;

export const nightCity: WorldDef = {
  id: 'night-city',
  name: 'Night City',
  source: 'Cyberpunk 2077',
  creator: 'CD Projekt Red, after Mike Pondsmith',
  tagline: 'Holo-koi over the megatowers, rain on Watson',
  era: '2077',
  hourOffset: 0,
  accent: '#ff2a6d',
  accent2: '#05d9e8',
  weathers: ['rain', 'acid-rain', 'clear', 'smog'],
  music: STYLES.nightCity,
  ambience: [
    { id: 'traffic', label: 'AV traffic', kind: 'speeders', gain: 0.5 },
    { id: 'crowd', label: 'Street crowd', kind: 'crowd', gain: 0.5 },
    { id: 'ads', label: 'Holo-ads', kind: 'chatter', gain: 0.6 },
    { id: 'siren', label: 'NCPD sirens', kind: 'siren', gain: 0.7 },
  ],
  create(rng) {
    const far = genSkyline(rng, { baseY: HORIZON, minW: 10, maxW: 24, minH: 40, maxH: 115, antennaChance: 0.4, stepChance: 0.3 });
    const mid = genSkyline(rng, { baseY: STREET, minW: 18, maxW: 42, minH: 28, maxH: 86, gap: 1, antennaChance: 0.2, stepChance: 0.2 });
    const blinkers = pickBlinkers(rng, mid, STREET, 60);
    const signs = mid.filter(() => rng() < 0.7).map((b) => ({
      x: b.x + randInt(rng, 2, Math.max(2, b.w - 6)),
      y: b.top + randInt(rng, 6, 20),
      n: randInt(rng, 3, 6),
      color: ['#ff2a6d', '#05d9e8', '#f9f871', '#b967ff'][randInt(rng, 0, 3)],
      seed: randInt(rng, 1, 1e6),
      bad: rng() < 0.2,
    }));
    const labels = ['BAR', 'HOTEL', 'NOODLES', 'RIPPER DOC', 'PAWN', 'CLINIC', 'ARCADE', 'CHROME'];
    const fronts = labels.map((s, i) => ({
      s,
      x: 8 + i * 60 + randInt(rng, 0, 14),
      y: STREET - 12 - randInt(rng, 0, 6),
      color: ['#ff2a6d', '#05d9e8', '#f9f871', '#b967ff', '#3dff9e'][i % 5],
    }));
    const tower = { x: 292, w: 34, top: 26 };

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#06021a'], [0.45, '#1b0736'], [0.75, '#470e4e'], [1, '#7c1b5c']], HORIZON);
        stars(ctx, rng, 40, 80, ['#ffffff', '#9fe8ff']);
        haze(ctx, 140, 210, '#ff2a6d', 0.18);
        drawBuildings(ctx, far, HORIZON, '#1d1036', '#2a1a4a', { colors: ['#05d9e8', '#b967ff', '#ff2a6d'], density: 0.18, cellW: 3, cellH: 4 });
        // the megatower
        const { x, w, top } = tower;
        rect(ctx, x, top + 18, w, HORIZON - top - 18, '#140a28');
        rect(ctx, x + 6, top, w - 12, 20, '#140a28');
        rect(ctx, x + 14, top - 14, 6, 14, '#140a28');
        for (let yy = top + 24; yy < HORIZON; yy += 5) rect(ctx, x + 3, yy, w - 6, 1, rgba('#05d9e8', 0.25));
        rect(ctx, x, top + 18, 1, HORIZON - top - 18, '#f9f871');
        rect(ctx, x + w - 1, top + 18, 1, HORIZON - top - 18, '#f9f871');
        rect(ctx, x + 6, top + 4, w - 12, 2, '#ff2a6d');
        rect(ctx, 0, HORIZON, W, STREET - HORIZON, '#100820');
        drawBuildings(ctx, mid, STREET, '#0f0820', '#1d1236', { colors: ['#f9f871', '#ff2a6d', '#05d9e8', '#ffb86b'], density: 0.42, cellW: 3, cellH: 4, winW: 2 });
        // street
        rect(ctx, 0, STREET, W, ROAD - STREET, '#1a1028');
        haze(ctx, STREET - 6, ROAD + 2, '#ff2a6d', 0.12);
        rect(ctx, 0, STREET, W, 1, '#3a2458');
        rect(ctx, 0, ROAD, W, H - ROAD, '#08050f');
        for (let xx = 0; xx < W; xx += 24) rect(ctx, xx, 251, 12, 1, '#3b2a55');
      },
      drawFrame(ctx: Ctx, t: number) {
        // searchlights from the megatower
        for (let i = 0; i < 2; i++) {
          const a = -Math.PI / 2 + wave(t, 3 + i, i * 0.3) * 0.55;
          beam(ctx, tower.x + tower.w / 2, tower.top - 12, a, 220, 0.04, '#9fe8ff', 0.16);
        }
        if (tick(t, 240) % 2) {
          px(ctx, tower.x + 17, tower.top - 15, '#ff3050');
          glow(ctx, tower.x + 17, tower.top - 15, 5, '#ff3050', 0.6);
        }

        // holo-koi crossing the sky, once per loop
        const kx = lane(t, 1, 0.1, 1, W + 200);
        const ky = 70 + wave(t, 6) * 10;
        holoKoi(ctx, kx, ky, t);

        // AV traffic lanes
        for (let i = 0; i < 12; i++) {
          const y = 52 + (i % 6) * 18 + Math.floor(hash2(i, 3) * 6);
          const dir = i % 2 ? 1 : -1;
          const x = lane(t, 2 + (i % 4), hash2(i, 7), dir);
          flyer(ctx, x, y, dir, '#2b1f40', '#fff2c0', dir > 0 ? '#ff2a4a' : '#ff8a2a');
        }
        const bx = lane(t, 3, 0.5, -1, W + 120);
        flyer(ctx, bx, 176, -1, '#382650', '#ffffff', '#ff2a4a', true);

        blink(ctx, blinkers, t, '#f9f871', '#0f0820');

        for (const s of signs) vsign(ctx, s.x, s.y, s.n, s.color, flicker(t, s.seed, s.bad ? 0.25 : 0.02), s.seed);
        for (const f of fronts) {
          const on = flicker(t, f.x, 0.03);
          rect(ctx, f.x - 2, f.y - 2, textWidth(f.s) + 4, 9, '#07040c');
          neonText(ctx, f.s, f.x, f.y, f.color, on);
        }

        reflect(ctx, ROAD, t, 0.35, H - ROAD, '#06030c');

        crowd(ctx, t, 11, 16, STREET + 6, ['#3a2450', '#4a2a3e', '#2a3450']);

        for (let i = 0; i < 5; i++) {
          const dir = i % 2 ? 1 : -1;
          const y = dir > 0 ? 246 : 262;
          car(ctx, lane(t, 3 + i, hash2(i, 9), dir, W + 80), y, dir, ['#2a1d3a', '#3a1530', '#1a2a3a'][i % 3]);
        }
        // puddle shimmer
        for (let i = 0; i < 12; i++) {
          const a = 0.3 + 0.3 * wave(t, 40 + i, hash2(i, 2));
          ctx.globalAlpha = a;
          rect(ctx, hash2(i, 13) * W, 238 + hash2(i, 14) * 28, 6 + hash2(i, 15) * 10, 1, ['#ff2a6d', '#05d9e8', '#f9f871'][i % 3]);
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

function holoKoi(ctx: Ctx, x: number, y: number, t: number): void {
  const len = 70;
  const sway = (i: number) => Math.sin(phase(t, 50) * Math.PI * 2 - i * 0.12) * (i / len) * 6;
  glow(ctx, x - len / 2, y, 50, '#05d9e8', 0.12);
  const on = 0.55 + 0.15 * wave(t, 480);
  for (let i = 0; i < len; i++) {
    const thick = i < 10 ? 4 + i * 0.6 : i < 45 ? 10 - (i - 10) * 0.12 : Math.max(1, 6 - (i - 45) * 0.25);
    const cx = x - i;
    const cy = y + sway(i);
    for (let j = -Math.floor(thick); j <= Math.floor(thick); j++) {
      if ((Math.floor(cy) + j + tick(t, 1200)) % 3 === 0) continue; // scanlines
      const spot = hash2(Math.floor(i / 6), j > 0 ? 1 : 2) > 0.6 && i > 8 && i < 50;
      ctx.globalAlpha = on * (spot ? 0.75 : 0.45);
      px(ctx, cx, cy + j, spot ? '#ff8a3a' : '#7ff6ff');
    }
  }
  // tail fins
  const tx = x - len;
  const ty = y + sway(len);
  for (let k = 0; k < 14; k++) {
    ctx.globalAlpha = on * 0.4 * (1 - k / 14);
    px(ctx, tx - k, ty - k * 0.8 + wave(t, 60) * 2, '#7ff6ff');
    px(ctx, tx - k, ty + k * 0.8 + wave(t, 60) * 2, '#7ff6ff');
  }
  ctx.globalAlpha = 1;
}
