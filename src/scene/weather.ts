import { W, H, type Ctx, phase, tick, hash2, rgba } from './core';
import { rect, px, overlay, vgrad, glyphs } from './draw';

export type Weather =
  | 'clear'
  | 'rain'
  | 'acid-rain'
  | 'snow'
  | 'ash'
  | 'data-rain'
  | 'sandstorm'
  | 'dust-storm'
  | 'smog'
  | 'terminator';

export const WEATHER_LABEL: Record<Weather, string> = {
  clear: 'clear',
  rain: 'rain',
  'acid-rain': 'acid rain',
  snow: 'snow',
  ash: 'ash',
  'data-rain': 'data rain',
  sandstorm: 'sandstorm',
  'dust-storm': 'dust storm',
  smog: 'smog',
  terminator: 'day & night',
};

function rain(ctx: Ctx, t: number, color: string, n: number, alpha: number): void {
  ctx.fillStyle = rgba(color, alpha);
  for (let i = 0; i < n; i++) {
    const k = 420 + Math.floor(hash2(i, 1) * 120);
    const y = ((hash2(i, 2) + phase(t, k)) % 1) * (H + 20) - 10;
    const x = ((hash2(i, 3) * (W + 60) + y * 0.18) % (W + 60)) - 30;
    const len = 3 + Math.floor(hash2(i, 4) * 4);
    for (let j = 0; j < len; j++) ctx.fillRect(Math.round(x + j * 0.18), Math.round(y + j), 1, 1);
  }
  // splashes along the bottom
  ctx.fillStyle = rgba(color, alpha * 0.8);
  for (let i = 0; i < 24; i++) {
    const tk = tick(t, 2400 + i * 40);
    if (hash2(i, tk) > 0.5) continue;
    const x = hash2(i * 7, tk) * W;
    const y = H - 2 - hash2(tk, i) * 50;
    ctx.fillRect(Math.round(x) - 1, Math.round(y), 1, 1);
    ctx.fillRect(Math.round(x) + 1, Math.round(y), 1, 1);
  }
}

function flakes(ctx: Ctx, t: number, color: string, n: number, kMin: number, kRange: number, sway: number, rise = false): void {
  for (let i = 0; i < n; i++) {
    const k = kMin + Math.floor(hash2(i, 11) * kRange);
    let p = (hash2(i, 12) + phase(t, k)) % 1;
    if (rise) p = 1 - p;
    const y = p * (H + 10) - 5;
    const x = (hash2(i, 13) * W + Math.sin((phase(t, 12 + (i % 5)) + hash2(i, 14)) * Math.PI * 2) * sway + W) % W;
    ctx.globalAlpha = 0.5 + hash2(i, 15) * 0.5;
    px(ctx, x, y, color);
    if (hash2(i, 16) > 0.7) px(ctx, x + 1, y, color);
  }
  ctx.globalAlpha = 1;
}

function dataRain(ctx: Ctx, t: number): void {
  for (let c = 0; c < 34; c++) {
    const x = Math.floor(hash2(c, 21) * (W / 4)) * 4;
    const k = 40 + Math.floor(hash2(c, 22) * 50);
    const head = ((hash2(c, 23) + phase(t, k)) % 1) * (H + 60) - 30;
    for (let j = 0; j < 8; j++) {
      const y = Math.floor((head - j * 6) / 6) * 6;
      if (y < -6 || y > H) continue;
      ctx.globalAlpha = j === 0 ? 0.9 : 0.55 * (1 - j / 8);
      glyphs(ctx, c * 977 + Math.floor(y / 6) + tick(t, 480), x, y, 1, j === 0 ? '#d8ffe0' : '#2bff6a');
    }
  }
  ctx.globalAlpha = 1;
}

function streaks(ctx: Ctx, t: number, color: string, n: number, alpha: number): void {
  ctx.fillStyle = rgba(color, alpha);
  for (let i = 0; i < n; i++) {
    const k = 160 + Math.floor(hash2(i, 31) * 160);
    const x = ((hash2(i, 32) + phase(t, k)) % 1) * (W + 80) - 40;
    const y = hash2(i, 33) * H;
    const len = 6 + Math.floor(hash2(i, 34) * 14);
    ctx.fillRect(Math.round(x), Math.round(y + Math.sin(x * 0.05) * 2), len, 1);
  }
}

export interface WeatherOpts {
  reduce?: boolean;
}

