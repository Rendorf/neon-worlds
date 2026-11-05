// Dev-only: renders each style offline and reports levels per role and per section (dBFS RMS, pre-compressor).
import { STYLES } from '../audio/styles';
import { AudioEngine } from '../audio/engine';
import { composeTrack, type Role } from '../audio/composer';
import { scheduleStep } from '../audio/player';
import type { MusicStyle } from '../audio/types';

const ROLES: Role[] = ['kick', 'snare', 'hat', 'openhat', 'perc', 'bass', 'pad', 'arp', 'lead', 'drone', 'bell'];
const SR = 16000;

async function render(style: MusicStyle, section: string, only?: Set<Role>): Promise<{ rms: number; peak: number }> {
  const track = composeTrack(style, 4242);
  const sec = track.sections.find((s) => s.name === section)!;
  const bars = 2;
  const seconds = (bars * 16 * 60) / track.bpm / 4 + 2;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * seconds), SR);
  const e = new AudioEngine(ctx);
  e.master.disconnect();
  e.master.connect(ctx.destination);
  const bus = e.createTrackBus();
  bus.out.gain.value = 1;
  e.setDelayTime((60 / track.bpm) * style.delayBeats);
  const stepDur = 60 / track.bpm / 4;
  const first = sec.startBar * 16 + (section === 'intro' ? 4 * 16 : 0);
  for (let i = 0; i < bars * 16; i++) scheduleStep(e, style, track, bus, first + i, 0.05 + i * stepDur, only);
  const buf = await ctx.startRendering();
  let sum = 0;
  let peak = 0;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = Math.floor(SR * 0.5); i < d.length; i++) {
      sum += d[i] * d[i];
      peak = Math.max(peak, Math.abs(d[i]));
    }
  }
  return { rms: Math.sqrt(sum / (2 * (buf.length - Math.floor(SR * 0.5)))), peak };
}

const db = (x: number) => (x > 1e-6 ? (20 * Math.log10(x)).toFixed(1) : '—');

async function main() {
  const out = document.getElementById('out') as HTMLTableElement;
  out.innerHTML = `<tr><th>style</th><th>intro</th><th>A</th><th>B</th><th>B peak</th>${ROLES.map((r) => `<th>${r}</th>`).join('')}</tr>`;
  const results: Record<string, Record<string, number>> = {};
  for (const style of Object.values(STYLES)) {
    const row: Record<string, number> = {};
    row.intro = (await render(style, 'intro')).rms;
    row.A = (await render(style, 'A')).rms;
    const b = await render(style, 'B');
    row.B = b.rms;
    row.peak = b.peak;
    for (const r of ROLES) row[r] = (await render(style, 'B', new Set([r]))).rms;
    results[style.id] = row;
    const cells = [row.intro, row.A, row.B, row.peak, ...ROLES.map((r) => row[r])]
      .map((v, i) => `<td class="${i === 3 && v > 0.9 ? 'hot' : ''}">${db(v)}</td>`).join('');
    out.insertAdjacentHTML('beforeend', `<tr><td>${style.id}</td>${cells}</tr>`);
  }
  (window as unknown as { labResults: unknown }).labResults = results;
  document.getElementById('status')!.textContent = 'done (dBFS RMS of 4 bars, pre-compressor; role columns are section B)';
}
void main();
