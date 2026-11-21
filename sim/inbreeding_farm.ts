// 실제 게임 규칙(인간, 농장 10칸, 임신실 2칸, 하루 1회 시도)에서 근친 효과가 브리딩 진행을 얼마나 막는지 비교.
// 플레이어: 매일 점수 높은 암컷부터 가장 점수 높은 수컷과 교배, 칸이 넘치면 점수 낮은 성체부터 판매.
// 실행: npx tsx sim/inbreeding_farm.ts
import { World, CONFIG, RACES, type Individual } from '../src/engine';
import { totalScore } from '../src/game/stats';

type Curve = [number, number][];
interface Variant {
  label: string;
  stat: Curve;
  express: Curve;
  fresh: Curve;
}

const ORIGINAL = {
  stat: CONFIG.inbreeding.statPenalty,
  express: CONFIG.inbreeding.badTraitExpress,
  fresh: CONFIG.inbreeding.newBadAllele,
};
const ZERO: Curve = [[0, 0], [1, 0]];
const half = (c: Curve): Curve => c.map(([x, y]) => [x, y / 2]);

const VARIANTS: Variant[] = [
  {
    label: '예전 (11-21 이전)',
    stat: [[0, 0], [0.25, 0.02], [0.375, 0.04], [0.5, 0.09], [0.625, 0.14], [0.75, 0.18], [1, 0.22]],
    express: [[0, 0], [0.125, 0.05], [0.25, 0.1], [0.375, 0.15], [0.5, 0.3], [0.75, 0.45], [1, 0.5]],
    fresh: [[0, 0], [0.375, 0], [0.5, 0.03], [1, 0.1]],
  },
  { label: '현재 설정', ...ORIGINAL },
  { label: '현재의 절반', stat: half(ORIGINAL.stat), express: half(ORIGINAL.express), fresh: half(ORIGINAL.fresh) },
  { label: '근친 효과 없음', stat: ZERO, express: ZERO, fresh: ZERO },
];

const FARM = 10;
const PREG = 2;
const DAYS = [30, 60, 120];

function run(v: Variant, seed: number, marketEvery: number) {
  CONFIG.inbreeding.statPenalty = v.stat;
  CONFIG.inbreeding.badTraitExpress = v.express;
  CONFIG.inbreeding.newBadAllele = v.fresh;
  const w = new World(seed);
  w.buyFromMarket('human', 'F');
  w.buyFromMarket('human', 'M');
  const out: { best: number[]; coi: number[]; badBorn: number; born: number } = { best: [], coi: [], badBorn: 0, born: 0 };

  for (let day = 1; day <= Math.max(...DAYS); day++) {
    if (marketEvery && day % marketEvery === 0) {
      // 마켓 5마리 중 가장 좋은 개체가 농장 최하위보다 좋으면 산다
      const offers = Array.from({ length: 5 }, (_, i) => w.buyFromMarket('human', i % 2 ? 'F' : 'M'));
      offers.sort((a, b) => totalScore(b) - totalScore(a));
      const adults = w.active().filter((x) => w.isAdult(x) && !offers.includes(x));
      const worst = Math.min(...adults.map(totalScore));
      offers.forEach((x, i) => { if (i > 0 || totalScore(x) <= worst) w.sell(x.id); });
    }
    const adults = w.active().filter((x) => w.isAdult(x));
    const males = adults.filter((x) => x.sex === 'M').sort((a, b) => totalScore(b) - totalScore(a));
    const females = adults.filter((x) => x.sex === 'F' && !x.pregnancy).sort((a, b) => totalScore(b) - totalScore(a));
    let pregnant = adults.filter((x) => x.pregnancy).length;
    for (const f of females) {
      if (pregnant >= PREG || !males.length) break;
      const r = w.tryMate(f.id, males[0].id);
      if (r.ok && w.get(f.id)!.pregnancy) pregnant++;
    }
    for (const ev of w.advanceDay()) {
      for (const c of ev.children) {
        out.born++;
        out.coi.push(c.coi);
        if (c.notes.some((n) => n.kind === 'inbreeding')) out.badBorn++;
      }
    }
    // 칸 정리: 임신 중이 아닌 성체 중 점수 낮은 순으로 판매 (각 성별 1마리는 남김)
    let farm = w.active().filter((x) => w.isAdult(x));
    while (farm.length > FARM) {
      const count = (s: string) => farm.filter((x) => x.sex === s).length;
      const pool = farm.filter((x) => !x.pregnancy && count(x.sex) > 1).sort((a, b) => totalScore(a) - totalScore(b));
      if (!pool.length) break;
      w.sell(pool[0].id);
      farm = farm.filter((x) => x !== pool[0]);
    }
    if (DAYS.includes(day)) out.best.push(Math.max(...w.active().filter((x: Individual) => w.isAdult(x)).map(totalScore)));
  }
  return out;
}

// 엔진 v0.7 제안(대립유전자 편차 2.2)과 비교하기 위한 옵션. 시뮬레이션 안에서만 바꾸고 되돌린다
const HUMAN_STATS = RACES.human.stats;
function withAlleleSd<T>(sd: number | null, f: () => T): T {
  if (sd === null) return f();
  const saved = JSON.parse(JSON.stringify(HUMAN_STATS));
  for (const k of Object.keys(HUMAN_STATS) as (keyof typeof HUMAN_STATS)[]) HUMAN_STATS[k] = [HUMAN_STATS[k][0], sd];
  try {
    return f();
  } finally {
    Object.assign(HUMAN_STATS, saved);
  }
}

const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const SEEDS = 60;
for (const [marketEvery, sd] of [[0, null], [3, null], [0, 2.2], [3, 2.2]] as [number, number | null][]) {
  const head = marketEvery ? `마켓 ${marketEvery}일마다 확인 (5마리 중 최고가 최하위보다 좋으면 구매)` : '마켓 안 씀 (시작 2마리로만)';
  console.log(`\n== ${head}${sd ? ` + 유전 편차 ${sd}` : ''} ==`);
  console.log(`농장 최고 종합 점수 평균: ${DAYS.join('일 / ')}일 | 태어난 개체 평균 근친 계수 | 근친 부작용 비율`);
  for (const v of VARIANTS) {
    const rs = withAlleleSd(sd, () => Array.from({ length: SEEDS }, (_, i) => run(v, 1000 + i, marketEvery)));
    const best = DAYS.map((_, k) => avg(rs.map((r) => r.best[k])).toFixed(1)).join(' / ');
    const coi = avg(rs.flatMap((r) => r.coi));
    const bad = avg(rs.map((r) => r.badBorn / Math.max(1, r.born)));
    console.log(`${v.label.padEnd(12)} ${best} | ${(coi * 100).toFixed(1)}% | ${(bad * 100).toFixed(1)}%`);
  }
}
Object.assign(CONFIG.inbreeding, { statPenalty: ORIGINAL.stat, badTraitExpress: ORIGINAL.express, newBadAllele: ORIGINAL.fresh });
