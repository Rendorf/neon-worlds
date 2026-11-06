import type { DrumKit, MusicStyle, Voice } from './types';

// ---------- voices ----------

const V = {
  sawPad: { waves: ['sawtooth', 'sawtooth'], detune: 16, filter: { type: 'lowpass', freq: 1300, q: 0.7, env: 700, decay: 1.6 }, env: { a: 0.5, d: 1, s: 0.7, r: 1.6 }, gain: 0.12, send: { reverb: 0.5, delay: 0.08 } },
  darkPad: { waves: ['sawtooth', 'sawtooth'], detune: 22, filter: { type: 'lowpass', freq: 650, q: 1, env: 300, decay: 2 }, env: { a: 1.2, d: 1, s: 0.8, r: 2 }, gain: 0.13, send: { reverb: 0.55 } },
  brassPad: { waves: ['sawtooth', 'sawtooth'], detune: 9, filter: { type: 'lowpass', freq: 800, q: 1.2, env: 1600, decay: 0.9 }, env: { a: 0.35, d: 0.8, s: 0.75, r: 2.4 }, gain: 0.12, vibrato: { rate: 5, depth: 6, delay: 0.6 }, send: { reverb: 0.75 } },
  choirPad: { waves: ['sawtooth', 'sawtooth', 'triangle'], detune: 12, filter: { type: 'bandpass', freq: 900, q: 1.4 }, env: { a: 1, d: 1, s: 0.85, r: 2.6 }, gain: 0.22, vibrato: { rate: 4.5, depth: 8, delay: 0.4 }, send: { reverb: 0.85 } },
  warmPad: { waves: ['triangle', 'triangle', 'sine'], detune: 10, filter: { type: 'lowpass', freq: 2200, q: 0.5 }, env: { a: 0.8, d: 1, s: 0.8, r: 2 }, gain: 0.11, send: { reverb: 0.55, delay: 0.1 } },
  glassPad: { waves: ['triangle', 'sine'], detune: 7, filter: { type: 'lowpass', freq: 3200, q: 0.5 }, env: { a: 1.4, d: 1, s: 0.8, r: 2.5 }, gain: 0.11, vibrato: { rate: 0.3, depth: 10 }, send: { reverb: 0.7, delay: 0.2 } },

  sawBass: { waves: ['sawtooth', 'square'], detune: 6, filter: { type: 'lowpass', freq: 260, q: 6, env: 900, decay: 0.14 }, env: { a: 0.004, d: 0.2, s: 0.55, r: 0.08 }, gain: 0.3, drive: 0.25 },
  subBass: { waves: ['sine', 'triangle'], detune: 2, filter: { type: 'lowpass', freq: 420, q: 0.5 }, env: { a: 0.02, d: 0.3, s: 0.9, r: 0.3 }, gain: 0.22 },
  squareBass: { waves: ['square'], filter: { type: 'lowpass', freq: 520, q: 3, env: 500, decay: 0.12 }, env: { a: 0.004, d: 0.18, s: 0.5, r: 0.08 }, gain: 0.24 },
  distBass: { waves: ['sawtooth', 'sawtooth'], detune: 10, filter: { type: 'lowpass', freq: 700, q: 2, env: 700, decay: 0.12 }, env: { a: 0.004, d: 0.2, s: 0.6, r: 0.08 }, gain: 0.2, drive: 0.75 },

  squareArp: { waves: ['square'], filter: { type: 'lowpass', freq: 2200, q: 4, env: 2000, decay: 0.1 }, env: { a: 0.002, d: 0.14, s: 0.15, r: 0.1 }, gain: 0.08, send: { delay: 0.4, reverb: 0.2 } },
  pluckArp: { waves: ['sawtooth'], filter: { type: 'lowpass', freq: 1400, q: 3, env: 3200, decay: 0.08 }, env: { a: 0.002, d: 0.2, s: 0, r: 0.15 }, gain: 0.11, send: { delay: 0.35, reverb: 0.25 } },
  glassArp: { waves: ['sine'], fm: { ratio: 3.5, index: 2.2, decay: 0.3 }, filter: { type: 'lowpass', freq: 6000 }, env: { a: 0.002, d: 0.6, s: 0, r: 0.5 }, gain: 0.12, send: { reverb: 0.55, delay: 0.35 } },
  bitArp: { waves: ['square'], transpose: 12, filter: { type: 'highpass', freq: 600, q: 0.7 }, env: { a: 0.001, d: 0.06, s: 0, r: 0.03 }, gain: 0.12, send: { delay: 0.3 } },

  sawLead: { waves: ['sawtooth', 'sawtooth'], detune: 9, filter: { type: 'lowpass', freq: 2000, q: 2, env: 1400, decay: 0.3 }, env: { a: 0.02, d: 0.3, s: 0.8, r: 0.25 }, gain: 0.08, vibrato: { rate: 5.5, depth: 10, delay: 0.2 }, send: { delay: 0.3, reverb: 0.35 } },
  saxLead: { waves: ['sawtooth'], filter: { type: 'lowpass', freq: 1300, q: 3, env: 1700, decay: 0.35 }, env: { a: 0.06, d: 0.4, s: 0.8, r: 0.35 }, gain: 0.1, noise: 0.12, scoop: 1, vibrato: { rate: 5, depth: 18, delay: 0.25 }, send: { reverb: 0.7, delay: 0.15 } },
  squareLead: { waves: ['square', 'square'], detune: 6, filter: { type: 'lowpass', freq: 2800, q: 1 }, env: { a: 0.01, d: 0.2, s: 0.7, r: 0.2 }, gain: 0.05, vibrato: { rate: 6, depth: 8, delay: 0.15 }, send: { delay: 0.35, reverb: 0.3 } },
  distLead: { waves: ['sawtooth', 'sawtooth'], detune: 14, filter: { type: 'lowpass', freq: 2400, q: 1.5 }, env: { a: 0.01, d: 0.3, s: 0.85, r: 0.25 }, gain: 0.05, drive: 0.9, vibrato: { rate: 5.5, depth: 14, delay: 0.2 }, send: { reverb: 0.3, delay: 0.25 } },
  thereminLead: { waves: ['sine'], filter: { type: 'lowpass', freq: 4000 }, env: { a: 0.25, d: 0.3, s: 0.9, r: 0.7 }, gain: 0.14, scoop: 3, vibrato: { rate: 6.5, depth: 32 }, send: { reverb: 0.65, delay: 0.25 } },
  fluteLead: { waves: ['sine', 'triangle'], detune: 4, filter: { type: 'lowpass', freq: 3000 }, env: { a: 0.07, d: 0.2, s: 0.85, r: 0.25 }, gain: 0.08, noise: 0.14, vibrato: { rate: 5, depth: 12, delay: 0.15 }, send: { reverb: 0.55, delay: 0.2 } },
  brassLead: { waves: ['sawtooth', 'sawtooth'], detune: 7, filter: { type: 'lowpass', freq: 1100, q: 1.4, env: 2400, decay: 0.25 }, env: { a: 0.05, d: 0.3, s: 0.8, r: 0.3 }, gain: 0.09, vibrato: { rate: 5, depth: 8, delay: 0.3 }, send: { reverb: 0.55 } },
  glassLead: { waves: ['sine'], fm: { ratio: 2, index: 1.2, decay: 0.8 }, filter: { type: 'lowpass', freq: 5000 }, env: { a: 0.01, d: 0.8, s: 0.4, r: 0.6 }, gain: 0.11, send: { reverb: 0.6, delay: 0.35 } },

  droneLow: { waves: ['sawtooth', 'sine'], detune: 5, filter: { type: 'lowpass', freq: 260, q: 2 }, env: { a: 2, d: 1, s: 1, r: 3 }, gain: 0.16, send: { reverb: 0.4 } },
  droneThroat: { waves: ['sawtooth', 'sawtooth'], detune: 5, filter: { type: 'bandpass', freq: 520, q: 7 }, env: { a: 2.5, d: 1, s: 1, r: 3 }, gain: 1, vibrato: { rate: 0.2, depth: 6 }, send: { reverb: 0.6 } },
  droneSpace: { waves: ['triangle', 'sine'], detune: 8, filter: { type: 'lowpass', freq: 600 }, env: { a: 3, d: 1, s: 1, r: 4 }, gain: 0.16, send: { reverb: 0.8 } },

  bell: { waves: ['sine'], fm: { ratio: 3.01, index: 3, decay: 0.5 }, filter: { type: 'lowpass', freq: 7000 }, env: { a: 0.002, d: 1.4, s: 0, r: 1.2 }, gain: 0.08, send: { reverb: 0.7, delay: 0.3 } },
  gamelan: { waves: ['sine'], fm: { ratio: 2.76, index: 2.4, decay: 0.7 }, filter: { type: 'lowpass', freq: 6000 }, env: { a: 0.002, d: 1.6, s: 0, r: 1.4 }, gain: 0.09, send: { reverb: 0.6 } },

  // Silicon Based Lifeforms radio: warm psybient. Sweeping pads, a resonant 16th sequence, a soft rolling bass.
  lifePad: { waves: ['sawtooth', 'sawtooth', 'triangle'], detune: 18, filter: { type: 'lowpass', freq: 1200, q: 0.9 }, sweep: { min: 420, max: 2600 }, env: { a: 2.2, d: 2, s: 0.85, r: 3.5 }, gain: 0.11, vibrato: { rate: 0.18, depth: 7 }, send: { reverb: 0.75, delay: 0.12 } },
  lifeSeq: { waves: ['sawtooth', 'square'], detune: 5, filter: { type: 'lowpass', freq: 900, q: 8, env: 1400, decay: 0.11 }, sweep: { min: 260, max: 3400 }, env: { a: 0.002, d: 0.17, s: 0.12, r: 0.12 }, gain: 0.075, send: { delay: 0.5, reverb: 0.3 } },
  lifeBass: { waves: ['sawtooth', 'sine'], detune: 3, filter: { type: 'lowpass', freq: 200, q: 3, env: 420, decay: 0.07 }, sweep: { min: 150, max: 420 }, env: { a: 0.003, d: 0.12, s: 0.35, r: 0.05 }, gain: 0.36 },
  lifeLead: { waves: ['triangle', 'sine'], detune: 6, filter: { type: 'lowpass', freq: 2600, q: 0.6 }, env: { a: 0.14, d: 0.7, s: 0.7, r: 1.4 }, gain: 0.09, vibrato: { rate: 4.6, depth: 11, delay: 0.5 }, send: { reverb: 0.75, delay: 0.5 } },
  lifeBell: { waves: ['sine'], fm: { ratio: 4.01, index: 1.6, decay: 0.4 }, filter: { type: 'lowpass', freq: 5200 }, env: { a: 0.002, d: 1.8, s: 0, r: 1.6 }, gain: 0.07, send: { reverb: 0.8, delay: 0.45 } },
} satisfies Record<string, Voice>;

