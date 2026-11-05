import { W, H, type Ctx, phase, wave, tick, hash2, randInt, rgba } from '../scene/core';
import {
  sky, stars, rect, px, glow, beam, haze, line, genSkyline, drawBuildings, pickBlinkers, blink, car, reflect,
  ripples, lane, flicker, glyphs, vgrad,
} from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const BAY = 150; // waterline of Tokyo Bay
const ROAD = 185; // elevated highway road surface
const WATER_DEPTH = ROAD - 3 - BAY;

interface Tower { x: number; w: number; top: number; twin?: boolean }
const TOWERS: Tower[] = [
  { x: 34, w: 14, top: 62 },
  { x: 92, w: 10, top: 78 },
  { x: 146, w: 24, top: 36, twin: true },
  { x: 212, w: 12, top: 56 },
  { x: 258, w: 16, top: 72 },
  { x: 298, w: 9, top: 86 },
];
const SEARCH = [TOWERS[0], TOWERS[2], TOWERS[3]];

const STADIUM = { cx: 405, half: 64, h: 24 };
const CRANES = [
  { x: 358, top: 74, jib: 30, dir: 1, off: 0 },
  { x: 410, top: 60, jib: 38, dir: -1, off: 0.3 },
  { x: 452, top: 86, jib: 26, dir: 1, off: 0.65 },
];
const LAMPS = Array.from({ length: 10 }, (_, i) => 18 + i * 48);
const PILLARS = Array.from({ length: 8 }, (_, i) => 30 + i * 64);
const BIKE_COLS = ['#e8262e', '#d8d8e0', '#3a6aff', '#ffb020', '#8a8a9a', '#c03aff'];

