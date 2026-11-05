import { W, H, type Ctx, phase, wave, tick, hash2, mix } from '../scene/core';
import {
  sky, rect, px, glow, haze, beam, genSkyline, drawBuildings, drawWindows, pickBlinkers, blink, text, textWidth,
  neonText, flicker, car, crowd, disc, type Building, randInt,
} from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const FAR_BASE = 172;
const STREET = 196;
const WAY_FAR = 112;
const WAY_MID = 138;
const WAY_NEAR = 166;
const GOLD = '#ffcc33';

interface Block {
  x: number;
  w: number;
  top: number;
  name: string;
  setback: number;
  seed: number;
  signColor: string;
}

const TICKER = 'CURFEW IN EFFECT - CITIZENS RETURN TO YOUR BLOCKS - REPORT ALL CRIME - ';

export const megaCityOne: WorldDef = {
  id: 'mega-city-one',
  name: 'Mega-City One',
  source: '2000 AD (Judge Dredd)',
  creator: 'John Wagner & Carlos Ezquerra',
  tagline: 'Four hundred million citizens and one Lawmaster',
  era: '2141',
  hourOffset: -5,
  accent: '#ffcc33',
  accent2: '#ff4040',
  weathers: ['smog', 'rain', 'acid-rain', 'clear'],
  music: STYLES.megaCity,
  ambience: [
    { id: 'megaway', label: 'Megaway', kind: 'traffic', gain: 0.55 },
    { id: 'pa', label: 'PA announcements', kind: 'chatter', gain: 0.45 },
    { id: 'sirens', label: 'Sirens', kind: 'siren', gain: 0.5 },
    { id: 'wind', label: 'Smog wind', kind: 'wind', gain: 0.35 },
  ],
  create(rng) {
    const far = genSkyline(rng, { baseY: FAR_BASE, minW: 30, maxW: 70, minH: 50, maxH: 112, gap: 2, stepChance: 0.4, antennaChance: 0.3 });
    const filler = genSkyline(rng, { baseY: STREET, minW: 16, maxW: 34, minH: 40, maxH: 78, gap: 1, stepChance: 0.3, antennaChance: 0.3 });
    const blocks: Block[] = [
      { x: -12, w: 98, top: 50, name: 'PEEL BLOCK', setback: 16, seed: 101, signColor: GOLD },
      { x: 148, w: 112, top: 74, name: 'ASIMOV BLOCK', setback: 0, seed: 202, signColor: '#7aff9a' },
      { x: 302, w: 78, top: 42, name: 'HARLOW BLOCK', setback: 12, seed: 303, signColor: '#ff6a4a' },
      { x: 398, w: 96, top: 64, name: 'KUBRICK BLOCK', setback: 18, seed: 404, signColor: '#9ad0ff' },
    ];
    const asBuildings = blocks.map((b) => ({ x: b.x, w: b.w, h: STREET - b.top, top: b.top, seed: b.seed, antenna: 0, step: 0 }));
    const blinkers = pickBlinkers(rng, asBuildings, WAY_NEAR - 2, 70);
    const pylons: number[] = [];
    for (let x = 30 + randInt(rng, 0, 20); x < W; x += randInt(rng, 70, 100)) pylons.push(x);
    const searchFrom = [
      [blocks[0].x + 30, blocks[0].top - 12],
      [blocks[2].x + 40, blocks[2].top - 12],
      [blocks[3].x + 60, blocks[3].top - 10],
    ];

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#121510'], [0.35, '#22261a'], [0.7, '#45432a'], [1, '#6e6034']], FAR_BASE + 10);
        haze(ctx, 120, 190, '#a08848', 0.35);
        // a sick sun smothered by smog
        glow(ctx, 236, 34, 46, '#c8b878', 0.25);
        disc(ctx, 236, 34, 11, '#8e8a5c');
        disc(ctx, 236, 34, 9, '#a49c68');
        for (let i = 0; i < 7; i++) {
          ctx.globalAlpha = 0.2;
          rect(ctx, randInt(rng, -40, W - 100), randInt(rng, 14, 70), randInt(rng, 80, 200), 1, '#5a5838');
        }
        ctx.globalAlpha = 1;
        // distant blocks in the smog
        drawBuildings(ctx, far, FAR_BASE, '#3d4030', '#4a4c38', { colors: ['#8a8058', '#7a8060'], density: 0.16, cellW: 2, cellH: 3 });
        haze(ctx, 90, 180, '#7a7448', 0.3);
        megaway(ctx, WAY_FAR, 3, '#3a3b2c', '#6a6848', FAR_BASE, pylons.map((x) => x + 30), 2);
        haze(ctx, 130, 200, '#6a6438', 0.25);

        // filler blocks between the big ones
        drawBuildings(ctx, filler, STREET, '#2c2e20', '#3a3c2a', { colors: ['#a89050', '#8a9070'], density: 0.14, cellW: 2, cellH: 3 });
        for (const b of [blocks[0], blocks[1], blocks[3]]) megaBlock(ctx, b);
        megaway(ctx, WAY_MID, 4, '#2e2f24', '#7a7650', STREET, pylons.map((x) => x + 12), 3);
        megaBlock(ctx, blocks[2]);
        megaway(ctx, WAY_NEAR, 6, '#25261c', '#8a8458', STREET, pylons, 4);

        // street level
        rect(ctx, 0, STREET - 6, W, 6, '#1a1b14');
        rect(ctx, 0, STREET - 6, W, 1, '#3a3a2c');
        rect(ctx, 0, STREET, W, H - STREET, '#0e0f0b');
        rect(ctx, 0, STREET, W, 1, '#2c2d22');
        for (let x = 0; x < W; x += 20) rect(ctx, x, STREET + 10, 10, 1, '#4a4630');

        // the big sector sign on its gantry
        rect(ctx, 104, 76, 3, WAY_NEAR - 76, '#1a1b14');
        rect(ctx, 176, 76, 3, WAY_NEAR - 76, '#1a1b14');
        rect(ctx, 96, 58, 92, 20, '#0d0e0a');
        rect(ctx, 96, 58, 92, 1, '#5a1a1a');
        rect(ctx, 96, 77, 92, 1, '#5a1a1a');
      },
      drawFrame(ctx: Ctx, t: number) {
        // drifting smog banks
        for (let i = 0; i < 5; i++) {
          const x = ((hash2(i, 1) + phase(t, 1 + (i % 3)) * (i % 2 ? 1 : -1) + 1) % 1) * (W + 160) - 80;
          glow(ctx, x, 70 + i * 22, 70, '#8a8450', 0.12);
        }

        // searchlights from the rooftops
        for (let i = 0; i < searchFrom.length; i++) {
          const [sx, sy] = searchFrom[i];
          const a = -Math.PI / 2 + wave(t, 2 + i, i * 0.37) * 0.6;
          beam(ctx, sx, sy, a, 230, 0.06, '#e8f0c0', 0.16);
          glow(ctx, sx, sy, 5, '#ffffe0', 0.7);
        }

        // H-wagon hovering across with a search beam
        const hx = W + 40 - phase(t, 2) * (W + 80);
        const hy = 32 + wave(t, 8) * 3;
        hwagon(ctx, hx, hy, t);

        // windows flicking on and off
        blink(ctx, blinkers, t, '#ffd870', '#1d2016', 13);

        // block name signs: one is failing
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          const sw = textWidth(b.name);
          const sx = Math.round(b.x + (b.w - sw) / 2);
          neonText(ctx, b.name, sx, b.top + 6, b.signColor, flicker(t, b.seed, i === 1 ? 0.2 : 0.02));
        }

        // the sector sign
        const on = flicker(t, 77, 0.04);
        neonText(ctx, 'SECTOR 13', 106, 62, GOLD, on, 2);
        if (tick(t, 240) % 2) px(ctx, 100, 61, '#ff4040');

        // scrolling curfew ticker on Asimov Block
        ticker(ctx, t, blocks[1].x + 16, blocks[1].top + 28, blocks[1].w - 32);

        // megaway traffic
        const harlow = blocks[2];
        for (let i = 0; i < 28; i++) {
          const dir = i % 2 ? 1 : -1;
          const x = lanePos(t, 3 + (i % 3), hash2(i, 21), dir);
          ctx.globalAlpha = 0.8;
          rect(ctx, x, WAY_FAR - 1 + (dir > 0 ? 0 : 1), 2, 1, dir > 0 ? '#fff0c0' : '#ff4a3a');
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 18; i++) {
          const dir = i % 2 ? 1 : -1;
          const x = lanePos(t, 4 + (i % 3), hash2(i, 22), dir);
          if (x > harlow.x - 3 && x < harlow.x + harlow.w + 3) continue;
          const y = WAY_MID - 3 + (dir > 0 ? 0 : 1);
          rect(ctx, x - 2, y, 5, 2, ['#4a4a3a', '#5a3a2a', '#3a4a4a'][i % 3]);
          px(ctx, dir > 0 ? x + 2 : x - 2, y, '#fff0c0');
          px(ctx, dir > 0 ? x - 2 : x + 2, y + 1, '#ff4a3a');
        }
        for (let i = 0; i < 8; i++) {
          const dir = i % 2 ? 1 : -1;
          const x = lanePos(t, 5 + (i % 4), hash2(i, 23), dir);
          if (i === 6) {
            truck(ctx, x, WAY_NEAR + 1, dir);
            continue;
          }
          car(ctx, x, WAY_NEAR + (dir > 0 ? 0 : 1), dir, ['#4a4c3a', '#5a2e24', '#2e3a44', '#6a5a2a'][i % 4]);
        }

        // citizens under the megaway
        crowd(ctx, t, 31, 12, STREET - 7, ['#0c0d09', '#1a1610', '#141a14']);

        // a Lawmaster crossing at street level, every half minute
        const n = tick(t, 8);
        const dir = n % 2 ? -1 : 1;
        const p = phase(t, 8);
        const bx = dir > 0 ? -40 + p * 1500 : W + 40 - p * 1500;
        if (bx > -40 && bx < W + 40) lawmaster(ctx, bx, STREET + 6, dir, t);

        // sodium street lamps pooling on the road
        for (let x = 40; x < W; x += 110) glow(ctx, x, STREET + 2, 18, '#ffb050', 0.18);
      },
    };
  },
};

