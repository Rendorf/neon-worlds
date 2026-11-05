import { W, H, type Ctx, phase, wave, tick, hash2, randInt, rgba, mix } from '../scene/core';
import {
  sky, rect, px, glow, line, genSkyline, drawBuildings, pickBlinkers, blink, neonText, textWidth, vsign, flicker,
  crowd, reflect, lane,
} from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const STREET = 200;
const ROADY = STREET + 9;
const ROOF_MARGIN = 8; // rooftop clutter never rises more than this above a block

const COFFIN = { x: 300, w: 66, top: 92 };
const CRANES = [
  { x: 18, top: 56, off: 0 },
  { x: 112, top: 66, off: 0.4 },
];

interface Front { x: number; w: number; s: string; c: string; arcade?: boolean }
const FRONTS: Front[] = [
  { x: 6, w: 44, s: 'ARCADE', c: '#ff3d7f', arcade: true },
  { x: 56, w: 28, s: 'BAR', c: '#9ad8ff' },
  { x: 90, w: 50, s: 'SIMSTIM', c: '#c8ff3a', arcade: true },
  { x: 148, w: 40, s: 'CLINIC', c: '#6affd8' },
  { x: 196, w: 44, s: 'ARCADE', c: '#ffb03a', arcade: true },
  { x: 248, w: 40, s: 'PAWN', c: '#ff6a3a' },
  { x: 374, w: 44, s: 'ARCADE', c: '#c07aff', arcade: true },
  { x: 424, w: 52, s: 'NOODLES', c: '#ff3d3d' },
];
const SCREEN_COLS = ['#ff3d7f', '#3dd8ff', '#c8ff3a', '#ffb03a', '#ffffff', '#7a5aff'];
const CAPSULE_COLS = ['#ffcf8a', '#9ad8ff', '#5a7aff', '#ff8ab8'];

