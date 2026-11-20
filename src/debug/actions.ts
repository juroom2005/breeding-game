// 디버그 리모컨 전용. 게임 규칙을 무시하고 상태를 바로 바꾼다
import { TRAITS, type BloodlineId, type Individual, type MorphId, type RaceId, type Sex, type StatId, type World } from '@/engine';
import { STATS, locusKey } from '@/engine/data/loci';
import { HAS, NOT, traitLocus } from '@/engine/data/traits';
import { nextDay, totalScore, type DayOptions, type GameState } from '@/game/game';
import { nextTax } from '@/game/economy';
import { marketSeed, raceAverage, restock } from '@/game/market';

export type Result = { state: GameState; message: string };

const tag = (text: string) => `[디버그] ${text}`;

function withLog(state: GameState, world: World, text: string): GameState {
  return { ...state, log: [...state.log, { day: world.day, text: tag(text), kind: 'info' as const }].slice(-200), world: world.serialize() };
}

export function setGold(state: GameState, gold: number): Result {
  return { state: { ...state, gold }, message: `골드 ${gold.toLocaleString()}g` };
}

export function skipDays(state: GameState, world: World, days: number, opts: DayOptions): Result {
  let cur = state;
  let passed = 0;
  for (; passed < days; passed++) {
    const next = nextDay(cur, world, opts);
    if (next === cur) break;
    cur = next;
    if (cur.gameOver) {
      passed++;
      break;
    }
  }
  const why = cur.gameOver ? ' (게임오버로 멈춤)' : passed < days ? ' (농장 칸 초과로 멈춤)' : '';
  return { state: cur, message: `${passed}일 넘김, 지금 ${world.day + 1}일차${why}` };
}

/** 세금 내는 날 바로 전날로 (유지비·세금 없이) */
export function skipToTaxEve(state: GameState, world: World): Result {
  const days = nextTax(world.day).daysLeft - 1;
  if (days <= 0) return { state, message: '이미 세금 전날입니다' };
  return skipDays(state, world, days, { free: true, ignoreOverflow: true });
}

export function changeSlots(state: GameState, key: 'farmSlots' | 'pregnancyRoom', delta: number): Result {
  const v = Math.max(1, state[key] + delta);
  return { state: { ...state, [key]: v }, message: `${key === 'farmSlots' ? '농장 칸' : '임신실'} ${v}칸` };
}

export function clearGameOver(state: GameState): Result {
  return { state: { ...state, gameOver: undefined }, message: '게임오버 해제' };
}

export function toggleDifficulty(state: GameState): Result {
  const difficulty = state.difficulty === 'normal' ? 'casual' : 'normal';
  return { state: { ...state, difficulty }, message: difficulty === 'normal' ? '일반 모드로 바꿈' : '즐기는 모드로 바꿈' };
}

export function resetRefresh(state: GameState): Result {
  return { state: { ...state, market: { ...state.market, refreshesUsed: 0 } }, message: '오늘 새로고침 횟수 초기화' };
}

export function rerollMarket(state: GameState, world: World): Result {
  const market = restock(world, state.market, marketSeed(world.seed, world.day, 1000 + Math.floor(Math.random() * 1e6)));
  return { state: { ...state, market, world: world.serialize() }, message: '매물을 새로 뽑았습니다' };
}

export interface NewIndividual {
  race: RaceId;
  sex: Sex;
  score: number;
  morph: MorphId | '';
  founders: BloodlineId[];
}

/** 목표 점수에 가장 가까운 개체를 30번 안에서 고른다. 유전자도 그 점수에 맞게 만들어져서 자식에게 이어진다 */
export function addIndividual(state: GameState, world: World, o: NewIndividual): Result {
  let best: Individual | null = null;
  for (let i = 0; i < 30; i++) {
    const ind = world.createMarketOffer(o.race, o.sex, {
      statShift: o.score - raceAverage(o.race),
      naturalFounders: false,
      forceFounder: o.founders,
      morph: o.morph || undefined,
    });
    if (!best || Math.abs(totalScore(ind) - o.score) < Math.abs(totalScore(best) - o.score)) {
      if (best) world.discardOffers([best.id]);
      best = ind;
    } else world.discardOffers([ind.id]);
    if (Math.abs(totalScore(best) - o.score) <= 1) break;
  }
  world.acceptOffer(best!.id);
  const text = `${best!.name} 추가 (${best!.raceLabel}, 종합 ${totalScore(best!)}점)`;
  return { state: { ...withLog(state, world, text), order: [...state.order, best!.id] }, message: text };
}

