// Pixel-art drawing helpers shared by all worlds.
import { W, H, type Ctx, type Rng, phase, tick, hash2, rgba, randInt, randRange } from './core';

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function vgrad(ctx: Ctx, x: number, y: number, w: number, h: number, stops: [number, string][]): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function sky(ctx: Ctx, stops: [number, string][], bottom = H): void {
  vgrad(ctx, 0, 0, W, bottom, stops);
}

export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 0.5): void {
  if (r <= 0 || alpha <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Soft horizontal band of colour, strongest in the middle. */
export function haze(ctx: Ctx, y0: number, y1: number, color: string, alpha: number): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.5, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, y1 - y0);
}

export function overlay(ctx: Ctx, color: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.fillStyle = rgba(color, alpha);
  ctx.fillRect(0, 0, W, H);
}

export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

export function stars(ctx: Ctx, rng: Rng, n: number, maxY: number, colors: string[] = ['#ffffff']): void {
  for (let i = 0; i < n; i++) {
    const c = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = 0.3 + rng() * 0.7;
    px(ctx, rng() * W, rng() * maxY, c);
  }
  ctx.globalAlpha = 1;
}

/** Stars that twinkle in the frame. Positions come from a seed, not the rng. */
export function twinkle(ctx: Ctx, t: number, seed: number, n: number, maxY: number, color = '#ffffff'): void {
  for (let i = 0; i < n; i++) {
    const a = 0.5 + 0.5 * Math.sin((phase(t, 20 + Math.floor(hash2(seed, i) * 30)) + hash2(i, seed)) * Math.PI * 2);
    ctx.globalAlpha = a;
    px(ctx, Math.floor(hash2(seed + 1, i) * W), Math.floor(hash2(seed + 2, i) * maxY), color);
  }
  ctx.globalAlpha = 1;
}

export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, width = 1): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function poly(ctx: Ctx, pts: number[], color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

/** A cone of light from (x, y) pointing at `angle` radians. */
export function beam(ctx: Ctx, x: number, y: number, angle: number, len: number, spread: number, color: string, alpha: number): void {
  const a0 = angle - spread;
  const a1 = angle + spread;
  const g = ctx.createLinearGradient(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a0) * len, y + Math.sin(a0) * len);
  ctx.lineTo(x + Math.cos(a1) * len, y + Math.sin(a1) * len);
  ctx.closePath();
  ctx.fill();
}

/** 1 most of the time, 0 for brief moments: a neon tube that sputters. */
export function flicker(t: number, seed: number, rate = 0.03): number {
  return hash2(seed, tick(t, 2400)) < rate ? 0 : 1;
}

/** Vertical sign with pseudo-characters, a frame and a glow. */
export function vsign(ctx: Ctx, x: number, y: number, n: number, color: string, on: number, seed: number, frame = '#000000'): void {
  rect(ctx, x - 1, y - 1, 5, n * 6 + 1, frame);
  if (on) glow(ctx, x + 1.5, y + n * 3, n * 4, color, 0.22);
  ctx.globalAlpha = on ? 1 : 0.25;
  glyphs(ctx, seed, x, y, n, color, true);
  ctx.globalAlpha = 1;
}

// ---------- pixel font (3x5) ----------

const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '111101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111',
  '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110',
  '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  '-': '000000111000000', '.': '000000000000010', '!': '010010010000010', "'": '010010000000000',
  '&': '010101010101011', ' ': '000000000000000', '/': '001001010100100', ':': '000010000010000',
};

export function textWidth(s: string, scale = 1): number {
  return s.length * 4 * scale - scale;
}

export function text(ctx: Ctx, s: string, x: number, y: number, color: string, scale = 1): void {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of s.toUpperCase()) {
    const bits = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) {
      if (bits[i] === '1') ctx.fillRect(cx + (i % 3) * scale, Math.round(y) + Math.floor(i / 3) * scale, scale, scale);
    }
    cx += 4 * scale;
  }
}

/** Neon text: glow + text. */
export function neonText(ctx: Ctx, s: string, x: number, y: number, color: string, on = 1, scale = 1): void {
  if (on <= 0) {
    ctx.globalAlpha = 0.25;
    text(ctx, s, x, y, color, scale);
    ctx.globalAlpha = 1;
    return;
  }
  const w = textWidth(s, scale);
  glow(ctx, x + w / 2, y + 2.5 * scale, Math.max(w, 10) * 0.75, color, 0.28 * on);
  ctx.globalAlpha = on;
  text(ctx, s, x, y, color, scale);
  ctx.globalAlpha = 1;
}

/** Pseudo-characters (signage in an unknown script). */
export function glyphs(ctx: Ctx, seed: number, x: number, y: number, n: number, color: string, vertical = true): void {
  ctx.fillStyle = color;
  for (let k = 0; k < n; k++) {
    const gx = vertical ? x : x + k * 4;
    const gy = vertical ? y + k * 6 : y;
    for (let i = 0; i < 15; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      const structural = (r === 0 && hash2(seed + k, 99) > 0.5) || (c === 1 && hash2(seed + k, 98) > 0.6);
      if (structural || hash2(seed * 31 + k, i) > 0.62) ctx.fillRect(gx + c, gy + r, 1, 1);
    }
  }
}