// ---------- drum kits ----------

const KIT = {
  darksynth: { kick: { f0: 160, f1: 42, decay: 0.42, gain: 1, drive: 0.3, click: 0.4 }, snare: { kind: 'clap', decay: 0.22, tone: 190, gain: 0.55, verb: 0.55 }, hat: { decay: 0.04, open: 0.28, gain: 0.18 } },
  soft: { kick: { f0: 110, f1: 45, decay: 0.5, gain: 1 }, snare: { kind: 'rim', decay: 0.08, tone: 420, gain: 0.35, verb: 0.7 }, hat: { decay: 0.03, open: 0.2, gain: 0.09 } },
  taiko: { kick: { f0: 120, f1: 44, decay: 0.45, gain: 0.9 }, snare: { kind: 'snare', decay: 0.2, tone: 200, gain: 0.45, verb: 0.5 }, hat: { decay: 0.035, open: 0.25, gain: 0.12 }, perc: { kind: 'taiko', gain: 0.8 } },
  glitch: { kick: { f0: 140, f1: 40, decay: 0.32, gain: 0.95, click: 0.6 }, snare: { kind: 'snare', decay: 0.12, tone: 240, gain: 0.45, verb: 0.2 }, hat: { decay: 0.02, open: 0.12, gain: 0.14 }, perc: { kind: 'blip', gain: 0.35 } },
  grid: { kick: { f0: 150, f1: 45, decay: 0.38, gain: 1, click: 0.3 }, snare: { kind: 'clap', decay: 0.18, tone: 210, gain: 0.5, verb: 0.35 }, hat: { decay: 0.035, open: 0.22, gain: 0.16 } },
  cinematic: { kick: { f0: 100, f1: 38, decay: 0.7, gain: 0.85 }, snare: { kind: 'snare', decay: 0.3, tone: 180, gain: 0.4, verb: 0.8 }, hat: { decay: 0.04, open: 0.3, gain: 0.08 }, perc: { kind: 'tom', gain: 0.6 } },
  industrial: { kick: { f0: 170, f1: 40, decay: 0.38, gain: 1, drive: 0.8, click: 0.5 }, snare: { kind: 'snare', decay: 0.22, tone: 160, gain: 0.55, verb: 0.4 }, hat: { decay: 0.05, open: 0.2, gain: 0.14 }, perc: { kind: 'metal', gain: 0.4 } },
  shaker: { kick: { f0: 95, f1: 42, decay: 0.45, gain: 0.7 }, snare: { kind: 'rim', decay: 0.1, tone: 500, gain: 0.3, verb: 0.7 }, hat: { decay: 0.05, open: 0.2, gain: 0.08 }, perc: { kind: 'shaker', gain: 0.4 } },
  brushes: { kick: { f0: 90, f1: 45, decay: 0.4, gain: 0.6 }, snare: { kind: 'rim', decay: 0.12, tone: 380, gain: 0.25, verb: 0.6 }, hat: { decay: 0.08, open: 0.25, gain: 0.06 }, perc: { kind: 'shaker', gain: 0.3 } },
  desert: { kick: { f0: 100, f1: 50, decay: 0.5, gain: 0.7 }, snare: { kind: 'rim', decay: 0.1, tone: 350, gain: 0.35, verb: 0.6 }, hat: { decay: 0.03, open: 0.2, gain: 0.08 }, perc: { kind: 'hand', gain: 0.7 } },
  life: { kick: { f0: 115, f1: 46, decay: 0.42, gain: 0.9, click: 0.1 }, snare: { kind: 'clap', decay: 0.16, tone: 220, gain: 0.3, verb: 0.8 }, hat: { decay: 0.025, open: 0.18, gain: 0.1 }, perc: { kind: 'shaker', gain: 0.35 } },
  war: { kick: { f0: 130, f1: 40, decay: 0.5, gain: 1, drive: 0.6 }, snare: { kind: 'snare', decay: 0.25, tone: 170, gain: 0.55, verb: 0.45 }, hat: { decay: 0.04, open: 0.2, gain: 0.1 }, perc: { kind: 'taiko', gain: 0.6 } },
} satisfies Record<string, DrumKit>;

