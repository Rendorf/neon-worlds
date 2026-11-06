// Panel contents: world picker, up next, mixer, focus timer, settings, help.
import type { App } from '../app';
import { WORLDS } from '../worlds';
import { thumbnail } from '../scene/renderer';
import { WEATHER_LABEL } from '../scene/weather';
import { store, loadTasks, saveTasks, type Settings, type Task } from '../state/store';
import type { Vibe } from '../audio/types';
import { STATIONS, type Station } from '../audio/styles';
import { h, icon, openPanel, closePanel, panelOpen, paintRange, toast } from './kit';

// ---------- world picker ----------

type PickerTab = 'all' | 'favourites' | 'passport';

export function picker(app: App, tab: PickerTab = 'all'): void {
  const body = h('div');
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const grid = h('div', { class: 'grid' });
  const note = h('p', { class: 'small' });

  const render = (which: PickerTab) => {
    tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', (t as HTMLElement).dataset.tab === which));
    const s = store.get();
    let list = WORLDS;
    if (which === 'favourites') list = WORLDS.filter((w) => s.favourites.includes(w.id));
    grid.replaceChildren();
    note.textContent =
      which === 'passport'
        ? `${s.visited.length} of ${WORLDS.length} worlds stamped. Visit a world to stamp it.`
        : which === 'favourites' && !list.length
          ? 'No favourites yet. Press the heart next to a world name, or L.'
          : 'Arrow keys step through worlds. Tour mode visits them for you.';
    for (const w of list) {
      const img = h('img', { alt: '', loading: 'lazy', width: 240, height: 135 });
      const visited = s.visited.includes(w.id);
      const card = h(
        'button',
        {
          class: 'card' + (w.id === app.world.id ? ' current' : ''),
          'aria-label': `${w.name}, ${w.source}`,
          onClick: () => {
            closePanel();
            app.setWorld(w.id);
          },
        },
        img,
        which === 'passport' ? h('span', { class: 'stamp', style: `color:${visited ? w.accent : '#555'}` }, visited ? 'VISITED' : 'NOT YET') : null,
        s.favourites.includes(w.id) ? h('span', { class: 'favmark' }, icon('heartFill')) : null,
        h('div', { class: 'cap' }, h('b', {}, w.name), h('small', {}, `${w.source} · ${w.music.label}`)),
      );
      if (which === 'passport' && !visited) img.style.filter = 'grayscale(1) brightness(0.6)';
      grid.append(card);
      // thumbnails are drawn lazily so the panel opens instantly
      const paint = () => (img.src = thumbnail(w));
      const idle = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle.call(window, paint, { timeout: 300 });
      else setTimeout(paint, 0);
    }
  };

  for (const [id, label] of [['all', `All ${WORLDS.length}`], ['favourites', 'Favourites'], ['passport', 'Passport']] as const) {
    tabs.append(h('button', { class: 'tab', role: 'tab', 'data-tab': id, onClick: () => render(id) }, label));
  }
  body.append(grid, note);
  openPanel('picker', 'Worlds', body, { headExtra: tabs });
  render(tab);
}

// ---------- up next ----------

let queueBody: HTMLElement | null = null;

export function queue(app: App): void {
  queueBody = h('div');
  openPanel('queue', 'Up next', queueBody, { narrow: true, onClose: () => (queueBody = null) });
  refreshQueue(app);
}

export function refreshQueue(app: App): void {
  if (!queueBody || !panelOpen('queue')) return;
  const np = app.nowPlaying;
  const playing = store.get().playing;
  const items: HTMLElement[] = [];
  items.push(
    h('div', { class: 'queue-item now' },
      h('div', {}, h('b', {}, playing && np ? np.title : 'Nothing playing yet'), h('br'), h('small', {}, playing && np ? `${np.style.label} · ${np.bpm} bpm` : 'press play to start')),
      h('button', { class: 'btn', onClick: () => app.next() }, playing ? 'Skip' : 'Play'),
    ),
  );
  const q = app.music?.queue.slice(0, 3) ?? [];
  q.forEach((item, i) => {
    items.push(
      h('div', { class: 'queue-item' },
        h('div', {}, item.title, h('br'), h('small', {}, `${app.musicStyle().label} · composed when it starts`)),
        h('button', { class: 'btn', onClick: () => { app.music?.playQueued(i); if (!store.get().playing) void app.togglePlay(); } }, 'Play now'),
      ),
    );
  });
  if (!q.length) items.push(h('p', { class: 'small' }, 'Tracks are composed on the fly for this world. Press play to start the queue.'));
  items.push(h('h3', {}, 'Radio'), stationSeg(app), h('h3', {}, 'Vibe'), vibeSeg(app));
  queueBody.replaceChildren(h('div', { class: 'rows' }, ...items));
}

