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
  /** 싼 개체는 값의 40%, 비싼 개체(1000g 이상)는 90%에 팔린다 */
  sellRatio: { min: 0.4, max: 0.9, from: 200, to: 1000 },
  slotUpgrade: { base: 200, growth: 1.5 },
  upkeep: {
    baby: 1,
    /** 종합 25 → 3g, 60 → 5g, 100 → 6g */
    score: (score: number) => (score <= 60 ? 3 + Math.max(0, score - 25) * (2 / 35) : 5 + (score - 60) / 40),
    trait: { 보통: 1, 희귀: 2, 전설: 3 },
    /** 점수와 트레잇으로 붙는 유지비 상한. 이형, 특수 혈통은 이 위에 더한다 */
    normalCap: 10,
    morph: 5,
    bloodlineTier: [0, 3, 6, 10],
  },
  tax: { monthDays: 30, first: 800, growth: 2 },
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
export function sellRatio(value: number): number {
  const { min, max, from, to } = ECONOMY.sellRatio;
  return min + (max - min) * Math.min(1, Math.max(0, (value - from) / (to - from)));
}

export function sellPrice(ind: Individual, world: World): number {
  const v = valueOf(ind, world);
  return round5(v * sellRatio(v));
}

export function upkeepOf(ind: Individual, world: World): number {
  const u = ECONOMY.upkeep;
  if (!world.isAdult(ind)) return u.baby;
  const p = ind.pheno;
  let normal = u.score(totalScore(ind));
  for (const t of p.traits) if (t.good) normal += u.trait[t.tier];
  let total = Math.min(u.normalCap, normal);
  if (p.morphs.length > 0) total += u.morph;
  for (const s of Object.values(p.bloodlines)) if (s.expressed) total += u.bloodlineTier[s.tier];
  return Math.round(total);
}

export function dailyUpkeep(world: World): number {
  return world.active().reduce((sum, x) => sum + upkeepOf(x, world), 0);
}

/** n번째 달(1부터) 말에 내는 세금 */
export function taxFor(month: number): number {
  return ECONOMY.tax.first * ECONOMY.tax.growth ** (month - 1);
}

export function nextTax(day: number): { month: number; dueDay: number; daysLeft: number; amount: number } {
  const month = Math.floor(day / ECONOMY.tax.monthDays) + 1;
  const dueDay = month * ECONOMY.tax.monthDays;
  return { month, dueDay, daysLeft: dueDay - day, amount: taxFor(month) };
}

/** n번째 농장 칸 늘리기 비용 (0부터). 늘릴수록 계단식으로 비싸진다 */
export function slotUpgradeCost(upgradesDone: number): number {
  return Math.round((ECONOMY.slotUpgrade.base * ECONOMY.slotUpgrade.growth ** upgradesDone) / 10) * 10;
}
