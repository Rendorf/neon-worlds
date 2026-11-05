// Synthesised ambience. Each kind builds a small graph and returns a stop function.
import type { AudioEngine } from './engine';

export type AmbKind =
  | 'rain' | 'wind' | 'sand' | 'sea' | 'water' | 'hum' | 'thrum' | 'griddrone'
  | 'traffic' | 'speeders' | 'bikes' | 'engine' | 'siren' | 'crowd' | 'chatter'
  | 'static' | 'arcade' | 'train' | 'chains' | 'wings' | 'rumble' | 'crickets'
  | 'phone' | 'shimmer' | 'pulse' | 'sweep' | 'steam' | 'birds';

export interface AmbSource {
  id: string;
  label: string;
  kind: AmbKind;
  gain: number;
}

type Stop = () => void;
type Builder = (e: AudioEngine, out: AudioNode) => Stop;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function noiseSrc(e: AudioEngine): AudioBufferSourceNode {
  const s = e.ctx.createBufferSource();
  s.buffer = e.noise;
  s.loop = true;
  s.start(e.now, Math.random() * 1.9);
  return s;
}

function filter(e: AudioEngine, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = e.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function lfo(e: AudioEngine, rate: number, depth: number, target: AudioParam, type: OscillatorType = 'sine'): OscillatorNode {
  const o = e.ctx.createOscillator();
  o.type = type;
  o.frequency.value = rate;
  const g = e.ctx.createGain();
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

function gain(e: AudioEngine, v: number): GainNode {
  const g = e.ctx.createGain();
  g.gain.value = v;
  return g;
}

/** Calls fire(time) at random intervals on the audio clock. */
function events(e: AudioEngine, min: number, max: number, fire: (when: number) => void, first = rand(0.5, min)): Stop {
  let nextAt = e.now + first;
  const id = window.setInterval(() => {
    const horizon = e.now + (document.visibilityState === 'hidden' ? 1.5 : 0.3);
    let guard = 0;
    while (nextAt < horizon && guard++ < 8) {
      if (nextAt > e.now - 0.2) fire(Math.max(nextAt, e.now + 0.02));
      nextAt += rand(min, max);
    }
  }, 200);
  return () => window.clearInterval(id);
}

function stopAll(nodes: (AudioScheduledSourceNode | AudioNode)[], extra: Stop[] = []): Stop {
  return () => {
    for (const n of nodes) {
      if ('stop' in n) {
        try { (n as AudioScheduledSourceNode).stop(); } catch { /* already stopped */ }
      }
      n.disconnect();
    }
    extra.forEach((s) => s());
  };
}

function noiseBed(e: AudioEngine, out: AudioNode, o: { lp?: number; hp?: number; bp?: number; q?: number; level: number; ampRate?: number; ampDepth?: number; freqRate?: number; freqDepth?: number }): Stop {
  const src = noiseSrc(e);
  let head: AudioNode = src;
  const nodes: AudioNode[] = [src];
  let main: BiquadFilterNode | null = null;
  for (const [type, f] of [['highpass', o.hp], ['lowpass', o.lp], ['bandpass', o.bp]] as const) {
    if (!f) continue;
    const n = filter(e, type, f, type === 'bandpass' ? o.q ?? 1 : 0.7);
    head.connect(n);
    head = n;
    nodes.push(n);
    main = n;
  }
  const g = gain(e, o.level);
  head.connect(g).connect(out);
  nodes.push(g);
  if (o.ampRate) nodes.push(lfo(e, o.ampRate, o.level * (o.ampDepth ?? 0.4), g.gain));
  if (o.freqRate && main) nodes.push(lfo(e, o.freqRate, o.freqDepth ?? 100, main.frequency));
  return stopAll(nodes);
}

/** A sound that swells and passes from one side to the other. */
function pass(e: AudioEngine, out: AudioNode, when: number, dur: number, build: (dest: AudioNode, when: number, dur: number) => void, level: number): void {
  const pan = e.ctx.createStereoPanner();
  const dir = Math.random() > 0.5 ? 1 : -1;
  pan.pan.setValueAtTime(-0.9 * dir, when);
  pan.pan.linearRampToValueAtTime(0.9 * dir, when + dur);
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  g.connect(pan).connect(out);
  build(g, when, dur);
  window.setTimeout(() => { g.disconnect(); pan.disconnect(); }, (when - e.now + dur + 1) * 1000);
}

function noiseBurst(e: AudioEngine, dest: AudioNode, when: number, dur: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1): void {
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;
  const f = filter(e, type, f0, q);
  f.frequency.setValueAtTime(f0, when);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), when + dur);
  src.connect(f).connect(dest);
  src.start(when, Math.random());
  src.stop(when + dur + 0.05);
}

