import { W, H, LOOP, mulberry32, seedFrom } from './core';
import { drawWeather, type Weather } from './weather';
import { ClickFx, WORLD_FX } from './clickfx';
import type { Scene, WorldDef } from '../worlds/types';

export function loopTime(nowMs = Date.now()): number {
  // Everyone sees the same moment of the loop, like a shared broadcast.
  return (nowMs / 1000) % LOOP;
}

function makeCanvas(w = W, h = H): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function buildScene(world: WorldDef): { scene: Scene; bg: HTMLCanvasElement } {
  const scene = world.create(mulberry32(seedFrom(world.id)));
  const bg = makeCanvas();
  const bctx = bg.getContext('2d')!;
  bctx.imageSmoothingEnabled = false;
  scene.drawStatic(bctx);
  return { scene, bg };
}

export function renderFrame(ctx: CanvasRenderingContext2D, scene: Scene, bg: HTMLCanvasElement, weather: Weather, t: number, reduce = false): void {
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.drawImage(bg, 0, 0);
  scene.drawFrame(ctx, t);
  ctx.globalAlpha = 1;
  drawWeather(ctx, weather, t, { reduce });
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: Scene | null = null;
  private world: WorldDef | null = null;
  private fx = new ClickFx();
  private bg: HTMLCanvasElement | null = null;
  private weather: Weather = 'clear';
  private raf = 0;
  private hiddenTimer: number | null = null;
  private last = 0;
  reduceMotion = false;
  frozenAt = 42;
  fps = 30;
  /** keep drawing while the tab is hidden (picture-in-picture) */
  keepAliveHidden = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    document.addEventListener('visibilitychange', () => this.syncHidden());
  }

  setWorld(world: WorldDef): void {
    const { scene, bg } = buildScene(world);
    this.world = world;
    this.scene = scene;
    this.bg = bg;
    this.draw();
  }

  setWeather(w: Weather): void {
    this.weather = w;
    this.draw();
  }

  time(): number {
    return this.reduceMotion ? this.frozenAt : loopTime();
  }

  draw(t = this.time()): void {
    if (!this.scene || !this.bg) return;
    renderFrame(this.ctx, this.scene, this.bg, this.weather, t, this.reduceMotion);
    if (this.fx.active) this.fx.draw(this.ctx, performance.now());
  }

  /** Map a click in page coordinates to scene pixels, honouring object-fit. */
  toScene(clientX: number, clientY: number): { x: number; y: number } | null {
    const r = this.canvas.getBoundingClientRect();
    const contain = getComputedStyle(this.canvas).objectFit === 'contain';
    const scale = contain ? Math.min(r.width / W, r.height / H) : Math.max(r.width / W, r.height / H);
    const x = (clientX - r.left - (r.width - W * scale) / 2) / scale;
    const y = (clientY - r.top - (r.height - H * scale) / 2) / scale;
    return x >= 0 && x < W && y >= 0 && y < H ? { x, y } : null;
  }

  /** Play the current world's click effect at a page position. */
  click(clientX: number, clientY: number): void {
    if (this.reduceMotion || !this.world) return;
    const pt = this.toScene(clientX, clientY);
    if (!pt) return;
    this.fx.spawn(WORLD_FX[this.world.id] ?? 'neon', pt.x, pt.y, this.world.accent, this.world.accent2);
  }

  start(): void {
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const interval = this.reduceMotion ? 1000 : 1000 / this.fps;
      if (now - this.last < interval - 2) return;
      this.last = now;
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private syncHidden(): void {
    const hidden = document.visibilityState === 'hidden';
    if (hidden && this.keepAliveHidden && this.hiddenTimer === null) {
      this.hiddenTimer = window.setInterval(() => this.draw(), 1000 / 15);
    } else if ((!hidden || !this.keepAliveHidden) && this.hiddenTimer !== null) {
      window.clearInterval(this.hiddenTimer);
      this.hiddenTimer = null;
    }
  }

  setKeepAlive(on: boolean): void {
    this.keepAliveHidden = on;
    this.syncHidden();
  }

  /** A scaled-up, crisp copy of the current frame. */
  snapshot(scale = 4): HTMLCanvasElement {
    const out = makeCanvas(W * scale, H * scale);
    const octx = out.getContext('2d')!;
    octx.imageSmoothingEnabled = false;
    octx.drawImage(this.canvas, 0, 0, W * scale, H * scale);
    return out;
  }
}

const thumbCache = new Map<string, string>();

/** Small preview image of a world for the picker. */
export function thumbnail(world: WorldDef, weather: Weather = world.weathers[0]): string {
  const key = world.id + ':' + weather;
  const hit = thumbCache.get(key);
  if (hit) return hit;
  const { scene, bg } = buildScene(world);
  const c = makeCanvas();
  const ctx = c.getContext('2d')!;
  renderFrame(ctx, scene, bg, weather, 75);
  const small = makeCanvas(240, 135);
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(c, 0, 0, 240, 135);
  const url = small.toDataURL('image/png');
  thumbCache.set(key, url);
  return url;
}
