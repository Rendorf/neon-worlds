import type { Weather } from '../scene/weather';
import type { Vibe } from '../audio/types';

const WEATHERS: Weather[] = ['clear', 'rain', 'acid-rain', 'snow', 'ash', 'data-rain', 'sandstorm', 'dust-storm', 'smog', 'terminator'];
const VIBES: Vibe[] = ['calm', 'focus', 'drive'];

export function readUrl(search = location.search): { world?: string; weather?: Weather; vibe?: Vibe } {
  const p = new URLSearchParams(search);
  const weather = p.get('weather') as Weather | null;
  const vibe = p.get('vibe') as Vibe | null;
  return {
    world: p.get('world') ?? undefined,
    weather: weather && WEATHERS.includes(weather) ? weather : undefined,
    vibe: vibe && VIBES.includes(vibe) ? vibe : undefined,
  };
}

export function shareUrl(world: string, weather: Weather, vibe: Vibe): string {
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('world', world);
  u.searchParams.set('weather', weather);
  u.searchParams.set('vibe', vibe);
  return u.toString();
}

export function writeUrl(world: string, weather: Weather, vibe: Vibe): void {
  try {
    history.replaceState(null, '', shareUrl(world, weather, vibe));
  } catch {
    /* sandboxed frames may refuse */
  }
}