// ---------- buildings ----------

export interface Building {
  x: number;
  w: number;
  h: number;
  top: number;
  seed: number;
  antenna: number;
  step: number;
}

export interface SkylineOpts {
  baseY: number;
  x0?: number;
  x1?: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  gap?: number;
  antennaChance?: number;
  stepChance?: number;
}

export function genSkyline(rng: Rng, o: SkylineOpts): Building[] {
  const out: Building[] = [];
  let x = (o.x0 ?? -10) + Math.floor(rng() * 6);
  const end = o.x1 ?? W + 10;
  while (x < end) {
    const w = randInt(rng, o.minW, o.maxW);
    const h = randInt(rng, o.minH, o.maxH);
    out.push({
      x,
      w,
      h,
      top: o.baseY - h,
      seed: Math.floor(rng() * 1e9),
      antenna: rng() < (o.antennaChance ?? 0) ? randInt(rng, 4, 14) : 0,
      step: rng() < (o.stepChance ?? 0) ? randInt(rng, 2, Math.max(3, Math.floor(w / 3))) : 0,
    });
    x += w + (o.gap ?? 0) + (rng() < 0.2 ? randInt(rng, 1, 4) : 0);
  }
  return out;
}

export interface WindowStyle {
  colors: string[];
  density: number; // 0..1 lit fraction
  cellW?: number;
  cellH?: number;
  winW?: number;
  winH?: number;
}

export function drawBuildings(ctx: Ctx, bs: Building[], baseY: number, body: string, edge?: string, win?: WindowStyle): void {
  for (const b of bs) {
    rect(ctx, b.x, b.top, b.w, baseY - b.top, body);
    if (b.step) rect(ctx, b.x + b.step, b.top - b.step * 2, b.w - b.step * 2, b.step * 2, body);
    if (b.antenna) {
      rect(ctx, b.x + Math.floor(b.w / 2), b.top - (b.step ? b.step * 2 : 0) - b.antenna, 1, b.antenna, body);
    }
    if (edge) rect(ctx, b.x, b.top, 1, baseY - b.top, edge);
    if (win) drawWindows(ctx, b, baseY, win);
  }
}

export function drawWindows(ctx: Ctx, b: Building, baseY: number, win: WindowStyle): void {
  const cw = win.cellW ?? 3;
  const ch = win.cellH ?? 3;
  const ww = win.winW ?? 1;
  const wh = win.winH ?? 1;
  const cols = Math.floor((b.w - 2) / cw);
  const rows = Math.floor((baseY - b.top - 3) / ch);
  for (let r = 0; r < rows; r++) {
    const rowLit = hash2(b.seed, r * 7 + 1) < 0.85;
    for (let c = 0; c < cols; c++) {
      const hv = hash2(b.seed + r * 131, c);
      if (!rowLit || hv > win.density) continue;
      const color = win.colors[Math.floor(hash2(b.seed + c, r) * win.colors.length)];
      ctx.globalAlpha = 0.55 + 0.45 * hash2(c, b.seed + r);
      rect(ctx, b.x + 1 + c * cw + Math.floor((cw - ww) / 2), b.top + 2 + r * ch, ww, wh, color);
    }
  }
  ctx.globalAlpha = 1;
}

/** Positions of lit windows to blink in the frame. */
export function pickBlinkers(rng: Rng, bs: Building[], baseY: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  if (!bs.length) return out;
  for (let i = 0; i < n; i++) {
    const b = bs[Math.floor(rng() * bs.length)];
    out.push([b.x + 1 + Math.floor(rng() * Math.max(1, b.w - 2)), b.top + 2 + Math.floor(rng() * Math.max(1, baseY - b.top - 4))]);
  }
  return out;
}

export function blink(ctx: Ctx, pts: [number, number][], t: number, colorOn: string, colorOff: string, seed = 7): void {
  for (let i = 0; i < pts.length; i++) {
    const on = hash2(seed + i, tick(t, 160 + (i % 5) * 40)) > 0.45;
    px(ctx, pts[i][0], pts[i][1], on ? colorOn : colorOff);
  }
}

// ---------- terrain ----------

export function genRidge(rng: Rng, amp: number, rough = 0.35, smooth = 3): number[] {
  const out: number[] = [];
  let v = rng() * amp;
  let dv = 0;
  for (let x = 0; x <= W; x++) {
    dv += (rng() - 0.5) * rough;
    dv *= 0.92;
    v += dv;
    if (v < 0) { v = 0; dv = Math.abs(dv); }
    if (v > amp) { v = amp; dv = -Math.abs(dv); }
    out.push(v);
  }
  for (let s = 0; s < smooth; s++) {
    for (let x = 1; x < out.length - 1; x++) out[x] = (out[x - 1] + out[x] + out[x + 1]) / 3;
  }
  return out;
}

