// Turns a MusicStyle + seed into a Track, and a Track + step into note events.
// Everything here is pure and deterministic so it can be unit tested.
import { mulberry32, hash2, pick, type Rng } from '../scene/core';
import { SCALES, degreeToMidi, parsePattern, nearestChordTone } from './theory';
import type { BassPattern, DrumPattern, MusicStyle, Vibe } from './types';

export type Role = 'kick' | 'snare' | 'hat' | 'openhat' | 'perc' | 'bass' | 'pad' | 'arp' | 'lead' | 'drone' | 'bell';

export interface NoteEvent {
  role: Role;
  midi: number[];
  /** duration in 16th steps */
  dur: number;
  vel: number;
  /** filter brightness 0..1 for voices with a sweep (long form only) */
  bright?: number;
}

export interface Section {
  name: string;
  bars: number;
  startBar: number;
  layers: Role[];
  drums: 'A' | 'B';
  leadMotif: 0 | 1;
}

interface MotifNote {
  deg: number;
  len: number;
}

export interface Track {
  seed: number;
  styleId: string;
  title: string;
  bpm: number;
  swing: number;
  root: number;
  scale: readonly number[];
  progression: number[];
  barsPerChord: number;
  sections: Section[];
  totalBars: number;
  motifs: (MotifNote | null)[][];
  bass: { mask: string; dur: number };
  drums: { A: Record<string, number[]>; B: Record<string, number[]> };
  arpRate: 8 | 16;
  arpShape: MusicStyle['arpShape'];
  leadOctave: number;
  vibe: Vibe;
  form: 'standard' | 'long';
}

export const BASS_PATTERNS: Record<BassPattern, { mask: string; dur: number }> = {
  driving16: { mask: 'xxxxxxxoxxxxxxxo', dur: 1 },
  eighths: { mask: 'x.x.x.x.x.x.x.x.', dur: 2 },
  octaves: { mask: 'x.o.x.o.x.o.x.o.', dur: 2 },
  offbeat: { mask: '..x...x...x...x.', dur: 2 },
  pulse: { mask: 'x..x..x...x.x...', dur: 2 },
  sustain: { mask: 'x...............', dur: 16 },
  halves: { mask: 'x.......x.......', dur: 8 },
  gallop: { mask: 'x.xxx.xxx.xxx.xx', dur: 1 },
  rolling: { mask: '.xxx.xxx.xxx.xxx', dur: 1 },
};

export const VIBE_TEMPO: Record<Vibe, number> = { calm: 0.88, focus: 1, drive: 1.1 };

function makeMotif(rng: Rng, density: number): (MotifNote | null)[] {
  const out: (MotifNote | null)[] = new Array(32).fill(null);
  let deg = Math.floor(rng() * 5);
  let s = 0;
  while (s < 32) {
    const strong = s % 8 === 0;
    const p = strong ? Math.min(0.95, density + 0.35) : density;
    if (rng() < p) {
      const len = pick(rng, s % 4 === 0 ? [2, 4, 4, 6, 8] : [2, 2, 3, 4]);
      deg += pick(rng, [-2, -1, -1, 0, 1, 1, 2, 3, -3]);
      deg = Math.max(-2, Math.min(9, deg));
      out[s] = { deg, len: Math.min(len, 32 - s) };
      s += len;
    } else {
      s += 2;
    }
  }
  // land the phrase on a long note
  for (let i = 31; i >= 0; i--) {
    if (out[i]) {
      out[i] = { deg: out[i]!.deg, len: 32 - i };
      break;
    }
  }
  return out;
}

function varyMotif(rng: Rng, m: (MotifNote | null)[]): (MotifNote | null)[] {
  return m.map((n, i) => {
    if (!n) return null;
    if (i >= 16 && rng() < 0.6) return { deg: n.deg + pick(rng, [-2, -1, 1, 2]), len: n.len };
    return { ...n };
  });
}

type Plan = { name: string; bars: number; layers: Role[]; drums: 'A' | 'B'; leadMotif: 0 | 1 }[];

