export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
} as const;

export type ScaleName = keyof typeof SCALES;

/** MIDI note for a scale degree (0-based, may be negative or above 7). */
export function degreeToMidi(root: number, scale: readonly number[], degree: number): number {
  const n = scale.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return root + oct * 12 + scale[idx];
}

/** Degrees of a stacked-thirds chord built on `degree`. */
export function chordDegrees(degree: number, size = 3): number[] {
  return Array.from({ length: size }, (_, i) => degree + i * 2);
}

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Euclidean rhythm: `pulses` hits spread as evenly as possible over `steps`, first step a hit. */
export function euclid(pulses: number, steps: number): boolean[] {
  return Array.from({ length: steps }, (_, i) => (i * pulses) % steps < pulses);
}

/** 'x' = 1, 'o' = 0.65, '-' = 0.35, '.' = 0. */
export function parsePattern(p: string): number[] {
  return p.split('').map((c) => (c === 'x' ? 1 : c === 'o' ? 0.65 : c === '-' ? 0.35 : 0));
}

/** Nearest degree to `deg` that is a tone of the triad built on `chordRoot`. */
export function nearestChordTone(deg: number, chordRoot: number, n = 7): number {
  let best = deg;
  let bestDist = Infinity;
  for (let d = deg - 3; d <= deg + 3; d++) {
    const rel = (((d - chordRoot) % n) + n) % n;
    if (rel === 0 || rel === 2 || rel === 4) {
      const dist = Math.abs(d - deg);
      if (dist < bestDist) {
        best = d;
        bestDist = dist;
      }
    }
  }
  return best;
}
