import type { Weather } from '../scene/weather';
import type { Vibe } from '../audio/types';
import type { Station } from '../audio/styles';

export interface Settings {
  crt: boolean;
  reduceMotion: boolean;
  clock24: boolean;
  fit: 'cover' | 'contain';
  tourMinutes: number;
}

export interface State {
  worldId: string;
  weatherByWorld: Record<string, Weather>;
  vibe: Vibe;
  /** 'world' plays each world's own music; a radio station plays over every world */
  station: Station;
  playing: boolean;
  musicVol: number;
  ambVol: number;
  tour: boolean;
  favourites: string[];
  visited: string[];
  /** per world, per ambience source id, 0..1 */
  mix: Record<string, Record<string, number>>;
  settings: Settings;
}

const KEY = 'neonworlds:v1';

const reducedByDefault = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const DEFAULTS: State = {
  worldId: 'night-city',
  weatherByWorld: {},
  vibe: 'focus',
  station: 'world',
  playing: false,
  musicVol: 0.7,
  ambVol: 0.5,
  tour: false,
  favourites: [],
  visited: [],
  mix: {},
  settings: { crt: true, reduceMotion: reducedByDefault, clock24: true, fit: 'cover', tourMinutes: 10 },
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw) as Partial<State>;
    return {
      ...structuredClone(DEFAULTS),
      ...saved,
      playing: false,
      settings: { ...DEFAULTS.settings, ...(saved.settings ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

type Listener = (s: State, prev: State) => void;

class Store {
  private state: State = load();
  private listeners = new Set<Listener>();

  get(): State {
    return this.state;
  }

  set(patch: Partial<State> | ((s: State) => Partial<State>)): void {
    const prev = this.state;
    const p = typeof patch === 'function' ? patch(prev) : patch;
    this.state = { ...prev, ...p };
    this.persist();
    for (const l of this.listeners) l(this.state, prev);
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private persist(): void {
    try {
      const { playing: _p, ...rest } = this.state;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      /* storage unavailable: settings live for this visit only */
    }
  }
}

export const store = new Store();

// ---------- tasks and timer (separate key, small) ----------

export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export function loadTasks(): Task[] {
  try {
    return JSON.parse(localStorage.getItem('neonworlds:tasks') ?? '[]') as Task[];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem('neonworlds:tasks', JSON.stringify(tasks));
  } catch {
    /* ignore */
  }
}