function lanePos(t: number, k: number, offset: number, dir: number): number {
  const p = (phase(t, k) + offset) % 1;
  return dir > 0 ? -30 + p * (W + 60) : W + 30 - p * (W + 60);
}

function megaBlock(ctx: Ctx, b: Block): void {
  const body = '#1d2016';
  const bld: Building = { x: b.x, w: b.w, h: STREET - b.top, top: b.top, seed: b.seed, antenna: 0, step: 0 };
  rect(ctx, b.x, b.top, b.w, STREET - b.top, body);
  // setback crown with rooftop clutter
  if (b.setback) {
    rect(ctx, b.x + b.setback, b.top - 10, b.w - b.setback * 2, 10, body);
    rect(ctx, b.x + b.setback, b.top - 10, b.w - b.setback * 2, 1, '#3a3c2a');
  }
  const roof = b.top - (b.setback ? 10 : 0);
  rect(ctx, b.x + b.w * 0.3, roof - 8, 1, 8, body);
  rect(ctx, b.x + b.w * 0.7, roof - 5, 6, 5, body);
  rect(ctx, b.x + b.w * 0.7 - 1, roof - 6, 8, 1, body);
  // tiny window grid
  drawWindows(ctx, bld, STREET, { colors: ['#e8c060', '#d0d890', '#ff9a50', '#c8c8a0'], density: 0.34, cellW: 2, cellH: 3 });
  // floor groups and service shafts
  ctx.globalAlpha = 0.5;
  for (let y = b.top + 18; y < STREET; y += 18) rect(ctx, b.x, y, b.w, 1, '#3a3c2a');
  ctx.globalAlpha = 1;
  for (let x = b.x + 10; x < b.x + b.w - 6; x += 30) rect(ctx, x, b.top + 2, 3, STREET - b.top - 2, '#151710');
  // lit edges from the city glow below
  rect(ctx, b.x, b.top, b.w, 1, '#4a4a34');
  rect(ctx, b.x + b.w - 1, b.top, 1, STREET - b.top, '#34362a');
  // dark sign panel
  const sw = textWidth(b.name);
  const sx = Math.round(b.x + (b.w - sw) / 2);
  rect(ctx, sx - 3, b.top + 3, sw + 6, 11, '#0a0b07');
  text(ctx, b.name, sx, b.top + 6, mix(b.signColor, '#000000', 0.7));
}

