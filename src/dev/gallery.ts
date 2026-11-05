// Dev-only: renders every world (or one, via ?world=id) at a few loop times and weathers.
import { WORLDS } from '../worlds';
import { renderFrame } from '../scene/renderer';
import { mulberry32, seedFrom, W, H } from '../scene/core';
import type { Weather } from '../scene/weather';

const params = new URLSearchParams(location.search);
const only = params.get('world');
const times = (params.get('t') ?? '0,75').split(',').map(Number);
const big = params.has('big');
const allWeather = params.has('weather');
const live = params.has('live');
const out = document.getElementById('out')!;

for (const world of WORLDS) {
  if (only && world.id !== only) continue;
  const h = document.createElement('h2');
  h.textContent = `${world.name} — ${world.source}`;
  out.appendChild(h);
  const row = document.createElement('div');
  row.className = 'row';
  out.appendChild(row);
  const scene = world.create(mulberry32(seedFrom(world.id)));
  const bg = document.createElement('canvas');
  bg.width = W;
  bg.height = H;
  scene.drawStatic(bg.getContext('2d')!);
  const weathers: Weather[] = allWeather ? world.weathers : [world.weathers[0]];
  for (const wx of weathers) {
    for (const t of live ? [0] : times) {
      const fig = document.createElement('figure');
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      if (big) c.className = 'big';
      const cap = document.createElement('figcaption');
      cap.textContent = `${wx} · t=${t}`;
      fig.append(c, cap);
      row.appendChild(fig);
      const ctx = c.getContext('2d', { alpha: false })!;
      if (live) {
        const start = performance.now();
        const loop = () => {
          renderFrame(ctx, scene, bg, wx, ((performance.now() - start) / 1000) % 240);
          requestAnimationFrame(loop);
        };
        loop();
      } else {
        renderFrame(ctx, scene, bg, wx, t);
      }
    }
  }
}