export const chibaCity: WorldDef = {
  id: 'chiba-city',
  name: 'Chiba City',
  source: 'Neuromancer (1984)',
  creator: 'William Gibson',
  tagline: 'The sky is a dead channel; the arcades never close',
  era: '2035',
  hourOffset: -1,
  accent: '#ff3d7f',
  accent2: '#9ad8ff',
  weathers: ['clear', 'rain', 'data-rain'],
  music: STYLES.chiba,
  ambience: [
    { id: 'static', label: 'Dead channel', kind: 'static', gain: 0.35 },
    { id: 'arcade', label: 'Arcades', kind: 'arcade', gain: 0.55 },
    { id: 'crowd', label: 'Night crowd', kind: 'crowd', gain: 0.45 },
    { id: 'hum', label: 'Port hum', kind: 'hum', gain: 0.3 },
  ],
  create(rng) {
    const far = genSkyline(rng, { baseY: STREET, minW: 10, maxW: 22, minH: 58, maxH: 100 });
    const near = genSkyline(rng, { baseY: STREET, minW: 16, maxW: 36, minH: 36, maxH: 70, gap: 1 });
    const blinkers = pickBlinkers(rng, near, STREET - 22, 40);

    // the highest solid pixel per column, so the static only falls on sky
    const topAt = new Array<number>(W).fill(STREET);
    const claim = (x0: number, w: number, top: number) => {
      for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) topAt[x] = Math.min(topAt[x], top - ROOF_MARGIN);
    };
    for (const b of far) claim(b.x, b.w, b.top);
    for (const b of near) claim(b.x, b.w, b.top);
    claim(COFFIN.x, COFFIN.w, COFFIN.top);
    const minTop = Math.min(...topAt);
    const craneFloor = CRANES.map((c) => {
      let m = STREET;
      for (let x = Math.max(0, c.x - 26); x < c.x + 58; x++) m = Math.min(m, topAt[x] + ROOF_MARGIN);
      return m;
    });

    const tanks = near.filter(() => rng() < 0.45).map((b) => ({ x: b.x + randInt(rng, 2, Math.max(2, b.w - 8)), y: b.top, w: randInt(rng, 4, 7), h: randInt(rng, 3, 6) }));
    const signs = near.filter(() => rng() < 0.65).map((b) => ({
      x: b.x + randInt(rng, 2, Math.max(2, b.w - 6)),
      y: b.top + randInt(rng, 4, 10),
      n: randInt(rng, 3, 6),
      color: ['#ff3d7f', '#3dd8ff', '#c8ff3a', '#ffb03a', '#c07aff'][randInt(rng, 0, 4)],
      seed: randInt(rng, 1, 1e6),
      bad: rng() < 0.25,
    })).filter((s) => s.y + s.n * 6 < STREET - 30 && (s.x < COFFIN.x - 4 || s.x > COFFIN.x + COFFIN.w + 2));

    const capCols = Math.floor((COFFIN.w - 4) / 4);
    const capRows = Math.floor((STREET - 22 - (COFFIN.top + 18)) / 3);
    const capsules = Array.from({ length: 56 }, () => [randInt(rng, 0, capCols - 1), randInt(rng, 0, capRows - 1)] as [number, number]);
    const capX = (c: number) => COFFIN.x + 3 + c * 4;
    const capY = (r: number) => COFFIN.top + 18 + r * 3;

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#26282c'], [0.5, '#3c3f44'], [1, '#575a60']], STREET);
        // baked grain and scanlines of the dead channel
        for (let i = 0; i < 4000; i++) {
          const g = rng();
          ctx.globalAlpha = 0.15 + rng() * 0.25;
          px(ctx, rng() * W, rng() * STREET, g < 0.5 ? '#1a1b1e' : '#c8cad0');
        }
        ctx.globalAlpha = 1;
        for (let y = 0; y < STREET; y += 2) rect(ctx, 0, y, W, 1, rgba('#000000', 0.06));

        drawBuildings(ctx, far, STREET, '#2a2c33', '#363944', { colors: ['#8a9ab0', '#c0a080'], density: 0.15, cellW: 3, cellH: 4 });
        drawBuildings(ctx, near, STREET, '#121318', '#22242c', { colors: ['#ffcf8a', '#9ad8ff', '#ff8ab8', '#e8e8f0'], density: 0.38, cellW: 3, cellH: 4, winW: 2 });
        for (const k of tanks) {
          rect(ctx, k.x, k.y - k.h, k.w, k.h, '#1a1b22');
          rect(ctx, k.x + 1, k.y - 1, 1, 1, '#0a0a0e');
          rect(ctx, k.x + k.w - 2, k.y - 1, 1, 1, '#0a0a0e');
        }
        // pipes and stair rails on the near blocks
        for (const b of near) {
          if (hash2(b.seed, 3) < 0.5) rect(ctx, b.x + b.w - 3, b.top + 2, 1, STREET - b.top - 20, '#2a2c34');
        }

        // the coffin hotel: a wall of capsules
        const { x, w, top } = COFFIN;
        rect(ctx, x, top, w, STREET - top, '#16171c');
        rect(ctx, x, top, w, 1, '#2e3038');
        rect(ctx, x, top, 1, STREET - top, '#2e3038');
        for (let r = 0; r < capRows; r++) {
          rect(ctx, x + 2, capY(r) + 2, w - 4, 1, '#24262e');
          for (let c = 0; c < capCols; c++) {
            const v = hash2(r * 41 + 7, c * 13 + 3);
            const col = v < 0.5 ? '#0a0a0e' : CAPSULE_COLS[Math.floor(hash2(c, r + 99) * hash2(r, c + 5) * CAPSULE_COLS.length)];
            ctx.globalAlpha = v < 0.5 ? 1 : 0.3 + 0.45 * hash2(r, c);
            rect(ctx, capX(c), capY(r), 3, 2, col);
          }
        }
        ctx.globalAlpha = 1;
        for (let c = 0; c < capCols; c += 5) rect(ctx, capX(c) - 1, top + 18, 1, capRows * 3, '#2e3038');

        // street, kerb and storefronts
        rect(ctx, 0, STREET, W, H - STREET, '#0c0c10');
        rect(ctx, 0, STREET, W, 1, '#2a2c34');
        rect(ctx, 0, ROADY, W, 1, '#1c1d24');
        for (let xx = 0; xx < W; xx += 26) rect(ctx, xx, 240, 13, 1, '#24252e');
        for (const f of FRONTS) {
          rect(ctx, f.x, STREET - 18, f.w, 18, '#0b0b10');
          rect(ctx, f.x, STREET - 18, f.w, 1, '#2a2c34');
          if (!f.arcade) {
            rect(ctx, f.x + 3, STREET - 14, f.w - 6, 10, mix('#0b0b10', f.c, 0.25));
            glow(ctx, f.x + f.w / 2, STREET - 8, f.w * 0.6, f.c, 0.12);
          }
          rect(ctx, f.x + f.w / 2 - 3, STREET - 10, 6, 10, mix('#0b0b10', f.c, 0.4));
        }
        // hotel lobby
        rect(ctx, COFFIN.x + 20, STREET - 12, 26, 12, '#3a3020');
        glow(ctx, COFFIN.x + 33, STREET - 6, 22, '#ffcf8a', 0.18);
      },

      drawFrame(ctx: Ctx, t: number) {
        // the dead channel: animated static that only lands on sky
        const tk = tick(t, 2400);
        for (let pass = 0; pass < 2; pass++) {
          ctx.fillStyle = pass ? '#d4d6dc' : '#141518';
          for (let i = pass * 180; i < 180 + pass * 180; i++) {
            const x = Math.floor(hash2(i, tk) * W);
            const y = Math.floor(hash2(tk, i + 999) * STREET);
            if (y >= topAt[x]) continue;
            ctx.fillRect(x, y, hash2(i, tk + 7) > 0.7 ? 2 : 1, 1);
          }
        }
        // the brighter roll band creeping down the sky
        const by = Math.floor(phase(t, 16) * (minTop + 30)) - 16;
        for (let j = 0; j < 8; j++) {
          const y = by + j * 2;
          if (y < 0 || y + 2 > minTop) continue;
          rect(ctx, 0, y, W, 2, rgba('#e8eaf0', 0.1 * Math.sin(((j + 0.5) / 8) * Math.PI)));
        }
        if (by + 17 < minTop && by + 16 >= 0) rect(ctx, 0, by + 16, W, 1, rgba('#000000', 0.18));
        for (let j = 0; j < 4; j++) {
          const y = Math.floor(hash2(tk, 50 + j) * minTop);
          const x0 = Math.floor(hash2(tk, 60 + j) * W);
          rect(ctx, x0, y, Math.min(W - x0, 20 + hash2(tk, 70 + j) * 110), 1, rgba('#e0e2e8', 0.22));
        }
        const tk4 = tick(t, 240);
        if (hash2(tk4, 3) < 0.08) rect(ctx, 0, 0, W, minTop, rgba('#ffffff', 0.05));

        // port cranes
        CRANES.forEach((c, i) => crane(ctx, c, t, i, topAt, craneFloor[i]));

        // drones crossing the static
        for (let i = 0; i < 3; i++) {
          const dir = i % 2 ? 1 : -1;
          const dx = lane(t, 2 + i, hash2(i, 81), dir, W + 40);
          const dy = 66 + i * 14 + wave(t, 5 + i, i * 0.3) * 4;
          if (dy >= topAt[Math.max(0, Math.min(W - 1, Math.round(dx)))]) continue;
          rect(ctx, dx - 2, dy, 5, 1, '#16171c');
          const on = (tick(t, 480) + i) % 2;
          px(ctx, dx, dy + 1, on ? '#ff3d3d' : '#3dd8ff');
          glow(ctx, dx, dy + 1, 4, on ? '#ff3d3d' : '#3dd8ff', 0.5);
        }

        blink(ctx, blinkers, t, '#ffcf8a', '#121318', 13);

        // capsules waking and sleeping
        for (let i = 0; i < capsules.length; i++) {
          const [c, r] = capsules[i];
          const on = hash2(i, tick(t, 30 + (i % 6) * 10)) > 0.45;
          const col = CAPSULE_COLS[Math.floor(hash2(i, 77) * CAPSULE_COLS.length)];
          ctx.globalAlpha = on ? (col === '#5a7aff' ? 0.4 + 0.4 * hash2(i, tick(t, 1200)) : 0.8) : 1;
          rect(ctx, capX(c), capY(r), 3, 2, on ? col : '#0a0a0e');
        }
        ctx.globalAlpha = 1;
        const hx = COFFIN.x + Math.floor((COFFIN.w - textWidth('HOTEL', 2)) / 2);
        rect(ctx, hx - 3, COFFIN.top + 3, textWidth('HOTEL', 2) + 6, 14, '#08080c');
        neonText(ctx, 'HOTEL', hx, COFFIN.top + 5, '#ff8ab8', flicker(t, 404, 0.06), 2);

        for (const s of signs) vsign(ctx, s.x, s.y, s.n, s.color, flicker(t, s.seed, s.bad ? 0.25 : 0.02), s.seed);

        // storefronts: arcade screens and neon names
        FRONTS.forEach((f, i) => {
          if (f.arcade) {
            const n = Math.floor((f.w - 4) / 8);
            let lead = f.c;
            for (let j = 0; j < n; j++) {
              const col = SCREEN_COLS[Math.floor(hash2(i * 8 + j, tick(t, 480)) * SCREEN_COLS.length)];
              if (j === 0) lead = col;
              rect(ctx, f.x + 3 + j * 8, STREET - 14, 6, 5, col);
              px(ctx, f.x + 4 + j * 8 + (tick(t, 960) + j) % 4, STREET - 12, '#0b0b10');
              rect(ctx, f.x + 3 + j * 8, STREET - 9, 6, 2, '#1a1a22');
            }
            glow(ctx, f.x + f.w / 2, STREET - 8, f.w * 0.7, lead, 0.2);
          }
          const lx = f.x + Math.floor((f.w - textWidth(f.s)) / 2);
          rect(ctx, lx - 2, STREET - 28, textWidth(f.s) + 4, 9, '#07070a');
          neonText(ctx, f.s, lx, STREET - 26, f.c, flicker(t, 900 + i, i % 3 ? 0.03 : 0.12));
        });

        reflect(ctx, ROADY, t, 0.28, H - ROADY, '#08080c');

        // the night crowd; some wear mirrorshades
        crowd(ctx, t, 31, 22, STREET + 3, ['#0a0a0e', '#17171d', '#212129'], (x, y, i) => {
          if (hash2(i, 5) < 0.25) px(ctx, x + 1, y - 7, '#9ad8ff');
        });

        // puddles catch the neon
        for (let i = 0; i < 12; i++) {
          ctx.globalAlpha = 0.25 + 0.25 * wave(t, 40 + i, hash2(i, 2));
          rect(ctx, hash2(i, 13) * W, 214 + hash2(i, 14) * 50, 5 + hash2(i, 15) * 10, 1, FRONTS[i % FRONTS.length].c);
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

function crane(ctx: Ctx, c: (typeof CRANES)[number], t: number, i: number, topAt: number[], floor: number): void {
  const col = '#17181e';
  const legBottom = (x: number) => topAt[Math.max(0, Math.min(W - 1, x))] + ROOF_MARGIN;
  for (const lx of [c.x, c.x + 28]) rect(ctx, lx, c.top + 10, 2, legBottom(lx) - c.top - 10, col);
  rect(ctx, c.x, c.top + 24, 30, 2, col);
  rect(ctx, c.x - 26, c.top + 8, 84, 2, col);
  rect(ctx, c.x - 2, c.top + 3, 34, 5, col);
  line(ctx, c.x + 14, c.top - 8, c.x - 25, c.top + 8, col);
  line(ctx, c.x + 14, c.top - 8, c.x + 56, c.top + 8, col);
  rect(ctx, c.x + 13, c.top - 8, 2, 11, col);
  // trolley and container
  const tx = Math.round(c.x - 22 + (0.5 + 0.5 * wave(t, 6, c.off)) * 74);
  const lowest = floor - 7;
  const cy = Math.round(c.top + 14 + (0.5 + 0.5 * wave(t, 12, c.off + 0.25)) * Math.max(0, lowest - c.top - 14));
  rect(ctx, tx - 2, c.top + 10, 5, 2, '#24262e');
  rect(ctx, tx, c.top + 12, 1, cy - c.top - 12, '#2a2c34');
  rect(ctx, tx - 4, cy, 9, 4, i ? '#2a6a8a' : '#a0502a');
  rect(ctx, tx - 4, cy, 9, 1, i ? '#3a8aaa' : '#c0703a');
  const on = (tick(t, 240) + i) % 2;
  px(ctx, c.x + 14, c.top - 9, on ? '#ff3030' : '#3a1010');
  px(ctx, c.x - 26, c.top + 8, on ? '#3a1010' : '#ff3030');
  px(ctx, c.x + 57, c.top + 8, on ? '#3a1010' : '#ff3030');
  if (on) glow(ctx, c.x + 14, c.top - 9, 5, '#ff3030', 0.6);
}