export function drawWeather(ctx: Ctx, kind: Weather, t: number, opts: WeatherOpts = {}): void {
  const reduce = !!opts.reduce;
  switch (kind) {
    case 'clear':
      return;
    case 'rain':
      overlay(ctx, '#0a1030', 0.12);
      if (!reduce) rain(ctx, t, '#a9c4ff', 220, 0.45);
      return;
    case 'acid-rain':
      overlay(ctx, '#3cff6a', 0.06);
      if (!reduce) rain(ctx, t, '#b7ff6a', 240, 0.5);
      return;
    case 'snow':
      overlay(ctx, '#c8d8ff', 0.05);
      if (!reduce) flakes(ctx, t, '#ffffff', 170, 8, 8, 6);
      return;
    case 'ash':
      overlay(ctx, '#5a4a40', 0.12);
      if (!reduce) {
        flakes(ctx, t, '#b8aea6', 120, 5, 5, 8);
        flakes(ctx, t, '#ff7a2a', 26, 6, 6, 4, true);
      }
      return;
    case 'data-rain':
      overlay(ctx, '#00ff66', 0.04);
      if (!reduce) dataRain(ctx, t);
      return;
    case 'sandstorm':
      vgrad(ctx, 0, 0, W, H, [[0, rgba('#c98a3e', 0.25)], [1, rgba('#e0a050', 0.5)]]);
      if (!reduce) streaks(ctx, t, '#f2c27a', 160, 0.35);
      return;
    case 'dust-storm': {
      vgrad(ctx, 0, 0, W, H, [[0, rgba('#6a4a2a', 0.35)], [1, rgba('#a0683a', 0.45)]]);
      if (!reduce) streaks(ctx, t, '#d09060', 120, 0.3);
      // lightning: six strikes per loop, a few frames each
      const p = phase(t, 6);
      if (!reduce && p < 0.012) {
        overlay(ctx, '#e8f0ff', 0.35 * (1 - p / 0.012));
        const s = tick(t, 6);
        let x = 60 + hash2(s, 41) * (W - 120);
        let y = 0;
        while (y < 150) {
          const nx = x + (hash2(s, y) - 0.5) * 10;
          rect(ctx, Math.min(x, nx), y, Math.abs(nx - x) + 1, 6, '#f4f8ff');
          x = nx;
          y += 6;
        }
      }
      return;
    }
    case 'smog':
      vgrad(ctx, 0, 0, W, H, [[0, rgba('#6b6b3a', 0.08)], [0.6, rgba('#7a7040', 0.28)], [1, rgba('#4a4a2a', 0.2)]]);
      for (let i = 0; i < 4; i++) {
        const y = 60 + i * 40;
        const off = phase(t, 1 + i) * W;
        ctx.globalAlpha = 0.18;
        vgrad(ctx, -W + off, y, W * 2, 26, [[0, 'rgba(160,150,100,0)'], [0.5, 'rgba(160,150,100,0.6)'], [1, 'rgba(160,150,100,0)']]);
      }
      ctx.globalAlpha = 1;
      return;
    case 'terminator': {
      // one full day/night cycle per loop
      const night = 0.5 - 0.5 * Math.cos(phase(t, 1) * Math.PI * 2);
      overlay(ctx, '#05081a', night * 0.55);
      return;
    }
  }
}

export function weatherAmbience(kind: Weather): { kind: string; label: string; gain: number }[] {
  switch (kind) {
    case 'rain':
      return [{ kind: 'rain', label: 'Rain', gain: 0.7 }];
    case 'acid-rain':
      return [{ kind: 'rain', label: 'Acid rain', gain: 0.75 }];
    case 'snow':
      return [{ kind: 'wind', label: 'Snow wind', gain: 0.35 }];
    case 'ash':
      return [{ kind: 'wind', label: 'Ash wind', gain: 0.4 }];
    case 'data-rain':
      return [{ kind: 'static', label: 'Data rain', gain: 0.25 }];
    case 'sandstorm':
      return [
        { kind: 'sand', label: 'Sandstorm', gain: 0.6 },
        { kind: 'wind', label: 'Storm wind', gain: 0.5 },
      ];
    case 'dust-storm':
      return [
        { kind: 'wind', label: 'Dust wind', gain: 0.55 },
        { kind: 'rumble', label: 'Thunder', gain: 0.6 },
      ];
    default:
      return [];
  }
}
