import { World } from '../src/engine';
import { restock, marketSeed } from '../src/game/market';
import { totalScore } from '../src/game/stats';
import { buyPrice, sellPrice, slotUpgradeCost } from '../src/game/economy';

const w = new World(2026);
const scores: number[] = [];
const races: Record<string, number> = {};
const prices: Record<string, number[]> = {};
let rare = 0, n = 0;
for (let d = 0; d < 600; d++) {
  const m = restock(w, undefined, marketSeed(w.seed, d, 0));
  for (const id of m.offers) {
    const x = w.get(id!)!;
    n++;
    scores.push(totalScore(x));
    const race = Object.keys(x.pedigreeRace)[0];
    races[race] = (races[race] ?? 0) + 1;
    const isRare = x.pheno.morphs.length > 0 || x.foundedBloodlines.length > 0;
    if (isRare) rare++;
    const key = race + (isRare ? '(희귀)' : '');
    (prices[key] ??= []).push(buyPrice(x, w));
  }
}
scores.sort((a, b) => a - b);
const q = (a: number[], p: number) => a[Math.floor(p * (a.length - 1))];
console.log('매물', n, '종합 점수 최소/5%/50%/95%/최대', scores[0], q(scores, .05), q(scores, .5), q(scores, .95), scores.at(-1));
console.log('종족', Object.fromEntries(Object.entries(races).map(([k, v]) => [k, (v / n * 100).toFixed(1) + '%'])));
console.log('희귀 비율', (rare / n * 100).toFixed(2) + '%');
for (const [k, v] of Object.entries(prices)) { v.sort((a, b) => a - b); console.log('가격', k, '최소', v[0], '중간', q(v, .5), '최대', v.at(-1), `(${v.length}개)`); }
const h = w.createMarketOffer('human', 'F', { statShift: 0 });
console.log('판매가 예시: 매물가', buyPrice(h, w), '→ 되팔면', sellPrice(h, w));
console.log('칸 늘리기 비용', [0, 1, 2, 3, 4, 5].map(slotUpgradeCost).join(', '));
