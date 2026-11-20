import { World } from '../src/engine';
// 매력만 보고 고르는 단순한 플레이: 매 세대 자식 6마리 중 가장 좋은 딸 + (가장 좋은 아들 vs 마켓 수컷 3마리 중 최고) 를 다음 부모로
const d = (v: number) => v / 5; // 표시 점수
function run(race: 'human' | 'elf', seed: number, gens = 8) {
  const w = new World(seed);
  let mom = w.buyFromMarket(race, 'F'), dad = w.buyFromMarket(race, 'M');
  const track = [Math.max(d(mom.pheno.stats.charm), d(dad.pheno.stats.charm))];
  for (let g = 0; g < gens; g++) {
    for (let k = 0; k < 4; k++) w.advanceDay();
    const kids = Array.from({ length: 6 }, (_, i) => w.breedInstant(mom.id, dad.id, i % 2 ? 'F' : 'M'));
    const daughters = kids.filter(k => k.sex === 'F'), sons = kids.filter(k => k.sex === 'M');
    const by = (a: any, b: any) => b.pheno.stats.charm - a.pheno.stats.charm;
    daughters.sort(by);
    const cands = [...sons.sort(by).slice(0, 1), ...[0, 1, 2].map(() => w.buyFromMarket(race, 'M'))].sort(by);
    // 근친 피하기: 아들은 딸과 남매라 마켓 수컷만 사용
    mom = daughters[0] ?? mom; dad = cands.find(c => c.motherId !== mom.motherId) ?? cands[0];
    track.push(Math.max(...kids.map(k => d(k.pheno.stats.charm))));
  }
  return track;
}
for (const race of ['human', 'elf'] as const) {
  const N = 150, acc = Array(9).fill(0);
  for (let s = 0; s < N; s++) run(race, 1000 + s).forEach((v, i) => acc[i] += v / N);
  console.log(race, acc.map(v => v.toFixed(1)).join('  '));
}
