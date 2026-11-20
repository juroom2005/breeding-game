import { World, RACE_IDS, RACES, type Individual } from '../src/engine';
const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

// 마켓 개체의 오드아이/알비노 비율, 종족 특화
{
  const w = new World(21);
  const by: Record<string, Individual[]> = {};
  for (const r of RACE_IDS) for (let i = 0; i < 4000; i++) (by[r] ??= []).push(w.buyFromMarket(r, i % 2 ? 'F' : 'M'));
  const all = Object.values(by).flat();
  console.log(`[마켓] 오드아이 ${pct(all.filter((x) => x.pheno.oddEye).length / all.length)} · 알비노 ${pct(all.filter((x) => x.pheno.albino).length / all.length)}`);
  console.log(`  오드아이 캐리어 ${pct(all.filter((x) => x.pheno.traitCarriers.includes('오드아이')).length / all.length)} · 알비노 캐리어 ${pct(all.filter((x) => x.pheno.traitCarriers.includes('알비노')).length / all.length)}`);
  console.log('[종족 특화] 평균 (상위 10% 경계)');
  for (const r of RACE_IDS) {
    const xs = by[r];
    const row = (['vitality', 'strength', 'agility', 'charm'] as const).map((k) => {
      const v = xs.map((x) => x.pheno.stats[k]).sort((a, b) => a - b);
      const avg = v.reduce((a, b) => a + b, 0) / v.length;
      return `${({ vitality: '활력', strength: '근력', agility: '민첩', charm: '매력' })[k]} ${avg.toFixed(0)} (${v[Math.floor(v.length * 0.9)]})`;
    });
    console.log(`  ${RACES[r].name}: ${row.join(' · ')}`);
  }
}

// 수정 확률: 아빠 활력별
{
  const w = new World(22);
  const m = w.buyFromMarket('human', 'F');
  console.log('[수정 확률] 엄마 인간 기준, 아빠 종족 / 활력');
  for (const r of RACE_IDS) {
    const f = w.buyFromMarket(r, 'M');
    const parts = [20, 50, 80].map((v) => { f.pheno.stats.vitality = v; return `활력 ${v}: ${Math.round(w.conceptionChance(m, f) * 100)}%`; });
    console.log(`  아빠 ${RACES[r].name} → ${parts.join(' · ')}`);
  }
  const e1 = w.buyFromMarket('elf', 'F'), e2 = w.buyFromMarket('elf', 'M');
  e2.pheno.stats.vitality = 50;
  console.log(`  엘프×엘프 활력 50: ${Math.round(w.conceptionChance(e1, e2) * 100)}% · 임신 기간 ${w.gestationDays(e1)}일`);
}

// 연관 유전: 엘프×인어 혼혈끼리 자식의 외모 조합
{
  const w = new World(23);
  const kids: Individual[] = [];
  for (let i = 0; i < 300; i++) {
    const m = w.buyFromMarket('mermaid', 'F'), f = w.buyFromMarket('elf', 'M');
    w.day += 10;
    const a = w.breedInstant(m.id, f.id, 'F'), b = w.breedInstant(m.id, f.id, 'M');
    w.day += 10;
    for (let j = 0; j < 6; j++) kids.push(w.breedInstant(a.id, b.id));
  }
  const look = (k: Individual) => {
    const s = k.pheno.slots;
    const mer = [s.ear === '지느러미 귀', s.eyeShape === '인어 눈', s.arms === '팔 지느러미', s.skinPattern === '비늘', s.lowerBody === '꼬리'].filter(Boolean).length;
    return mer === 0 ? '인어 특징 없음' : mer === 5 ? '인어 특징 전부' : '섞임';
  };
  const c: Record<string, number> = {};
  for (const k of kids) c[look(k)] = (c[look(k)] ?? 0) + 1;
  console.log(`[연관 유전] 엘프×인어 혼혈끼리 자식: ${Object.entries(c).map(([k, v]) => `${k} ${pct(v / kids.length)}`).join(' · ')}`);
  console.log(`  종족 분류: ${[...new Set(kids.map((k) => k.raceLabel))].join(', ')}`);
}

// 저장 용량
{
  const w = new World(24);
  const a = w.buyFromMarket('elf', 'F'), b = w.buyFromMarket('human', 'M');
  w.day = 5;
  for (let i = 0; i < 98; i++) w.breedInstant(a.id, b.id);
  const active = JSON.stringify(w.serialize()).length / 100;
  for (const x of w.active().slice(0, 50)) w.sell(x.id);
  const mixed = JSON.stringify(w.serialize()).length / 100;
  console.log(`[저장 용량] 개체당 평균 ${(active / 1024).toFixed(1)}KB (전부 농장) → 절반 판매 후 ${(mixed / 1024).toFixed(1)}KB`);
}
