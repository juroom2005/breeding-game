// 농장 10칸이 처음 차는 날 (인간 한 쌍으로 시작, 임신실 2, 아무것도 안 팔 때)
import { World, RACES } from '../src/engine';
const H = RACES.human as any; H.gestationDays = 1; H.fertility = 0.85;
const days: number[] = [];
for (let s = 0; s < 200; s++) {
  const w = new World(9000 + s); const last = new Map<string, number>();
  let farm: any[] = [w.buyFromMarket('human', 'F'), w.buyFromMarket('human', 'M')];
  let d = 0;
  for (; d < 60 && farm.length < 10; d++) {
    let room = 2 - farm.filter(x => x.pregnancy).length;
    const M = farm.filter(x => x.sex === 'M' && w.isAdult(x));
    for (const f of farm.filter(x => x.sex === 'F' && w.isAdult(x) && !x.pregnancy && (last.get(x.id) ?? -9) + 1 <= w.day)) {
      if (room <= 0 || !M.length) break;
      for (let t = 0; t < 2; t++) { f.lastMateDay = null; if (w.tryMate(f.id, M[0].id).ok) { room--; break; } }
    }
    for (const ev of w.advanceDay()) { last.set(ev.mother.id, w.day); farm.push(...ev.children); }
  }
  days.push(d);
}
days.sort((a, b) => a - b);
console.log('농장 10칸이 차는 날: 중간값', days[100], '/ 빠르면', days[10], '/ 늦으면', days[190]);
