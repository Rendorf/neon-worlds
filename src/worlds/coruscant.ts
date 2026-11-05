import { W, H, type Ctx, phase, wave, tick, hash2, mix } from '../scene/core';
import { sky, rect, px, glow, haze, poly, disc, flyer, genSkyline, drawWindows, type Building, randInt } from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const SUN_X = 300;
const SUN_Y = 138;
const TEMPLE_X = 150;
const SENATE_X = 398;
const BASE = 200;

interface Lane {
  y: number;
  slope: number;
  dir: number;
  k: number;
  n: number;
  size: number;
  seed: number;
}

interface Win {
  x: number;
  y: number;
  thr: number;
  color: string;
}

export const coruscant: WorldDef = {
  id: 'coruscant',
  name: 'Coruscant',
  source: 'Star Wars',
  creator: 'George Lucas; Lucasfilm',
  tagline: 'Skylanes at dusk over a city that covers a world',
  era: '19 BBY',
  hourOffset: 5,
  accent: '#ff9a4a',
  accent2: '#b46cff',
  weathers: ['clear', 'rain', 'smog'],
  music: STYLES.coruscant,
  ambience: [
    { id: 'skylanes', label: 'Skylanes', kind: 'speeders', gain: 0.55 },
    { id: 'wind', label: 'High wind', kind: 'wind', gain: 0.35 },
    { id: 'ships', label: 'Starships', kind: 'thrum', gain: 0.45 },
    { id: 'city', label: 'City hum', kind: 'hum', gain: 0.3 },
  ],
  create(rng) {
    const far = genSkyline(rng, { baseY: BASE, minW: 3, maxW: 9, minH: 6, maxH: 34, antennaChance: 0.3 });
    const mid = genSkyline(rng, { baseY: BASE + 4, minW: 5, maxW: 13, minH: 16, maxH: 64, antennaChance: 0.4, stepChance: 0.3 });
    const near = genSkyline(rng, { baseY: BASE + 14, minW: 8, maxW: 20, minH: 30, maxH: 100, gap: 1, antennaChance: 0.3, stepChance: 0.2 })
      .filter((b) => !overlaps(b, TEMPLE_X - 72, TEMPLE_X + 72, 22) && !overlaps(b, SENATE_X - 48, SENATE_X + 48, 14) && !overlaps(b, SUN_X - 30, SUN_X + 30, 44));
    // giant foreground towers framing the view
    const giants: Building[] = [
      { x: -4, w: 34, h: 210, top: 60, seed: 11, antenna: 18, step: 0 },
      { x: 30, w: 20, h: 150, top: 120, seed: 12, antenna: 0, step: 4 },
      { x: 444, w: 40, h: 230, top: 40, seed: 13, antenna: 12, step: 6 },
      { x: 420, w: 22, h: 140, top: 130, seed: 14, antenna: 8, step: 0 },
    ].map((b) => ({ ...b, top: H - b.h }));
    const low = genSkyline(rng, { baseY: H, minW: 10, maxW: 30, minH: 40, maxH: 86, gap: 1, antennaChance: 0.3 });
    const caps = new Map<Building, number>();
    for (const b of [...far, ...mid, ...near, ...giants]) caps.set(b, randInt(rng, 0, 3));
    for (const b of low) caps.set(b, rng() < 0.2 ? 1 : 0);

    // windows that come on as dusk deepens
    const wins: Win[] = [];
    const winCols = ['#ffd890', '#fff4d0', '#ffb070', '#a8dcff'];
    for (const b of [...near, ...giants, ...low]) {
      const baseY = b.top + b.h;
      for (let y = b.top + 4; y < Math.min(baseY - 2, H - 2); y += 4) {
        for (let x = b.x + 2; x < b.x + b.w - 2; x += 3) {
          if (rng() > 0.16) continue;
          wins.push({ x, y, thr: rng(), color: winCols[randInt(rng, 0, 3)] });
        }
      }
    }
    const beacons = [...near, ...giants]
      .filter(() => rng() < 0.5)
      .map((b) => [b.x + Math.floor(b.w / 2), b.top - b.antenna - (b.step ? b.step * 2 : 0)] as [number, number]);

    const lanes: Lane[] = [];
    const laneYs = [58, 72, 88, 104, 120, 138, 156, 176];
    laneYs.forEach((y, i) => {
      lanes.push({
        y,
        slope: (rng() - 0.5) * 0.12,
        dir: i % 2 ? 1 : -1,
        k: 3 + Math.floor(i * 0.8) + randInt(rng, 0, 1),
        n: 22 + randInt(rng, 0, 8),
        size: i < 3 ? 1 : 2,
        seed: randInt(rng, 1, 1e6),
      });
    });

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#170a38'], [0.3, '#3a1a66'], [0.55, '#86357a'], [0.75, '#e06a50'], [0.9, '#ffa858'], [1, '#ffd68a']], BASE + 10);
        // the setting sun
        glow(ctx, SUN_X, SUN_Y, 150, '#ff9a50', 0.45);
        glow(ctx, SUN_X, SUN_Y, 60, '#fff0b0', 0.55);
        disc(ctx, SUN_X, SUN_Y, 32, '#ffe2a0');
        disc(ctx, SUN_X, SUN_Y, 29, '#fff6d0');
        // long thin clouds across the sun
        for (let i = 0; i < 6; i++) {
          const y = 120 + i * 6 + randInt(rng, -1, 1);
          const w = randInt(rng, 60, 140);
          ctx.globalAlpha = 0.35 + rng() * 0.25;
          rect(ctx, SUN_X - w / 2 + randInt(rng, -40, 40), y, w, 1, i % 2 ? '#e0707a' : '#c85a78');
        }
        ctx.globalAlpha = 1;

        // atmospheric layers of towers to the horizon
        drawLayer(ctx, far, caps, '#c86e7c', null, null);
        haze(ctx, 170, 215, '#ffa060', 0.3);
        drawLayer(ctx, mid, caps, '#8c4272', '#d47a88', { colors: ['#ffd890', '#ffeccc'], density: 0.1, cellW: 3, cellH: 4 });
        haze(ctx, 176, 220, '#ff8a5a', 0.22);

        senate(ctx);
        temple(ctx);
        drawLayer(ctx, near, caps, '#40204e', '#b0507a', { colors: ['#ffcf80', '#ffe8c0', '#ff9a60'], density: 0.12, cellW: 3, cellH: 4 });
        haze(ctx, 190, 240, '#3a1446', 0.5);
        drawLayer(ctx, low, caps, '#1c0b24', '#5a2a5a', { colors: ['#ffcf80', '#ff9a60'], density: 0.1, cellW: 3, cellH: 4 });
        drawLayer(ctx, giants, caps, '#1a0a22', '#7a3a6a', { colors: ['#ffcf80', '#ffe8c0'], density: 0.08, cellW: 3, cellH: 4 });
      },
      drawFrame(ctx: Ctx, t: number) {
        // drifting high cloud wisps
        for (let i = 0; i < 5; i++) {
          const w = 50 + Math.floor(hash2(i, 1) * 60);
          const x = ((hash2(i, 2) + phase(t, 1 + (i % 2))) % 1) * (W + w + 40) - w - 20;
          const y = 34 + i * 17 + Math.floor(hash2(i, 3) * 6);
          ctx.globalAlpha = 0.18;
          rect(ctx, x, y, w, 1, '#ffb0a0');
          rect(ctx, x + w * 0.2, y + 1, w * 0.6, 1, '#d070a0');
        }
        ctx.globalAlpha = 1;

        // a capital ship crossing high above, slowly
        const sx = W + 50 - phase(t, 1) * (W + 100);
        capitalShip(ctx, sx, 30 + wave(t, 2) * 2, t);

        // shuttles rising to orbit
        for (let i = 0; i < 3; i++) {
          const p = (phase(t, 5 + i) + hash2(i, 31)) % 1;
          const x0 = 60 + hash2(i, 32) * 360;
          const x = x0 + p * (40 + i * 20) * (i % 2 ? 1 : -1);
          const y = BASE - p * 190;
          const fade = Math.min(1, (1 - p) * 4);
          for (let j = 1; j < 14; j++) {
            ctx.globalAlpha = fade * 0.35 * (1 - j / 14);
            px(ctx, x - j * (40 + i * 20) * (i % 2 ? 1 : -1) / 190 * 2, y + j * 2, '#a8d8ff');
          }
          ctx.globalAlpha = fade;
          rect(ctx, x - 1, y - 1, 3, 2, '#e8e0ff');
          glow(ctx, x, y + 1, 5, '#a8d8ff', 0.5 * fade);
          ctx.globalAlpha = 1;
        }

        // skylanes: white stream one way, red the other
        for (let li = 0; li < lanes.length; li++) {
          const L = lanes[li];
          const head = L.dir > 0 ? '#fff2c8' : '#ff5a48';
          const span = W + 40;
          for (let i = 0; i < L.n; i++) {
            if (hash2(L.seed, i) < 0.15) continue;
            const p = (hash2(i, L.seed) + L.dir * phase(t, L.k) + 2) % 1;
            const x = p * span - 20;
            const y = L.y + L.slope * (x - W / 2) + (hash2(L.seed + 1, i) < 0.3 ? 1 : 0);
            ctx.globalAlpha = L.size === 1 ? 0.7 : 0.9;
            rect(ctx, x, y, L.size + 1, L.size === 1 ? 1 : 1, head);
            if (L.size > 1) px(ctx, x + (L.dir > 0 ? -1 : 3), y, mix(head, '#000000', 0.4));
          }
        }
        ctx.globalAlpha = 1;
        // a few close speeders
        for (let i = 0; i < 4; i++) {
          const dir = i % 2 ? 1 : -1;
          const x = (hash2(i, 41) + phase(t, 6 + i * 2)) % 1;
          const xx = dir > 0 ? -30 + x * (W + 60) : W + 30 - x * (W + 60);
          flyer(ctx, xx, 150 + i * 11, dir, ['#5a2a5a', '#3a2050', '#6a3060', '#2a1640'][i], '#fff2c8', '#ff4a3a', i === 3);
        }

        // windows coming on as dusk deepens (and off again toward the loop's end)
        const lit = 0.25 + 0.6 * (0.5 - 0.5 * Math.cos(phase(t, 1) * Math.PI * 2));
        for (const w of wins) {
          if (w.thr > lit) continue;
          ctx.globalAlpha = Math.min(1, (lit - w.thr) * 8);
          px(ctx, w.x, w.y, w.color);
        }
        ctx.globalAlpha = 1;

        // beacon lights on the tower tops
        for (let i = 0; i < beacons.length; i++) {
          if ((tick(t, 120) + i) % 3) continue;
          px(ctx, beacons[i][0], beacons[i][1], '#ff4a4a');
          glow(ctx, beacons[i][0], beacons[i][1], 4, '#ff4a4a', 0.6);
        }

        // temple spire glints catching the sun
        const g = 0.5 + 0.5 * wave(t, 4);
        glow(ctx, TEMPLE_X + 1, 98, 6, '#ffe0a0', 0.35 * g);
      },
    };
  },
};

