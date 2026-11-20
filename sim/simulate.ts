// 밸런스 확인용 시뮬레이션: npx tsx sim/simulate.ts
import { World, RACE_IDS, type Individual, type RaceId } from '../src/engine';

const N = 4000;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function grownWorld(seed: number) {
  const w = new World(seed);
  return w;
}

function breedMany(w: World, m: Individual, f: Individual, n: number) {
  const kids: Individual[] = [];
  for (let i = 0; i < n; i++) kids.push(w.breedInstant(m.id, f.id));
  return kids;
}

function report(title: string, kids: Individual[]) {
  const mana = kids.map((k) => k.pheno.stats.mana).sort((a, b) => a - b);
  const expressed = kids.filter((k) => k.pheno.bloodlines.magic.expressed).length / kids.length;
  const carrier = kids.filter((k) => k.pheno.bloodlines.magic.carrier).length / kids.length;
  const q = (p: number) => mana[Math.floor(p * (mana.length - 1))].toFixed(1);
  console.log(
    `${title}\n  마법 발현 ${pct(expressed)} · 캐리어 ${pct(carrier)} · 마력 중앙값 ${q(0.5)} (10%: ${q(0.1)}, 90%: ${q(0.9)}, 최대 ${q(1)})`,
  );
}

// 1. 일반 × 일반
{
  const w = grownWorld(1);
  const kids: Individual[] = [];
  for (let i = 0; i < N / 20; i++) {
    const r1 = RACE_IDS[i % 3];
    const r2 = RACE_IDS[(i + 1) % 3];
    const m = w.buyFromMarket(r1, 'F');
    const f = w.buyFromMarket(r2, 'M');
    if (m.pheno.bloodlines.magic.expressed || f.pheno.bloodlines.magic.expressed) continue;
    kids.push(...breedMany(w, m, f, 20));
  }
  const under3 = kids.filter((k) => k.pheno.stats.mana < 3).length / kids.length;
  const founders = kids.filter((k) => k.foundedBloodlines.includes('magic')).length / kids.length;
  report('[일반 × 일반]', kids);
  console.log(`  마력 3% 미만 ${pct(under3)} · 농장 각성 초대 ${pct(founders)}`);

  const market = [...w.individuals.values()].filter((x) => x.source === 'market');
  const mf = market.filter((x) => x.foundedBloodlines.includes('magic')).length / market.length;
  console.log(`  (마켓 개체 중 마법 초대 비율 ${pct(mf)})`);
}

// 2. 초대 × 일반, 3. 초대 × 초대
{
  const w = grownWorld(2);
  const fxn: Individual[] = [];
  const fxf: Individual[] = [];
  for (let i = 0; i < 100; i++) {
    const fm = w.buyFromMarket('human', 'F', ['magic']);
    const nm = w.buyFromMarket('elf', 'M');
    fxn.push(...breedMany(w, fm, nm, N / 100));
    const ff = w.buyFromMarket('elf', 'M', ['magic']);
    fxf.push(...breedMany(w, fm, ff, N / 100));
  }
  const founders = [...w.individuals.values()].filter((x) => x.source === 'market' && x.foundedBloodlines.includes('magic'));
  const fm = founders.map((x) => x.pheno.stats.mana);
  console.log(`\n[초대] 마력 평균 ${(fm.reduce((a, b) => a + b, 0) / fm.length).toFixed(1)} · 최소 ${Math.min(...fm).toFixed(1)} · 최대 ${Math.max(...fm).toFixed(1)}`);
  report('[초대 × 일반]', fxn);
  report('[초대 × 다른 가문 초대]', fxf);

  // 4. 초대×일반에서 나온 발현 개체끼리 (1단계 × 1단계)
  const awakened = fxn.filter((k) => k.pheno.bloodlines.magic.expressed);
  const moms = awakened.filter((k) => k.sex === 'F');
  const dads = awakened.filter((k) => k.sex === 'M');
  w.day += 10;
  const lv1: Individual[] = [];
  for (let i = 0; i < Math.min(moms.length, dads.length); i++) lv1.push(...breedMany(w, moms[i], dads[i], 30));
  report('[1단계 × 1단계 (초대×일반의 발현 자식끼리, 서로 다른 가문)]', lv1);
}