/** Slow psybient arc: long atmospheric intro, a build, two grooves around a breakdown, long outro. */
function longPlan(): Plan {
  const groove: Role[] = ['kick', 'snare', 'hat', 'perc', 'bass', 'pad', 'arp', 'drone'];
  return [
    { name: 'intro', bars: 16, layers: ['pad', 'drone', 'bell', 'arp'], drums: 'A', leadMotif: 0 },
    { name: 'build', bars: 16, layers: ['pad', 'drone', 'arp', 'hat', 'perc', 'bass'], drums: 'A', leadMotif: 0 },
    { name: 'A', bars: 32, layers: [...groove, 'bell'], drums: 'A', leadMotif: 0 },
    { name: 'break', bars: 16, layers: ['pad', 'drone', 'arp', 'lead', 'bell'], drums: 'A', leadMotif: 1 },
    { name: 'B', bars: 32, layers: [...groove, 'lead', 'openhat'], drums: 'B', leadMotif: 0 },
    { name: 'outro', bars: 16, layers: ['pad', 'drone', 'arp', 'hat', 'bell'], drums: 'A', leadMotif: 1 },
  ];
}

function sectionPlan(style: MusicStyle, vibe: Vibe, bpm: number): Section[] {
  const long = style.form === 'long';
  const m = !long && bpm >= 104 ? 1.5 : 1;
  const all: Role[] = ['kick', 'snare', 'hat', 'perc', 'bass', 'pad', 'arp', 'drone'];
  const base: Plan = long ? longPlan() : [
    { name: 'intro', bars: 8, layers: ['pad', 'drone', 'hat', 'arp'], drums: 'A', leadMotif: 0 },
    { name: 'A', bars: 16, layers: [...all], drums: 'A', leadMotif: 0 },
    { name: 'B', bars: 16, layers: [...all, 'lead', 'openhat', 'bell'], drums: 'B', leadMotif: 0 },
    { name: 'break', bars: 8, layers: ['pad', 'lead', 'drone', 'bell', 'arp'], drums: 'A', leadMotif: 1 },
    { name: 'A2', bars: 16, layers: [...all, 'lead'], drums: 'B', leadMotif: 1 },
    { name: 'outro', bars: 8, layers: ['pad', 'arp', 'drone', 'hat', 'bell'], drums: 'A', leadMotif: 0 },
  ];
  let start = 0;
  return base.map((s) => {
    let layers = s.layers.slice();
    if (vibe === 'calm') layers = layers.filter((l) => l !== 'hat' && l !== 'openhat' && l !== 'perc');
    if (vibe === 'drive' && (s.name === 'A' || s.name === 'A2')) layers.push('openhat', 'perc');
    layers = layers.filter((l) => {
      if (l === 'bass') return !!style.bass;
      if (l === 'pad') return !!style.pad;
      if (l === 'arp') return !!style.arp;
      if (l === 'lead') return !!style.lead;
      if (l === 'drone') return !!style.drone;
      if (l === 'bell') return !!style.bell;
      if (l === 'perc') return !!style.kit?.perc;
      if (l === 'kick' || l === 'snare' || l === 'hat' || l === 'openhat') return !!style.kit;
      return true;
    });
    const bars = Math.round((s.bars * m) / 4) * 4;
    const sec: Section = { ...s, bars, startBar: start, layers: Array.from(new Set(layers)) };
    start += bars;
    return sec;
  });
}

function parseDrums(p: DrumPattern | undefined): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (!p) return out;
  for (const [k, v] of Object.entries(p)) if (v) out[k] = parsePattern(v as string);
  return out;
}

export function trackTitle(style: MusicStyle, seed: number): string {
  const rng = mulberry32(Math.imul(seed ^ 0x5bd1e995, 0x9e3779b1));
  rng();
  rng();
  return `${pick(rng, style.vocab[0])} ${pick(rng, style.vocab[1])}`;
}

