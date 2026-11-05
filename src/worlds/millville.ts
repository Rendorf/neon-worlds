import { W, H, type Ctx, phase, wave, tick, hash2, rgba, mix, randInt } from '../scene/core';
import { sky, stars, rect, px, glow, beam, haze, vgrad, text, neonText, flicker, genRidge, drawRidge, twinkle, disc } from '../scene/draw';
import { STYLES } from '../audio/styles';
import type { WorldDef } from './types';

const HORIZON = 150;
const STREET = 180; // buildings stand here; the road runs from STREET to GROUND
const GROUND = 187;
const CAR_Y = 185; // wheel line of the car

// The barrier: half an ellipse over the whole town.
const DCX = 236;
const DCY = 184;
const DRX = 212;
const DRY = 140;
const BX = DCX + DRX - 1; // where the road meets the barrier

const CAR_HOME = 213; // parked in front of the diner
const CAR_STOP = BX - 10; // front bumper touches the barrier
const CAR_K = 5; // drive-bump-reverse cycles per loop (48 s each)
const HIT = 0.42; // point in the cycle where the car touches the barrier

const LAMPS = [133, 192, 264, 352];
const POLES = [362, 424, 478];

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
const smooth = (u: number): number => {
  const v = clamp01(u);
  return v * v * (3 - 2 * v);
};

function domePt(theta: number): [number, number] {
  return [DCX + Math.cos(theta) * DRX, DCY - Math.sin(theta) * DRY];
}

/** Accelerate over the first `a` of the trip, then cruise. */
function accel(u: number, a = 0.3): number {
  const v = 1 / (1 - a / 2);
  return u < a ? (v * u * u) / (2 * a) : v * (a / 2 + (u - a));
}

/** Car position and state for the barrier loop. */
function carState(t: number): { x: number; jolt: number; brake: boolean; reverse: boolean; age: number } {
  const p = phase(t, CAR_K);
  let x = CAR_HOME;
  let jolt = 0;
  let brake = false;
  let reverse = false;
  if (p < 0.1) {
    x = CAR_HOME;
  } else if (p < HIT) {
    x = CAR_HOME + (CAR_STOP - CAR_HOME) * accel((p - 0.1) / (HIT - 0.1));
  } else if (p < 0.47) {
    const s = (p - HIT) / 0.05;
    x = CAR_STOP - 3 * smooth(s) - 2 * Math.sin(Math.PI * s);
    jolt = s < 0.3 ? 1 : 0;
    brake = true;
  } else if (p < 0.58) {
    x = CAR_STOP - 3;
    brake = true;
  } else if (p < 0.9) {
    const u = (p - 0.58) / 0.32;
    x = CAR_STOP - 3 + (CAR_HOME - (CAR_STOP - 3)) * smooth(u);
    reverse = true;
  } else {
    x = CAR_HOME;
    brake = p < 0.93;
  }
  return { x, jolt, brake, reverse, age: (p - HIT) * (240 / CAR_K) };
}

/** A two-tone 1960s sedan with fins, facing right. y = wheel line. */
function sedan(ctx: Ctx, x: number, y: number, jolt: number, brake: boolean, reverse: boolean): void {
  const yy = y - jolt;
  rect(ctx, x - 9, yy - 5, 19, 3, '#3f9a94');
  rect(ctx, x - 9, yy - 6, 2, 1, '#3f9a94'); // tail fin
  rect(ctx, x - 4, yy - 8, 9, 3, '#e6e2d6'); // white roof
  rect(ctx, x - 3, yy - 7, 3, 2, '#2b3a4c');
  rect(ctx, x + 1, yy - 7, 3, 2, '#2b3a4c');
  rect(ctx, x - 9, yy - 3, 19, 1, '#d2d8e0'); // chrome
  rect(ctx, x + 9, yy - 4, 1, 2, '#d2d8e0');
  rect(ctx, x - 6, y - 2, 3, 2, '#0e0c12');
  rect(ctx, x + 4, y - 2, 3, 2, '#0e0c12');
  px(ctx, x - 5, y - 1, '#8a8a96');
  px(ctx, x + 5, y - 1, '#8a8a96');
  px(ctx, x + 9, yy - 5, '#fff4c8');
  px(ctx, x - 9, yy - 5, brake ? '#ff4a3a' : '#a82a2a');
  glow(ctx, x - 9, yy - 5, brake ? 6 : 3, '#ff3a2a', brake ? 0.6 : 0.35);
  if (reverse) {
    px(ctx, x - 9, yy - 4, '#ffffff');
    glow(ctx, x - 10, yy - 4, 5, '#ffffff', 0.35);
  }
  // headlights, cut short by the barrier
  const front = x + 10;
  const len = Math.min(34, BX - front);
  if (len > 2) beam(ctx, front, yy - 5, 0.04, len, 0.11, '#fff1c1', 0.2);
  glow(ctx, front, yy - 5, 4, '#fff4c8', 0.5);
  if (len < 34) glow(ctx, BX, yy - 6, 9, '#e6f2ff', 0.32 * (1 - Math.max(0, len) / 34));
}

