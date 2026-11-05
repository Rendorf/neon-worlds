import type { Ctx, Rng } from '../scene/core';
import type { Weather } from '../scene/weather';
import type { MusicStyle } from '../audio/types';
import type { AmbSource } from '../audio/ambience';

export interface Scene {
  /** Everything that never moves. Drawn once into an offscreen canvas. */
  drawStatic(ctx: Ctx): void;
  /** Everything that moves, as a pure function of loop time t. */
  drawFrame(ctx: Ctx, t: number): void;
}

export interface WorldDef {
  id: string;
  name: string;
  /** the work the world comes from */
  source: string;
  creator: string;
  tagline: string;
  /** label shown next to the local clock, e.g. "2077" */
  era: string;
  /** hours added to the visitor's clock for the world's local time */
  hourOffset: number;
  accent: string;
  accent2: string;
  /** first entry is the default */
  weathers: Weather[];
  music: MusicStyle;
  ambience: AmbSource[];
  create(rng: Rng): Scene;
}