export function composeTrack(style: MusicStyle, seed: number, vibe: Vibe = 'focus'): Track {
  const rng = mulberry32(seed);
  const root = pick(rng, style.roots);
  const progression = pick(rng, style.progressions);
  const bpm = Math.round(style.bpm * VIBE_TEMPO[vibe] * (0.97 + rng() * 0.06));
  const density = style.leadDensity * (vibe === 'calm' ? 0.6 : vibe === 'drive' ? 1.15 : 1);
  const motifA = makeMotif(rng, density);
  const motifB = varyMotif(rng, motifA);
  const sections = sectionPlan(style, vibe, bpm);
  const last = sections[sections.length - 1];
  return {
    seed,
    styleId: style.id,
    title: trackTitle(style, seed),
    bpm,
    swing: style.swing,
    root,
    scale: SCALES[style.scale],
    progression,
    barsPerChord: style.barsPerChord,
    sections,
    totalBars: last.startBar + last.bars,
    motifs: [motifA, motifB],
    bass: BASS_PATTERNS[style.bassPattern],
    drums: { A: parseDrums(style.patterns?.A), B: parseDrums(style.patterns?.B) },
    arpRate: style.arpRate,
    arpShape: style.arpShape,
    leadOctave: style.leadOctave,
    vibe,
    form: style.form ?? 'standard',
  };
}

export function totalSteps(track: Track): number {
  return track.totalBars * 16;
}

export function sectionAt(track: Track, bar: number): Section {
  for (const s of track.sections) if (bar < s.startBar + s.bars) return s;
  return track.sections[track.sections.length - 1];
}

/**
 * Filter brightness over a long-form track: closed in the intro, opening through the build,
 * breathing on a 16-bar wave in the grooves, closing into the breakdown and the outro.
 */
export function brightnessAt(track: Track, step: number): number | undefined {
  if (track.form !== 'long') return undefined;
  const bar = Math.floor(step / 16);
  const sec = sectionAt(track, bar);
  const x = (bar - sec.startBar + (step % 16) / 16) / sec.bars; // 0..1 through the section
  const wave = (bars: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * (bar - sec.startBar + (step % 16) / 16)) / bars);
  let b: number;
  switch (sec.name) {
    case 'intro': b = 0.05 + 0.25 * x; break;
    case 'build': b = 0.3 + 0.4 * x; break;
    case 'A': b = 0.55 + 0.3 * wave(16); break;
    case 'break': b = x < 0.5 ? 0.7 - 0.9 * x : 0.25 + 0.5 * (x - 0.5); break;
    case 'B': b = Math.min(1, 0.5 + 0.9 * x) - 0.15 * wave(8); break;
    default: b = 0.6 - 0.5 * x;
  }
  return Math.max(0, Math.min(1, b));
}

export function chordAt(track: Track, bar: number): number {
  return track.progression[Math.floor(bar / track.barsPerChord) % track.progression.length];
}

