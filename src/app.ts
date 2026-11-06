// The app controller: wires the scene, audio, state and HUD together.
import { Renderer } from './scene/renderer';
import { WEATHER_LABEL, weatherAmbience, type Weather } from './scene/weather';
import { AudioEngine } from './audio/engine';
import { MusicPlayer, type NowPlaying } from './audio/player';
import { AmbiencePlayer, type AmbSource } from './audio/ambience';
import type { MusicStyle, Vibe } from './audio/types';
import { STATIONS, type Station } from './audio/styles';
import { WORLDS, worldById } from './worlds';
import type { WorldDef } from './worlds/types';
import { store, type State } from './state/store';
import { readUrl, writeUrl, shareUrl } from './state/url';
import { hydrateIcons, setIcon, paintRange, toast, panelOpen, closePanel } from './ui/kit';
import * as panels from './ui/panels';

const VIBES: Vibe[] = ['calm', 'focus', 'drive'];
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class App {
  readonly renderer: Renderer;
  engine: AudioEngine | null = null;
  music: MusicPlayer | null = null;
  ambience: AmbiencePlayer | null = null;
  world: WorldDef;
  nowPlaying: NowPlaying | null = null;
  private tourTimer: number | null = null;
  private idleTimer: number | null = null;
  private pipVideo: HTMLVideoElement | null = null;
  readonly timer = new panels.FocusTimer(() => this.engine?.chime());

  constructor() {
    const fromUrl = readUrl();
    const s = store.get();
    const world = worldById(fromUrl.world) ?? worldById(s.worldId) ?? WORLDS[0];
    this.world = world;
    const patch: Partial<State> = { worldId: world.id };
    if (fromUrl.weather && world.weathers.includes(fromUrl.weather)) {
      patch.weatherByWorld = { ...s.weatherByWorld, [world.id]: fromUrl.weather };
    }
    if (fromUrl.vibe) patch.vibe = fromUrl.vibe;
    if (fromUrl.station) patch.station = fromUrl.station;
    store.set(patch);

    this.renderer = new Renderer($<HTMLCanvasElement>('scene'));
    this.applySettings();
    this.showWorld(world);
    this.renderer.start();

    hydrateIcons();
    this.bindHud();
    this.bindKeys();
    this.bindIdle();
    window.setInterval(() => this.tickClock(), 1000);
    store.subscribe((st, prev) => this.onState(st, prev));
    this.renderHud();
    this.markVisited(world.id);
    if (store.get().tour) this.startTour();
  }

  // ---------- state helpers ----------

  weather(): Weather {
    const w = store.get().weatherByWorld[this.world.id];
    return w && this.world.weathers.includes(w) ? w : this.world.weathers[0];
  }

  private markVisited(id: string): void {
    const v = store.get().visited;
    if (!v.includes(id)) store.set({ visited: [...v, id] });
  }

  // ---------- audio ----------

  /** The music that plays now: the radio station's, or this world's own. */
  musicStyle(): MusicStyle {
    const st = store.get().station;
    return st === 'world' ? this.world.music : STATIONS[st].style;
  }

  stationName(): string {
    const st = store.get().station;
    return st === 'world' ? this.world.name : STATIONS[st].name;
  }

  setStation(station: Station): void {
    if (station === store.get().station) return;
    store.set({ station });
    this.music?.setStyle(this.musicStyle());
    this.applyAmbience();
    this.syncUrl();
    this.renderHud();
  }

  toggleStation(): void {
    const next: Station = store.get().station === 'world' ? 'lifeforms' : 'world';
    this.setStation(next);
    toast(next === 'world' ? `Radio: each world's own music` : `Radio: ${STATIONS[next].name}, ${STATIONS[next].style.label} on every world`);
  }

  private syncUrl(): void {
    const s = store.get();
    writeUrl(this.world.id, this.weather(), s.vibe, s.station);
  }

  private ensureAudio(): AudioEngine {
    if (!this.engine) {
      this.engine = new AudioEngine();
      this.music = new MusicPlayer(this.engine, this.musicStyle());
      this.music.setVibe(store.get().vibe);
      this.music.onChange = (np) => {
        this.nowPlaying = np;
        this.renderNowPlaying();
        panels.refreshQueue(this);
      };
      this.ambience = new AmbiencePlayer(this.engine);
      this.applyVolumes();
    }
    return this.engine;
  }

  async togglePlay(): Promise<void> {
    const playing = !store.get().playing;
    if (playing) {
      const e = this.ensureAudio();
      store.set({ playing });
      await e.resume();
      this.music!.play();
      this.applyAmbience();
    } else {
      store.set({ playing });
      this.music?.pause();
      this.ambience?.stopAll();
    }
  }

  next(): void {
    if (!store.get().playing) {
      void this.togglePlay();
      return;
    }
    this.music?.next();
  }

  ambienceSources(): AmbSource[] {
    const list = [...this.world.ambience];
    for (const wx of weatherAmbience(this.weather())) {
      if (list.some((s) => s.kind === wx.kind)) continue;
      list.push({ id: `wx-${wx.kind}`, label: wx.label, kind: wx.kind as AmbSource['kind'], gain: wx.gain });
    }
    // the psybient station brings its own field recording: water in a greenhouse
    if (store.get().station === 'lifeforms' && !list.some((s) => s.kind === 'water')) {
      list.push({ id: 'radio-water', label: 'Greenhouse water (radio)', kind: 'water', gain: 0.32 });
    }
    return list;
  }

  mixLevels(): Record<string, number> {
    return store.get().mix[this.world.id] ?? {};
  }

  applyAmbience(): void {
    if (!this.ambience || !store.get().playing) return;
    this.ambience.setSources(this.ambienceSources(), this.mixLevels());
  }

  setMixLevel(id: string, v: number): void {
    const s = store.get();
    store.set({ mix: { ...s.mix, [this.world.id]: { ...(s.mix[this.world.id] ?? {}), [id]: v } } });
    this.ambience?.setLevel(id, v);
  }

  private applyVolumes(): void {
    if (!this.engine) return;
    const s = store.get();
    const now = this.engine.now;
    this.engine.musicOut.gain.setTargetAtTime(s.musicVol * s.musicVol * 2, now, 0.05);
    this.engine.ambienceOut.gain.setTargetAtTime(s.ambVol * s.ambVol * 2.2, now, 0.05);
  }

  // ---------- worlds ----------

  private showWorld(world: WorldDef): void {
    this.world = world;
    this.renderer.setWorld(world);
    this.renderer.setWeather(this.weather());
    const root = document.documentElement.style;
    root.setProperty('--accent', world.accent);
    root.setProperty('--accent2', world.accent2);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', world.accent);
  }

  setWorld(id: string): void {
    const world = worldById(id);
    if (!world || world.id === this.world.id) return;
    const fade = document.querySelector('.fade')!;
    const reduce = store.get().settings.reduceMotion;
    fade.classList.add('on');
    window.setTimeout(() => {
      this.showWorld(world);
      store.set({ worldId: world.id });
      this.markVisited(world.id);
      this.music?.setStyle(this.musicStyle());
      this.applyAmbience();
      this.renderHud();
      this.syncUrl();
      fade.classList.remove('on');
    }, reduce ? 0 : 600);
    if (this.tourTimer !== null) this.startTour();
  }

  stepWorld(dir: number): void {
    const i = WORLDS.findIndex((w) => w.id === this.world.id);
    this.setWorld(WORLDS[(i + dir + WORLDS.length) % WORLDS.length].id);
  }

  setWeather(w: Weather): void {
    const s = store.get();
    store.set({ weatherByWorld: { ...s.weatherByWorld, [this.world.id]: w } });
    this.renderer.setWeather(w);
    this.applyAmbience();
    this.renderHud();
    this.syncUrl();
  }

  cycleWeather(): void {
    const ws = this.world.weathers;
    const next = ws[(ws.indexOf(this.weather()) + 1) % ws.length];
    this.setWeather(next);
    toast(`Weather: ${WEATHER_LABEL[next]}`);
  }

  setVibe(v: Vibe): void {
    store.set({ vibe: v });
    this.music?.setVibe(v);
    this.syncUrl();
    this.renderHud();
  }

  cycleVibe(): void {
    const v = VIBES[(VIBES.indexOf(store.get().vibe) + 1) % VIBES.length];
    this.setVibe(v);
    toast(`Vibe: ${v}`);
  }

  toggleFavourite(): void {
    const s = store.get();
    const fav = s.favourites.includes(this.world.id);
    store.set({ favourites: fav ? s.favourites.filter((f) => f !== this.world.id) : [...s.favourites, this.world.id] });
    toast(fav ? `Removed ${this.world.name} from favourites` : `Added ${this.world.name} to favourites`);
  }

  // ---------- tour ----------

  toggleTour(): void {
    const tour = !store.get().tour;
    store.set({ tour });
    if (tour) {
      this.startTour();
      toast(`Tour on: a new world every ${store.get().settings.tourMinutes} minutes`);
    } else {
      this.stopTour();
      toast('Tour off');
    }
  }

  private startTour(): void {
    this.stopTour();
    const ms = store.get().settings.tourMinutes * 60_000;
    this.tourTimer = window.setTimeout(() => {
      this.tourTimer = null;
      const s = store.get();
      const order = s.favourites.length >= 3 ? WORLDS.filter((w) => s.favourites.includes(w.id)) : WORLDS;
      const i = order.findIndex((w) => w.id === this.world.id);
      this.setWorld(order[(i + 1) % order.length].id);
      this.startTour();
    }, ms);
  }

  private stopTour(): void {
    if (this.tourTimer !== null) window.clearTimeout(this.tourTimer);
    this.tourTimer = null;
  }

  // ---------- media actions ----------

  saveScene(): void {
    const c = this.renderer.snapshot(4);
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-worlds-${this.world.id}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Scene saved as a 1920×1080 PNG');
    }, 'image/png');
  }

  async share(): Promise<void> {
    const url = shareUrl(this.world.id, this.weather(), store.get().vibe, store.get().station);
    const text = `${this.world.name}, from ${this.world.source}, with endless synth music`;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Neon Worlds', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch {
      toast(url, 6000);
    }
  }

  async miniPlayer(): Promise<void> {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      if (!document.pictureInPictureEnabled) throw new Error('unsupported');
      if (!this.pipVideo) {
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.srcObject = this.renderer.canvas.captureStream(30);
        v.addEventListener('leavepictureinpicture', () => this.renderer.setKeepAlive(false));
        this.pipVideo = v;
      }
      await this.pipVideo.play();
      await this.pipVideo.requestPictureInPicture();
      this.renderer.setKeepAlive(true);
    } catch {
      toast('Mini player is not supported in this browser');
    }
  }

  async fullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast('Fullscreen is not available here');
    }
  }

  applySettings(): void {
    const st = store.get().settings;
    document.body.classList.toggle('no-crt', !st.crt);
    document.body.classList.toggle('fit-contain', st.fit === 'contain');
    this.renderer.reduceMotion = st.reduceMotion;
    this.renderer.draw();
  }

  // ---------- HUD ----------

  private bindHud(): void {
    $('play').addEventListener('click', () => void this.togglePlay());
    this.renderer.canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this.renderer.click(e.clientX, e.clientY);
    });
    $('next').addEventListener('click', () => this.next());
    $('queue').addEventListener('click', () => panels.queue(this));
    $('fav').addEventListener('click', () => this.toggleFavourite());
    $('passport').addEventListener('click', () => panels.picker(this, 'passport'));
    $('chip-world').addEventListener('click', () => panels.picker(this));
    $('chip-tour').addEventListener('click', () => this.toggleTour());
    $('chip-weather').addEventListener('click', () => this.cycleWeather());
    $('chip-vibe').addEventListener('click', () => this.cycleVibe());
    $('chip-radio').addEventListener('click', () => this.toggleStation());
    $('btn-mixer').addEventListener('click', () => panels.mixer(this));
    $('btn-timer').addEventListener('click', () => panels.timer(this));
    $('btn-save').addEventListener('click', () => this.saveScene());
    $('btn-share').addEventListener('click', () => void this.share());
    $('btn-pip').addEventListener('click', () => void this.miniPlayer());
    $('btn-full').addEventListener('click', () => void this.fullscreen());
    $('btn-settings').addEventListener('click', () => panels.settings(this));
    $('btn-help').addEventListener('click', () => panels.help(this));
    $('btn-more').addEventListener('click', () => panels.more(this));

    const s = store.get();
    for (const [id, key] of [['vol-music', 'musicVol'], ['vol-amb', 'ambVol']] as const) {
      const input = $<HTMLInputElement>(id);
      input.value = String(s[key]);
      paintRange(input);
      input.addEventListener('input', () => {
        paintRange(input);
        store.set({ [key]: Number(input.value) } as Partial<State>);
      });
    }
    document.addEventListener('fullscreenchange', () => $('btn-full').classList.toggle('on', !!document.fullscreenElement));
  }

  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('input, textarea, select') && e.key !== 'Escape') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      const act: Record<string, () => void> = {
        ' ': () => void this.togglePlay(),
        n: () => this.next(),
        q: () => panels.queue(this),
        '/': () => panels.picker(this),
        g: () => panels.picker(this),
        ArrowRight: () => this.stepWorld(1),
        ArrowLeft: () => this.stepWorld(-1),
        ArrowUp: () => this.nudgeVolume(0.05),
        ArrowDown: () => this.nudgeVolume(-0.05),
        c: () => this.toggleTour(),
        w: () => this.cycleWeather(),
        v: () => this.cycleVibe(),
        r: () => this.toggleStation(),
        m: () => panels.mixer(this),
        t: () => panels.timer(this),
        s: () => this.saveScene(),
        p: () => void this.miniPlayer(),
        f: () => void this.fullscreen(),
        l: () => this.toggleFavourite(),
        ',': () => panels.settings(this),
        '?': () => panels.help(this, 'keys'),
        Escape: () => closePanel(),
      };
      const fn = act[k] ?? act[k.toLowerCase()];
      if (!fn) return;
      if (k === ' ' && target.closest?.('button')) return; // let space press focused buttons
      e.preventDefault();
      fn();
    });
  }

  private nudgeVolume(d: number): void {
    const v = Math.max(0, Math.min(1, store.get().musicVol + d));
    store.set({ musicVol: v });
    const input = $<HTMLInputElement>('vol-music');
    input.value = String(v);
    paintRange(input);
  }

  private bindIdle(): void {
    const wake = () => {
      document.body.classList.remove('idle');
      if (this.idleTimer !== null) window.clearTimeout(this.idleTimer);
      this.idleTimer = window.setTimeout(() => {
        if (store.get().playing && !panelOpen() && !document.querySelector('.hud-bottom:hover, .hud-top:hover')) {
          document.body.classList.add('idle');
        }
      }, 6000);
    };
    for (const ev of ['mousemove', 'pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, wake, { passive: true });
    wake();
  }

  private onState(s: State, prev: State): void {
    if (s.musicVol !== prev.musicVol || s.ambVol !== prev.ambVol) this.applyVolumes();
    if (s.settings !== prev.settings) this.applySettings();
    if (s.favourites !== prev.favourites || s.visited !== prev.visited || s.tour !== prev.tour || s.playing !== prev.playing) this.renderHud();
  }

  private clock(): string {
    const d = new Date(Date.now() + this.world.hourOffset * 3_600_000);
    const hh = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (store.get().settings.clock24) return `${String(hh).padStart(2, '0')}:${mm}`;
    return `${((hh + 11) % 12) + 1}:${mm} ${hh < 12 ? 'am' : 'pm'}`;
  }

  private tickClock(): void {
    const el = document.querySelector('#world-meta .clock');
    if (el) el.textContent = this.clock();
    const chipSub = document.querySelector('#chip-world .chip-sub');
    if (chipSub) chipSub.textContent = this.clock();
    if (this.timer.running) document.title = `${this.timer.label()} · ${this.world.name} · Neon Worlds`;
    else if (!document.title.startsWith('Neon Worlds')) document.title = 'Neon Worlds · sci-fi worlds with endless synth music';
  }

  renderHud(): void {
    const s = store.get();
    const w = this.world;
    $('world-name').textContent = w.name;
    $('world-meta').innerHTML = '';
    $('world-meta').append(`${w.tagline} · `, Object.assign(document.createElement('span'), { className: 'clock', textContent: this.clock() }), ` local · ${w.era}`);
    $('world-source').textContent = `${w.source}`;
    $('passport').textContent = `Passport ${s.visited.filter((id) => worldById(id)).length}/${WORLDS.length}`;
    const fav = s.favourites.includes(w.id);
    const favBtn = $('fav');
    favBtn.classList.toggle('on', fav);
    setIcon(favBtn, fav ? 'heartFill' : 'heart');
    favBtn.setAttribute('aria-pressed', String(fav));

    document.querySelector('#chip-world .chip-label')!.textContent = w.name;
    document.querySelector('#chip-world .chip-sub')!.textContent = this.clock();
    $('chip-tour').classList.toggle('on', s.tour);
    document.querySelector('#chip-tour .chip-sub')!.textContent = s.tour ? `${s.settings.tourMinutes} min` : 'off';
    document.querySelector('#chip-weather .chip-sub')!.textContent = WEATHER_LABEL[this.weather()];
    document.querySelector('#chip-vibe .chip-sub')!.textContent = s.vibe;
    const radio = $('chip-radio');
    radio.classList.toggle('on', s.station !== 'world');
    radio.querySelector('.chip-sub')!.textContent = s.station === 'world' ? 'world' : STATIONS[s.station].short;

    const play = $('play');
    setIcon(play, s.playing ? 'pause' : 'play');
    play.setAttribute('aria-label', s.playing ? 'Pause music (Space)' : 'Play music (Space)');
    this.renderNowPlaying();
  }

  renderNowPlaying(): void {
    const s = store.get();
    const np = this.nowPlaying;
    if (!s.playing || !np) {
      $('np-title').textContent = s.playing ? 'Tuning in…' : 'Press play for endless synth';
      $('np-sub').textContent = `music is generated live in your browser · ${this.musicStyle().label}${s.station === 'world' ? '' : ` · ${this.stationName()}`}`;
      $('np-progress').style.width = '0';
      return;
    }
    $('np-title').textContent = np.title;
    $('np-sub').textContent = `${np.style.label} · ${np.bpm} bpm · ${np.vibe} · ${this.stationName()}`;
    $('np-progress').style.width = `${Math.round(np.progress * 100)}%`;
  }
}