function osc(e: AudioEngine, dest: AudioNode, when: number, dur: number, type: OscillatorType, f0: number, f1 = f0, level = 1, attack = 0.005): void {
  const o = e.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, when);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), when + dur);
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(level, when + attack);
  g.gain.exponentialRampToValueAtTime(0.0005, when + dur);
  o.connect(g).connect(dest);
  o.start(when);
  o.stop(when + dur + 0.05);
}

const BUILDERS: Record<AmbKind, Builder> = {
  rain: (e, out) => {
    const a = noiseBed(e, out, { hp: 500, lp: 7000, level: 0.32, ampRate: 0.11, ampDepth: 0.15 });
    const b = noiseBed(e, out, { lp: 400, level: 0.25 });
    const drips = events(e, 0.04, 0.25, (w) => osc(e, out, w, 0.03, 'sine', rand(1800, 4200), rand(900, 1500), 0.02));
    return () => { a(); b(); drips(); };
  },
  wind: (e, out) => noiseBed(e, out, { bp: 420, q: 0.9, level: 0.35, ampRate: 0.06, ampDepth: 0.7, freqRate: 0.07, freqDepth: 260 }),
  sand: (e, out) => noiseBed(e, out, { hp: 2400, lp: 9000, level: 0.12, ampRate: 0.13, ampDepth: 0.9 }),
  sea: (e, out) => {
    const a = noiseBed(e, out, { lp: 700, level: 0.4, ampRate: 0.09, ampDepth: 0.85 });
    const b = noiseBed(e, out, { hp: 1500, lp: 5000, level: 0.07, ampRate: 0.09, ampDepth: 0.9 });
    return () => { a(); b(); };
  },
  water: (e, out) => {
    const a = noiseBed(e, out, { lp: 1100, level: 0.22, ampRate: 0.2, ampDepth: 0.4 });
    const b = events(e, 0.25, 1.4, (w) => osc(e, out, w, 0.08, 'sine', rand(300, 600), rand(700, 1300), 0.05, 0.01));
    return () => { a(); b(); };
  },
  hum: (e, out) => {
    const g = gain(e, 0.05);
    const lp = filter(e, 'lowpass', 400);
    const o1 = e.ctx.createOscillator();
    o1.frequency.value = 60;
    const o2 = e.ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = 120;
    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g).connect(out);
    o1.start();
    o2.start();
    const flick = events(e, 2, 7, (w) => noiseBurst(e, out, w, 0.06, 'bandpass', 3000, 2500, 3));
    return stopAll([o1, o2, lp, g], [flick]);
  },
  thrum: (e, out) => {
    const g = gain(e, 0.1);
    const o1 = e.ctx.createOscillator();
    o1.frequency.value = 38;
    const o2 = e.ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = 57.3;
    o1.connect(g);
    o2.connect(g);
    g.connect(out);
    o1.start();
    o2.start();
    const l = lfo(e, 0.07, 0.06, g.gain);
    return stopAll([o1, o2, l, g]);
  },
  griddrone: (e, out) => {
    const g = gain(e, 0.07);
    const lp = filter(e, 'lowpass', 300, 4);
    const o1 = e.ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 55;
    const o2 = e.ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = 55.4;
    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g).connect(out);
    o1.start();
    o2.start();
    const l = lfo(e, 0.05, 140, lp.frequency);
    return stopAll([o1, o2, lp, g, l]);
  },
  traffic: (e, out) => {
    const bed = noiseBed(e, out, { lp: 500, level: 0.12 });
    const ev = events(e, 2.5, 8, (w) => {
      const d = rand(2.5, 4.5);
      pass(e, out, w, d, (dest, t, dd) => noiseBurst(e, dest, t, dd, 'bandpass', 300, 900, 1.5), 0.5);
    });
    return () => { bed(); ev(); };
  },
  speeders: (e, out) => {
    const bed = noiseBed(e, out, { bp: 900, q: 0.6, level: 0.06 });
    const ev = events(e, 1, 4, (w) => {
      const d = rand(1.2, 2.5);
      pass(e, out, w, d, (dest, t, dd) => {
        noiseBurst(e, dest, t, dd, 'bandpass', 1200, 2600, 3);
        osc(e, dest, t, dd, 'sawtooth', rand(180, 260), rand(120, 160), 0.05, dd * 0.4);
      }, 0.35);
    });
    return () => { bed(); ev(); };
  },
  bikes: (e, out) => events(e, 5, 14, (w) => {
    const d = rand(2.5, 4);
    pass(e, out, w, d, (dest, t, dd) => {
      const sh = e.ctx.createWaveShaper();
      sh.curve = e.curve(0.6);
      const lp = filter(e, 'lowpass', 1400);
      sh.connect(lp).connect(dest);
      osc(e, sh, t, dd, 'sawtooth', 90, 70, 0.6, dd * 0.3);
      osc(e, sh, t, dd * 0.6, 'sawtooth', 140, 220, 0.4, dd * 0.2);
      window.setTimeout(() => { sh.disconnect(); lp.disconnect(); }, (t - e.now + dd + 1) * 1000);
    }, 0.4);
  }),
  engine: (e, out) => {
    const sh = e.ctx.createWaveShaper();
    sh.curve = e.curve(0.5);
    const lp = filter(e, 'lowpass', 260, 3);
    const g = gain(e, 0.12);
    const o1 = e.ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 42;
    const o2 = e.ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = 43.5;
    o1.connect(sh);
    o2.connect(sh);
    sh.connect(lp).connect(g).connect(out);
    o1.start();
    o2.start();
    const l1 = lfo(e, 0.09, 8, o1.frequency);
    const l2 = lfo(e, 0.13, 0.06, g.gain);
    const revs = events(e, 6, 14, (w) => osc(e, lp, w, 2, 'sawtooth', 60, 110, 0.5, 0.6));
    return stopAll([o1, o2, sh, lp, g, l1, l2], [revs]);
  },
  siren: (e, out) => events(e, 14, 30, (w) => {
    const d = rand(5, 8);
    pass(e, out, w, d, (dest, t, dd) => {
      const o = e.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 780;
      const l = e.ctx.createOscillator();
      l.frequency.value = Math.random() > 0.5 ? 0.7 : 3.2;
      const lg = e.ctx.createGain();
      lg.gain.value = 170;
      l.connect(lg).connect(o.frequency);
      const lp = filter(e, 'lowpass', 1800);
      o.connect(lp).connect(dest);
      o.start(t);
      l.start(t);
      o.stop(t + dd);
      l.stop(t + dd);
    }, 0.08);
  }),
  crowd: (e, out) => {
    const stops = [320, 650, 1100, 2300].map((f, i) =>
      noiseBed(e, out, { bp: f, q: 3, level: 0.09 / (1 + i * 0.4), ampRate: 0.6 + i * 0.37, ampDepth: 0.7, freqRate: 0.9 + i * 0.3, freqDepth: f * 0.15 }));
    return () => stops.forEach((s) => s());
  },
  chatter: (e, out) => events(e, 7, 18, (w) => {
    const hp = filter(e, 'highpass', 500);
    const lp = filter(e, 'lowpass', 2800);
    const g = gain(e, 0.05);
    hp.connect(lp).connect(g).connect(out);
    let t = w;
    const n = Math.floor(rand(10, 22));
    for (let i = 0; i < n; i++) {
      const d = rand(0.07, 0.16);
      const o = e.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(rand(120, 190), t);
      const bp = filter(e, 'bandpass', rand(600, 1600), 5);
      const vg = e.ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(1, t + 0.02);
      vg.gain.linearRampToValueAtTime(0, t + d);
      o.connect(bp).connect(vg).connect(hp);
      o.start(t);
      o.stop(t + d + 0.02);
      t += d + (Math.random() < 0.15 ? rand(0.15, 0.4) : 0.02);
    }
    window.setTimeout(() => { hp.disconnect(); lp.disconnect(); g.disconnect(); }, (t - e.now + 1) * 1000);
  }),
  static: (e, out) => {
    const bed = noiseBed(e, out, { hp: 2500, level: 0.05, ampRate: 0.3, ampDepth: 0.3 });
    const cr = events(e, 0.08, 0.5, (w) => noiseBurst(e, out, w, 0.012, 'highpass', 1500));
    return () => { bed(); cr(); };
  },
  arcade: (e, out) => events(e, 0.8, 3, (w) => {
    const notes = [72, 75, 77, 79, 82, 84, 87];
    const n = Math.floor(rand(2, 6));
    for (let i = 0; i < n; i++) {
      const m = notes[Math.floor(Math.random() * notes.length)];
      const f = 440 * Math.pow(2, (m - 69) / 12);
      osc(e, out, w + i * 0.07, 0.06, 'square', f, f, 0.025);
    }
  }),
  train: (e, out) => events(e, 22, 45, (w) => {
    const d = 9;
    pass(e, out, w, d, (dest, t, dd) => {
      noiseBurst(e, dest, t, dd, 'lowpass', 220, 300);
      for (let k = 0.6; k < dd - 0.5; k += 0.9) {
        noiseBurst(e, dest, t + k, 0.05, 'bandpass', 900, 700, 2);
        noiseBurst(e, dest, t + k + 0.16, 0.05, 'bandpass', 900, 700, 2);
      }
    }, 0.45);
  }, 6),
  chains: (e, out) => events(e, 1.5, 5, (w) => {
    const n = Math.floor(rand(2, 5));
    for (let i = 0; i < n; i++) noiseBurst(e, out, w + i * rand(0.05, 0.12), 0.09, 'bandpass', rand(2500, 4200), rand(2000, 3500), 22);
  }),
  wings: (e, out) => events(e, 10, 24, (w) => {
    const d = rand(4, 6);
    pass(e, out, w, d, (dest, t, dd) => {
      const am = e.ctx.createGain();
      am.gain.value = 0.5;
      const l = e.ctx.createOscillator();
      l.type = 'square';
      l.frequency.value = 16;
      const lg = e.ctx.createGain();
      lg.gain.value = 0.5;
      l.connect(lg).connect(am.gain);
      am.connect(dest);
      noiseBurst(e, am, t, dd, 'bandpass', 500, 700, 1.2);
      l.start(t);
      l.stop(t + dd);
    }, 0.5);
  }, 3),
  rumble: (e, out) => events(e, 12, 30, (w) => {
    const g = e.ctx.createGain();
    const d = rand(4, 7);
    g.gain.setValueAtTime(0.0001, w);
    g.gain.exponentialRampToValueAtTime(0.8, w + d * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, w + d);
    g.connect(out);
    noiseBurst(e, g, w, d, 'lowpass', 160, 90, 1);
    osc(e, g, w, d, 'sine', 42, 34, 0.4, d * 0.3);
    window.setTimeout(() => g.disconnect(), (w - e.now + d + 1) * 1000);
  }, 4),
  crickets: (e, out) => {
    const nodes: AudioNode[] = [];
    for (const [f, r, gate] of [[4400, 28, 1.1], [4950, 33, 0.73], [3900, 24, 0.5]] as const) {
      const o = e.ctx.createOscillator();
      o.frequency.value = f;
      const am = gain(e, 0.5);
      const g1 = gain(e, 0.012);
      o.connect(am).connect(g1).connect(out);
      o.start();
      const l1 = lfo(e, r, 0.5, am.gain, 'square');
      const l2 = lfo(e, gate, 0.012, g1.gain, 'square');
      nodes.push(o, am, g1, l1, l2);
    }
    return stopAll(nodes);
  },
  phone: (e, out) => events(e, 28, 55, (w) => {
    const lp = filter(e, 'lowpass', 1600);
    const g = gain(e, 0.05);
    lp.connect(g).connect(out);
    for (let r = 0; r < 3; r++) {
      const t = w + r * 4;
      for (const f of [440, 480]) {
        const o = e.ctx.createOscillator();
        o.frequency.value = f;
        const am = e.ctx.createGain();
        am.gain.value = 0;
        const l = e.ctx.createOscillator();
        l.type = 'square';
        l.frequency.value = 20;
        const lg = e.ctx.createGain();
        lg.gain.value = 0.5;
        l.connect(lg).connect(am.gain);
        const env = e.ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(1, t + 0.02);
        env.gain.setValueAtTime(1, t + 1.9);
        env.gain.linearRampToValueAtTime(0, t + 2);
        o.connect(am).connect(env).connect(lp);
        o.start(t);
        l.start(t);
        o.stop(t + 2.05);
        l.stop(t + 2.05);
      }
    }
    window.setTimeout(() => { lp.disconnect(); g.disconnect(); }, (w - e.now + 14) * 1000);
  }, 8),
  shimmer: (e, out) => events(e, 5, 12, (w) => {
    const n = Math.floor(rand(4, 7));
    for (let i = 0; i < n; i++) {
      const f = rand(1800, 5200);
      osc(e, out, w + i * 0.06, rand(1.5, 2.5), 'sine', f, f * 1.06, 0.025, 0.4);
    }
  }, 2),
  pulse: (e, out) => events(e, 1, 3, (w) => {
    const f = [880, 1320, 1760, 660][Math.floor(Math.random() * 4)];
    osc(e, out, w, 0.5, 'sine', f, f, 0.05, 0.003);
    osc(e, out, w + 0.18, 0.4, 'sine', f, f, 0.02, 0.003);
  }),
  sweep: (e, out) => events(e, 5, 12, (w) => {
    const d = rand(1.3, 2.2);
    pass(e, out, w, d, (dest, t, dd) => {
      const lp = filter(e, 'lowpass', 2200, 4);
      lp.connect(dest);
      osc(e, lp, t, dd, 'sawtooth', rand(160, 220), rand(600, 900), 0.4, dd * 0.4);
      window.setTimeout(() => lp.disconnect(), (t - e.now + dd + 1) * 1000);
    }, 0.25);
  }),
  steam: (e, out) => events(e, 4, 11, (w) => {
    const g = e.ctx.createGain();
    const d = rand(1, 2.2);
    g.gain.setValueAtTime(0, w);
    g.gain.linearRampToValueAtTime(0.18, w + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0005, w + d);
    g.connect(out);
    noiseBurst(e, g, w, d, 'highpass', 2500, 1800);
    window.setTimeout(() => g.disconnect(), (w - e.now + d + 1) * 1000);
  }),
  birds: (e, out) => events(e, 3, 9, (w) => {
    const n = Math.floor(rand(1, 4));
    for (let i = 0; i < n; i++) {
      const f = rand(1400, 2200);
      osc(e, out, w + i * rand(0.2, 0.35), 0.22, 'sine', f, f * 0.7, 0.04, 0.02);
    }
  }),
};