export const neoTokyo: WorldDef = {
  id: 'neo-tokyo',
  name: 'Neo-Tokyo',
  source: 'Akira (1988)',
  creator: 'Katsuhiro Otomo',
  tagline: 'Tail lights smear red along the bay highway',
  era: '2019',
  hourOffset: 0,
  accent: '#e8262e',
  accent2: '#3aa0ff',
  weathers: ['clear', 'rain', 'smog'],
  music: STYLES.neoTokyo,
  ambience: [
    { id: 'bikes', label: 'Biker gang', kind: 'bikes', gain: 0.6 },
    { id: 'sirens', label: 'Police sirens', kind: 'siren', gain: 0.35 },
    { id: 'wind', label: 'Bay wind', kind: 'wind', gain: 0.35 },
    { id: 'traffic', label: 'Highway traffic', kind: 'traffic', gain: 0.45 },
  ],
  create(rng) {
    const far = genSkyline(rng, { baseY: BAY, x0: -10, x1: 340, minW: 5, maxW: 14, minH: 10, maxH: 44, antennaChance: 0.3, stepChance: 0.25 });
    const blinkers = pickBlinkers(rng, far, BAY, 50);
    const boards = far.filter((b) => b.w >= 8 && rng() < 0.3).map((b) => ({
      x: b.x + 1,
      y: b.top + randInt(rng, 3, 10),
      n: Math.floor((b.w - 2) / 4),
      color: ['#ff2a3a', '#3aa0ff', '#ffffff', '#ff8a2a'][randInt(rng, 0, 3)],
      seed: randInt(rng, 1, 1e6),
    }));
    const clouds = Array.from({ length: 9 }, () => ({ x: rng() * W, y: 12 + rng() * 80, w: 60 + rng() * 120, h: 3 + randInt(rng, 1, 4) }));

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#03040c'], [0.5, '#0a0c22'], [0.8, '#1c1030'], [1, '#4a1628']], BAY);
        stars(ctx, rng, 60, 90, ['#ffffff', '#c8d8ff']);
        for (const c of clouds) {
          for (let j = 0; j < c.h; j++) {
            const k = 1 - Math.abs(j - (c.h - 1) / 2) / c.h;
            rect(ctx, c.x - (c.w * k) / 2, c.y + j, c.w * k, 1, rgba(j < c.h / 2 ? '#2a1838' : '#4a1a34', 0.35));
          }
        }
        glow(ctx, 170, BAY, 170, '#ff3a3a', 0.16);
        haze(ctx, 104, 160, '#ff3a3a', 0.16);
        drawBuildings(ctx, far, BAY, '#0d1024', '#1a1e3c', { colors: ['#ffcf7a', '#9ad0ff', '#ff6a5a'], density: 0.26, cellW: 2, cellH: 3 });

        // tall towers
        for (const tw of TOWERS) {
          rect(ctx, tw.x, tw.top, tw.w, BAY - tw.top, '#0a0c1c');
          rect(ctx, tw.x + 2, tw.top - 6, tw.w - 4, 6, '#0a0c1c');
          rect(ctx, tw.x, tw.top, 1, BAY - tw.top, '#232a52');
          if (tw.twin) {
            rect(ctx, tw.x + 3, tw.top - 22, 5, 16, '#0a0c1c');
            rect(ctx, tw.x + tw.w - 8, tw.top - 22, 5, 16, '#0a0c1c');
            rect(ctx, tw.x + 5, tw.top - 30, 1, 8, '#0a0c1c');
            rect(ctx, tw.x + tw.w - 6, tw.top - 30, 1, 8, '#0a0c1c');
          } else {
            rect(ctx, tw.x + Math.floor(tw.w / 2), tw.top - 14, 1, 8, '#0a0c1c');
          }
          for (let y = tw.top + 3; y < BAY - 2; y += 3) {
            for (let x = tw.x + 2; x < tw.x + tw.w - 1; x += 2) {
              const v = hash2(tw.x * 7 + x, y);
              if (v < 0.42) px(ctx, x, y, v < 0.08 ? '#ffffff' : v < 0.3 ? '#ffd890' : '#7aa8ff');
            }
          }
        }

        // the Olympic stadium, half built
        const { cx, half, h } = STADIUM;
        for (let x = cx - half; x <= cx + half; x++) {
          const k = (x - cx) / half;
          const top = Math.round(BAY - h * Math.sqrt(Math.max(0, 1 - k * k)) - 4);
          const built = x < cx + half * 0.45;
          if (built) rect(ctx, x, top, 1, BAY - top, '#0e1226');
          else if (x % 4 === 0) rect(ctx, x, top, 1, BAY - top, '#1a2040');
          if (x % 3 === 0) px(ctx, x, top, built ? '#fff0b0' : '#ffb050');
        }
        for (let y = BAY - 20; y < BAY; y += 5) rect(ctx, cx - half + 6, y, half * 2 - 12, 1, rgba('#3a4a8a', 0.5));
        glow(ctx, cx, BAY - h, 50, '#9ad0ff', 0.18);
        for (const c of CRANES) {
          rect(ctx, c.x - 1, c.top, 3, BAY - c.top, '#141a34');
          for (let y = c.top + 2; y < BAY; y += 4) px(ctx, c.x, y, '#060814');
          rect(ctx, c.x - 2, c.top - 2, 5, 3, '#1e2648');
          rect(ctx, c.x, c.top - 10, 1, 8, '#141a34');
        }

        // bay water
        rect(ctx, 0, BAY, W, H - BAY, '#04060f');
        rect(ctx, 0, BAY, W, 1, '#1a1e3c');

        // elevated highway deck and pillars
        rect(ctx, 0, ROAD + 3, W, 6, '#1a1c2a');
        rect(ctx, 0, ROAD + 3, W, 1, '#3a3e58');
        rect(ctx, 0, ROAD + 9, W, 2, '#0a0b14');
        for (const x of PILLARS) {
          rect(ctx, x - 3, ROAD + 9, 14, 3, '#151622');
          rect(ctx, x, ROAD + 12, 8, H - ROAD - 12, '#10111c');
          rect(ctx, x, ROAD + 12, 1, H - ROAD - 12, '#22253a');
        }
        for (let x = 0; x < W; x += 12) px(ctx, x, ROAD + 6, '#2a2e44');
      },

      drawFrame(ctx: Ctx, t: number) {
        // searchlights sweeping the clouds
        SEARCH.forEach((tw, i) => {
          const a = -Math.PI / 2 + wave(t, 2 + i, i * 0.33) * 0.6;
          beam(ctx, tw.x + tw.w / 2, tw.top - 8, a, 220, 0.035, '#cfe4ff', 0.13);
        });
        // aviation lights
        for (let i = 0; i < TOWERS.length; i++) {
          const tw = TOWERS[i];
          if ((tick(t, 160) + i) % 3 !== 0) continue;
          const top = tw.twin ? tw.top - 30 : tw.top - 14;
          const x = tw.twin ? tw.x + 5 : tw.x + Math.floor(tw.w / 2);
          px(ctx, x, top, '#ff3030');
          glow(ctx, x, top, 5, '#ff3030', 0.6);
          if (tw.twin) {
            px(ctx, tw.x + tw.w - 6, top, '#ff3030');
            glow(ctx, tw.x + tw.w - 6, top, 5, '#ff3030', 0.6);
          }
        }
        blink(ctx, blinkers, t, '#ffd890', '#0d1024', 5);

        // tower cranes turning over the stadium
        for (let i = 0; i < CRANES.length; i++) crane(ctx, CRANES[i], t, i);

        // a police helicopter over the city
        const hx = 120 + wave(t, 2) * 80;
        const hy = 46 + wave(t, 6) * 5;
        beam(ctx, hx, hy + 3, Math.PI / 2 + wave(t, 7, 0.2) * 0.35, 120, 0.06, '#e8f0ff', 0.13);
        rect(ctx, hx - 5, hy - 1, 10, 3, '#1a1c2c');
        rect(ctx, hx + 5, hy, 7, 1, '#1a1c2c');
        rect(ctx, tick(t, 4800) % 2 ? hx - 9 : hx - 4, hy - 3, tick(t, 4800) % 2 ? 18 : 8, 1, '#3a3e58');
        px(ctx, hx + 11, hy - 1, tick(t, 480) % 2 ? '#ff3030' : '#30ff60');
        // airliner lights far off
        for (let i = 0; i < 2; i++) {
          const ax = lane(t, 2 + i, i * 0.5, i ? 1 : -1, W + 40);
          const ay = 24 + i * 18;
          px(ctx, ax, ay, '#ffffff');
          if (tick(t, 240) % 2) px(ctx, ax + 1, ay, '#ff3030');
        }

        for (const b of boards) {
          const on = flicker(t, b.seed, 0.04);
          rect(ctx, b.x - 1, b.y - 1, b.n * 4 + 1, 7, '#05060e');
          if (on) glow(ctx, b.x + b.n * 2, b.y + 2, b.n * 4 + 4, b.color, 0.25);
          ctx.globalAlpha = on ? 1 : 0.25;
          glyphs(ctx, b.seed + tick(t, 24), b.x, b.y, b.n, b.color, false);
          ctx.globalAlpha = 1;
        }

        reflect(ctx, BAY, t, 0.6, WATER_DEPTH);
        vgrad(ctx, 0, BAY, W, WATER_DEPTH, [[0, rgba('#03050e', 0.15)], [1, rgba('#03050e', 0.55)]]);
        ripples(ctx, t, BAY + 2, ROAD - 4, 30, '#ffb070');

        // a ferry crossing the bay
        const fx = lane(t, 2, 0.2, -1, W + 80);
        rect(ctx, fx - 10, 166, 22, 3, '#0c0e1a');
        rect(ctx, fx - 6, 163, 13, 3, '#14182a');
        for (let k = 0; k < 4; k++) px(ctx, fx - 5 + k * 3, 164, '#ffe0a0');
        px(ctx, fx - 10, 166, '#ff3030');
        ctx.globalAlpha = 0.35;
        rect(ctx, fx - 6, 170 + (tick(t, 480) % 2), 13, 1, '#ffd890');
        ctx.globalAlpha = 1;

        // rear railing and lamp posts
        rect(ctx, 0, ROAD - 3, W, 1, '#2a2e44');
        for (const x of LAMPS) {
          rect(ctx, x, ROAD - 17, 1, 15, '#2a2e44');
          rect(ctx, x, ROAD - 17, 4, 1, '#2a2e44');
          px(ctx, x + 3, ROAD - 16, '#ffc070');
          glow(ctx, x + 3, ROAD - 14, 11, '#ffa040', 0.32);
        }

        // ordinary traffic
        for (let i = 0; i < 6; i++) {
          const dir = i % 2 ? 1 : -1;
          const y = dir > 0 ? ROAD + 2 : ROAD;
          car(ctx, lane(t, 4 + i, hash2(i, 9), dir, W + 80), y, dir, ['#2a2c40', '#3a1a22', '#1e2a3a'][i % 3]);
        }

        bikes(ctx, t);

        // front parapet with reflectors
        rect(ctx, 0, ROAD + 1, W, 2, '#2c3048');
        for (let x = 6; x < W; x += 24) px(ctx, x, ROAD + 1, '#ffb050');

        // sodium light shimmering on the dark water under the highway
        for (let i = 0; i < LAMPS.length; i++) {
          for (let j = 0; j < 6; j++) {
            const a = 0.25 + 0.25 * wave(t, 24 + j * 4 + (i % 3), hash2(i, j));
            const w = 2 + Math.round(2 * (0.5 + 0.5 * wave(t, 18 + j, hash2(j, i))));
            ctx.globalAlpha = a;
            rect(ctx, LAMPS[i] + 3 - w / 2, ROAD + 14 + j * 9, w, 1, '#ffa040');
          }
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

function crane(ctx: Ctx, c: (typeof CRANES)[number], t: number, i: number): void {
  const ang = ((c.dir > 0 ? phase(t, 1) : 1 - phase(t, 1)) + c.off) * Math.PI * 2;
  const front = c.jib * Math.cos(ang);
  const back = -0.35 * c.jib * Math.cos(ang);
  const y = c.top - 2;
  const x0 = Math.min(c.x + back, c.x + front);
  rect(ctx, x0, y, Math.abs(front - back) + 1, 1, '#2a3260');
  rect(ctx, c.x + back - (back < 0 ? 3 : 0), y + 1, 4, 3, '#1a2040');
  line(ctx, c.x + 0.5, c.top - 10, c.x + front, y, rgba('#2a3260', 0.8));
  line(ctx, c.x + 0.5, c.top - 10, c.x + back, y, rgba('#2a3260', 0.8));
  // hook
  const hx = c.x + front * 0.7;
  const hy = y + 14 + (0.5 + 0.5 * wave(t, 6 + i * 2, c.off)) * 22;
  rect(ctx, hx, y + 1, 1, hy - y - 1, '#1e2444');
  rect(ctx, hx - 2, hy, 5, 3, ['#ff6a30', '#3a8aff', '#ffd040'][i]);
  // tip light
  const on = (tick(t, 240) + i) % 2;
  px(ctx, c.x + front, y, on ? '#ff3030' : '#401010');
  if (on) glow(ctx, c.x + front, y, 4, '#ff3030', 0.6);
  px(ctx, c.x, c.top - 11, '#ff3030');
}

/** The biker gang, every 20 seconds: red tail lights leave long weaving trails. */
function bikes(ctx: Ctx, t: number): void {
  const p = phase(t, 12);
  if (p > 0.32) return;
  const q = p / 0.32;
  const lead = -40 + q * (W + 330);
  for (let i = 5; i >= 0; i--) {
    const x = lead - i * 26 - Math.floor(hash2(i, 3) * 12);
    if (x < -10 || x > W + 150) continue;
    const base = ROAD + 2 - (i % 2);
    const yOf = (xx: number) => base + Math.round(Math.sin(xx * 0.035 + i * 1.7) * 1.2);
    const len = i === 0 ? 150 : 70 + hash2(i, 4) * 50;
    const th = i === 0 ? 2 : 1;
    // trail
    const n = Math.floor(len / 5);
    for (let s = 0; s < n; s++) {
      const xs = x - 5 - s * 5;
      if (xs < -5) break;
      ctx.globalAlpha = 0.9 * (1 - s / n);
      rect(ctx, xs - 5, yOf(xs) - 4, 5, th, s < 3 ? '#ff6050' : '#ff1a28');
    }
    ctx.globalAlpha = 1;
    glow(ctx, x - 4, yOf(x) - 4, i === 0 ? 10 : 6, '#ff3a3a', 0.6);
    bike(ctx, x, yOf(x), BIKE_COLS[i], i === 0);
  }
}

function bike(ctx: Ctx, x: number, y: number, color: string, big: boolean): void {
  rect(ctx, x - 4, y - 2, 2, 2, '#08080c');
  rect(ctx, x + 3, y - 2, 2, 2, '#08080c');
  rect(ctx, x - 3, y - 4, 7, 2, color);
  rect(ctx, x + 1, y - 5, big ? 4 : 3, 1, color);
  if (big) rect(ctx, x - 3, y - 5, 2, 1, color);
  rect(ctx, x - 1, y - 7, 2, 3, '#1a1420');
  px(ctx, x, y - 8, big ? '#e8262e' : '#2a2030');
  px(ctx, x + 5, y - 4, '#fff6e0');
  beam(ctx, x + 5, y - 4, 0, 32, 0.08, '#fff6e0', 0.2);
  px(ctx, x - 4, y - 4, '#ff3030');
}
