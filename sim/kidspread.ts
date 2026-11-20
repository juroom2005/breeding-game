import { World } from '../src/engine';
const sum = (x: any) => ['vitality', 'strength', 'agility', 'charm'].reduce((a, k) => a + x.pheno.stats[k] / 5, 0);
const w = new World(4242);
const diffs: number[] = [];
for (let p = 0; p < 200; p++) {
  const m = w.buyFromMarket('human', 'F'), f = w.buyFromMarket('human', 'M');
  for (let k = 0; k < 4; k++) w.advanceDay();
  const mid = (sum(m) + sum(f)) / 2;
  for (let i = 0; i < 10; i++) diffs.push(sum(w.breedInstant(m.id, f.id)) - mid);
}
diffs.sort((a, b) => a - b);
const q = (p: number) => diffs[Math.floor(p * (diffs.length - 1))].toFixed(1);
console.log('자식 합 - 부모 평균 (4스탯, 0~80 기준): 1%', q(.01), '5%', q(.05), '50%', q(.5), '95%', q(.95), '99%', q(.99), '최대', diffs[diffs.length - 1].toFixed(1));
