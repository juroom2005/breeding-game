import { RACES, Rng, type BloodlineId, type Individual, type MorphId, type RaceId, type World } from '@/engine';
import { SHOWN_STATS, totalScore } from './stats';

export const MARKET = {
  stockSize: 5,
  refreshesPerDay: 2,
  raceWeights: { human: 70, elf: 20, mermaid: 10 } as Record<RaceId, number>,
  scoreRange: [25, 60] as [number, number],
  scoreTarget: { mean: 42, sd: 8 },
  rareChance: 0.01,
  rareWeights: { morph: 60, magic: 25, fire: 7.5, ice: 7.5 },
};

export interface MarketState {
  day: number;
  refreshesUsed: number;
  /** 매물 칸. 사 간 칸은 null로 남겨서 다른 매물 위치가 바뀌지 않게 한다 */
  offers: (string | null)[];
}

const MORPH_POOL: MorphId[] = ['pigment', 'oddEye', 'angel', 'devil'];

export function raceAverage(race: RaceId): number {
  const stats = RACES[race].stats as Record<string, [number, number]>;
  return SHOWN_STATS.reduce((s, k) => s + stats[k][0] * 12, 0) / SHOWN_STATS.length;
}

function makeOffer(world: World, rng: Rng): Individual {
  const race = rng.weighted(MARKET.raceWeights) as RaceId;
  const sex = rng.chance(0.5) ? 'F' : 'M';
  let founder: BloodlineId | undefined;
  let morph: MorphId | undefined;
  if (rng.chance(MARKET.rareChance)) {
    const kind = rng.weighted(MARKET.rareWeights);
    if (kind === 'morph') morph = rng.pick(MORPH_POOL);
    else founder = kind as BloodlineId;
  }
  const [lo, hi] = MARKET.scoreRange;
  for (let tries = 0; ; tries++) {
    const target = Math.min(hi, Math.max(lo, rng.normal(MARKET.scoreTarget.mean, MARKET.scoreTarget.sd)));
    const ind = world.createMarketOffer(race, sex, {
      statShift: target - raceAverage(race),
      naturalFounders: false,
      forceFounder: founder ? [founder] : [],
      morph,
    });
    const score = totalScore(ind);
    // 희귀 매물이 아닌데 이형이 저절로 나오면 희귀 확률이 어긋나므로 다시 뽑는다
    const unwantedMorph = !morph && ind.pheno.morphs.length > 0;
    if ((score >= lo && score <= hi && !unwantedMorph) || tries > 30) return ind;
    world.discardOffers([ind.id]);
  }
}

export function restock(world: World, market: MarketState | undefined, seed: number): MarketState {
  world.discardOffers();
  const rng = new Rng(seed);
  const offers = Array.from({ length: MARKET.stockSize }, () => makeOffer(world, rng).id);
  return { day: world.day, refreshesUsed: market?.day === world.day ? market.refreshesUsed : 0, offers };
}

export function marketSeed(worldSeed: number, day: number, refresh: number): number {
  return (worldSeed * 31 + day * 977 + refresh * 7919) % 2147483647;
}

export function offerList(world: World, market: MarketState): (Individual | null)[] {
  return market.offers.map((id) => (id ? (world.get(id)?.status === 'market' ? world.get(id)! : null) : null));
}