function megaway(ctx: Ctx, y: number, th: number, deck: string, edge: string, ground: number, pylons: number[], pw: number): void {
  for (const x of pylons) {
    rect(ctx, x, y + th, pw, ground - y - th, mix(deck, '#000000', 0.25));
    rect(ctx, x - 2, y + th, pw + 4, 2, mix(deck, '#000000', 0.25));
  }
  rect(ctx, 0, y, W, th, deck);
  rect(ctx, 0, y, W, 1, edge);
  rect(ctx, 0, y + th, W, 1, '#0c0d08');
  ctx.globalAlpha = 0.8;
  for (let x = 3; x < W; x += 9) px(ctx, x, y - 1, '#d8a040');
  ctx.globalAlpha = 1;
}

function ticker(ctx: Ctx, t: number, x: number, y: number, w: number): void {
  rect(ctx, x - 2, y - 2, w + 4, 9, '#080806');
  const full = TICKER.length * 4;
  const off = phase(t, 20) * full;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - 1, w, 7);
  ctx.clip();
  const first = Math.floor(off / 4);
  for (let i = first; i < first + Math.ceil(w / 4) + 2; i++) {
    const cx = x + i * 4 - off;
    text(ctx, TICKER[i % TICKER.length], cx, y, '#ffb030');
  }
  ctx.restore();
  glow(ctx, x + w / 2, y + 2, w * 0.6, '#ffb030', 0.12);
}

