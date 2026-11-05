import type { WorldDef } from './types';
import { nightCity } from './night-city';
import { la2019 } from './la-2019';
import { neoTokyo } from './neo-tokyo';
import { niihama } from './niihama';
import { chibaCity } from './chiba-city';
import { theGrid } from './the-grid';
import { coruscant } from './coruscant';
import { megaCityOne } from './mega-city-one';
import { vavatch } from './vavatch-orbital';
import { millville } from './millville';
import { arrakeen } from './arrakeen';
import { citadel } from './the-citadel';

/** Display order in the picker and on tour. */
export const WORLDS: WorldDef[] = [nightCity, la2019, neoTokyo, niihama, chibaCity, theGrid, coruscant, megaCityOne, vavatch, millville, arrakeen, citadel];

export function worldById(id: string | null | undefined): WorldDef | undefined {
  return WORLDS.find((w) => w.id === id);
}
