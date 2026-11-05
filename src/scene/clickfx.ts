// Click effects: a short, world-themed burst drawn over the scene where the visitor clicks.
// These run on real time, not loop time, so they are outside the seamless-loop rule.
import { type Ctx, rgba } from './core';
import { glyphs, glow } from './draw';

export type FxKind =
  | 'neon' | 'flare' | 'trail' | 'ripple' | 'static' | 'grid'
  | 'speeders' | 'siren' | 'aura' | 'petals' | 'spice' | 'splash';

/** Which effect each world uses. */
export const WORLD_FX: Record<string, FxKind> = {
  'night-city': 'neon',
  'la-2019': 'flare',
  'neo-tokyo': 'trail',
  niihama: 'ripple',
  'chiba-city': 'static',
  'the-grid': 'grid',
  coruscant: 'speeders',
  'mega-city-one': 'siren',
  'vavatch-orbital': 'aura',
  millville: 'petals',
  arrakeen: 'spice',
  'the-citadel': 'splash',
};

interface Particle {
  x: number; y: number; vx: number; vy: number;
  ay: number; drag: number; sway: number;
  life: number; age: number; color: string; size: number;
  shape: 'dot' | 'glyph' | 'streak' | 'petal';
  len: number; seed: number;
}

interface Ring {
  x: number; y: number; r: number; vr: number;
  life: number; age: number; delay: number; color: string;
  shape: 'circle' | 'square' | 'diamond'; squash: number;
}

