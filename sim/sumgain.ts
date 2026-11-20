import { World } from '../src/engine';
// 종합(4스탯 합, 표시 기준) 으로 고르는 두 줄기 교차 선발. 줄기당 매 세대 자식 KIDS마리
const S = (x: any) => ['vitality', 'strength', 'agility', 'charm'].reduce((a, k) => a + x.pheno.stats[k] / 5, 0);
function run(seed: number, gens: number, KIDS: number) {
  const w = new World(seed);
  let A = { m: w.buyFromMarket('human', 'F'), f: w.buyFromMarket('human', 'M') };
  let B = { m: w.buyFromMarket('human', 'F'), f: w.buyFromMarket('human', 'M') };
  const par = [(S(A.m) + S(A.f) + S(B.m) + S(B.f)) / 4];
  const by = (a: any, b: any) => S(b) - S(a);
  for (let g = 0; g < gens; g++) {
    for (let k = 0; k < 4; k++) w.advanceDay();
    const ka = Array.from({ length: KIDS }, (_, i) => w.breedInstant(A.m.id, A.f.id, i % 2 ? 'F' : 'M'));
    const kb = Array.from({ length: KIDS }, (_, i) => w.breedInstant(B.m.id, B.f.id, i % 2 ? 'F' : 'M'));
    const best = (ks: any[], s: string) => ks.filter(k => k.sex === s).sort(by)[0];
    A = { m: best(ka, 'F'), f: best(kb, 'M') }; B = { m: best(kb, 'F'), f: best(ka, 'M') };
    par.push((S(A.m) + S(A.f) + S(B.m) + S(B.f)) / 4);
  }
  return par;
}
for (const KIDS of [6, 20]) {
  const N = 120, G = 12, acc = Array(G + 1).fill(0);
  for (let s = 0; s < N; s++) run(3000 + s, G, KIDS).forEach((v, i) => acc[i] += v / N);
  console.log(`줄기당 자식 ${KIDS}마리/세대 | 부모 평균 종합(4스탯):`, acc.map(v => v.toFixed(1)).join(' '));
  console.log(`   5스탯 환산(x1.25):`, acc.map(v => (v * 1.25).toFixed(0)).join(' '));
}
