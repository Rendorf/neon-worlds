import type { ScaleName } from './theory';

export interface Voice {
  waves: OscillatorType[];
  /** cents of spread between the oscillators */
  detune?: number;
  /** semitone offset applied to every note */
  transpose?: number;
  filter: { type: BiquadFilterType; freq: number; q?: number; env?: number; decay?: number };
  env: { a: number; d: number; s: number; r: number };
  gain: number;
  vibrato?: { rate: number; depth: number; delay?: number };
  /** waveshaper distortion, 0..1 */
  drive?: number;
  /** breath noise mixed in, 0..1 */
  noise?: number;
  /** start this many semitones below and slide up (theremin, sax) */
  scoop?: number;
  /** FM bell: modulator ratio, index (multiples of carrier) and decay time */
  fm?: { ratio: number; index: number; decay: number };
  send?: { reverb?: number; delay?: number };
}

export type PercKind = 'taiko' | 'hand' | 'blip' | 'metal' | 'tom' | 'shaker';

export interface DrumKit {
  kick: { f0: number; f1: number; decay: number; gain: number; drive?: number; click?: number };
  snare: { kind: 'snare' | 'clap' | 'rim'; decay: number; tone: number; gain: number; verb: number };
  hat: { decay: number; open: number; gain: number };
  perc?: { kind: PercKind; gain: number };
}

export interface DrumPattern {
  kick: string;
  snare: string;
  hat: string;
  openhat?: string;
  perc?: string;
}

export type BassPattern =
  | 'driving16'
  | 'eighths'
  | 'octaves'
  | 'offbeat'
  | 'pulse'
  | 'sustain'
  | 'halves'
  | 'gallop';

export type Vibe = 'calm' | 'focus' | 'drive';

export interface MusicStyle {
  id: string;
  label: string;
  bpm: number;
  swing: number;
  scale: ScaleName;
  /** MIDI roots in the bass register */
  roots: number[];
  /** chord progressions as scale degrees (0 = tonic) */
  progressions: number[][];
  barsPerChord: 1 | 2;
  kit: DrumKit | null;
  patterns: { A: DrumPattern; B: DrumPattern } | null;
  bass: Voice | null;
  bassPattern: BassPattern;
  pad: Voice | null;
  arp: Voice | null;
  arpRate: 8 | 16;
  arpShape: 'up' | 'updown' | 'random' | 'broken';
  lead: Voice | null;
  leadDensity: number;
  /** semitones above the root for the lead line */
  leadOctave: number;
  drone: Voice | null;
  bell: Voice | null;
  /** how hard the kick ducks pads and arps, 0..1 */
  sidechain: number;
  /** delay time in beats */
  delayBeats: number;
  vocab: [string[], string[]];
}
