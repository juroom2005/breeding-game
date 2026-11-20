// 단순한 플레이어로 돈 흐름 확인: 매일 교배, 칸이 넘치면 값싼 성체부터 판매. 유지비와 세금 적용
import { World } from '../src/engine';
import { asPair, farmCount, mateBlockReason, newGame, nextDay, overflow, sellIndividual, tryMate, type GameState } from '../src/game/game';
import { dailyUpkeep, valueOf } from '../src/game/economy';

function play(seed: number, days: number, keepFree: number) {
  Math.random = (() => { let x = seed; return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); })();
  let { state, world } = newGame('시험', 'normal');
  const goldAt: Record<number, number> = {};
  let sold = 0, income = 0, upkeepSum = 0;
  for (let d = 0; d < days; d++) {
    // 칸 정리
    while (overflow(state, world) > 0 || farmCount(world) > state.farmSlots - keepFree) {
      const cands = world.active().filter((x) => world.isAdult(x) && !x.pregnancy).sort((a, b) => valueOf(a, world) - valueOf(b, world));
      if (cands.length <= 2) break;
      const r = sellIndividual(state, world, cands[0].id);
      if (!r.ok) break;
      income += r.state.gold - state.gold; sold++; state = r.state;
    }
    // 교배
    const adults = world.active().filter((x) => world.isAdult(x));
    for (const f of adults.filter((x) => x.sex === 'F')) {
      const m = adults.filter((x) => x.sex === 'M').sort((a, b) => world.kinship(f, a) - world.kinship(f, b))[0];
      if (m && !mateBlockReason(state, world, f, m)) state = tryMate(state, world, f.id, m.id).state;
    }
    upkeepSum += dailyUpkeep(world);
    state = nextDay(state, world);
    if (state.gameOver) return { goldAt, over: state.gameOver, sold, income, upkeepSum };
    if ((d + 1) % 15 === 0) goldAt[d + 1] = state.gold;
  }
  return { goldAt, over: null, sold, income, upkeepSum };
}
for (const keep of [0, 2]) {
  for (const seed of [1, 2, 3]) {
    const r = play(seed, 120, keep);
    console.log(`빈칸 ${keep}개 유지, 시드 ${seed}:`, JSON.stringify(r.goldAt), r.over ? `게임오버 ${r.over.day + 1}일: ${r.over.reason}` : '생존', `| 판매 ${r.sold}마리 수입 ${r.income}g, 유지비 합 ${r.upkeepSum}g`);
  }
}
