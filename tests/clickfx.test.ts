import { describe, it, expect } from 'vitest';
import { ClickFx, WORLD_FX, type FxKind } from '../src/scene/clickfx';
import { WORLDS } from '../src/worlds';
import { mockCtx } from './mockctx';

describe('click effects', () => {
  it('every world has an effect', () => {
    for (const w of WORLDS) expect(WORLD_FX[w.id]).toBeDefined();
  });

  for (const kind of new Set(Object.values(WORLD_FX)) as Set<FxKind>) {
    it(`${kind}: draws, then clears itself within a few seconds`, () => {
      const fx = new ClickFx();
      const { ctx, log } = mockCtx();
      const t0 = performance.now();
      fx.spawn(kind, 240, 135, '#ff2a6d', '#05d9e8');
      expect(fx.active).toBe(true);
      for (let i = 1; i <= 50; i++) fx.draw(ctx, t0 + i * 66);
      expect(log.some((l) => l.startsWith('fillRect'))).toBe(true);
      expect(log.some((l) => l.includes('NaN'))).toBe(false);
      expect(fx.active).toBe(false);
    });
  }

  it('caps particles when clicked many times', () => {
    const fx = new ClickFx();
    for (let i = 0; i < 100; i++) fx.spawn('static', 100, 100, '#fff', '#000');
    expect((fx as unknown as { ps: unknown[] }).ps.length).toBeLessThanOrEqual(700);
  });
});