function stationSeg(app: App): HTMLElement {
  const wrap = h('div');
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Radio station' });
  const opts: [Station, string][] = [['world', 'This world'], ['lifeforms', STATIONS.lifeforms.name]];
  const note = h('p', { class: 'small' });
  const sync = () => {
    const st = store.get().station;
    seg.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', opts[i][0] === st); b.setAttribute('aria-pressed', String(opts[i][0] === st)); });
    note.textContent = st === 'world' ? `Each world plays its own style. Now: ${app.world.music.label}.` : `${STATIONS[st].blurb} Stays on as you change worlds.`;
  };
  for (const [st, label] of opts) seg.append(h('button', { onClick: () => { app.setStation(st); sync(); } }, label));
  sync();
  wrap.append(seg, note);
  return wrap;
}

function vibeSeg(app: App): HTMLElement {
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Vibe' });
  const vibes: [Vibe, string][] = [['calm', 'Calm'], ['focus', 'Focus'], ['drive', 'Drive']];
  for (const [v, label] of vibes) {
    seg.append(h('button', { class: store.get().vibe === v ? 'on' : '', 'aria-pressed': String(store.get().vibe === v), onClick: () => { app.setVibe(v); seg.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', vibes[i][0] === v)); } }, label));
  }
  return seg;
}

// ---------- mixer ----------

function sliderRow(label: string, value: number, onInput: (v: number) => void): HTMLElement {
  const val = h('span', { class: 'val' }, String(Math.round(value * 100)));
  const input = h('input', { type: 'range', min: '0', max: '1', step: '0.01', 'aria-label': label }) as HTMLInputElement;
  input.value = String(value);
  paintRange(input);
  input.addEventListener('input', () => {
    paintRange(input);
    val.textContent = String(Math.round(Number(input.value) * 100));
    onInput(Number(input.value));
  });
  return h('div', { class: 'row' }, h('label', {}, label), input, val);
}

export function mixer(app: App): void {
  const s = store.get();
  const levels = app.mixLevels();
  const syncMaster = (id: string, v: number) => {
    const el = document.getElementById(id) as HTMLInputElement;
    el.value = String(v);
    paintRange(el);
  };
  const rows = h('div', { class: 'rows' },
    sliderRow('Music', s.musicVol, (v) => { store.set({ musicVol: v }); syncMaster('vol-music', v); }),
    sliderRow('World sounds', s.ambVol, (v) => { store.set({ ambVol: v }); syncMaster('vol-amb', v); }),
    h('h3', {}, `${app.world.name} sounds`),
    ...app.ambienceSources().map((src) => sliderRow(src.label, levels[src.id] ?? 1, (v) => app.setMixLevel(src.id, v))),
  );
  const note = h('p', { class: 'small' }, store.get().playing ? `Weather adds its own layer: ${WEATHER_LABEL[app.weather()]}.` : 'Press play to hear the world. Your mix is saved per world.');
  openPanel('mixer', 'Mixer', h('div', {}, rows, note), { narrow: true });
}

// ---------- focus timer ----------

export class FocusTimer {
  focusMin = 25;
  breakMin = 5;
  mode: 'focus' | 'break' = 'focus';
  remaining = 25 * 60;
  running = false;
  private id: number | null = null;
  onTick: () => void = () => {};

  constructor(private chime: () => void) {}

  label(): string {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    let last = Date.now();
    this.id = window.setInterval(() => {
      const now = Date.now();
      const d = Math.round((now - last) / 1000);
      if (d < 1) return;
      last += d * 1000;
      this.remaining = Math.max(0, this.remaining - d);
      if (this.remaining === 0) {
        this.chime();
        this.mode = this.mode === 'focus' ? 'break' : 'focus';
        this.remaining = (this.mode === 'focus' ? this.focusMin : this.breakMin) * 60;
        toast(this.mode === 'break' ? 'Focus block done. Take a break.' : 'Break over. Back to it.', 5000);
      }
      this.onTick();
    }, 250);
    this.onTick();
  }

  pause(): void {
    this.running = false;
    if (this.id !== null) window.clearInterval(this.id);
    this.id = null;
    this.onTick();
  }

  reset(): void {
    this.pause();
    this.remaining = (this.mode === 'focus' ? this.focusMin : this.breakMin) * 60;
    this.onTick();
  }

  setFocus(min: number): void {
    this.focusMin = min;
    if (this.mode === 'focus' && !this.running) this.remaining = min * 60;
    this.onTick();
  }
}

export function timer(app: App): void {
  const t = app.timer;
  const face = h('div', { class: 'timer-face', 'aria-live': 'off' });
  const mode = h('div', { class: 'timer-mode' });
  const startBtn = h('button', { class: 'btn primary', onClick: () => (t.running ? t.pause() : t.start()) });
  const lengths = h('div', { class: 'seg', role: 'group', 'aria-label': 'Focus length' });
  for (const m of [15, 25, 50]) {
    lengths.append(h('button', { 'data-min': m, onClick: () => t.setFocus(m) }, `${m} min`));
  }
  const paint = () => {
    face.textContent = t.label();
    mode.textContent = t.mode === 'focus' ? 'focus' : 'break';
    startBtn.textContent = t.running ? 'Pause' : 'Start';
    lengths.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number((b as HTMLElement).dataset.min) === t.focusMin));
  };
  t.onTick = paint;
  paint();

  // tasks
  let tasks: Task[] = loadTasks();
  const list = h('div');
  const renderTasks = () => {
    list.replaceChildren(
      ...tasks.map((task) =>
        h('div', { class: 'task' + (task.done ? ' done' : '') },
          h('input', { type: 'checkbox', checked: task.done, 'aria-label': `Done: ${task.text}`, onChange: () => { task.done = !task.done; saveTasks(tasks); renderTasks(); } }),
          h('span', {}, task.text),
          h('button', { class: 'icon-btn', 'aria-label': `Delete ${task.text}`, onClick: () => { tasks = tasks.filter((x) => x !== task); saveTasks(tasks); renderTasks(); } }, icon('trash')),
        ),
      ),
    );
  };
  renderTasks();
  const input = h('input', { type: 'text', placeholder: 'Add a task and press Enter', maxlength: '120', 'aria-label': 'New task' }) as HTMLInputElement;
  const add = () => {
    const text = input.value.trim();
    if (!text) return;
    tasks.push({ id: String(Date.now()), text, done: false });
    saveTasks(tasks);
    input.value = '';
    renderTasks();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  const body = h('div', {},
    mode, face,
    h('div', { class: 'center' }, startBtn, h('button', { class: 'btn', onClick: () => t.reset() }, 'Reset')),
    h('div', { class: 'center', style: 'margin-top:10px' }, lengths),
    h('h3', {}, 'Tasks'),
    list,
    h('div', { class: 'task-input' }, input, h('button', { class: 'btn', onClick: add }, 'Add')),
    h('p', { class: 'small' }, 'Timer and tasks stay on this device. A chime plays when a block ends if sound is on.'),
  );
  openPanel('timer', 'Focus timer', body, { narrow: true, onClose: () => (t.onTick = () => {}) });
  void app;
}

// ---------- settings ----------

export function settings(app: App): void {
  const st = () => store.get().settings;
  const set = (patch: Partial<Settings>) => store.set({ settings: { ...st(), ...patch } });
  const toggle = (label: string, key: 'crt' | 'reduceMotion' | 'clock24') => {
    const box = h('input', { type: 'checkbox', class: 'switch', checked: st()[key], 'aria-label': label, onChange: () => { set({ [key]: box.checked }); app.renderHud(); } }) as HTMLInputElement;
    return h('div', { class: 'row' }, h('label', {}, label), box);
  };
  const seg = <T extends string | number>(label: string, options: [T, string][], value: T, on: (v: T) => void) => {
    const g = h('div', { class: 'seg', role: 'group', 'aria-label': label });
    options.forEach(([v, text]) => g.append(h('button', { class: v === value ? 'on' : '', onClick: () => { on(v); g.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', options[i][0] === v)); } }, text)));
    return h('div', { class: 'row' }, h('label', {}, label), g);
  };
  const body = h('div', { class: 'rows' },
    toggle('CRT scanlines', 'crt'),
    toggle('Reduce motion (still frame, no particles)', 'reduceMotion'),
    toggle('24-hour clock', 'clock24'),
    seg('Fit the scene', [['cover', 'Fill'], ['contain', 'Whole scene']], st().fit, (v) => set({ fit: v })),
    seg('Tour stays', [[5, '5 min'], [10, '10'], [15, '15'], [30, '30']], st().tourMinutes, (v) => { set({ tourMinutes: v }); app.renderHud(); }),
    h('div', { class: 'row' }, h('label', {}, 'Passport and favourites'),
      h('button', { class: 'btn', onClick: () => { store.set({ visited: [app.world.id], favourites: [] }); toast('Passport and favourites cleared'); } }, 'Clear')),
    h('p', { class: 'small' }, 'Settings are stored in this browser only. Nothing is sent anywhere.'),
  );
  openPanel('settings', 'Settings', body, { narrow: true });
}

// ---------- help ----------

export function help(app: App, tab: 'about' | 'worlds' | 'keys' = 'about'): void {
  const content = h('div');
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const pages: Record<string, () => HTMLElement> = {
    about: () => h('div', {},
      h('p', {}, 'Neon Worlds pairs animated pixel-art scenes from the worlds of science fiction with endless music composed live in your browser. Each world has its own palette, weather, sounds and musical style, from Night City darksynth to the desert drones of Arrakeen.'),
      h('p', {}, 'Every scene is drawn by code at 480×270 and loops seamlessly every four minutes. Everyone sees the same moment of the loop. Every note and every sound is synthesised on the fly: there are no recordings, no samples and no tracking.'),
      h('h3', {}, 'Silicon Based Lifeforms radio'),
      h('p', {}, 'Press R, or choose Radio, to switch from each world\'s own music to Silicon Based Lifeforms: a station of slow, warm psybient in the style of the Swedish ambient duo ', h('a', { href: 'https://carbonbasedlifeforms.net', target: '_blank', rel: 'noopener' }, 'Carbon Based Lifeforms'), '. Long tracks build from a closed filter to full bloom over five minutes, and the station keeps playing as you travel between worlds. Like everything here it is composed live: a tribute, not their music, and not affiliated with them.'),
      h('p', {}, 'Use it as a calm background for work, study or winding down. Pick a world, press play, and let it run. Tour mode moves between worlds on its own. Click anywhere on the scene for a small surprise in that world\'s style.'),
      h('h3', {}, 'Inspired by Lofi Cities'),
      h('p', {}, 'Neon Worlds is inspired by ', h('a', { href: 'https://loficities.com', target: '_blank', rel: 'noopener' }, 'Lofi Cities (loficities.com)'), ', which pairs pixel-art city nights with lofi music made in the browser. Go and visit it: this is the same idea carried into science fiction.'),
      h('h3', {}, 'Unofficial fan project'),
      h('p', { class: 'small' }, 'Neon Worlds is a non-commercial tribute. World names refer to the works listed under Worlds. All art, music and sound here are original. It is not affiliated with or endorsed by CD Projekt, Warner Bros., Kodansha, Shueisha, Disney, Lucasfilm, Rebellion, Legendary, Kennedy Miller Mitchell, or the estates of Philip K. Dick, William Gibson, Iain M. Banks, Clifford D. Simak and Frank Herbert.'),
    ),
    worlds: () => h('div', { class: 'rows' },
      ...WORLDS.map((w) => h('div', { class: 'queue-item' + (w.id === app.world.id ? ' now' : '') },
        h('div', {}, h('b', {}, w.name), h('br'), h('small', {}, `${w.source} · ${w.creator}`)),
        h('button', { class: 'btn', onClick: () => { closePanel(); app.setWorld(w.id); } }, 'Go'),
      )),
    ),
    keys: () => {
      const rows: [string, string][] = [
        ['Space', 'Play or pause'], ['N', 'Next track'], ['Q', 'Up next and vibe'], ['/ or G', 'All worlds'],
        ['← →', 'Previous or next world'], ['↑ ↓', 'Music volume'], ['C', 'Tour on or off'], ['W', 'Change weather'],
        ['V', 'Change vibe'], ['R', 'Radio: world music or Silicon Based Lifeforms'], ['M', 'Mixer'], ['T', 'Focus timer and tasks'], ['L', 'Favourite this world'],
        ['S', 'Save scene as PNG'], ['P', 'Mini player'], ['F', 'Fullscreen'], [',', 'Settings'], ['?', 'This help'], ['Esc', 'Close panel'], ['Click', 'A world-themed effect on the scene'],
      ];
      return h('table', { class: 'keys' }, h('tbody', {}, ...rows.map(([k, d]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, d)))));
    },
  };
  const show = (id: string) => {
    tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', (t as HTMLElement).dataset.tab === id));
    content.replaceChildren(pages[id]());
  };
  for (const [id, label] of [['about', 'About'], ['worlds', 'Worlds'], ['keys', 'Shortcuts']] as const) {
    tabs.append(h('button', { class: 'tab', role: 'tab', 'data-tab': id, onClick: () => show(id) }, label));
  }
  openPanel('help', 'Neon Worlds', content, { headExtra: tabs });
  show(tab);
}

// ---------- "more" sheet for small screens ----------

export function more(app: App): void {
  const item = (label: string, ic: Parameters<typeof icon>[0], fn: () => void) =>
    h('button', { class: 'queue-item', style: 'border:0;cursor:pointer;width:100%;color:inherit;text-align:left', onClick: () => { closePanel(); fn(); } }, h('span', {}, label), icon(ic));
  openPanel('more', 'More', h('div', { class: 'rows' },
    item('Mixer', 'mixer', () => mixer(app)),
    item('Focus timer and tasks', 'timer', () => timer(app)),
    item('Save scene', 'camera', () => app.saveScene()),
    item('Share this world', 'share', () => void app.share()),
    item('Mini player', 'pip', () => void app.miniPlayer()),
    item('Fullscreen', 'fullscreen', () => void app.fullscreen()),
    item('Settings', 'settings', () => settings(app)),
    item('About and shortcuts', 'help', () => help(app)),
  ), { narrow: true });
}