function overlaps(b: Building, x0: number, x1: number, maxH: number): boolean {
  return b.x + b.w > x0 && b.x < x1 && b.h > maxH;
}

function drawLayer(
  ctx: Ctx,
  bs: Building[],
  caps: Map<Building, number>,
  body: string,
  edge: string | null,
  win: { colors: string[]; density: number; cellW: number; cellH: number } | null,
): void {
  for (const b of bs) {
    const baseY = b.top + b.h;
    rect(ctx, b.x, b.top, b.w, baseY - b.top, body);
    const cap = caps.get(b) ?? 0;
    let topY = b.top;
    if (cap === 1 && b.w > 4) {
      // pointed crown
      poly(ctx, [b.x, b.top, b.x + b.w, b.top, b.x + b.w / 2, b.top - b.w * 0.8], body);
      topY = b.top - b.w * 0.8;
    } else if (cap === 2 && b.w > 5) {
      // rounded cap
      const r = Math.floor(b.w / 2);
      for (let dy = 0; dy < r; dy++) {
        const half = Math.floor(Math.sqrt(r * r - (r - dy) * (r - dy)));
        rect(ctx, b.x + r - half, b.top - r + dy, half * 2 + (b.w % 2), 1, body);
      }
      topY = b.top - r;
    } else if (b.step) {
      rect(ctx, b.x + b.step, b.top - b.step * 2, b.w - b.step * 2, b.step * 2, body);
      topY = b.top - b.step * 2;
    }
    if (b.antenna) rect(ctx, b.x + Math.floor(b.w / 2), topY - b.antenna, 1, b.antenna, body);
    // the sun side catches the light
    if (edge) {
      const lx = b.x + b.w / 2 < SUN_X ? b.x + b.w - 1 : b.x;
      ctx.globalAlpha = 0.7;
      rect(ctx, lx, b.top, 1, baseY - b.top, edge);
      ctx.globalAlpha = 1;
    }
    if (win) drawWindows(ctx, b, Math.min(baseY, H), win);
  }
}