/** Every note event that starts on this 16th step. */
export function eventsAt(track: Track, step: number): NoteEvent[] {
  const bar = Math.floor(step / 16);
  const s = step % 16;
  const sec = sectionAt(track, bar);
  const barIn = bar - sec.startBar;
  const has = (r: Role) => sec.layers.includes(r);
  const chord = chordAt(track, bar);
  const { root, scale } = track;
  const out: NoteEvent[] = [];
  const h = (salt: number) => hash2(track.seed + salt, step);
  const outroFade = sec.name === 'outro' ? 1 - barIn / sec.bars * 0.7 : 1;
  const introLift = sec.name === 'intro' ? 0.5 + (barIn / sec.bars) * 0.5 : 1;
  const lvl = outroFade * introLift;

  // drums
  const drums = track.drums[sec.drums];
  const fill = track.form === 'standard' && barIn === sec.bars - 1 && has('snare') && s >= 12 && sec.name !== 'outro';
  const bright = brightnessAt(track, step);
  for (const role of ['kick', 'snare', 'hat', 'openhat', 'perc'] as const) {
    if (!has(role)) continue;
    const pat = drums[role] ?? (role === 'openhat' ? undefined : track.drums.A[role]);
    if (!pat) continue;
    let v = pat[s] ?? 0;
    if (role === 'snare' && fill) v = Math.max(v, 0.4 + (s - 12) * 0.15);
    if (role === 'hat' && v > 0) v *= 0.7 + 0.3 * h(3);
    if (sec.name === 'intro' && role === 'hat' && barIn < sec.bars / 2) v = 0;
    if (v > 0) out.push({ role, midi: [], dur: 1, vel: v * lvl });
  }

  // bass
  // in the long form's build the bass waits for the second half
  if (has('bass') && !(sec.name === 'build' && barIn < sec.bars / 2)) {
    const c = track.bass.mask[s];
    if (c && c !== '.') {
      const base = degreeToMidi(root, scale, chord);
      const midi = c === 'o' ? base + 12 : c === '5' ? degreeToMidi(root, scale, chord + 4) : base;
      out.push({ role: 'bass', midi: [midi], dur: track.bass.dur, vel: (s % 4 === 0 ? 1 : 0.8) * lvl, bright });
    }
  }

  // pad: on chord changes
  if (has('pad') && s === 0 && bar % track.barsPerChord === 0) {
    const degs = [chord, chord + 2, chord + 4, chord + 6];
    const midi = degs.map((d) => degreeToMidi(root + 12, scale, d));
    out.push({ role: 'pad', midi, dur: 16 * track.barsPerChord - 1, vel: 0.85 * lvl, bright });
  }

  // drone: every four bars
  if (has('drone') && s === 0 && barIn % 4 === 0) {
    out.push({ role: 'drone', midi: [root - 12, root - 5], dur: 64, vel: 0.9 * lvl });
  }

  // arp
  const arpEvery = track.arpRate === 16 ? 1 : 2;
  const arpOn = has('arp') && !(sec.name === 'intro' && barIn < sec.bars / 2);
  if (arpOn && s % arpEvery === 0) {
    const tones = [0, 2, 4, 7, 9, 11].map((d) => degreeToMidi(root + 24, scale, chord + d));
    const i = Math.floor(s / arpEvery) + bar * (16 / arpEvery);
    let idx: number;
    switch (track.arpShape) {
      case 'up': idx = i % tones.length; break;
      case 'updown': { const p = i % (tones.length * 2 - 2); idx = p < tones.length ? p : tones.length * 2 - 2 - p; break; }
      case 'broken': idx = [0, 2, 1, 3, 2, 4, 3, 5][i % 8]; break;
      default: idx = Math.floor(h(7) * tones.length);
    }
    const skip = track.arpShape === 'random' && h(8) < 0.3;
    if (!skip) out.push({ role: 'arp', midi: [tones[idx]], dur: arpEvery, vel: (0.6 + 0.4 * (s % 4 === 0 ? 1 : h(9))) * lvl, bright });
  }

  // lead
  if (has('lead')) {
    const motif = track.motifs[(sec.leadMotif + Math.floor(barIn / 4)) % 2];
    const n = motif[(bar % 2) * 16 + s];
    const rest = sec.name === 'break' ? barIn % 4 >= 2 : barIn % 8 >= 6; // breathing room
    if (n && !rest) {
      const deg = s % 8 === 0 ? nearestChordTone(n.deg + chord, chord) : n.deg + chord;
      out.push({ role: 'lead', midi: [degreeToMidi(root + track.leadOctave, scale, deg)], dur: n.len, vel: 0.85 * lvl });
    }
  }

  // bell: sparse chord-tone hits
  if (has('bell') && (s === 0 || s === 6 || s === 10) && h(11) < 0.28) {
    const deg = chord + [0, 2, 4, 7][Math.floor(h(12) * 4)];
    out.push({ role: 'bell', midi: [degreeToMidi(root + 36, scale, deg)], dur: 8, vel: 0.7 * lvl });
  }

  return out;
}