export interface IndividualPatch {
  name?: string;
  stats?: Partial<Record<Exclude<StatId, 'mana'>, number>>;
  /** 겉 능력치만 바꾸면 자식은 원래 유전자를 따른다. true면 유전자도 같은 만큼 옮긴다 */
  geneticToo?: boolean;
}

export function patchIndividual(state: GameState, world: World, id: string, patch: IndividualPatch): Result {
  const ind = world.get(id);
  if (!ind) return { state, message: '개체를 찾을 수 없습니다' };
  if (patch.name?.trim()) ind.name = patch.name.trim();
  for (const [k, v] of Object.entries(patch.stats ?? {}) as [Exclude<StatId, 'mana'>, number][]) {
    const next = Math.max(0, Math.min(100, Math.round(v)));
    const delta = next - ind.pheno.stats[k];
    ind.pheno.stats[k] = next;
    if (patch.geneticToo && delta) {
      const g = STATS[k];
      const per = delta / (g.loci * 2);
      for (let i = 0; i < g.loci; i++) {
        for (const a of ind.genome[locusKey(g.id, i)] ?? []) a.v = Math.max(0, Math.min(g.alleleMax, (a.v as number) + per));
      }
    }
  }
  return { state: { ...state, world: world.serialize() }, message: `${ind.name} 수정 (종합 ${totalScore(ind)}점)` };
}

/** 트레잇 유전자를 동형으로 바꿔서 자식에게도 이어지게 한다. 능력치 보정도 같이 더하거나 뺀다 */
export function setTrait(state: GameState, world: World, id: string, traitId: string, on: boolean): Result {
  const ind = world.get(id);
  const def = TRAITS.find((t) => t.id === traitId);
  if (!ind || !def) return { state, message: '대상을 찾을 수 없습니다' };
  const had = ind.pheno.traits.some((t) => t.id === traitId);
  for (let i = 0; i < def.lociCount; i++) {
    for (const a of ind.genome[traitLocus(def, i)] ?? []) a.v = on ? HAS : NOT;
  }
  if (on !== had) {
    const sign = on ? 1 : -1;
    for (const [k, v] of Object.entries(def.effect) as [StatId, number][]) {
      ind.pheno.stats[k] = Math.max(0, Math.min(100, ind.pheno.stats[k] + sign * v));
    }
    ind.pheno.traits = on
      ? [...ind.pheno.traits, { id: def.id, name: def.name, tier: def.tier, good: def.good }]
      : ind.pheno.traits.filter((t) => t.id !== traitId);
  }
  return { state: { ...state, world: world.serialize() }, message: `${ind.name}: ${def.name} ${on ? '추가' : '제거'}` };
}

export function growUp(state: GameState, world: World, id: string): Result {
  const ind = world.get(id);
  if (!ind) return { state, message: '개체를 찾을 수 없습니다' };
  if (world.isAdult(ind)) return { state, message: `${ind.name}: 이미 성체입니다` };
  ind.bornDay = world.day - world.babyDays(ind);
  return { state: withLog(state, world, `${ind.name} 바로 성체로`), message: `${ind.name}: 성체가 되었습니다` };
}

export function dueTomorrow(state: GameState, world: World, id: string): Result {
  const ind = world.get(id);
  if (!ind?.pregnancy) return { state, message: '임신 중이 아닙니다' };
  ind.pregnancy.dueDay = world.day + 1;
  return { state: { ...state, world: world.serialize() }, message: `${ind.name}: 내일 출산` };
}

export function resetMate(state: GameState, world: World, id: string): Result {
  const ind = world.get(id);
  if (!ind) return { state, message: '개체를 찾을 수 없습니다' };
  ind.lastMateDay = null;
  return { state: { ...state, world: world.serialize() }, message: `${ind.name}: 오늘 다시 교배 가능` };
}

/** 돈 없이 농장에서 내보낸다 (족보에는 판매됨으로 남음) */
export function removeIndividual(state: GameState, world: World, id: string): Result {
  const ind = world.get(id);
  if (!ind) return { state, message: '개체를 찾을 수 없습니다' };
  ind.pregnancy = null;
  const err = world.sell(id);
  if (err) return { state, message: err };
  return { state: { ...withLog(state, world, `${ind.name} 내보냄`), order: state.order.filter((o) => o !== id) }, message: `${ind.name}: 농장에서 내보냄` };
}