function temple(ctx: Ctx): void {
  const body = '#33183f';
  const lit = '#c0607e';
  // five spires (rear pair first, paler with distance)
  const spires: [number, number, number, string][] = [
    [-10, 28, 6, '#5a2a5a'],
    [10, 28, 6, '#5a2a5a'],
    [-22, 24, 7, body],
    [22, 24, 7, body],
    [0, 46, 9, body],
  ];
  const top = BASE - 54;
  for (const [dx, h, w, col] of spires) {
    const x = TEMPLE_X + dx;
    poly(ctx, [x - w / 2, top + 2, x + w / 2, top + 2, x + 1.5, top - h + 8, x, top - h, x - 1.5, top - h + 8], col);
    // fluting and the lit flank
    ctx.globalAlpha = 0.6;
    rect(ctx, x + 1, top - h + 8, 1, h - 6, lit);
    ctx.globalAlpha = 1;
  }
  // the stepped ziggurat
  for (let i = 0; i < 6; i++) {
    const w = 140 - i * 17;
    const y = BASE - (i + 1) * 9;
    rect(ctx, TEMPLE_X - w / 2, y, w, 9, body);
    rect(ctx, TEMPLE_X - w / 2, y, w, 1, '#5a2a5e');
    ctx.globalAlpha = 0.8;
    rect(ctx, TEMPLE_X + w / 2 - 2, y, 2, 9, lit);
    ctx.globalAlpha = 1;
    // vertical ribs
    for (let x = TEMPLE_X - w / 2 + 4; x < TEMPLE_X + w / 2 - 4; x += 6) rect(ctx, x, y + 2, 1, 6, '#26112f');
  }
  // the great doorway glow at the base
  rect(ctx, TEMPLE_X - 6, BASE - 8, 12, 8, '#ffbf70');
  glow(ctx, TEMPLE_X, BASE - 4, 16, '#ffbf70', 0.4);
}

