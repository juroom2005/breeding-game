import { RACES, formatRace, type Individual, type RaceId } from '@/engine';

/** 카드용 짧은 혈통 비율: "엘프 62.5 · 인간 37.5". 카드 폭(글자 영역 약 108px)에 두 종족까지 들어가게 % 기호를 뺀다 */
export function raceRatioShort(ind: Individual): string {
  return (Object.entries(ind.pedigreeRace) as [RaceId, number][])
    .filter(([, v]) => v > 0.0001)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${RACES[k].name} ${Math.round(v * 1000) / 10}`)
    .join(' · ');
}

/** 계보상 혈통 비율: "엘프 62.5% · 인간 37.5%" */
export const raceRatio = (ind: Individual): string => formatRace(ind.pedigreeRace);
