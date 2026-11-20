// 인어 꼬리 설정 비교
import { World, SLOTS, type Individual } from '../src/engine';

const lower = SLOTS.find((s) => s.id === 'lowerBody')!;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const tail = (arr: Individual[]) => arr.filter((k) => k.pheno.slots.lowerBody === '꼬리').length / arr.length;

function run(label: string, setup: () => void) {
  setup();
  const w = new World(7);
  const f1: Individual[] = [];
  for (let i = 0; i < 300; i++) f1.push(w.breedInstant(w.buyFromMarket('mermaid', 'F').id, w.buyFromMarket(i % 2 ? 'elf' : 'human', 'M').id));
  w.day += 10;
  const fs = f1.filter((k) => k.sex === 'F');
  const ms = f1.filter((k) => k.sex === 'M');
  const f2: Individual[] = [];
  const back: Individual[] = [];
  const out: Individual[] = [];
  const quarter: Individual[] = [];
  for (let i = 0; i < Math.min(fs.length, ms.length); i++) {
    for (let j = 0; j < 6; j++) f2.push(w.breedInstant(fs[i].id, ms[i].id));
    for (let j = 0; j < 6; j++) back.push(w.breedInstant(fs[i].id, w.buyFromMarket('mermaid', 'M').id));
    for (let j = 0; j < 6; j++) out.push(w.breedInstant(fs[i].id, w.buyFromMarket('elf', 'M').id));
  }
  w.day += 10;
  // 25% 인어끼리
  const of = out.filter((k) => k.sex === 'F');
  const om = out.filter((k) => k.sex === 'M');
  for (let i = 0; i < Math.min(of.length, om.length); i++) for (let j = 0; j < 4; j++) quarter.push(w.breedInstant(of[i].id, om[i].id));
  console.log(`${label.padEnd(26)} | 혼혈 1세대(인어50%) ${pct(tail(f1)).padStart(4)} | 혼혈끼리 ${pct(tail(f2)).padStart(4)} | 혼혈×순종인어(75%) ${pct(tail(back)).padStart(4)} | 혼혈×엘프(25%) ${pct(tail(out)).padStart(4)} | 25%끼리 ${pct(tail(quarter)).padStart(4)}`);
}

run('A. 꼬리 우성 (현재)', () => { lower.rank = { 꼬리: 2, 다리: 1 }; delete lower.conditions; });
run('B. 꼬리 열성', () => { lower.rank = { 꼬리: 1, 다리: 2 }; delete lower.conditions; });
run('C. 우성 + 인어 50% 이상', () => { lower.rank = { 꼬리: 2, 다리: 1 }; lower.conditions = { 꼬리: { race: 'mermaid', min: 0.5 } }; lower.fallback = '다리'; });
run('D. 우성 + 인어 40% 이상', () => { lower.rank = { 꼬리: 2, 다리: 1 }; lower.conditions = { 꼬리: { race: 'mermaid', min: 0.4 } }; lower.fallback = '다리'; });
run('E. 열성 + 인어 40% 이상', () => { lower.rank = { 꼬리: 1, 다리: 2 }; lower.conditions = { 꼬리: { race: 'mermaid', min: 0.4 } }; lower.fallback = '다리'; });