function senate(ctx: Ctx): void {
  const body = '#3c1c4a';
  // plaza
  rect(ctx, SENATE_X - 48, BASE - 6, 96, 6, body);
  rect(ctx, SENATE_X - 48, BASE - 6, 96, 1, '#9a4a72');
  // tapered stem
  poly(ctx, [SENATE_X - 16, BASE - 6, SENATE_X + 16, BASE - 6, SENATE_X + 26, BASE - 20, SENATE_X - 26, BASE - 20], body);
  // the broad, flat dome
  const rx = 40;
  const ry = 8;
  for (let dy = 0; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - ((ry - dy) / ry) ** 2));
    rect(ctx, SENATE_X - half, BASE - 20 - ry + dy, half * 2, 1, body);
  }
  // sunset rim and a ring of lights
  rect(ctx, SENATE_X - 14, BASE - 29, 28, 1, '#e08a90');
  rect(ctx, SENATE_X - rx, BASE - 20, rx * 2, 1, '#7a3a6a');
  for (let i = -36; i <= 36; i += 6) px(ctx, SENATE_X + i, BASE - 19, '#ffd890');
}

function capitalShip(ctx: Ctx, x: number, y: number, t: number): void {
  if (x < -60 || x > W + 60) return;
  glow(ctx, x, y, 30, '#b46cff', 0.12);
  // a long wedge, nose to the left (its direction of travel)
  poly(ctx, [x - 30, y + 3, x + 22, y - 3, x + 24, y + 6, x + 18, y + 8], '#4a2a62');
  rect(ctx, x + 10, y - 6, 6, 3, '#4a2a62');
  rect(ctx, x + 12, y - 8, 2, 2, '#4a2a62');
  ctx.globalAlpha = 0.6;
  rect(ctx, x - 20, y + 4, 40, 1, '#a070c0');
  ctx.globalAlpha = 1;
  // engines and running lights
  glow(ctx, x + 24, y + 3, 6, '#9fd0ff', 0.6);
  px(ctx, x + 24, y + 2, '#e0f0ff');
  px(ctx, x + 24, y + 4, '#e0f0ff');
  if (tick(t, 120) % 2) px(ctx, x - 29, y + 3, '#ff6a5a');
}
