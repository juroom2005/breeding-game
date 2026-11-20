export * from './types';
export { Rng } from './rng';
export { World, type SaveData, type MateResult, type BirthEvent } from './world';
export { raceLabel, mainRaceOf } from './classify';
export { geneticRace, geneticSum, morphScore, morphChance } from './genome';
export { MORPHS, MORPH_IDS, CHOSEN_HYBRID_NAME } from './data/morphs';
export { CONFIG, inbreedingStatPenalty } from './data/config';
export { RACES, RACE_IDS } from './data/races';
export { BLOODLINES, BLOODLINE_IDS, COMBOS } from './data/bloodlines';
export { TRAITS } from './data/traits';
export { SLOTS, STAT_NAMES, EYE_COLOR, HAIR_COLOR } from './data/loci';

import type { Individual, RaceId } from './types';
import { RACES } from './data/races';

/** 혈통 % 표시: "엘프 75% · 인어 25%" */
export function formatRace(r: Partial<Record<RaceId, number>>): string {
  return (Object.entries(r) as [RaceId, number][])
    .filter(([, v]) => v > 0.0001)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${RACES[k].name} ${Math.round(v * 1000) / 10}%`)
    .join(' · ');
}

/** 가문 비율 표시 (해당 혈통 비율만 정규화) */
export function formatHouses(ind: Individual, b: keyof Individual['houses'], nameOf: (id: string) => string): string {
  const h = ind.houses[b];
  if (!h) return '';
  const total = Object.values(h).reduce((s, v) => s + v, 0);
  return Object.entries(h)
    .sort((a, c) => c[1] - a[1])
    .map(([id, v]) => `${nameOf(id)} 가문 ${Math.round((v / total) * 100)}%`)
    .join(' · ');
}