// 5. 선택 교배 10세대: 초대 2마리 + 일반으로 시작, 매 세대 마력 상위만 교배
{
  const w = grownWorld(3);
  let pop: Individual[] = [w.buyFromMarket('human', 'F', ['magic']), w.buyFromMarket('elf', 'M', ['magic'])];
  for (let i = 0; i < 6; i++) pop.push(w.buyFromMarket(RACE_IDS[i % 3], i % 2 ? 'M' : 'F'));
  console.log('\n[선택 교배] 매 세대 마력 상위 암수 6쌍씩 교배, 쌍당 자식 8');
  for (let gen = 1; gen <= 30; gen++) {
    w.day += 10;
    const top = (sex: 'F' | 'M') => pop.filter((x) => x.sex === sex).sort((a, b) => b.pheno.stats.mana - a.pheno.stats.mana).slice(0, 6);
    const ms = top('F');
    const fs = top('M');
    const next: Individual[] = [];
    for (let i = 0; i < Math.min(ms.length, fs.length); i++) next.push(...breedMany(w, ms[i], fs[(i + gen) % fs.length], 8));
    pop = next;
    const mana = pop.map((x) => x.pheno.stats.mana);
    const avg = mana.reduce((a, b) => a + b, 0) / mana.length;
    const exp = pop.filter((x) => x.pheno.bloodlines.magic.expressed).length / pop.length;
    const tiers = [1, 2, 3].map((t) => pop.filter((x) => x.pheno.bloodlines.magic.tier === t).length);
    const coi = pop.reduce((a, b) => a + b.coi, 0) / pop.length;
    const vit = pop.reduce((a, b) => a + b.pheno.stats.vitality, 0) / pop.length;
    if (gen % 3 !== 0 && gen !== 1) continue;
    console.log(
      `  ${gen + 1}세대: 마력 평균 ${avg.toFixed(1)} · 발현 ${pct(exp)} · 단계별 ${tiers.join('/')} · 근친 계수 평균 ${coi.toFixed(3)} · 활력 평균 ${vit.toFixed(1)}`,
    );
  }
}

// 6. 색 유전 표시: 2세대에서 숨은 색, 3세대에서 조부모 색
{
  const w = grownWorld(4);
  let hidden2 = 0, total2 = 0, grand3 = 0, great4 = 0, total3 = 0, total4 = 0;
  for (let i = 0; i < 200; i++) {
    const r: RaceId = RACE_IDS[i % 3];
    const g1 = [w.buyFromMarket(r, 'F'), w.buyFromMarket(r, 'M'), w.buyFromMarket(r, 'F'), w.buyFromMarket(r, 'M')];
    w.day += 10;
    const a = breedMany(w, g1[0], g1[1], 4);
    const b = breedMany(w, g1[2], g1[3], 4);
    for (const k of [...a, ...b]) {
      total2++;
      if (k.notes.some((n) => n.kind === 'hidden' && (n.locus === 'eyeColor' || n.locus === 'hairColor'))) hidden2++;
    }
    w.day += 10;
    const m2 = a.find((x) => x.sex === 'F') ?? a[0];
    const f2 = b.find((x) => x.sex === 'M') ?? b[0];
    if (m2.sex !== 'F' || f2.sex !== 'M') continue;
    const g3 = breedMany(w, m2, f2, 6);
    for (const k of g3) {
      total3++;
      if (k.notes.some((n) => n.kind === 'grandparent' && (n.locus === 'eyeColor' || n.locus === 'hairColor'))) grand3++;
    }
    w.day += 10;
    const m3 = g3.find((x) => x.sex === 'F');
    const f3 = g3.find((x) => x.sex === 'M');
    if (!m3 || !f3) continue;
    for (const k of breedMany(w, m3, f3, 6)) {
      total4++;
      if (k.notes.some((n) => n.kind === 'great' && (n.locus === 'eyeColor' || n.locus === 'hairColor'))) great4++;
    }
  }
  console.log(`\n[색 유전 표시] (눈색/머리색)`);
  console.log(`  2세대: 부모에게 없던 색 ${pct(hidden2 / total2)}`);
  console.log(`  3세대: 조부모 색 표시 ${pct(grand3 / total3)}`);
  console.log(`  4세대 (남매 교배 포함): 증조부모 색 표시 ${pct(great4 / total4)}`);
}

// 7. 종족 간 교배: 엘프 × 인어 → 2세대끼리
{
  const w = grownWorld(5);
  const kids: Individual[] = [];
  for (let i = 0; i < 100; i++) kids.push(...breedMany(w, w.buyFromMarket('elf', 'F'), w.buyFromMarket('mermaid', 'M'), 1));
  w.day += 10;
  const f2: Individual[] = [];
  const ms = kids.filter((k) => k.sex === 'F');
  const fs = kids.filter((k) => k.sex === 'M');
  for (let i = 0; i < Math.min(ms.length, fs.length); i++) f2.push(...breedMany(w, ms[i], fs[i], 10));
  const count = (arr: Individual[], slot: string) => {
    const m: Record<string, number> = {};
    for (const k of arr) m[k.pheno.slots[slot]] = (m[k.pheno.slots[slot]] ?? 0) + 1;
    return Object.entries(m).map(([k, v]) => `${k} ${pct(v / arr.length)}`).join(', ');
  };
  console.log('\n[엘프 × 인어]');
  console.log(`  1세대 혼혈 귀: ${count(kids, 'ear')} / 하체: ${count(kids, 'lowerBody')}`);
  console.log(`  혼혈끼리 자식 귀: ${count(f2, 'ear')}`);
  console.log(`  혼혈끼리 자식 하체: ${count(f2, 'lowerBody')}`);
  console.log(`  혼혈끼리 자식 팔: ${count(f2, 'arms')}`);
}
