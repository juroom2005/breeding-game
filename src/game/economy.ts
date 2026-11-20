import { blendByRace, type Individual, type RaceId, type World } from '@/engine';
import { totalScore } from './stats';

// 경제 숫자는 전부 임시값. 세금, 유지비가 들어오면 함께 다시 맞춘다
export const ECONOMY = {
  raceMultiplier: { human: 1, elf: 2.5, mermaid: 4 } as Record<RaceId, number>,
  /** 인간 기준 종합 점수 → 값. 마켓 범위(25~60)에서 150~250g */
  scorePrice: (score: number) =>
    score <= 60 ? Math.max(80, 150 + (score - 25) * (100 / 35)) : 250 + (score - 60) * 8,
  traitPrice: {
    good: { 보통: 15, 희귀: 60, 전설: 250 },
    bad: { 보통: -15, 희귀: -40, 전설: -100 },
  },
  // 이형, 특수 혈통은 종족 배율과 상관없이 크게 더한다. 인간 매물이 엘프 혈통 개량용 "싼 지름길"이 되지 않게
  morphPrice: 500,
  oddEyePrice: 300,
  hybridMorphPrice: 900,
  bloodlinePrice: { magic: 700, fire: 1000, ice: 1000 },
  bloodlineTierMultiplier: [0, 1, 1.8, 3],
  babyPrice: 60,
  sellRatio: 0.5,
  slotUpgrade: { base: 200, growth: 1.5 },
};

const round5 = (v: number) => Math.max(5, Math.round(v / 5) * 5);

export function valueOf(ind: Individual, world: World): number {
  const raceMult = blendByRace(ind.pedigreeRace, (r) => ECONOMY.raceMultiplier[r]);
  if (!world.isAdult(ind)) return round5(ECONOMY.babyPrice * raceMult);

  const p = ind.pheno;
  let base = ECONOMY.scorePrice(totalScore(ind));
  for (const t of p.traits) base += ECONOMY.traitPrice[t.good ? 'good' : 'bad'][t.tier];

  let rare = 0;
  for (const m of p.morphs) {
    if (m === '오드아이') rare += ECONOMY.oddEyePrice;
    else if (m === '황혼 쵸즌') rare += ECONOMY.hybridMorphPrice;
    else rare += ECONOMY.morphPrice;
  }
  for (const [b, s] of Object.entries(p.bloodlines) as [keyof typeof ECONOMY.bloodlinePrice, (typeof p.bloodlines)['magic']][]) {
    if (s.expressed) rare += ECONOMY.bloodlinePrice[b] * ECONOMY.bloodlineTierMultiplier[s.tier];
  }
  return round5(Math.max(40, base) * raceMult + rare);
}

export const buyPrice = (ind: Individual, world: World) => valueOf(ind, world);
export const sellPrice = (ind: Individual, world: World) => round5(valueOf(ind, world) * ECONOMY.sellRatio);

/** n번째 농장 칸 늘리기 비용 (0부터). 늘릴수록 계단식으로 비싸진다 */
export function slotUpgradeCost(upgradesDone: number): number {
  return Math.round((ECONOMY.slotUpgrade.base * ECONOMY.slotUpgrade.growth ** upgradesDone) / 10) * 10;
}
