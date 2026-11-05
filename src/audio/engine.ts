// Web Audio graph: master chain, shared reverb/delay, per-track buses, voices and drums.
import { midiToFreq } from './theory';
import type { DrumKit, PercKind, Voice } from './types';

export interface TrackBus {
  /** pads / arps / leads go here so the kick can duck them */
  duck: GainNode;
  /** drums and bass */
  dry: GainNode;
  /** fade control for the whole track */
  out: GainNode;
  reverb: GainNode;
  delay: GainNode;
}

export class AudioEngine {
  readonly ctx: BaseAudioContext;
  readonly master: GainNode;
  readonly musicOut: GainNode;
  readonly ambienceOut: GainNode;
  readonly fxOut: GainNode;
  readonly noise: AudioBuffer;
  private reverbIn: GainNode;
  private delayIn: GainNode;
  private delayNode: DelayNode;
  private curves = new Map<number, Float32Array<ArrayBuffer>>();

  constructor(offline?: BaseAudioContext) {
    if (offline) {
      this.ctx = offline;
    } else {
      const Ctor: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'playback' });
    }
    const ctx = this.ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    // brick-wall-ish limiter so transients never clip
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(comp).connect(limiter).connect(ctx.destination);

    this.musicOut = ctx.createGain();
    this.ambienceOut = ctx.createGain();
    this.fxOut = ctx.createGain();
    this.musicOut.connect(this.master);
    this.ambienceOut.connect(this.master);
    this.fxOut.connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // reverb
    const conv = ctx.createConvolver();
    conv.buffer = this.impulse(3.2, 2.6);
    this.reverbIn = ctx.createGain();
    const revOut = ctx.createGain();
    revOut.gain.value = 0.55;
    const revHp = ctx.createBiquadFilter();
    revHp.type = 'highpass';
    revHp.frequency.value = 180;
    this.reverbIn.connect(revHp).connect(conv).connect(revOut).connect(this.musicOut);

    // ping-pong-ish delay
    this.delayIn = ctx.createGain();
    this.delayNode = ctx.createDelay(4);
    this.delayNode.delayTime.value = 0.375;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const delOut = ctx.createGain();
    delOut.gain.value = 0.45;
    this.delayIn.connect(this.delayNode);
    this.delayNode.connect(lp).connect(fb).connect(this.delayNode);
    lp.connect(delOut).connect(this.musicOut);
    delOut.connect(this.reverbIn);
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  async resume(): Promise<void> {
    if (this.ctx instanceof AudioContext && this.ctx.state !== 'running') await this.ctx.resume();
  }

  setDelayTime(sec: number): void {
    this.delayNode.delayTime.setTargetAtTime(Math.min(3.5, sec), this.now, 0.1);
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  curve(amount: number): Float32Array<ArrayBuffer> {
    const key = Math.round(amount * 100);
    let c = this.curves.get(key);
    if (!c) {
      const n = 1024;
      c = new Float32Array(n);
      const k = 2 + amount * 60;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      this.curves.set(key, c);
    }
    return c;
  }

  createTrackBus(): TrackBus {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.musicOut);
    const duck = ctx.createGain();
    duck.connect(out);
    const dry = ctx.createGain();
    dry.connect(out);
    const reverb = ctx.createGain();
    reverb.connect(this.reverbIn);
    const delay = ctx.createGain();
    delay.connect(this.delayIn);
    return { duck, dry, out, reverb, delay };
  }

  fadeBus(bus: TrackBus, to: number, seconds: number, at = this.now): void {
    for (const g of [bus.out, bus.reverb, bus.delay]) {
      g.gain.cancelScheduledValues(at);
      g.gain.setValueAtTime(g.gain.value, at);
      g.gain.linearRampToValueAtTime(to, at + seconds);
    }
  }

  disposeBus(bus: TrackBus): void {
    for (const n of [bus.duck, bus.dry, bus.out, bus.reverb, bus.delay]) n.disconnect();
  }

  duckAt(bus: TrackBus, when: number, depth: number, beat: number): void {
    if (depth <= 0) return;
    const g = bus.duck.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(1 - depth, when);
    g.setTargetAtTime(1, when + 0.02, beat * 0.22);
  }

  // ---------- voices ----------

  playVoice(v: Voice, midis: number[], when: number, dur: number, vel: number, bus: TrackBus, dest: 'duck' | 'dry' = 'duck', level = 1): void {
    const ctx = this.ctx;
    const end = when + Math.max(0.03, dur);
    const stopAt = end + v.env.r * 3 + 0.1;
    const peak = (v.gain * vel * level) / Math.sqrt(midis.length);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, when);
    amp.gain.linearRampToValueAtTime(peak, when + v.env.a);
    amp.gain.setTargetAtTime(peak * v.env.s, when + v.env.a, Math.max(0.01, v.env.d / 3));
    amp.gain.setTargetAtTime(0, end, Math.max(0.01, v.env.r / 3));

    const filt = ctx.createBiquadFilter();
    filt.type = v.filter.type;
    filt.Q.value = v.filter.q ?? 0.7;
    const f0 = v.filter.freq;
    filt.frequency.setValueAtTime(f0, when);
    if (v.filter.env) {
      filt.frequency.linearRampToValueAtTime(f0 + v.filter.env * vel, when + Math.max(0.005, v.env.a));
      filt.frequency.setTargetAtTime(f0, when + Math.max(0.005, v.env.a), Math.max(0.01, (v.filter.decay ?? 0.2) / 3));
    }

    let head: AudioNode = filt;
    if (v.drive) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.curve(v.drive);
      shaper.oversample = '2x';
      shaper.connect(filt);
      head = shaper;
    }
    filt.connect(amp);
    amp.connect(dest === 'duck' ? bus.duck : bus.dry);
    if (v.send?.reverb) {
      const s = ctx.createGain();
      s.gain.value = v.send.reverb;
      amp.connect(s).connect(bus.reverb);
    }
    if (v.send?.delay) {
      const s = ctx.createGain();
      s.gain.value = v.send.delay;
      amp.connect(s).connect(bus.delay);
    }

    let vib: OscillatorNode | null = null;
    let vibGain: GainNode | null = null;
    if (v.vibrato) {
      vib = ctx.createOscillator();
      vib.frequency.value = v.vibrato.rate;
      vibGain = ctx.createGain();
      const delay = v.vibrato.delay ?? 0;
      vibGain.gain.setValueAtTime(delay ? 0 : v.vibrato.depth, when);
      if (delay) vibGain.gain.linearRampToValueAtTime(v.vibrato.depth, when + delay + 0.3);
      vib.connect(vibGain);
      vib.start(when);
      vib.stop(stopAt);
    }

    const n = v.waves.length;
    for (const m of midis) {
      const freq = midiToFreq(m + (v.transpose ?? 0));
      v.waves.forEach((type, i) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        if (v.scoop) {
          osc.frequency.setValueAtTime(freq * Math.pow(2, -v.scoop / 12), when);
          osc.frequency.exponentialRampToValueAtTime(freq, when + 0.12);
        } else {
          osc.frequency.value = freq;
        }
        osc.detune.value = n > 1 ? ((i / (n - 1)) * 2 - 1) * (v.detune ?? 0) : 0;
        if (vibGain) vibGain.connect(osc.detune);
        if (v.fm) {
          const mod = ctx.createOscillator();
          mod.frequency.value = freq * v.fm.ratio;
          const mg = ctx.createGain();
          mg.gain.setValueAtTime(freq * v.fm.index, when);
          mg.gain.setTargetAtTime(freq * v.fm.index * 0.1, when, v.fm.decay / 3);
          mod.connect(mg).connect(osc.frequency);
          mod.start(when);
          mod.stop(stopAt);
        }
        osc.connect(head);
        osc.start(when);
        osc.stop(stopAt);
      });
    }

    if (v.noise) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(8000, midiToFreq(midis[0]) * 3);
      bp.Q.value = 1;
      const g = ctx.createGain();
      g.gain.value = v.noise * 2;
      src.connect(bp).connect(g).connect(filt);
      src.start(when, Math.random());
      src.stop(stopAt);
    }
  }

  // ---------- drums ----------

  private noiseHit(when: number, dest: AudioNode, opts: { type: BiquadFilterType; freq: number; q?: number; gain: number; decay: number; attack?: number }): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type;
    f.frequency.value = opts.freq;
    f.Q.value = opts.q ?? 0.7;
    const g = ctx.createGain();
    const a = opts.attack ?? 0.001;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(opts.gain, when + a);
    g.gain.exponentialRampToValueAtTime(0.0008, when + a + opts.decay);
    src.connect(f).connect(g).connect(dest);
    src.start(when, Math.random() * 1.5);
    src.stop(when + a + opts.decay + 0.05);
  }

  private tone(when: number, dest: AudioNode, f0: number, f1: number, gain: number, decay: number, type: OscillatorType = 'sine', drive = 0): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), when + Math.min(decay, 0.14));
    // the envelope comes last so distortion never changes the level
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0008, when + decay);
    if (drive) {
      const sh = ctx.createWaveShaper();
      sh.curve = this.curve(drive);
      const pre = ctx.createGain();
      pre.gain.setValueAtTime(1, when);
      pre.gain.exponentialRampToValueAtTime(0.05, when + decay);
      osc.connect(pre).connect(sh).connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(dest);
    osc.start(when);
    osc.stop(when + decay + 0.05);
  }

  playDrum(kind: 'kick' | 'snare' | 'hat' | 'openhat' | 'perc', kit: DrumKit, when: number, velIn: number, bus: TrackBus, level = 1): void {
    const dest = bus.dry;
    const vel = velIn * level;
    switch (kind) {
      case 'kick': {
        const k = kit.kick;
        this.tone(when, dest, k.f0, k.f1, k.gain * vel * 0.9, k.decay, 'sine', k.drive ?? 0);
        if (k.click) this.noiseHit(when, dest, { type: 'highpass', freq: 3000, gain: 0.15 * k.click * vel, decay: 0.012 });
        return;
      }
      case 'snare': {
        const s = kit.snare;
        const g = s.gain * vel;
        const send = this.ctx.createGain();
        send.gain.value = s.verb;
        send.connect(bus.reverb);
        if (s.kind === 'clap') {
          for (let i = 0; i < 3; i++) this.noiseHit(when + i * 0.011, dest, { type: 'bandpass', freq: 1300, q: 1.2, gain: g * 0.8, decay: 0.03 });
          this.noiseHit(when + 0.033, dest, { type: 'bandpass', freq: 1200, q: 1, gain: g, decay: s.decay });
          this.noiseHit(when, send, { type: 'bandpass', freq: 1500, gain: g, decay: s.decay });
        } else if (s.kind === 'rim') {
          this.tone(when, dest, s.tone * 2, s.tone * 1.8, g * 1.5, 0.05, 'triangle');
          this.noiseHit(when, dest, { type: 'bandpass', freq: 2500, q: 3, gain: g * 1.25, decay: s.decay * 0.5 });
          this.noiseHit(when, send, { type: 'bandpass', freq: 2500, q: 2, gain: g * 1.5, decay: s.decay });
        } else {
          this.tone(when, dest, s.tone * 1.4, s.tone, g * 0.5, 0.12, 'triangle');
          this.noiseHit(when, dest, { type: 'highpass', freq: 1200, gain: g * 0.8, decay: s.decay });
          this.noiseHit(when, send, { type: 'highpass', freq: 1500, gain: g * 0.7, decay: s.decay });
        }
        return;
      }
      case 'hat':
        this.noiseHit(when, dest, { type: 'highpass', freq: 7500, gain: kit.hat.gain * vel, decay: kit.hat.decay });
        return;
      case 'openhat':
        this.noiseHit(when, dest, { type: 'highpass', freq: 6500, gain: kit.hat.gain * vel * 0.8, decay: kit.hat.open });
        return;
      case 'perc':
        if (kit.perc) this.perc(kit.perc.kind, when, kit.perc.gain * vel, bus);
        return;
    }
  }

  private perc(kind: PercKind, when: number, g: number, bus: TrackBus): void {
    const dest = bus.dry;
    switch (kind) {
      case 'taiko':
        this.tone(when, dest, 110, 62, g * 0.4, 0.7);
        this.noiseHit(when, dest, { type: 'lowpass', freq: 400, gain: g * 0.28, decay: 0.25 });
        this.noiseHit(when, bus.reverb, { type: 'lowpass', freq: 500, gain: g * 0.25, decay: 0.3 });
        return;
      case 'hand':
        this.tone(when, dest, 260, 180, g * 0.6, 0.18);
        this.noiseHit(when, dest, { type: 'bandpass', freq: 900, q: 2, gain: g * 0.4, decay: 0.05 });
        return;
      case 'tom':
        this.tone(when, dest, 150, 85, g * 0.55, 0.45);
        this.noiseHit(when, bus.reverb, { type: 'lowpass', freq: 600, gain: g * 0.4, decay: 0.3 });
        return;
      case 'blip':
        this.tone(when, dest, 1800 + Math.random() * 1600, 900, g * 0.6, 0.04, 'square');
        return;
      case 'metal':
        this.noiseHit(when, dest, { type: 'bandpass', freq: 3200, q: 14, gain: g * 2.8, decay: 0.18 });
        this.tone(when, dest, 520, 500, g * 0.4, 0.15, 'square');
        return;
      case 'shaker':
        this.noiseHit(when, dest, { type: 'bandpass', freq: 6000, q: 1.5, gain: g * 0.8, decay: 0.05, attack: 0.012 });
        return;
    }
  }

  /** Short chime for timers and UI. */
  chime(): void {
    const ctx = this.ctx;
    const t = this.now + 0.02;
    [76, 83, 88].forEach((m, i) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = midiToFreq(m);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + i * 0.18);
      g.gain.linearRampToValueAtTime(0.18, t + i * 0.18 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, t + i * 0.18 + 1.6);
      osc.connect(g).connect(this.fxOut);
      osc.start(t + i * 0.18);
      osc.stop(t + i * 0.18 + 1.7);
    });
  }
}