interface Active {
  src: AmbSource;
  gain: GainNode;
  stop: Stop;
}

export class AmbiencePlayer {
  private active = new Map<string, Active>();
  constructor(private engine: AudioEngine) {}

  /** Replace the active set, crossfading. levels are the user's mixer settings (0..1). */
  setSources(sources: AmbSource[], levels: Record<string, number>): void {
    const e = this.engine;
    const want = new Map(sources.map((s) => [s.id, s]));
    for (const [id, a] of this.active) {
      if (want.has(id)) continue;
      a.gain.gain.setTargetAtTime(0, e.now, 0.6);
      window.setTimeout(() => { a.stop(); a.gain.disconnect(); }, 3500);
      this.active.delete(id);
    }
    for (const s of sources) {
      const level = s.gain * (levels[s.id] ?? 1);
      const cur = this.active.get(s.id);
      if (cur) {
        cur.gain.gain.setTargetAtTime(level, e.now, 0.3);
        continue;
      }
      const g = e.ctx.createGain();
      g.gain.value = 0;
      g.connect(e.ambienceOut);
      const stop = BUILDERS[s.kind](e, g);
      g.gain.setTargetAtTime(level, e.now, 0.8);
      this.active.set(s.id, { src: s, gain: g, stop });
    }
  }

  setLevel(id: string, level: number): void {
    const a = this.active.get(id);
    if (a) a.gain.gain.setTargetAtTime(a.src.gain * level, this.engine.now, 0.1);
  }

  stopAll(): void {
    for (const a of this.active.values()) {
      a.gain.gain.setTargetAtTime(0, this.engine.now, 0.3);
      const x = a;
      window.setTimeout(() => { x.stop(); x.gain.disconnect(); }, 1500);
    }
    this.active.clear();
  }
}