function truck(ctx: Ctx, x: number, y: number, dir: number): void {
  rect(ctx, x - 14, y - 9, 22, 7, '#4a4632');
  rect(ctx, x - 14, y - 9, 22, 1, '#6a6648');
  const cab = dir > 0 ? x + 8 : x - 20;
  rect(ctx, cab, y - 7, 6, 5, '#5a3a24');
  rect(ctx, x - 12, y - 2, 3, 2, '#000000');
  rect(ctx, x + 4, y - 2, 3, 2, '#000000');
  const front = dir > 0 ? cab + 6 : cab;
  px(ctx, front, y - 4, '#fff0c0');
  glow(ctx, front, y - 4, 6, '#fff0c0', 0.4);
}

function hwagon(ctx: Ctx, x: number, y: number, t: number): void {
  if (x < -40 || x > W + 40) return;
  beam(ctx, x, y + 5, Math.PI / 2 + wave(t, 10) * 0.45, 170, 0.07, '#f0f8d0', 0.16);
  glow(ctx, x, y, 22, '#c8c890', 0.12);
  rect(ctx, x - 11, y - 3, 22, 7, '#4a4e54');
  rect(ctx, x - 7, y - 6, 12, 3, '#4a4e54');
  rect(ctx, x - 7, y - 6, 12, 1, '#8a8e94');
  rect(ctx, x - 11, y - 3, 22, 1, '#7a7e84');
  rect(ctx, x - 6, y - 2, 4, 2, '#c8e0ff');
  rect(ctx, x - 11, y + 1, 22, 1, GOLD);
  rect(ctx, x - 14, y + 4, 5, 2, '#1a1c20');
  rect(ctx, x + 9, y + 4, 5, 2, '#1a1c20');
  glow(ctx, x - 11, y + 7, 6, '#ffb050', 0.5);
  glow(ctx, x + 11, y + 7, 6, '#ffb050', 0.5);
  const rb = tick(t, 960) % 2;
  px(ctx, x - 5, y - 7, rb ? '#ff3030' : '#401010');
  px(ctx, x + 3, y - 7, rb ? '#102040' : '#3080ff');
  glow(ctx, rb ? x - 5 : x + 3, y - 7, 7, rb ? '#ff3030' : '#3080ff', 0.6);
}

// Lawmaster side view, facing right. k hull, t tyre, g gold trim, h helmet, r/b lights, L headlamp, s cannon.
const BIKE = [
  '..........hh........',
  '.........hhgh.......',
  '.....kkkkkhhkrb.....',
  '..kkkkkkkkkkkkkkk...',
  '.kkggggggkkkkkkkkksL',
  '.tttt.kkkkkkkk.tttt.',
  'ttkktt........ttkktt',
  'ttkktt........ttkktt',
  '.tttt..........tttt.',
];

function lawmaster(ctx: Ctx, x: number, y: number, dir: number, t: number): void {
  const flash = tick(t, 1440) % 2;
  glow(ctx, x, y - 4, 34, flash ? '#ff2a2a' : '#2a6aff', 0.28);
  beam(ctx, x + dir * 10, y - 4, dir > 0 ? 0 : Math.PI, 60, 0.14, '#fff6d0', 0.22);
  const w = BIKE[0].length;
  const cols: Record<string, string> = {
    k: '#2a2c30', t: '#0a0a0a', g: GOLD, h: '#1a1a1e', s: '#5a5c60', L: '#fff6d0',
    r: flash ? '#ff3030' : '#501010', b: flash ? '#102050' : '#3a7aff',
  };
  for (let r = 0; r < BIKE.length; r++) {
    for (let c = 0; c < w; c++) {
      const ch = BIKE[r][dir > 0 ? c : w - 1 - c];
      if (ch === '.') continue;
      px(ctx, x - w / 2 + c, y - BIKE.length + r, cols[ch]);
    }
  }
  // light streak on the wet road
  ctx.globalAlpha = 0.25;
  rect(ctx, x - 10, y + 1, 20, 1, flash ? '#ff3030' : '#3a7aff');
  ctx.globalAlpha = 1;
}

