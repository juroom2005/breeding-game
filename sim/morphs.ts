// 이형 확률 확인: npx tsx sim/morphs.ts
import { World, RACE_IDS, type Individual } from '../src/engine';
const pct = (x: number) => `${(x * 100).toFixed(2)}%`;
type Key = 'pigment' | 'oddEye' | 'angel' | 'devil';
const has = (k: Individual, m: Key) =>
  m === 'pigment' ? k.pheno.albino || k.pheno.leucistic
  : m === 'oddEye' ? k.pheno.oddEye
  : m === 'angel' ? k.pheno.morphs.some((x) => x === '엔젤 쵸즌' || x === '황혼 쵸즌')
  : k.pheno.morphs.some((x) => x === '데빌 쵸즌' || x === '황혼 쵸즌');

let w = new World(31);
let market: Individual[] = [];
const fresh = (seed: number) => {
  w = new World(seed);
  market = [];
  for (let i = 0; i < 30000; i++) market.push(w.buyFromMarket(RACE_IDS[i % 3], i % 2 ? 'F' : 'M'));
  w.day += 10;
};
const rate = (arr: Individual[], m: Key) => arr.filter((k) => has(k, m)).length / arr.length;

for (const m of ['pigment', 'oddEye', 'angel'] as Key[]) {
  fresh(m.length * 7);
  const morphF = market.filter((x) => x.sex === 'F' && has(x, m));
  const morphM = market.filter((x) => x.sex === 'M' && has(x, m));
  const normF = market.filter((x) => x.sex === 'F' && !has(x, m)).slice(0, 2000);
  const normM = market.filter((x) => x.sex === 'M' && !has(x, m)).slice(0, 2000);
  const mn: Individual[] = [];
  const mm: Individual[] = [];
  for (let i = 0; i < 3000; i++) {
    mn.push(w.breedInstant(morphF[i % morphF.length].id, normM[i % normM.length].id));
    mm.push(w.breedInstant(morphF[i % morphF.length].id, morphM[(i * 7) % morphM.length].id));
  }
  // 여러 세대: 매 세대 이형 자식끼리만 교배
  let pool = mm.filter((k) => has(k, m));
  const gens: string[] = [];
  for (let g = 0; g < 10; g++) {
    w.day += 10;
    const fs = pool.filter((x) => x.sex === 'F');
    const ms = pool.filter((x) => x.sex === 'M');
    const kids: Individual[] = [];
    for (let i = 0; i < 1500; i++) kids.push(w.breedInstant(fs[i % fs.length].id, ms[(i * 13 + g) % ms.length].id));
    gens.push(pct(rate(kids, m)));
    const next = kids.filter((k) => has(k, m));
    if (next.filter((x) => x.sex === 'F').length > 5 && next.filter((x) => x.sex === 'M').length > 5) pool = next;
  }
  console.log(`[${m}] 마켓 ${pct(rate(market, m))} · 이형×일반 ${pct(rate(mn, m))} · 이형×이형 ${pct(rate(mm, m))}`);
  console.log(`   이형끼리 세대 반복: ${gens.filter((_, i) => i % 2 === 1).join(' → ')}`);
}
const albino = market.filter((x) => x.pheno.albino).length, leu = market.filter((x) => x.pheno.leucistic).length;
const hybrid = market.filter((x) => x.pheno.morphs.includes('황혼 쵸즌')).length;
const multi = market.filter((x) => x.pheno.morphs.length >= 2).length;
console.log(`[마켓 세부] 알비노 ${pct(albino / market.length)} · 루시스틱 ${pct(leu / market.length)} · 황혼 쵸즌 ${pct(hybrid / market.length)} · 이형 2개 이상 ${pct(multi / market.length)}`);
