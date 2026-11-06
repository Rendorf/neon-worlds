import { describe, it, expect } from 'vitest';
import { degreeToMidi, euclid, parsePattern, nearestChordTone, SCALES, midiToFreq } from '../src/audio/theory';
import { composeTrack, eventsAt, totalSteps, sectionAt, brightnessAt } from '../src/audio/composer';
import { STYLES, STATIONS } from '../src/audio/styles';
import { mulberry32, hash2, tick, phase } from '../src/scene/core';

describe('theory', () => {
  it('maps degrees to midi across octaves', () => {
    expect(degreeToMidi(60, SCALES.major, 0)).toBe(60);
    expect(degreeToMidi(60, SCALES.major, 2)).toBe(64);
    expect(degreeToMidi(60, SCALES.major, 7)).toBe(72);
    expect(degreeToMidi(60, SCALES.major, -1)).toBe(59);
    expect(degreeToMidi(60, SCALES.minor, 2)).toBe(63);
  });
  it('tunes A4 to 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToFreq(81)).toBeCloseTo(880);
  });
  it('builds euclidean rhythms', () => {
    expect(euclid(3, 8).map((b) => (b ? 'x' : '.')).join('')).toBe('x..x..x.');
    expect(euclid(4, 16).filter(Boolean).length).toBe(4);
  });
  it('parses drum patterns', () => {
    expect(parsePattern('xo-.')).toEqual([1, 0.65, 0.35, 0]);
  });
  it('snaps to the nearest chord tone', () => {
    expect([0, 2, 4]).toContain(((nearestChordTone(1, 0) % 7) + 7) % 7);
    expect(nearestChordTone(4, 0)).toBe(4);
  });
});

describe('core helpers', () => {
  it('seeded rng is deterministic and in range', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it('hash2 is stable and spread out', () => {
    expect(hash2(3, 4)).toBe(hash2(3, 4));
    const vals = Array.from({ length: 1000 }, (_, i) => hash2(i, 7));
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
  it('phase and tick wrap at the loop', () => {
    expect(phase(0, 3)).toBe(0);
    expect(phase(240, 3)).toBe(0);
    expect(tick(240, 100)).toBe(0);
    expect(tick(239.99, 100)).toBe(99);
  });
});

describe('composer', () => {
  const styles = Object.values(STYLES);

  it('every style id matches a world id format', () => {
    for (const s of styles) expect(s.id).toMatch(/^[a-z0-9-]+$/);
  });

  for (const style of styles) {
    it(`${style.id}: same seed gives the same track`, () => {
      const a = composeTrack(style, 1234);
      const b = composeTrack(style, 1234);
      expect(a.title).toBe(b.title);
      for (let s = 0; s < totalSteps(a); s += 7) expect(eventsAt(a, s)).toEqual(eventsAt(b, s));
    });

    it(`${style.id}: track lasts about two to five minutes`, () => {
      const tr = composeTrack(style, 99);
      const seconds = (totalSteps(tr) * 60) / tr.bpm / 4;
      expect(seconds).toBeGreaterThan(120);
      expect(seconds).toBeLessThan(330);
    });

    it(`${style.id}: melodic notes stay in the scale and in a sane range`, () => {
      const tr = composeTrack(style, 7);
      const pcs = new Set(tr.scale.map((d) => (tr.root + d) % 12));
      let notes = 0;
      for (let s = 0; s < totalSteps(tr); s++) {
        for (const ev of eventsAt(tr, s)) {
          if (ev.role === 'drone') continue;
          for (const m of ev.midi) {
            notes++;
            expect(pcs.has(((m % 12) + 12) % 12)).toBe(true);
            expect(m).toBeGreaterThan(18);
            expect(m).toBeLessThan(110);
          }
          expect(ev.vel).toBeGreaterThan(0);
          expect(ev.vel).toBeLessThanOrEqual(1.01);
        }
      }
      expect(notes).toBeGreaterThan(50);
    });
  }

  it('vibe changes tempo and drops hats when calm', () => {
    const calm = composeTrack(STYLES.nightCity, 5, 'calm');
    const drive = composeTrack(STYLES.nightCity, 5, 'drive');
    expect(drive.bpm).toBeGreaterThan(calm.bpm);
    const sec = sectionAt(calm, 20);
    expect(sec.layers).not.toContain('hat');
  });

  it('different seeds give different tracks', () => {
    const titles = new Set(Array.from({ length: 20 }, (_, i) => composeTrack(STYLES.grid, i * 977).title));
    expect(titles.size).toBeGreaterThan(5);
  });

  describe('Silicon Based Lifeforms radio (long form)', () => {
    const style = STATIONS.lifeforms.style;
    const tr = composeTrack(style, 2026);
    const rolesIn = (name: string) => {
      const sec = tr.sections.find((x) => x.name === name)!;
      const roles = new Set<string>();
      for (let st = sec.startBar * 16; st < (sec.startBar + sec.bars) * 16; st++) for (const ev of eventsAt(tr, st)) roles.add(ev.role);
      return roles;
    };

    it('runs about five minutes in six sections', () => {
      expect(tr.sections.map((x) => x.name)).toEqual(['intro', 'build', 'A', 'break', 'B', 'outro']);
      const seconds = (totalSteps(tr) * 60) / tr.bpm / 4;
      expect(seconds).toBeGreaterThan(270);
      expect(seconds).toBeLessThan(330);
    });

    it('intro is beatless, the kick arrives in the groove and leaves in the breakdown', () => {
      expect(rolesIn('intro').has('kick')).toBe(false);
      expect(rolesIn('build').has('kick')).toBe(false);
      expect(rolesIn('A').has('kick')).toBe(true);
      expect(rolesIn('break').has('kick')).toBe(false);
      expect(rolesIn('B').has('lead')).toBe(true);
    });

    it('the filter opens from the intro into the groove and stays in 0..1', () => {
      const at = (name: string, frac: number) => {
        const sec = tr.sections.find((x) => x.name === name)!;
        return brightnessAt(tr, Math.floor((sec.startBar + sec.bars * frac) * 16))!;
      };
      expect(at('intro', 0.1)).toBeLessThan(0.15);
      expect(at('build', 0.9)).toBeGreaterThan(at('intro', 0.9));
      expect(at('B', 0.9)).toBeGreaterThan(0.7);
      for (let st = 0; st < totalSteps(tr); st += 5) {
        const b = brightnessAt(tr, st)!;
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(1);
      }
      for (const ev of eventsAt(tr, tr.sections[2].startBar * 16)) if (ev.role === 'arp' || ev.role === 'bass') expect(ev.bright).toBeDefined();
    });

    it('world styles keep their standard form and no sweep', () => {
      const w = composeTrack(STYLES.nightCity, 3);
      expect(w.form).toBe('standard');
      expect(brightnessAt(w, 100)).toBeUndefined();
    });
  });
});