interface Flash {
  x: number; y: number; r: number; life: number; age: number; delay: number; color: string;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export class ClickFx {
  private ps: Particle[] = [];
  private rs: Ring[] = [];
  private fs: Flash[] = [];
  private last = 0;

  get active(): boolean {
    return this.ps.length + this.rs.length + this.fs.length > 0;
  }

  private p(x: number, y: number, o: Partial<Particle>): void {
    this.ps.push({
      x, y, vx: 0, vy: 0, ay: 0, drag: 0, sway: 0, life: 1, age: 0,
      color: '#ffffff', size: 1, shape: 'dot', len: 0, seed: Math.floor(Math.random() * 1e6), ...o,
    });
  }

  private ring(x: number, y: number, o: Partial<Ring>): void {
    this.rs.push({ x, y, r: 0, vr: 60, life: 0.8, age: 0, delay: 0, color: '#ffffff', shape: 'circle', squash: 1, ...o });
  }

  private flash(x: number, y: number, o: Partial<Flash>): void {
    this.fs.push({ x, y, r: 30, life: 0.35, age: 0, delay: 0, color: '#ffffff', ...o });
  }

  /** Radial burst of particles. */
  private burst(x: number, y: number, n: number, speed: [number, number], o: Partial<Particle>, colors: string[], life: [number, number] = [0.5, 1]): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rnd(speed[0], speed[1]);
      this.p(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, color: pick(colors), life: rnd(life[0], life[1]), ...o });
    }
  }

  spawn(kind: FxKind, x: number, y: number, a1: string, a2: string): void {
    if (!this.active) this.last = performance.now();
    // keep the total small so a click-happy visitor cannot slow the page down
    if (this.ps.length > 600) this.ps.splice(0, this.ps.length - 600);
    switch (kind) {
      case 'neon':
        this.flash(x, y, { color: a1, r: 34 });
        this.ring(x, y, { color: a2, vr: 110, life: 0.6 });
        this.ring(x, y, { color: a1, vr: 70, life: 0.8, delay: 0.08 });
        this.burst(x, y, 18, [40, 110], { drag: 2.5, size: 1 }, [a1, a2, '#f9f871']);
        for (let i = 0; i < 6; i++) this.p(x + rnd(-14, 14), y + rnd(-6, 6), { vy: rnd(-18, -32), shape: 'glyph', color: a2, life: rnd(0.9, 1.4) });
        break;
      case 'flare':
        this.flash(x, y, { color: '#ff8a2a', r: 44, life: 0.45 });
        for (let i = 0; i < 30; i++) {
          this.p(x + rnd(-3, 3), y, { vx: rnd(-28, 28), vy: rnd(-120, -40), ay: 50, drag: 0.8, color: pick(['#fff1b8', '#ffd27a', '#ff8a2a', '#ff4a1a']), life: rnd(0.5, 1.2), size: Math.random() < 0.3 ? 2 : 1 });
        }
        for (let i = 0; i < 6; i++) this.p(x + rnd(-6, 6), y - 4, { vx: rnd(-6, 6), vy: rnd(-14, -24), color: '#5a4a44', life: rnd(1.2, 1.8), size: 2 });
        break;
      case 'trail':
        this.flash(x, y, { color: '#ff2030', r: 26 });
        for (let i = 0; i < 7; i++) {
          const dir = i % 2 ? 1 : -1;
          this.p(x, y + rnd(-10, 10), { vx: dir * rnd(180, 320), vy: rnd(-6, 6), shape: 'streak', len: rnd(0.08, 0.16), color: '#ff2030', life: rnd(0.4, 0.7) });
        }
        this.ring(x, y, { color: '#ff5060', vr: 90, life: 0.5, squash: 0.5 });
        break;
      case 'ripple':
        for (let i = 0; i < 3; i++) this.ring(x, y, { color: i ? a1 : '#d8fff4', vr: 34, life: 1.5, delay: i * 0.22, squash: 0.35 });
        for (let i = 0; i < 10; i++) this.p(x, y, { vx: rnd(-30, 30), vy: rnd(-70, -35), ay: 180, color: '#cdeee6', life: rnd(0.5, 0.8) });
        break;
      case 'static':
        this.ring(x, y, { color: '#d0d0d0', vr: 70, life: 0.55, shape: 'square' });
        for (let i = 0; i < 70; i++) {
          this.p(x + rnd(-16, 16), y + rnd(-10, 10), { color: pick(['#ffffff', '#b8b8b8', '#7a7a7a', a1]), life: rnd(0.1, 0.5) });
        }
        for (let i = 0; i < 4; i++) this.p(x + rnd(-10, 10), y, { vy: rnd(-14, -26), shape: 'glyph', color: a1, life: rnd(0.8, 1.2) });
        break;
      case 'grid':
        this.flash(x, y, { color: '#00e5ff', r: 24 });
        this.ring(x, y, { color: '#00e5ff', vr: 50, life: 0.7, shape: 'square' });
        this.ring(x, y, { color: '#ff8a00', vr: 75, life: 0.8, shape: 'diamond', delay: 0.06 });
        for (const [vx, vy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          this.p(x, y, { vx: vx * 260, vy: vy * 160, shape: 'streak', len: 0.12, color: '#7ff6ff', life: 0.6 });
        }
        break;
      case 'speeders':
        this.flash(x, y, { color: '#ffb347', r: 28 });
        for (let i = 0; i < 14; i++) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          this.p(x, y + rnd(-14, 14), { vx: dir * rnd(110, 230), vy: rnd(-25, 25), shape: 'streak', len: 0.06, color: dir > 0 ? '#fff4d8' : '#ff5a4a', life: rnd(0.6, 1) });
        }
        break;
      case 'siren':
        for (let i = 0; i < 4; i++) this.ring(x, y, { color: i % 2 ? '#2a6aff' : '#ff2020', vr: 80, life: 0.7, delay: i * 0.14 });
        this.flash(x, y, { color: '#ff2020', r: 36, life: 0.2 });
        this.flash(x, y, { color: '#2a6aff', r: 36, life: 0.2, delay: 0.2 });
        this.burst(x, y, 10, [30, 70], { drag: 2 }, ['#ffd400']);
        break;
      case 'aura': {
        const hues = ['#7fd8ff', '#c58cff', '#ffd27a', '#7dffb0'];
        hues.slice(0, 3).forEach((c, i) => this.ring(x, y, { color: c, vr: 30, life: 1.6, delay: i * 0.25 }));
        this.flash(x, y, { color: pick(hues), r: 22, life: 0.9 });
        for (let i = 0; i < 6; i++) this.p(x + rnd(-10, 10), y + rnd(-4, 4), { vy: rnd(-10, -22), sway: 6, color: pick(hues), life: rnd(1.2, 1.8) });
        break;
      }
      case 'petals':
        this.ring(x, y, { color: '#dff4ff', vr: 130, life: 0.5 });
        for (let i = 0; i < 20; i++) {
          this.p(x, y, { vx: rnd(-50, 50), vy: rnd(-80, -30), ay: 45, drag: 1.2, sway: 10, shape: 'petal', color: pick(['#c58cff', '#8f5bd8', '#e7c6ff']), life: rnd(1.2, 2) });
        }
        for (let i = 0; i < 4; i++) this.p(x + rnd(-12, 12), y + rnd(-8, 4), { vy: rnd(-6, -14), sway: 8, color: '#fff27a', life: rnd(1.5, 2.2) });
        break;
      case 'spice':
        for (let i = 0; i < 3; i++) this.ring(x, y, { color: '#d9a066', vr: 40, life: 1.2, delay: i * 0.3, squash: 0.3 });
        this.burst(x, y, 16, [20, 50], { ay: 60, drag: 1 }, ['#c98a4e', '#a8703a'], [0.4, 0.8]);
        for (let i = 0; i < 22; i++) this.p(x + rnd(-8, 8), y, { vx: rnd(-12, 12), vy: rnd(-45, -15), ay: -6, sway: 7, color: pick(['#ff9f1c', '#ffcf6b', '#ff7a1a']), life: rnd(1, 1.8) });
        break;
      case 'splash':
        this.ring(x, y, { color: '#bfe6ff', vr: 45, life: 0.9, squash: 0.3 });
        for (let i = 0; i < 26; i++) {
          this.p(x, y, { vx: rnd(-55, 55), vy: rnd(-150, -60), ay: 260, color: pick(['#ffffff', '#e8f6ff', '#9fd8ff']), life: rnd(0.6, 1), size: Math.random() < 0.25 ? 2 : 1 });
        }
        this.burst(x, y, 10, [15, 40], { ay: 30, drag: 1.5 }, ['#d9925a', '#b8743e'], [0.6, 1]);
        break;
    }
  }

  /** Advance and draw. `now` is performance.now(). */
  draw(ctx: Ctx, now: number): void {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    if (!this.active) return;

    for (const f of this.fs) {
      f.age += dt;
      const k = f.age - f.delay;
      if (k < 0) continue;
      glow(ctx, f.x, f.y, f.r * (0.6 + 0.4 * (k / f.life)), f.color, 0.5 * (1 - k / f.life));
    }
    this.fs = this.fs.filter((f) => f.age - f.delay < f.life);

    for (const r of this.rs) {
      r.age += dt;
      const k = r.age - r.delay;
      if (k < 0) continue;
      const rad = r.vr * k;
      const a = 1 - k / r.life;
      ctx.fillStyle = rgba(r.color, a * 0.9);
      if (r.shape === 'square') {
        const s = Math.round(rad);
        ctx.fillRect(Math.round(r.x - s), Math.round(r.y - s), s * 2, 1);
        ctx.fillRect(Math.round(r.x - s), Math.round(r.y + s), s * 2 + 1, 1);
        ctx.fillRect(Math.round(r.x - s), Math.round(r.y - s), 1, s * 2);
        ctx.fillRect(Math.round(r.x + s), Math.round(r.y - s), 1, s * 2);
      } else {
        const n = Math.max(16, Math.floor(rad * 6));
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          let dx = Math.cos(t) * rad;
          let dy = Math.sin(t) * rad * r.squash;
          if (r.shape === 'diamond') {
            const m = Math.abs(Math.cos(t)) + Math.abs(Math.sin(t));
            dx /= m;
            dy /= m;
          }
          ctx.fillRect(Math.round(r.x + dx), Math.round(r.y + dy), 1, 1);
        }
      }
    }
    this.rs = this.rs.filter((r) => r.age - r.delay < r.life);

    for (const p of this.ps) {
      p.age += dt;
      p.vy += p.ay * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = Math.max(0, 1 - p.age / p.life);
      const sx = p.sway ? Math.sin(p.age * 5 + p.seed) * p.sway * 0.15 : 0;
      const x = Math.round(p.x + sx);
      const y = Math.round(p.y);
      if (p.shape === 'streak') {
        const steps = 10;
        for (let i = 0; i < steps; i++) {
          ctx.fillStyle = rgba(p.color, a * (1 - i / steps));
          ctx.fillRect(Math.round(p.x - p.vx * p.len * (i / steps)), Math.round(p.y - p.vy * p.len * (i / steps)), 1, 1);
        }
        ctx.fillStyle = rgba('#ffffff', a);
        ctx.fillRect(x, y, 1, 1);
      } else if (p.shape === 'glyph') {
        ctx.globalAlpha = a;
        glyphs(ctx, p.seed, x, y, 1, p.color, true);
        ctx.globalAlpha = 1;
      } else if (p.shape === 'petal') {
        ctx.fillStyle = rgba(p.color, a);
        const flip = Math.sin(p.age * 8 + p.seed) > 0;
        ctx.fillRect(x, y, flip ? 2 : 1, flip ? 1 : 2);
      } else {
        ctx.fillStyle = rgba(p.color, a);
        ctx.fillRect(x, y, p.size, p.size);
      }
    }
    this.ps = this.ps.filter((p) => p.age < p.life);
  }
}