const FOUR = 'x...x...x...x...';

export const STYLES = {
  nightCity: {
    id: 'night-city', label: 'darksynth', bpm: 124, swing: 0, scale: 'phrygian', roots: [40, 41, 43],
    progressions: [[0, 5, 3, 4], [0, 6, 5, 4], [0, 3, 5, 6], [0, 0, 5, 1]], barsPerChord: 1,
    kit: KIT.darksynth,
    patterns: {
      A: { kick: FOUR, snare: '....x.......x...', hat: '..x...x...x...x.' },
      B: { kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: '-x-x-x-x-x-x-x-x', openhat: '..x...x...x...x.', perc: '' },
    },
    bass: V.sawBass, bassPattern: 'driving16', pad: V.sawPad, arp: V.squareArp, arpRate: 16, arpShape: 'updown',
    lead: V.distLead, leadDensity: 0.55, leadOctave: 24, drone: null, bell: null, sidechain: 0.6, delayBeats: 0.75,
    vocab: [['Chrome', 'Kiroshi', 'Corpo', 'Neon', 'Badlands', 'Watson', 'Glitched', 'Afterparty'], ['Overdrive', 'Heat', 'Run', 'Heist', 'Static', 'Gig', 'Flatline', 'Blackwall']],
  },
  la2019: {
    id: 'la-2019', label: 'analog noir', bpm: 68, swing: 0.08, scale: 'dorian', roots: [38, 41, 43],
    progressions: [[0, 3, 5, 4], [0, 6, 3, 4], [0, 2, 3, 1]], barsPerChord: 2,
    kit: KIT.soft,
    patterns: {
      A: { kick: 'x.........x.....', snare: '........x.......', hat: '' },
      B: { kick: 'x.........x..x..', snare: '........x.......', hat: '..-...-...-...-.' },
    },
    bass: V.subBass, bassPattern: 'halves', pad: V.brassPad, arp: null, arpRate: 8, arpShape: 'up',
    lead: V.saxLead, leadDensity: 0.4, leadOctave: 24, drone: V.droneLow, bell: V.bell, sidechain: 0, delayBeats: 1,
    vocab: [['Tears in', 'Tannhäuser', 'Off-world', 'Replicant', 'Voight', 'Spinner', 'Origami', 'Rooftop'], ['Rain', 'Memories', 'Blues', 'Gate', 'Lights', 'Unicorn', 'Nocturne', 'Dawn']],
  },
  neoTokyo: {
    id: 'neo-tokyo', label: 'taiko synth', bpm: 108, swing: 0, scale: 'minor', roots: [40, 42, 45],
    progressions: [[0, 5, 6, 4], [0, 3, 6, 5], [0, 6, 5, 6]], barsPerChord: 1,
    kit: KIT.taiko,
    patterns: {
      A: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', perc: 'x..x..x.....x...' },
      B: { kick: 'x.....x...x...x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', perc: 'x..x..x...x.x.x.' },
    },
    bass: V.sawBass, bassPattern: 'octaves', pad: V.choirPad, arp: V.pluckArp, arpRate: 16, arpShape: 'broken',
    lead: V.squareLead, leadDensity: 0.5, leadOctave: 24, drone: null, bell: V.gamelan, sidechain: 0.35, delayBeats: 0.75,
    vocab: [['Capsule', 'Kaneda', 'Tetsuo', 'Neo', 'Olympic', 'Clown', 'Esper', 'Harukiya'], ['Slide', 'Gang', 'Crater', 'Highway', 'Awakening', 'Bypass', 'Signal', 'Riot']],
  },
  niihama: {
    id: 'niihama', label: 'cyborg chant', bpm: 84, swing: 0.05, scale: 'dorian', roots: [38, 40, 43],
    progressions: [[0, 2, 3, 0], [0, 5, 3, 4], [0, 6, 0, 5]], barsPerChord: 2,
    kit: KIT.taiko,
    patterns: {
      A: { kick: 'x.......x.......', snare: '', hat: '..-...-...-...-.', perc: 'x.......x..x....' },
      B: { kick: 'x.......x.x.....', snare: '........x.......', hat: '-.-.-.-.-.-.-.-.', perc: 'x..x....x..x..x.' },
    },
    bass: V.subBass, bassPattern: 'pulse', pad: V.choirPad, arp: V.glassArp, arpRate: 8, arpShape: 'random',
    lead: V.fluteLead, leadDensity: 0.3, leadOctave: 24, drone: V.droneLow, bell: V.gamelan, sidechain: 0.2, delayBeats: 0.75,
    vocab: [['Ghost', 'Shell', 'Thermoptic', 'Section', 'Puppet', 'Tachikoma', 'Net', 'Canal'], ['Dive', 'Whispers', 'Chant', 'Float', 'Garden', 'Interface', 'Drift', 'Echoes']],
  },
  chiba: {
    id: 'chiba-city', label: 'dead-channel glitch', bpm: 96, swing: 0.12, scale: 'phrygian', roots: [41, 43, 44],
    progressions: [[0, 1, 0, 6], [0, 5, 1, 0], [0, 3, 1, 4]], barsPerChord: 1,
    kit: KIT.glitch,
    patterns: {
      A: { kick: 'x..x......x.....', snare: '....x.......x...', hat: 'x-x-xx-x-x-xx-x-', perc: '...x.....x....x.' },
      B: { kick: 'x..x..x...x..x..', snare: '....x.......x.x.', hat: 'xxx-xxx-xxx-x-xx', perc: '.x.x...x.x...xx.' },
    },
    bass: V.squareBass, bassPattern: 'pulse', pad: V.darkPad, arp: V.bitArp, arpRate: 16, arpShape: 'random',
    lead: null, leadDensity: 0, leadOctave: 24, drone: V.droneLow, bell: V.bell, sidechain: 0.4, delayBeats: 0.5,
    vocab: [['Ninsei', 'Ono-Sendai', 'Simstim', 'Chatsubo', 'Sprawl', 'Ice', 'Wintermute', 'Coffin'], ['Static', 'Jack-in', 'Breaker', 'Flatline', 'Deck', 'Run', 'Cascade', 'Loop']],
  },
  grid: {
    id: 'the-grid', label: 'light-cycle electro', bpm: 120, swing: 0, scale: 'minor', roots: [38, 40, 43],
    progressions: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6]], barsPerChord: 1,
    kit: KIT.grid,
    patterns: {
      A: { kick: FOUR, snare: '....x.......x...', hat: '..x...x...x...x.' },
      B: { kick: FOUR, snare: '....x.......x...', hat: 'x-x-x-x-x-x-x-x-', openhat: '..x...x...x...x.' },
    },
    bass: V.sawBass, bassPattern: 'eighths', pad: V.brassPad, arp: V.squareArp, arpRate: 16, arpShape: 'up',
    lead: V.squareLead, leadDensity: 0.45, leadOctave: 24, drone: null, bell: null, sidechain: 0.55, delayBeats: 0.75,
    vocab: [['End of', 'Recognizer', 'Light', 'Solar', 'Disc', 'Derezzed', 'Arena', 'User'], ['Line', 'Cycle', 'Sailer', 'Wars', 'Grid', 'Program', 'Portal', 'Rectifier']],
  },
  coruscant: {
    id: 'coruscant', label: 'cinematic synth', bpm: 98, swing: 0, scale: 'mixolydian', roots: [36, 38, 41],
    progressions: [[0, 6, 3, 4], [0, 3, 6, 4], [0, 4, 5, 3]], barsPerChord: 2,
    kit: KIT.cinematic,
    patterns: {
      A: { kick: 'x.......x.......', snare: '........x.......', hat: '..-...-...-...-.', perc: '' },
      B: { kick: 'x.......x...x...', snare: '....x.......x...', hat: '-.-.-.-.-.-.-.-.', perc: '............xxxx' },
    },
    bass: V.subBass, bassPattern: 'halves', pad: V.brassPad, arp: V.pluckArp, arpRate: 8, arpShape: 'updown',
    lead: V.brassLead, leadDensity: 0.45, leadOctave: 24, drone: V.droneSpace, bell: V.bell, sidechain: 0, delayBeats: 0.75,
    vocab: [['Senate', 'Temple', 'Galactic', 'Uscru', 'Skylane', 'Monument', 'Works', 'Level 1313'], ['Dusk', 'Traffic', 'Procession', 'Spires', 'Senate', 'Ascent', 'District', 'March']],
  },
  megaCity: {
    id: 'mega-city-one', label: 'industrial', bpm: 114, swing: 0, scale: 'phrygianDominant', roots: [40, 41, 43],
    progressions: [[0, 1, 0, 6], [0, 5, 1, 0], [0, 0, 1, 1]], barsPerChord: 1,
    kit: KIT.industrial,
    patterns: {
      A: { kick: 'x..x..x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', perc: '..x.......x...x.' },
      B: { kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', perc: '..x...x...x...x.' },
    },
    bass: V.distBass, bassPattern: 'gallop', pad: V.darkPad, arp: V.squareArp, arpRate: 16, arpShape: 'broken',
    lead: V.distLead, leadDensity: 0.4, leadOctave: 12, drone: V.droneLow, bell: null, sidechain: 0.4, delayBeats: 0.5,
    vocab: [['Sector', 'Block', 'Lawmaster', 'Iso-Cube', 'Megaway', 'Justice', 'Cursed', 'Undercity'], ['13', 'Riot', 'Sentence', 'Patrol', 'Curfew', 'Pursuit', 'Lockdown', 'Sweep']],
  },
  vavatch: {
    id: 'vavatch-orbital', label: 'utopian ambient', bpm: 88, swing: 0.06, scale: 'lydian', roots: [41, 43, 45],
    progressions: [[0, 1, 4, 3], [0, 4, 5, 1], [0, 3, 1, 4]], barsPerChord: 2,
    kit: KIT.shaker,
    patterns: {
      A: { kick: 'x.........x.....', snare: '', hat: '', perc: 'x-x-x-x-x-x-x-x-' },
      B: { kick: 'x.......x.x.....', snare: '........x.......', hat: '..-...-...-...-.', perc: 'x-x-x-x-x-x-x-x-' },
    },
    bass: V.subBass, bassPattern: 'halves', pad: V.glassPad, arp: V.glassArp, arpRate: 8, arpShape: 'updown',
    lead: V.glassLead, leadDensity: 0.35, leadOctave: 24, drone: V.droneSpace, bell: V.bell, sidechain: 0, delayBeats: 0.75,
    vocab: [['Sleeper', 'Gravitas', 'Excession', 'Orbital', 'Plate', 'Ship-Mind', 'Contact', 'Shellworld'], ['Service', 'Afternoon', 'Drift', 'Tides', 'Field', 'Sabbatical', 'Reverie', 'Lull']],
  },
  millville: {
    id: 'millville', label: 'pastoral eerie', bpm: 72, swing: 0.1, scale: 'mixolydian', roots: [41, 43, 38],
    progressions: [[0, 3, 0, 4], [0, 5, 3, 4], [0, 6, 3, 0]], barsPerChord: 2,
    kit: KIT.brushes,
    patterns: {
      A: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x--x--x-x--x--x-', perc: '' },
      B: { kick: 'x.......x..x....', snare: '....x.......x...', hat: 'x--x--x-x--x--x-', perc: '..x...x...x...x.' },
    },
    bass: V.subBass, bassPattern: 'halves', pad: V.warmPad, arp: null, arpRate: 8, arpShape: 'up',
    lead: V.fluteLead, leadDensity: 0.35, leadOctave: 24, drone: null, bell: V.bell, sidechain: 0, delayBeats: 0.75,
    vocab: [['Purple', 'Barrier', 'Main Street', 'Sundown', 'Telephone', 'Flower', 'Prairie', 'Shimmer'], ['Fields', 'Waltz', 'Porch', 'Line', 'Hymn', 'Signals', 'Evening', 'Grass']],
  },
  arrakeen: {
    id: 'arrakeen', label: 'desert drone', bpm: 80, swing: 0.08, scale: 'phrygianDominant', roots: [38, 40, 41],
    progressions: [[0, 1, 0, 1], [0, 6, 1, 0], [0, 3, 1, 0]], barsPerChord: 2,
    kit: KIT.desert,
    patterns: {
      A: { kick: 'x.........x.....', snare: '', hat: '', perc: 'x..x..x.x..x..x.' },
      B: { kick: 'x.........x.....', snare: '........x.......', hat: '..-...-...-...-.', perc: 'x..x..x.x.xx.xx.' },
    },
    bass: V.subBass, bassPattern: 'sustain', pad: V.darkPad, arp: null, arpRate: 8, arpShape: 'up',
    lead: V.fluteLead, leadDensity: 0.35, leadOctave: 24, drone: V.droneThroat, bell: V.gamelan, sidechain: 0, delayBeats: 0.75,
    vocab: [['Spice', 'Shai-Hulud', 'Fremen', 'Sietch', 'Thumper', 'Water of', 'Shield Wall', 'Kwisatz'], ['Melange', 'Sands', 'Prayer', 'Ritual', 'Rising', 'Life', 'Storm', 'Dream']],
  },
  citadel: {
    id: 'the-citadel', label: 'war-rig industrial', bpm: 104, swing: 0, scale: 'phrygian', roots: [40, 38, 43],
    progressions: [[0, 1, 0, 6], [0, 5, 6, 0], [0, 6, 5, 1]], barsPerChord: 1,
    kit: KIT.war,
    patterns: {
      A: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: '', perc: 'x...x...x...x...' },
      B: { kick: 'x.x...x...x.x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', perc: 'x..xx..xx..xx.xx' },
    },
    bass: V.distBass, bassPattern: 'eighths', pad: V.darkPad, arp: null, arpRate: 8, arpShape: 'up',
    lead: V.distLead, leadDensity: 0.5, leadOctave: 12, drone: V.droneLow, bell: null, sidechain: 0.3, delayBeats: 0.5,
    vocab: [['Fury', 'Chrome', 'Valhalla', 'Aqua', 'War', 'Doof', 'Fang', 'Gas Town'], ['Road', 'Rig', 'Witness', 'Cola', 'Pup', 'Warrior', 'Convoy', 'Guzzoline']],
  },
  /** Not a world: the Silicon Based Lifeforms radio, in the style of Carbon Based Lifeforms. Plays over any world. */
  lifeforms: {
    id: 'silicon-based-lifeforms', label: 'psybient', bpm: 100, swing: 0, scale: 'minor', roots: [38, 40, 41, 43],
    progressions: [[0, 5, 3, 6], [0, 6, 5, 6], [0, 3, 0, 5], [0, 5, 6, 4], [0, 0, 5, 5]], barsPerChord: 4, form: 'long',
    kit: KIT.life,
    patterns: {
      A: { kick: FOUR, snare: '', hat: '..x...x...x...x.', perc: '.-x-.-x-.-x-.-x-' },
      B: { kick: FOUR, snare: '....x.......x...', hat: '..x...x...x...x.', openhat: '..............x.', perc: 'x-x-x-x-x-x-x-x-' },
    },
    bass: V.lifeBass, bassPattern: 'rolling', pad: V.lifePad, arp: V.lifeSeq, arpRate: 16, arpShape: 'broken',
    lead: V.lifeLead, leadDensity: 0.22, leadOctave: 24, drone: V.droneSpace, bell: V.lifeBell, sidechain: 0.5, delayBeats: 0.75,
    vocab: [['Aeroponic', 'Mycelial', 'Chlorophyll', 'Lichen', 'Quartz', 'Spore', 'Tidal', 'Cellular', 'Biolume', 'Synaptic', 'Silicate', 'Nocturnal'], ['Garden', 'Drift', 'Bloom', 'Lattice', 'Habitat', 'Respiration', 'Canopy', 'Membrane', 'Genesis', 'Archive', 'Sleep', 'Tide']],
  },
} satisfies Record<string, MusicStyle>;

/** Radio stations that play over every world. 'world' means each world's own music. */
export type Station = 'world' | 'lifeforms';
export const STATIONS: Record<Exclude<Station, 'world'>, { name: string; short: string; style: MusicStyle; blurb: string }> = {
  lifeforms: {
    name: 'Silicon Based Lifeforms',
    short: 'SBL radio',
    style: STYLES.lifeforms,
    blurb: 'Slow-building psybient: warm sweeping pads, a resonant sequence that opens over minutes, a soft rolling bass and a greenhouse full of water.',
  },
};
