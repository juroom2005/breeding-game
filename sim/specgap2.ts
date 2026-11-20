import { World } from '../src/engine';
// 두 줄기 교차 선발: 줄기 A의 최고 딸 × 줄기 B의 최고 아들, B의 최고 딸 × A의 최고 아들 (마켓 개체를 다시 섞지 않음)
const d = (v: number) => v / 5;
function run(race: 'human' | 'elf', seed: number, gens = 8) {
  const w = new World(seed);
  let A = { m: w.buyFromMarket(race, 'F'), f: w.buyFromMarket(race, 'M') };
  let B = { m: w.buyFromMarket(race, 'F'), f: w.buyFromMarket(race, 'M') };
  const track = [Math.max(...[A.m, A.f, B.m, B.f].map(x => d(x.pheno.stats.charm)))];
  const by = (a: any, b: any) => b.pheno.stats.charm - a.pheno.stats.charm;
  for (let g = 0; g < gens; g++) {
    for (let k = 0; k < 4; k++) w.advanceDay();
    const ka = Array.from({ length: 6 }, (_, i) => w.breedInstant(A.m.id, A.f.id, i % 2 ? 'F' : 'M'));
    const kb = Array.from({ length: 6 }, (_, i) => w.breedInstant(B.m.id, B.f.id, i % 2 ? 'F' : 'M'));
    const best = (ks: any[], s: string) => ks.filter(k => k.sex === s).sort(by)[0];
    A = { m: best(ka, 'F'), f: best(kb, 'M') };
    B = { m: best(kb, 'F'), f: best(ka, 'M') };
    track.push(Math.max(...[...ka, ...kb].map(k => d(k.pheno.stats.charm))));
  }
  return track;
}
for (const race of ['human', 'elf'] as const) {
  const N = 150, acc = Array(9).fill(0);
  for (let s = 0; s < N; s++) run(race, 2000 + s).forEach((v, i) => acc[i] += v / N);
  console.log(race, acc.map(v => v.toFixed(1)).join('  '));
}
