import type { Weather } from '../scene/weather';
import type { Vibe } from '../audio/types';
import type { Station } from '../audio/styles';

const WEATHERS: Weather[] = ['clear', 'rain', 'acid-rain', 'snow', 'ash', 'data-rain', 'sandstorm', 'dust-storm', 'smog', 'terminator'];
const VIBES: Vibe[] = ['calm', 'focus', 'drive'];

export function readUrl(search = location.search): { world?: string; weather?: Weather; vibe?: Vibe; station?: Station } {
  const p = new URLSearchParams(search);
  const weather = p.get('weather') as Weather | null;
  const vibe = p.get('vibe') as Vibe | null;
  return {
    world: p.get('world') ?? undefined,
    weather: weather && WEATHERS.includes(weather) ? weather : undefined,
    vibe: vibe && VIBES.includes(vibe) ? vibe : undefined,
    station: p.get('radio') === 'lifeforms' ? 'lifeforms' : p.has('radio') ? 'world' : undefined,
  };
}

export function shareUrl(world: string, weather: Weather, vibe: Vibe, station: Station = 'world'): string {
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('world', world);
  u.searchParams.set('weather', weather);
  u.searchParams.set('vibe', vibe);
  if (station !== 'world') u.searchParams.set('radio', station);
  return u.toString();
}

export function writeUrl(world: string, weather: Weather, vibe: Vibe, station: Station = 'world'): void {
  try {
    history.replaceState(null, '', shareUrl(world, weather, vibe, station));
  } catch {
    /* sandboxed frames may refuse */
  }
}
