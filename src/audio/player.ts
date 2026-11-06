// Lookahead scheduler: a JS timer schedules notes ahead on the AudioContext clock.
import { composeTrack, eventsAt, totalSteps, trackTitle, type Role, type Track } from './composer';
import type { AudioEngine, TrackBus } from './engine';
import type { MusicStyle, Vibe } from './types';

export interface QueueItem {
  seed: number;
  title: string;
}

export interface NowPlaying {
  title: string;
  style: MusicStyle;
  bpm: number;
  vibe: Vibe;
  progress: number; // 0..1
  queue: QueueItem[];
}

const CROSSFADE = 2.5;

export class MusicPlayer {
  private style: MusicStyle;
  private vibe: Vibe = 'focus';
  private track: Track | null = null;
  private bus: TrackBus | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private counter = 0;
  queue: QueueItem[] = [];
  playing = false;
  onChange: (np: NowPlaying) => void = () => {};

  constructor(private engine: AudioEngine, style: MusicStyle) {
    this.style = style;
    this.refillQueue();
  }

  private newSeed(): number {
    this.counter++;
    return (Math.floor(Math.random() * 0x7fffffff) ^ (this.counter * 2654435761)) >>> 0;
  }

  private refillQueue(): void {
    while (this.queue.length < 4) {
      const seed = this.newSeed();
      this.queue.push({ seed, title: trackTitle(this.style, seed) });
    }
  }

  get nowPlaying(): NowPlaying | null {
    if (!this.track) return null;
    return {
      title: this.track.title,
      style: this.style,
      bpm: this.track.bpm,
      vibe: this.vibe,
      progress: Math.min(1, this.step / totalSteps(this.track)),
      queue: this.queue.slice(0, 3),
    };
  }

  private emit(): void {
    const np = this.nowPlaying;
    if (np) this.onChange(np);
  }

  /** Start a new track now, crossfading out whatever was playing. */
  private startTrack(item?: QueueItem, fade = CROSSFADE): void {
    const e = this.engine;
    const next = item ?? this.queue.shift()!;
    this.refillQueue();
    const old = this.bus;
    if (old) {
      e.fadeBus(old, 0, fade);
      window.setTimeout(() => e.disposeBus(old), (fade + 6) * 1000);
    }
    this.track = composeTrack(this.style, next.seed, this.vibe);
    this.bus = e.createTrackBus();
    e.fadeBus(this.bus, 1, old ? Math.min(1.2, fade) : 0.4);
    this.step = 0;
    this.nextTime = e.now + 0.08;
    e.setDelayTime((60 / this.track.bpm) * this.style.delayBeats);
    this.emit();
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.startTrack(undefined, 0.6);
    this.loop();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    if (this.bus) {
      const b = this.bus;
      this.engine.fadeBus(b, 0, 0.4);
      window.setTimeout(() => this.engine.disposeBus(b), 5000);
      this.bus = null;
    }
  }

  next(): void {
    if (!this.playing) return;
    this.startTrack(undefined, 1.2);
  }

  playQueued(index: number): void {
    const item = this.queue.splice(index, 1)[0];
    if (!item) return;
    if (!this.playing) {
      this.queue.unshift(item);
      this.play();
    } else {
      this.startTrack(item, 1.2);
    }
  }

  setStyle(style: MusicStyle): void {
    if (style.id === this.style.id) return;
    this.style = style;
    this.queue = [];
    this.refillQueue();
    if (this.playing) this.startTrack(undefined, CROSSFADE);
  }

  setVibe(vibe: Vibe): void {
    if (vibe === this.vibe) return;
    this.vibe = vibe;
    if (this.playing && this.track) this.startTrack({ seed: this.track.seed, title: this.track.title }, 1.5);
  }

  private lookahead(): number {
    return document.visibilityState === 'hidden' ? 1.6 : 0.2;
  }

  private loop = (): void => {
    if (!this.playing) return;
    const e = this.engine;
    const horizon = e.now + this.lookahead();
    // if we fell far behind (tab suspended), resync instead of bursting notes
    if (this.nextTime < e.now - 0.5) this.nextTime = e.now + 0.05;
    let guard = 0;
    while (this.nextTime < horizon && this.track && this.bus && guard++ < 256) {
      if (this.step >= totalSteps(this.track)) {
        this.startTrack(undefined, 3);
        continue;
      }
      scheduleStep(this.engine, this.style, this.track, this.bus, this.step, this.nextTime);
      const stepDur = 60 / this.track.bpm / 4;
      this.nextTime += stepDur;
      this.step++;
      if (this.step % 64 === 0) this.emit();
    }
    this.timer = window.setTimeout(this.loop, 25);
  };
}

/** Mix trims per role, measured with the audio lab (dev page) so every style sits at a similar balance. */
export const ROLE_LEVEL: Record<Role, number> = {
  kick: 0.55, snare: 3, hat: 8, openhat: 4, perc: 1.4,
  bass: 0.5, pad: 1.6, arp: 1.7, lead: 2, drone: 0.5, bell: 2.5,
};

/** Schedule every note of one 16th step. `only` limits it to some roles (used by the audio lab). */
export function scheduleStep(e: AudioEngine, style: MusicStyle, track: Track, bus: TrackBus, step: number, time: number, only?: Set<Role>): void {
  const stepDur = 60 / track.bpm / 4;
  const when = step % 2 === 1 ? time + track.swing * stepDur : time;
  for (const ev of eventsAt(track, step)) {
    if (only && !only.has(ev.role)) continue;
    const dur = ev.dur * stepDur;
    const lv = ROLE_LEVEL[ev.role];
    switch (ev.role) {
      case 'kick':
        if (style.kit) e.playDrum('kick', style.kit, when, ev.vel, bus, lv);
        e.duckAt(bus, when, style.sidechain, stepDur * 4);
        break;
      case 'snare':
      case 'hat':
      case 'openhat':
      case 'perc':
        if (style.kit) e.playDrum(ev.role, style.kit, when, ev.vel, bus, lv);
        break;
      case 'bass':
        if (style.bass) e.playVoice(style.bass, ev.midi, when, dur * 0.92, ev.vel, bus, 'dry', lv, ev.bright);
        break;
      case 'pad':
        if (style.pad) e.playVoice(style.pad, ev.midi, when, dur, ev.vel, bus, 'duck', lv, ev.bright);
        break;
      case 'arp':
        if (style.arp) e.playVoice(style.arp, ev.midi, when, dur * 0.8, ev.vel, bus, 'duck', lv, ev.bright);
        break;
      case 'lead':
        if (style.lead) e.playVoice(style.lead, ev.midi, when, dur * 0.95, ev.vel, bus, 'duck', lv);
        break;
      case 'drone':
        if (style.drone) e.playVoice(style.drone, ev.midi, when, dur, ev.vel, bus, 'dry', lv);
        break;
      case 'bell':
        if (style.bell) e.playVoice(style.bell, ev.midi, when, dur, ev.vel, bus, 'duck', lv);
        break;
    }
  }
}
