import { describe, it, expect } from 'vitest';
import { WORLDS } from '../src/worlds';
import { mulberry32, seedFrom, LOOP } from '../src/scene/core';
import { drawWeather, type Weather } from '../src/scene/weather';
import { mockCtx } from './mockctx';

function frameLog(worldIndex: number, t: number, weather?: Weather): string[] {
  const world = WORLDS[worldIndex];
  const scene = world.create(mulberry32(seedFrom(world.id)));
  const { ctx, log } = mockCtx();
  scene.drawFrame(ctx, t);
  if (weather) drawWeather(ctx, weather, t);
  return log;
}

describe('every world loops seamlessly', () => {
  WORLDS.forEach((world, i) => {
    it(`${world.id}: frame at t equals frame at t + LOOP`, () => {
      for (const t of [0.013, 37.337, 101.713, 239.271]) {
        expect(frameLog(i, t + LOOP)).toEqual(frameLog(i, t));
      }
    });
    it(`${world.id}: the scene moves`, () => {
      expect(frameLog(i, 50.123)).not.toEqual(frameLog(i, 63.417));
    });
    it(`${world.id}: draws the same frame twice (no Math.random in drawFrame)`, () => {
      expect(frameLog(i, 88.811)).toEqual(frameLog(i, 88.811));
    });
    for (const w of world.weathers) {
      it(`${world.id}: ${w} weather loops`, () => {
        expect(frameLog(i, 12.613 + LOOP, w)).toEqual(frameLog(i, 12.613, w));
      });
    }
    it(`${world.id}: metadata is complete`, () => {
      expect(world.weathers.length).toBeGreaterThan(0);
      expect(world.ambience.length).toBeGreaterThan(1);
      expect(new Set(world.ambience.map((a) => a.id)).size).toBe(world.ambience.length);
      expect(world.music.id).toBe(world.id);
    });
  });
});
