/**
 * 농장 시뮬레이션: 슬롯 제한 안에서 종합 점수를 올리는 플레이어를 흉내낸다.
 * 엔진 코드는 건드리지 않고, 시뮬레이션 안에서만 종족 수치와 규칙을 바꿔 끼운다.
 */
import { World, RACES } from '../src/engine';
type Opt = {
  label: string; days: number; farm: number; preg: number;
  gest: number; cooldown: number; attempts: number; fert: number;
  alleleSd?: number;        // 능력치 대립유전자 편차 (원래 1.0~1.3)
  jump?: number;            // 자식 1마리가 "도약 돌연변이"를 가질 확률
  marketEvery?: number;     // 며칠마다 마켓 확인
};
const STATS = ['vitality', 'strength', 'agility', 'charm'] as const;
const score = (x: any) => STATS.reduce((a, k) => a + x.pheno.stats[k] / 5, 0) * 1.25; // 5스탯 환산

function run(o: Opt, seed: number) {
  const H = RACES.human as any;
  const save = { g: H.gestationDays, f: H.fertility, st: JSON.parse(JSON.stringify(H.stats)) };
  H.gestationDays = o.gest; H.fertility = o.fert;
  if (o.alleleSd) for (const k of STATS) H.stats[k] = [H.stats[k][0], o.alleleSd];
  const w = new World(seed);
  const lastBirth = new Map<string, number>();
  let farm: any[] = [w.buyFromMarket('human', 'F'), w.buyFromMarket('human', 'M')];
  let gens = 0; const daily: number[] = []; let births = 0, jumps = 0;
  const pregnant = () => farm.filter(x => x.pregnancy).length;
  const sellWorst = () => {
    while (farm.length + pregnant() * 0 > o.farm) {
      const F = farm.filter(x => x.sex === 'F'), M = farm.filter(x => x.sex === 'M');
      const pool = farm.filter(x => !x.pregnancy && !((x.sex === 'F' && F.length <= 1) || (x.sex === 'M' && M.length <= 1)));
      if (!pool.length) break;
      pool.sort((a, b) => score(a) - score(b));
      w.sell(pool[0].id); farm = farm.filter(x => x !== pool[0]);
    }
  };
  for (let day = 0; day < o.days; day++) {
    // 마켓: 더 좋은 개체가 있으면 들임 (5마리 중 최고)
    if (o.marketEvery && day % o.marketEvery === 0 && day > 0) {
      const offers = Array.from({ length: 5 }, (_, i) => w.buyFromMarket('human', i % 2 ? 'F' : 'M'));
      offers.sort((a, b) => score(b) - score(a));
      const best = offers[0]; offers.slice(1).forEach(x => w.sell(x.id));
      const same = farm.filter(x => x.sex === best.sex && !x.pregnancy).sort((a, b) => score(a) - score(b));
      if (farm.length < o.farm || (same[0] && score(same[0]) < score(best))) { farm.push(best); sellWorst(); }
      else w.sell(best.id);
    }
    // 교배: 임신실 빈 칸만큼, 근친도 고려해서 최고 짝
    let room = o.preg - pregnant();
    const adultsF = farm.filter(x => x.sex === 'F' && w.isAdult(x) && !x.pregnancy && (lastBirth.get(x.id) ?? -99) + o.cooldown <= w.day);
    const adultsM = farm.filter(x => x.sex === 'M' && w.isAdult(x));
    adultsF.sort((a, b) => score(b) - score(a));
    for (const f of adultsF) {
      if (room <= 0 || !adultsM.length) break;
      const m = [...adultsM].sort((a, b) => (score(b) - 40 * w.kinship(f, b)) - (score(a) - 40 * w.kinship(f, a)))[0];
      for (let t = 0; t < o.attempts; t++) {
        f.lastMateDay = null;
        const r = w.tryMate(f.id, m.id);
        if (r.ok) {
          room--;
          if (o.jump) for (const e of f.pregnancy.embryos) if (Math.random() < o.jump) {
            jumps++;
            for (const k of STATS) for (const i of [0, 1, 2]) { const p = e.genome[`${k}.${i}`]; p[0].v = Math.min(8.33, (p[0].v as number) + 2.5); }
          }
          break;
        }
      }
    }
    for (const ev of w.advanceDay()) {
      lastBirth.set(ev.mother.id, w.day);
      for (const c of ev.children) { farm.push(c); births++; gens = Math.max(gens, c.generation); }
    }
    sellWorst();
    daily.push(Math.max(...farm.map(score)));
  }
  H.gestationDays = save.g; H.fertility = save.f; H.stats = save.st;
  return { daily, gens, births, jumps };
}

export function report(o: Opt, N = 60) {
  const D = o.days, acc = Array(D).fill(0); let g = 0, b = 0, j = 0;
  for (let s = 0; s < N; s++) { const r = run(o, 5000 + s); r.daily.forEach((v, i) => acc[i] += v / N); g += r.gens / N; b += r.births / N; j += r.jumps / N; }
  const at = (d: number) => acc[Math.min(D - 1, d - 1)].toFixed(0);
  console.log(`${o.label.padEnd(34)} | 30일 ${at(30)} | 60일 ${at(60)} | 90일 ${at(90)} | 150일 ${at(150)} | ${D}일간 최고 세대 ${g.toFixed(1)}, 출산 ${b.toFixed(0)}마리${o.jump ? `, 도약 ${j.toFixed(1)}회` : ''}`);
}
