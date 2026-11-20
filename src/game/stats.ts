import type { Individual, StatId } from '@/engine';

export const STAT_MAX = 100;
export const SHOWN_STATS: StatId[] = ['vitality', 'strength', 'agility', 'charm'];
export const shownStat = (v: number) => Math.max(1, Math.round(v));

/** 능력치 평균 (1~100). 지능이 들어오면 SHOWN_STATS에 추가만 하면 된다 */
export function totalScore(ind: Individual): number {
  const sum = SHOWN_STATS.reduce((s, k) => s + ind.pheno.stats[k], 0);
  return Math.max(1, Math.round(sum / SHOWN_STATS.length));
}