export function drawRidge(ctx: Ctx, heights: number[], baseY: number, color: string, bottom = H): void {
  ctx.fillStyle = color;
  for (let x = 0; x < W; x++) {
    const top = Math.round(baseY - heights[x]);
    ctx.fillRect(x, top, 1, bottom - top);
  }
}

// ---------- water ----------

/** Mirror the canvas above waterY onto the water with a ripple. Call after drawing the scene above. */
export function reflect(ctx: Ctx, waterY: number, t: number, alpha = 0.4, depth = H - waterY, tint?: string): void {
  const c = ctx.canvas;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < depth; i++) {
    const sy = waterY - 1 - Math.floor(i * 0.85);
    if (sy < 0) break;
    const off = Math.round(Math.sin(i * 0.45 + phase(t, 90) * Math.PI * 2) * (0.6 + i * 0.05));
    ctx.drawImage(c, 0, sy, W, 1, off, waterY + i, W, 1);
  }
  ctx.restore();
  if (tint) vgrad(ctx, 0, waterY, W, depth, [[0, rgba(tint, 0.25)], [1, rgba(tint, 0.75)]]);
}

/** Bright ripple dashes on water. */
export function ripples(ctx: Ctx, t: number, y0: number, y1: number, n: number, color: string, seed = 3): void {
  for (let i = 0; i < n; i++) {
    const y = y0 + Math.floor(hash2(seed, i) * (y1 - y0));
    const x = (hash2(i, seed) * W + phase(t, 2 + (i % 3)) * 24 * (i % 2 ? 1 : -1) + W) % W;
    const a = 0.5 + 0.5 * Math.sin((phase(t, 30 + (i % 7) * 4) + hash2(seed + 9, i)) * Math.PI * 2);
    ctx.globalAlpha = a * 0.6;
    rect(ctx, x, y, 2 + Math.floor(hash2(i, 5) * 4), 1, color);
  }
  ctx.globalAlpha = 1;
}

// ---------- sprites ----------

/** Small flying car. dir 1 = moving right. */
export function flyer(ctx: Ctx, x: number, y: number, dir: number, body: string, head = '#fff4c8', tail = '#ff2a4a', big = false): void {
  const s = big ? 2 : 1;
  rect(ctx, x - 3 * s, y, 7 * s, 2 * s, body);
  rect(ctx, x - 2 * s, y - s, 4 * s, s, body);
  const front = dir > 0 ? x + 3 * s : x - 3 * s;
  const back = dir > 0 ? x - 3 * s : x + 3 * s;
  px(ctx, front, y, head);
  px(ctx, back, y + s, tail);
  glow(ctx, front, y, 5 * s, head, 0.35);
  glow(ctx, back, y + s, 3 * s, tail, 0.4);
}

/** Ground car seen side-on. y = road surface. */
export function car(ctx: Ctx, x: number, y: number, dir: number, body: string, head = '#fff1c1', tail = '#ff2a3a'): void {
  rect(ctx, x - 6, y - 3, 13, 2, body);
  rect(ctx, x - 3, y - 5, 7, 2, body);
  rect(ctx, x - 4, y - 1, 2, 1, '#000000');
  rect(ctx, x + 3, y - 1, 2, 1, '#000000');
  const front = dir > 0 ? x + 6 : x - 6;
  const back = dir > 0 ? x - 6 : x + 6;
  px(ctx, front, y - 3, head);
  px(ctx, back, y - 3, tail);
  beam(ctx, front, y - 3, dir > 0 ? 0 : Math.PI, 26, 0.12, head, 0.18);
  glow(ctx, back, y - 3, 4, tail, 0.45);
}

/** Pedestrian, feet at y. */
export function walker(ctx: Ctx, x: number, y: number, color: string, t: number, seed: number): void {
  const step = tick(t, 960) % 2;
  rect(ctx, x, y - 8, 2, 2, color);
  rect(ctx, x, y - 6, 2, 4, color);
  if ((step + seed) % 2) {
    rect(ctx, x - 1, y - 2, 1, 2, color);
    rect(ctx, x + 2, y - 2, 1, 2, color);
  } else {
    rect(ctx, x, y - 2, 2, 2, color);
  }
}

/** Walkers moving along a street. */
export function crowd(ctx: Ctx, t: number, seed: number, n: number, y: number, colors: string[], decorate?: (x: number, y: number, i: number) => void): void {
  for (let i = 0; i < n; i++) {
    const dir = hash2(seed, i) > 0.5 ? 1 : -1;
    const k = 1 + Math.floor(hash2(i, seed) * 3);
    const span = W + 40;
    const x = ((hash2(seed + 5, i) * span + dir * phase(t, k) * span) % span + span) % span - 20;
    const yy = y + Math.floor(hash2(seed + 9, i) * 4);
    walker(ctx, x, yy, colors[i % colors.length], t + i * 0.13, i);
    decorate?.(x, yy, i);
  }
}

/** Position along a looping lane: returns x for an object that crosses `span` px `k` times per loop. */
export function lane(t: number, k: number, offset: number, dir: number, span = W + 60): number {
  const p = (phase(t, k) + offset) % 1;
  return dir > 0 ? -30 + p * span : W + 30 - p * span;
}

export { randInt, randRange };