export const millville: WorldDef = {
  id: 'millville',
  name: 'Millville',
  source: 'All Flesh Is Grass',
  creator: 'Clifford D. Simak',
  tagline: 'A quiet town, purple flowers, no way out',
  era: '1965',
  hourOffset: -1,
  accent: '#c08aff',
  accent2: '#ff9a5a',
  weathers: ['clear', 'rain', 'snow'],
  music: STYLES.millville,
  ambience: [
    { id: 'crickets', label: 'Crickets', kind: 'crickets', gain: 0.55 },
    { id: 'wind', label: 'Prairie wind', kind: 'wind', gain: 0.3 },
    { id: 'barrier', label: 'The barrier', kind: 'shimmer', gain: 0.35 },
    { id: 'phone', label: 'Phone booth', kind: 'phone', gain: 0.3 },
  ],
  create(rng) {
    const hills = genRidge(rng, 9, 0.3, 4);
    const flowers = Array.from({ length: 210 }, () => {
      const y = GROUND + 1 + Math.pow(rng(), 2.2) * 78;
      const s = 1 + (y - GROUND) / 30;
      return {
        x: Math.floor(rng() * W),
        y: Math.floor(y),
        s,
        h: Math.round(3 + s * 4),
        ph: rng(),
        c: ['#9a5ad8', '#b878f0', '#7a48c0', '#d49cff'][randInt(rng, 0, 3)],
      };
    }).sort((a, b) => a.y - b.y);
    const flies = Array.from({ length: 30 }, (_, i) => ({
      x: rng() * W,
      y: 150 + rng() * 85,
      k: 40 + (i % 13),
      h: rng(),
      kx: 5 + (i % 5),
      ky: 8 + (i % 4),
    }));
    const clouds = Array.from({ length: 5 }, (_, i) => ({ x: rng() * (W + 120), y: 26 + i * 11 + rng() * 6, w: 30 + rng() * 50 }));

    return {
      drawStatic(ctx: Ctx) {
        sky(ctx, [[0, '#141a3e'], [0.35, '#2c3266'], [0.6, '#6a4a7e'], [0.8, '#c46a78'], [0.92, '#f08a5c'], [1, '#ffb070']], HORIZON);
        glow(ctx, 400, HORIZON + 2, 130, '#ffa050', 0.35);
        stars(ctx, rng, 38, 70, ['#ffffff', '#d6deff']);
        // thin crescent moon, lit toward the set sun
        for (let dy = -5; dy <= 5; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            const inA = dx * dx + dy * dy <= 25;
            const inB = (dx + 2) * (dx + 2) + (dy + 2) * (dy + 2) <= 22;
            if (inA && !inB) px(ctx, 300 + dx, 56 + dy, '#fff0d0');
          }
        }
        glow(ctx, 301, 57, 14, '#ffe8c0', 0.18);

        // far hills and fields
        drawRidge(ctx, hills, HORIZON + 3, '#3c2f55', STREET);
        vgrad(ctx, 0, HORIZON + 2, W, STREET - HORIZON - 2, [[0, '#4a3a5c'], [1, '#2a2438']]);
        for (let i = 0; i < 9; i++) {
          const y = HORIZON + 4 + Math.round(Math.pow(i / 9, 1.6) * 24);
          rect(ctx, 0, y, W, 1, rgba(i % 2 ? '#6a5070' : '#1e1a2c', 0.45));
        }
        // tree line on the horizon
        for (let i = 0; i < 26; i++) {
          const x = rng() * W;
          disc(ctx, x, HORIZON + 2, 2 + Math.floor(rng() * 3), '#2e2440');
        }
        // a farm beyond the barrier
        rect(ctx, 450, 160, 16, 8, '#4a2432');
        for (let i = 0; i < 5; i++) rect(ctx, 450 + i, 160 - 5 + i, 16 - i * 2, 1, '#3a1c2a');
        rect(ctx, 468, 151, 5, 17, '#5a4e62');
        disc(ctx, 470, 151, 2, '#5a4e62');
        px(ctx, 455, 163, '#ffcf7a');

        // telephone poles and sagging wires
        const poleTop = 140;
        for (const x of POLES) {
          rect(ctx, x, poleTop, 2, STREET - poleTop, '#2a2232');
          rect(ctx, x - 4, poleTop + 3, 10, 1, '#2a2232');
          px(ctx, x - 4, poleTop + 2, '#4a4458');
          px(ctx, x + 5, poleTop + 2, '#4a4458');
        }
        const wire = (x0: number, y0: number, x1: number, y1: number, sag: number) => {
          for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
            const u = (x - x0) / (x1 - x0);
            px(ctx, x, y0 + (y1 - y0) * u + sag * 4 * u * (1 - u), '#231c2c');
          }
        };
        for (let i = 0; i < POLES.length - 1; i++) {
          wire(POLES[i] - 4, poleTop + 2, POLES[i + 1] - 4, poleTop + 2, 7);
          wire(POLES[i] + 5, poleTop + 2, POLES[i + 1] + 5, poleTop + 2, 6);
        }
        wire(322, 160, POLES[0] - 4, poleTop + 2, 4);

        // water tower
        const tx = 392;
        const leg = (x0: number, x1: number) => {
          for (let y = 122; y <= STREET; y++) px(ctx, x0 + ((x1 - x0) * (y - 122)) / (STREET - 122), y, '#2c2638');
        };
        leg(tx - 10, tx - 15);
        leg(tx + 10, tx + 15);
        leg(tx - 4, tx - 5);
        leg(tx + 4, tx + 5);
        for (let k = 0; k < 3; k++) {
          const y0 = 128 + k * 17;
          for (let j = 0; j <= 14; j++) {
            px(ctx, tx - 11 + (j * 22) / 14, y0 + j, '#2c2638');
            px(ctx, tx + 11 - (j * 22) / 14, y0 + j, '#2c2638');
          }
        }
        rect(ctx, tx - 20, 104, 40, 18, '#6e6c8c');
        rect(ctx, tx - 20, 104, 2, 18, '#55536f');
        rect(ctx, tx + 15, 104, 5, 18, '#b88e9a');
        rect(ctx, tx - 18, 122, 36, 1, '#55536f');
        rect(ctx, tx - 22, 120, 44, 1, '#3a3650');
        for (let i = 0; i < 7; i++) rect(ctx, Math.round(tx - 3 - i * 2.6), 97 + i, Math.round(6 + i * 5.2), 1, i < 3 ? '#7a7898' : '#625f80');
        rect(ctx, tx, 94, 1, 3, '#3a3650');
        text(ctx, 'MILLVILLE', tx - 17, 110, '#efe8f6');

        // houses on the west end
        const house = (x: number, w: number, h: number, wall: string, roof: string, lit: boolean[]) => {
          const top = STREET - h;
          const rh = Math.ceil((w + 4) / 2);
          for (let i = 0; i < rh; i++) rect(ctx, x + w / 2 - i - 1, top - rh + i + 1, (i + 1) * 2, 1, roof);
          rect(ctx, x, top, w, h, wall);
          for (let y = top + 2; y < STREET; y += 2) rect(ctx, x, y, w, 1, rgba('#000000', 0.1));
          rect(ctx, x + w - 2, top, 2, h, rgba('#ff9a6a', 0.18));
          lit.forEach((on, i) => {
            const wx = x + 3 + i * (w - 10);
            rect(ctx, wx, top + 4, 4, 5, on ? '#ffcf7a' : '#1e2034');
            rect(ctx, wx - 1, top + 9, 6, 1, '#d8d0c8');
            if (on) glow(ctx, wx + 2, top + 6, 6, '#ffcf7a', 0.2);
          });
          rect(ctx, x + w / 2 - 2, STREET - 7, 4, 7, '#2a1e24');
          px(ctx, x + w / 2 + 3, STREET - 8, '#ffe6a0');
          glow(ctx, x + w / 2 + 3, STREET - 8, 5, '#ffd890', 0.4);
        };
        // windmill tower (wheel is animated)
        for (let y = 128; y <= STREET; y++) {
          const u = (y - 128) / (STREET - 128);
          px(ctx, 59 - u * 5, y, '#2a2236');
          px(ctx, 61 + u * 5, y, '#2a2236');
          if (y % 9 === 0) rect(ctx, 59 - u * 5, y, 3 + u * 10, 1, '#2a2236');
        }
        rect(ctx, 60, 125, 8, 1, '#2a2236');
        rect(ctx, 66, 122, 3, 5, '#2a2236');
        house(28, 26, 18, '#4a4e6e', '#2a2840', [true, false]);
        house(68, 24, 16, '#8a7c62', '#3a2c34', [false, true]);

        // church
        const cx = 98;
        for (let i = 0; i < 15; i++) rect(ctx, cx + 13 - i - 1, 138 + i, (i + 1) * 2, 1, '#4a4058');
        rect(ctx, cx, 152, 26, 28, '#aea6c2');
        rect(ctx, cx + 22, 152, 4, 28, '#d0a4a8');
        rect(ctx, cx + 7, 128, 12, 22, '#b6aeca');
        rect(ctx, cx + 16, 128, 3, 22, '#d6a8aa');
        rect(ctx, cx + 10, 132, 6, 6, '#2a2236');
        px(ctx, cx + 13, 135, '#c8a04a');
        for (let i = 0; i < 36; i++) {
          const hw = Math.max(0, Math.round(7 * (1 - i / 36)));
          if (hw > 0) rect(ctx, cx + 13 - hw, 127 - i, hw * 2, 1, i % 6 === 0 ? '#5a4e6a' : '#6a5e7c');
        }
        rect(ctx, cx + 12, 84, 1, 8, '#d8d0e0');
        rect(ctx, cx + 10, 86, 5, 1, '#d8d0e0');
        rect(ctx, cx + 3, 158, 3, 8, '#ffb86a');
        rect(ctx, cx + 20, 158, 3, 8, '#ffb86a');
        rect(ctx, cx + 10, 156, 6, 7, '#ffcf7a');
        px(ctx, cx + 12, 155, '#ffcf7a');
        px(ctx, cx + 13, 155, '#ffcf7a');
        px(ctx, cx + 11, 158, '#d86a6a');
        px(ctx, cx + 14, 160, '#6a8ad8');
        rect(ctx, cx + 10, 170, 6, 10, '#3a2a2a');
        glow(ctx, cx + 13, 159, 12, '#ffb86a', 0.22);
        // elm between church and store
        rect(ctx, 129, 164, 2, 16, '#2a1e24');
        disc(ctx, 130, 160, 6, '#2a3040');
        disc(ctx, 127, 156, 4, '#2e3646');
        disc(ctx, 133, 157, 4, '#262c3a');
        // big tree outside the town, west
        rect(ctx, 11, 158, 2, 22, '#221a22');
        disc(ctx, 12, 152, 9, '#262a3a');
        disc(ctx, 7, 147, 6, '#2a3042');
        disc(ctx, 17, 146, 6, '#22283a');

        // general store
        rect(ctx, 136, 146, 54, 34, '#6a3530');
        for (let y = 148; y < STREET; y += 2) {
          rect(ctx, 136, y, 54, 1, rgba('#2a0e0c', 0.18));
          for (let x = 136 + ((y / 2) % 2) * 3; x < 190; x += 6) px(ctx, x, y + 1, rgba('#2a0e0c', 0.25));
        }
        rect(ctx, 134, 144, 58, 2, '#4a2522');
        rect(ctx, 135, 149, 56, 9, '#d8c8a0');
        text(ctx, 'GENERAL STORE', 138, 151, '#5a2a22');
        for (let i = 0; i < 17; i++) rect(ctx, 138 + i * 3, 159, 3, 3, i % 2 ? '#e8e0d0' : '#a83a3a');
        rect(ctx, 139, 163, 18, 12, '#ffcf7a');
        rect(ctx, 169, 163, 18, 12, '#ffcf7a');
        rect(ctx, 139, 168, 18, 1, rgba('#6a3a20', 0.5));
        rect(ctx, 169, 168, 18, 1, rgba('#6a3a20', 0.5));
        rect(ctx, 147, 163, 1, 12, '#4a2522');
        rect(ctx, 177, 163, 1, 12, '#4a2522');
        rect(ctx, 159, 162, 8, 18, '#3a2420');
        rect(ctx, 160, 164, 6, 5, '#ffcf7a');
        glow(ctx, 163, 170, 22, '#ffcf7a', 0.18);

        // diner
        rect(ctx, 194, 156, 38, 24, '#8a92a6');
        rect(ctx, 194, 154, 38, 2, '#c8ccd8');
        rect(ctx, 228, 156, 4, 24, '#b49aa8');
        rect(ctx, 196, 162, 30, 9, '#ffe9b0');
        for (let i = 0; i < 5; i++) {
          const sx = 198 + i * 6 + (i % 2);
          rect(ctx, sx, 165, 2, 2, '#5a4a4a');
          rect(ctx, sx - 1, 167, 4, 4, '#6a5656');
        }
        rect(ctx, 196, 168, 30, 1, '#c8b890');
        rect(ctx, 194, 174, 38, 2, '#b83a3a');
        rect(ctx, 227, 162, 4, 18, '#3a2e34');
        glow(ctx, 211, 167, 26, '#ffe9b0', 0.2);
        rect(ctx, 199, 144, 27, 10, '#1a1420');
        rect(ctx, 202, 154, 1, 2, '#1a1420');
        rect(ctx, 222, 154, 1, 2, '#1a1420');

        // barber shop
        rect(ctx, 236, 142, 24, 38, '#5a3440');
        rect(ctx, 235, 140, 26, 2, '#3e222c');
        rect(ctx, 240, 146, 5, 6, '#ffcf7a');
        rect(ctx, 251, 146, 5, 6, '#1e1a2a');
        rect(ctx, 236, 157, 24, 6, '#e0d4bc');
        text(ctx, 'BARBER', 237, 158, '#3e222c');
        rect(ctx, 238, 165, 14, 9, '#ffd08a');
        rect(ctx, 254, 164, 4, 16, '#2a1e24');
        rect(ctx, 260, 163, 1, 1, '#d8d8e0');
        rect(ctx, 260, 175, 1, 1, '#d8d8e0');

        // gas station
        rect(ctx, 302, 160, 22, 20, '#a8a09a');
        rect(ctx, 302, 158, 22, 2, '#c8322a');
        rect(ctx, 305, 165, 10, 7, '#ffe6a8');
        rect(ctx, 318, 166, 4, 14, '#3a3238');
        glow(ctx, 310, 168, 14, '#ffe6a8', 0.2);
        rect(ctx, 266, 158, 36, 3, '#e8e0d0');
        rect(ctx, 266, 161, 36, 1, '#c83a2a');
        rect(ctx, 268, 162, 1, 18, '#8a8490');
        rect(ctx, 299, 162, 1, 18, '#8a8490');
        glow(ctx, 284, 166, 22, '#fff4d8', 0.25);
        for (const x of [276, 288]) {
          rect(ctx, x, 168, 5, 12, '#c8322a');
          rect(ctx, x, 166, 5, 2, '#f0e8d8');
          rect(ctx, x + 1, 170, 3, 2, '#fff2b0');
          px(ctx, x + 5, 171, '#1a1418');
          px(ctx, x + 6, 172, '#1a1418');
          px(ctx, x + 6, 173, '#1a1418');
        }
        rect(ctx, 330, 128, 2, 52, '#4a4458');
        rect(ctx, 323, 123, 16, 10, '#f0e8d8');
        rect(ctx, 323, 133, 16, 1, '#c8322a');

        // phone booth
        rect(ctx, 340, 161, 8, 19, '#c8c8d8');
        rect(ctx, 341, 163, 6, 15, '#fff3c4');
        rect(ctx, 340, 161, 8, 2, '#3a5aa8');
        rect(ctx, 343, 167, 2, 3, '#2a2a34');
        rect(ctx, 341, 170, 6, 1, '#d8d0b0');

        // street lamps
        for (const x of LAMPS) {
          rect(ctx, x, 158, 1, 22, '#2a2a38');
          rect(ctx, x, 158, 4, 1, '#2a2a38');
          rect(ctx, x + 3, 159, 3, 1, '#ffe8a8');
        }

        // the road
        rect(ctx, 0, STREET, W, GROUND - STREET, '#2c2a3a');
        rect(ctx, 0, STREET, W, 1, '#4a4458');
        for (let x = 4; x < W; x += 14) rect(ctx, x, 183, 7, 1, '#8a8070');
        for (const x of LAMPS) rect(ctx, x - 6, STREET + 1, 16, 2, rgba('#ffe8a8', 0.12));

        // the barrier, barely there
        for (let i = 0; i <= 700; i++) {
          const [x, y] = domePt((i / 700) * Math.PI);
          ctx.globalAlpha = 0.05 + 0.035 * Math.sin(i * 0.13);
          px(ctx, x, y, '#d8ecff');
        }
        ctx.globalAlpha = 1;

        // the foreground field
        vgrad(ctx, 0, GROUND, W, H - GROUND, [[0, '#2e2442'], [0.4, '#1e1830'], [1, '#100a18']]);
        haze(ctx, GROUND - 3, GROUND + 14, '#7a4ab0', 0.18);
        for (let i = 0; i < 500; i++) {
          const y = GROUND + Math.pow(rng(), 1.3) * (H - GROUND);
          rect(ctx, rng() * W, y, 1, 1 + Math.floor(rng() * 3), rng() < 0.5 ? '#26362e' : '#1e2a2a');
        }
        for (let i = 0; i < 260; i++) {
          ctx.globalAlpha = 0.4 + rng() * 0.5;
          px(ctx, rng() * W, GROUND + 1 + rng() * 12, ['#8a52c8', '#a86ae0', '#6a3ab0'][Math.floor(rng() * 3)]);
        }
        ctx.globalAlpha = 1;
      },

      drawFrame(ctx: Ctx, t: number) {
        // drifting pink-lit clouds
        for (const c of clouds) {
          const span = W + 120;
          const x = ((c.x + phase(t, 1) * span) % span) - 60;
          ctx.globalAlpha = 0.32;
          rect(ctx, x, c.y, c.w, 2, '#e88a9a');
          rect(ctx, x + 6, c.y - 1, c.w - 14, 1, '#9a6a9e');
          rect(ctx, x + 10, c.y + 2, c.w - 22, 1, '#ffb08a');
        }
        ctx.globalAlpha = 1;
        twinkle(ctx, t, 41, 18, 62, '#ffffff');

        // the barrier: a faint sweep now and then, and stray sparkles
        const sw = phase(t, 4);
        if (sw < 0.12) {
          const s = sw / 0.12;
          const c = Math.PI * (1 - s);
          const env = Math.sin(Math.PI * s);
          for (let i = -30; i <= 30; i++) {
            const [x, y] = domePt(c + i * 0.01);
            ctx.globalAlpha = 0.28 * env * (1 - Math.abs(i) / 31);
            px(ctx, x, y, '#e8f6ff');
          }
        }
        const cell = tick(t, 240);
        const sp = Math.sin(Math.PI * phase(t, 240));
        for (let i = 0; i < 7; i++) {
          if (hash2(i, cell) > 0.6) continue;
          const [x, y] = domePt(0.05 + hash2(cell, i + 9) * (Math.PI - 0.1));
          ctx.globalAlpha = 0.35 * sp;
          px(ctx, x, y, '#ffffff');
        }
        ctx.globalAlpha = 1;

        // windmill wheel
        const a0 = phase(t, 30) * Math.PI * 2;
        for (let b = 0; b < 12; b++) {
          const a = a0 + (b * Math.PI) / 6;
          for (let r = 2; r <= 8; r++) px(ctx, 60 + Math.cos(a) * r, 126 + Math.sin(a) * r, '#2a2236');
        }
        px(ctx, 60, 126, '#4a4058');

        // street lamps and their moths
        for (let i = 0; i < LAMPS.length; i++) {
          const x = LAMPS[i] + 4;
          glow(ctx, x, 160, 16, '#ffd890', 0.33 + 0.03 * wave(t, 120, i * 0.3));
          for (let m = 0; m < 2; m++) {
            const a = (phase(t, 37 + i * 3 + m * 5) + m * 0.5) * Math.PI * 2;
            px(ctx, x + Math.cos(a) * (3 + m), 161 + Math.sin(a * 2) * 2, '#f0e6d0');
          }
        }

        // signs
        neonText(ctx, 'DINER', 203, 147, '#ff5a6a', flicker(t, 77, 0.04));
        neonText(ctx, 'GAS', 326, 125, '#e0322a', flicker(t, 78, 0.01));

        // barber pole
        const sh = tick(t, 480);
        for (let r = 0; r < 10; r++) px(ctx, 260, 164 + r, (r + sh) % 4 < 2 ? '#d83a3a' : (r + sh) % 4 === 2 ? '#f0f0f0' : '#3a5ad8');

        // phone booth: buzzing light, and now and then it rings
        const on = flicker(t, 31, 0.05);
        glow(ctx, 344, 170, 15, '#fff0b0', on ? 0.32 : 0.12);
        const ring = phase(t, 4);
        if (ring > 0.5 && ring < 0.56 && tick(t, 960) % 2) {
          for (const [dx, dy] of [[-3, 1], [-4, 0], [-3, -1], [10, 1], [11, 0], [10, -1]]) px(ctx, 341 + dx, 165 + dy, '#fff6d0');
          px(ctx, 344, 167, '#fff6d0');
        }

        // the car: out of town, into the barrier, back again
        const car = carState(t);
        sedan(ctx, car.x, CAR_Y, car.jolt, car.brake, car.reverse);
        if (car.age >= 0 && car.age < 5) {
          const a = car.age;
          const fade = 1 - a / 5;
          glow(ctx, BX, 178, 6 + a * 5, '#c8ecff', 0.45 * fade);
          for (let j = 0; j < 3; j++) {
            const r = (a - j * 0.6) * 16;
            if (r <= 0 || r > 70) continue;
            ctx.globalAlpha = 0.6 * (1 - r / 70) * fade;
            for (let n = 0; n < 32; n++) {
              const th = (n / 32) * Math.PI * 2;
              const y = 179 - Math.sin(th) * r;
              if (y > CAR_Y) continue;
              px(ctx, BX + Math.cos(th) * r * 0.25, y, '#e0f4ff');
            }
          }
          const tmax = Math.min(1.3, a * 0.55);
          for (let th = 0; th < tmax; th += 0.012) {
            const [x, y] = domePt(th);
            ctx.globalAlpha = 0.55 * fade * (1 - (th / Math.max(tmax, 0.01)) * 0.85);
            px(ctx, x, y, '#e8f6ff');
            px(ctx, x - 1, y, '#a8d8ff');
          }
          ctx.globalAlpha = 1;
        }

        // the purple flowers, swaying and pulsing together
        for (const f of flowers) {
          const gust = 0.6 + 0.4 * wave(t, 4, -f.x / W);
          const sway = wave(t, 20, f.ph + f.x * 0.01) * gust * (0.6 + f.s * 0.6);
          const pulse = Math.max(0, wave(t, 6, (f.x / W) * 0.8 - f.y / 200));
          const hx = Math.round(f.x + sway);
          const hy = f.y - f.h;
          const half = Math.ceil(f.h / 2);
          rect(ctx, f.x, f.y - half, 1, half, '#2a4a3c');
          rect(ctx, Math.round(f.x + sway * 0.5), hy + 1, 1, f.h - half, '#2e5440');
          const col = mix(f.c, '#f2d0ff', pulse * 0.55);
          if (f.s < 1.6) {
            rect(ctx, hx, hy, 2, 2, col);
          } else if (f.s < 2.4) {
            rect(ctx, hx - 1, hy, 3, 1, col);
            rect(ctx, hx, hy - 1, 1, 3, col);
            px(ctx, hx, hy, '#ffe88a');
          } else {
            rect(ctx, hx - 2, hy, 5, 1, col);
            rect(ctx, hx, hy - 2, 1, 5, col);
            rect(ctx, hx - 1, hy - 1, 3, 3, col);
            px(ctx, hx, hy, '#ffe88a');
            if (pulse > 0.3) glow(ctx, hx, hy, 4 + f.s * 2, '#c890ff', 0.2 * pulse);
          }
        }

        // fireflies
        for (let i = 0; i < flies.length; i++) {
          const f = flies[i];
          const b = (phase(t, f.k) + f.h) % 1;
          if (b > 0.4) continue;
          const env = Math.sin((b / 0.4) * Math.PI);
          const x = f.x + wave(t, f.kx, f.h) * 10;
          const y = f.y + wave(t, f.ky, f.h * 2) * 5;
          glow(ctx, x, y, 4, '#d8ff7a', 0.45 * env);
          ctx.globalAlpha = env;
          px(ctx, x, y, '#f4ffb0');
          ctx.globalAlpha = 1;
        }
      },
    };
  },
};
