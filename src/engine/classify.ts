// 종족 분류 이름: 계보상 혈통 %로 정한다.
//  - 기록된 조상이 전부 한 종족: 순혈 엘프 (90%처럼 대부분이어도 다른 종족이 섞이면 순혈이 아니다)
//  - 두 종족 50:50: 하프 + (인간이 아닌 쪽). 둘 다 인간이 아니면 엄마 쪽 종족
//  - 인간 75% + 다른 종족 25%: 쿼터 + (그 종족)
//  - 그 밖: 가장 많이 차지하는 종족. 동률이면 엄마 쪽 종족

import type { RaceId } from './types';
import { RACES } from './data/races';

const EPS = 1e-9;

export function raceLabel(pedigree: Partial<Record<RaceId, number>>, motherMain?: RaceId): string {
  const entries = (Object.entries(pedigree) as [RaceId, number][])
    .filter(([, v]) => v > EPS)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 1) return `순혈 ${RACES[entries[0][0]].name}`;

  if (entries.length === 2) {
    const [[a, va], [b, vb]] = entries;
    if (Math.abs(va - 0.5) < EPS && Math.abs(vb - 0.5) < EPS) {
      let target: RaceId;
      if (a === 'human') target = b;
      else if (b === 'human') target = a;
      else target = motherMain && (motherMain === a || motherMain === b) ? motherMain : a;
      return `하프${RACES[target].name}`;
    }
    if (a === 'human' && Math.abs(va - 0.75) < EPS && Math.abs(vb - 0.25) < EPS) {
      return `쿼터${RACES[b].name}`;
    }
  }

  const max = entries[0][1];
  const top = entries.filter(([, v]) => Math.abs(v - max) < EPS).map(([r]) => r);
  const pick = top.length > 1 && motherMain && top.includes(motherMain) ? motherMain : top[0];
  return RACES[pick].name;
}

/** 계보상 혈통에서 가장 많은 종족 (동률이면 엄마 쪽) */
export function mainRaceOf(pedigree: Partial<Record<RaceId, number>>, motherMain?: RaceId): RaceId {
  const entries = (Object.entries(pedigree) as [RaceId, number][]).sort((a, b) => b[1] - a[1]);
  const max = entries[0][1];
  const top = entries.filter(([, v]) => Math.abs(v - max) < EPS).map(([r]) => r);
  return top.length > 1 && motherMain && top.includes(motherMain) ? motherMain : top[0];
}

/** 종족 수치를 계보상 혈통 비율로 섞기 (혼혈의 임신 기간, 수정률, 쌍둥이 확률) */
export function blendByRace(pedigree: Partial<Record<RaceId, number>>, pick: (r: RaceId) => number): number {
  let s = 0;
  for (const [r, v] of Object.entries(pedigree) as [RaceId, number][]) s += pick(r) * v;
  return s;
}
