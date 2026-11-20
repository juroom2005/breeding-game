// 남매 교배를 대대로 반복했을 때 근친 효과 확인
import { World, CONFIG, inbreedingStatPenalty, RACE_IDS, type Individual } from '../src/engine';

function run(withEffects: boolean) {
  const saved = { ...CONFIG.inbreeding };
  if (!withEffects) {
    CONFIG.inbreeding.badTraitExpress = [[0, 0], [1, 0]];
    CONFIG.inbreeding.newBadAllele = [[0, 0], [1, 0]];
  }
  const w = new World(11);
  const rows: { coi: number; bad: number; vit: number }[][] = [];
  for (let line = 0; line < 300; line++) {
    const r = RACE_IDS[line % 3];
    let m = w.buyFromMarket(r, 'F');
    let f = w.buyFromMarket(r, 'M');
    for (let gen = 0; gen < 6; gen++) {
      w.day += 10;
      const kids: Individual[] = [];
      for (let k = 0; k < 8; k++) kids.push(w.breedInstant(m.id, f.id));
      (rows[gen] ??= []).push(...kids.map((k) => ({
        coi: k.coi,
        bad: k.pheno.traits.some((t) => !t.good && t.tier !== '보통') ? 1 : 0,
        vit: k.pheno.stats.vitality,
      })));
      const nm = kids.find((k) => k.sex === 'F');
      const nf = kids.find((k) => k.sex === 'M');
      if (!nm || !nf) break;
      m = nm; f = nf;
    }
  }
  Object.assign(CONFIG.inbreeding, saved);
  return rows.map((g) => ({
    coi: g.reduce((a, b) => a + b.coi, 0) / g.length,
    bad: g.reduce((a, b) => a + b.bad, 0) / g.length,
  }));
}

const off = run(false);
const on = run(true);
console.log('남매 교배 반복 | 근친 계수 | 능력치 페널티 | 희귀/전설 나쁜 트레잇 (추가 효과 없음 → 있음)');
on.forEach((r, i) => {
  console.log(`${i + 1}대째 | ${r.coi.toFixed(3)} | -${(inbreedingStatPenalty(r.coi) * 100).toFixed(1)}% | ${(off[i].bad * 100).toFixed(1)}% → ${(r.bad * 100).toFixed(1)}%`);
});
