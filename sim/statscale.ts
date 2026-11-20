import { World } from '../src/engine';
const w = new World(777);
const races = ['human', 'elf', 'mermaid'] as const;
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
for (const r of races) {
  const sums5: number[] = [], sums4: number[] = [], mana: number[] = [], one: number[] = [];
  for (let i = 0; i < 3000; i++) {
    const ind = w.buyFromMarket(r, i % 2 ? 'F' : 'M');
    const s = ind.pheno.stats;
    const d = (v: number) => Math.round(v / 5);
    const four = d(s.vitality) + d(s.strength) + d(s.agility) + d(s.charm);
    sums4.push(four); sums5.push(four + d(s.mana)); mana.push(s.mana); one.push(s.vitality);
    w.sell(ind.id);
  }
  console.log(r, '| 4스탯 합(÷5) 5/50/95%:', pct(sums4, .05), pct(sums4, .5), pct(sums4, .95),
    '| 마력 포함:', pct(sums5, .05), pct(sums5, .5), pct(sums5, .95),
    '| 마력 원값 50/95/99%:', pct(mana, .5), pct(mana, .95), pct(mana, .99),
    '| 활력 원값 5/50/95%:', pct(one, .05), pct(one, .5), pct(one, .95));
}
