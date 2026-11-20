import { josa } from './josa';
import { World, type SaveData, type Individual } from '@/engine';
import { totalScore } from './stats';
import { buyPrice, dailyUpkeep, ECONOMY, sellPrice, slotUpgradeCost, taxFor } from './economy';
import { MARKET, marketSeed, restock, type MarketState } from './market';

export type Difficulty = 'casual' | 'normal';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  casual: '즐기는 모드',
  normal: '일반 모드',
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
  casual: '게임오버 없이 브리딩만 즐깁니다.',
  normal: '세금을 못 내면 게임오버. 재정 관리까지 신경 써야 합니다.',
};

/** 경제 설계 전 임시값 */
export const RULES = {
  startGold: 500,
  farmSlots: 10,
  pregnancyRoom: 2,
};

export interface LogEntry {
  day: number;
  text: string;
  kind: 'info' | 'birth' | 'mate' | 'adult' | 'trade' | 'money';
}

export interface GameState {
  version: 1;
  farmName: string;
  difficulty: Difficulty;
  gold: number;
  farmSlots: number;
  pregnancyRoom: number;
  /** 농장 화면에서 플레이어가 끌어서 정한 개체 순서 */
  order: string[];
  farmUpgrades: number;
  market: MarketState;
  gameOver?: { day: number; reason: string };
  log: LogEntry[];
  world: SaveData;
}

export { STAT_MAX, SHOWN_STATS, shownStat, totalScore } from './stats';

/** 시작 개체가 조건(보통 스탯, 보통 트레잇)에 맞을 때까지 새 World로 다시 뽑는다. 버린 개체가 기록에 남지 않게 하려는 것 */
export function newGame(farmName: string, difficulty: Difficulty): { state: GameState; world: World } {
  let seed = Math.floor(Math.random() * 2_000_000_000);
  for (let tries = 0; tries < 200; tries++, seed++) {
    const world = new World(seed);
    const f = world.buyFromMarket('human', 'F');
    const m = world.buyFromMarket('human', 'M');
    const ok = [f, m].every(
      (x) => x.pheno.traits.every((t) => t.tier === '보통') && Math.abs(totalScore(x) - 50) <= 5 && x.pheno.morphs.length === 0,
    );
    if (!ok) continue;
    const state: GameState = {
      version: 1,
      farmName: farmName.trim() || '이름 없는 농장',
      difficulty,
      gold: RULES.startGold,
      farmSlots: RULES.farmSlots,
      pregnancyRoom: RULES.pregnancyRoom,
      order: [f.id, m.id],
      farmUpgrades: 0,
      market: restock(world, undefined, marketSeed(world.seed, world.day, 0)),
      log: [{ day: world.day, text: `${farmName.trim() || '농장'}의 첫날. ${josa(f.name, '와/과')} ${josa(m.name, '이/가')} 농장에 왔습니다.`, kind: 'info' }],
      world: world.serialize(),
    };
    return { state, world };
  }
  throw new Error('시작 개체를 만들지 못했습니다');
}

export function pregnantCount(world: World): number {
  return world.active().filter((x) => x.pregnancy).length;
}

/** 성체만 농장 칸을 차지한다 (임신실에 있어도 차지). 아기는 육아실에 있다가 성체가 되면 칸이 필요해진다 */
export function farmCount(world: World): number {
  return world.active().filter((x) => world.isAdult(x)).length;
}

export function withDefaults(s: GameState): GameState {
  return { ...s, order: s.order ?? [], farmUpgrades: s.farmUpgrades ?? 0 };
}

/** 이어하기 직후나 날짜가 바뀐 뒤 매물이 없으면 채운다 */
export function ensureMarket(state: GameState, world: World): GameState {
  if (state.market && state.market.day === world.day) return state;
  const market = restock(world, state.market, marketSeed(world.seed, world.day, 0));
  return { ...state, market, world: world.serialize() };
}

type Result = { state: GameState; ok: boolean; message: string };

const addLog = (state: GameState, world: World, text: string, kind: LogEntry['kind']): LogEntry[] =>
  [...state.log, { day: world.day, text, kind }].slice(-200);

export function refreshMarket(state: GameState, world: World): Result {
  const used = state.market.day === world.day ? state.market.refreshesUsed : 0;
  if (used >= MARKET.refreshesPerDay) return { state, ok: false, message: '오늘은 새로고침을 다 썼습니다' };
  const market = { ...restock(world, state.market, marketSeed(world.seed, world.day, used + 1)), refreshesUsed: used + 1 };
  return { state: { ...state, market, world: world.serialize() }, ok: true, message: `새 매물이 들어왔습니다 (남은 새로고침 ${MARKET.refreshesPerDay - used - 1}회)` };
}

export function buyOffer(state: GameState, world: World, id: string): Result {
  const ind = world.get(id);
  if (!ind || ind.status !== 'market') return { state, ok: false, message: '이미 팔린 매물입니다' };
  const price = buyPrice(ind, world);
  if (state.gold < price) return { state, ok: false, message: `골드가 부족합니다 (${price.toLocaleString()}g 필요)` };
  if (farmCount(world) >= state.farmSlots) return { state, ok: false, message: '농장 칸이 꽉 찼습니다. 팔거나 칸을 늘리세요' };
  world.acceptOffer(id);
  const offers = state.market.offers.map((o) => (o === id ? null : o));
  const text = `${josa(ind.name, '을/를')} ${price.toLocaleString()}g에 샀습니다`;
  return {
    state: { ...state, gold: state.gold - price, order: [...state.order, id], market: { ...state.market, offers }, log: addLog(state, world, text, 'trade'), world: world.serialize() },
    ok: true,
    message: text,
  };
}

export function sellIndividual(state: GameState, world: World, id: string): Result {
  const ind = world.get(id);
  if (!ind) return { state, ok: false, message: '개체를 찾을 수 없습니다' };
  const price = sellPrice(ind, world);
  const err = world.sell(id);
  if (err) return { state, ok: false, message: err };
  const text = `${josa(ind.name, '을/를')} ${price.toLocaleString()}g에 팔았습니다`;
  return {
    state: { ...state, gold: state.gold + price, order: state.order.filter((o) => o !== id), log: addLog(state, world, text, 'trade'), world: world.serialize() },
    ok: true,
    message: text,
  };
}

export function upgradeFarm(state: GameState, world: World): Result {
  const cost = slotUpgradeCost(state.farmUpgrades);
  if (state.gold < cost) return { state, ok: false, message: `골드가 부족합니다 (${cost.toLocaleString()}g 필요)` };
  const text = `농장 칸을 ${state.farmSlots + 1}칸으로 늘렸습니다 (${cost.toLocaleString()}g)`;
  return {
    state: { ...state, gold: state.gold - cost, farmSlots: state.farmSlots + 1, farmUpgrades: state.farmUpgrades + 1, log: addLog(state, world, text, 'trade') },
    ok: true,
    message: text,
  };
}

/** 농장 칸을 넘으면 다음 날로 넘어갈 수 없다 (팔거나 칸을 늘려야 함) */
export function overflow(state: GameState, world: World): number {
  return Math.max(0, farmCount(world) - state.farmSlots);
}

export function setOrder(state: GameState, order: string[]): GameState {
  return { ...state, order };
}

export function nextDay(state: GameState, world: World): GameState {
  if (state.gameOver || overflow(state, world) > 0) return state;
  const log = [...state.log];
  const upkeep = dailyUpkeep(world);
  const births = world.advanceDay();
  let gold = state.gold - upkeep;
  let gameOver: GameState['gameOver'];
  if (world.day % ECONOMY.tax.monthDays === 0) {
    const month = world.day / ECONOMY.tax.monthDays;
    const tax = taxFor(month);
    if (state.difficulty === 'normal' && gold < tax) {
      gameOver = { day: world.day, reason: `${month}월 세금 ${tax.toLocaleString()}g을 내지 못했습니다 (가진 돈 ${gold.toLocaleString()}g)` };
      log.push({ day: world.day, text: gameOver.reason, kind: 'money' });
    } else {
      gold -= tax;
      log.push({ day: world.day, text: `${month}월 세금 ${tax.toLocaleString()}g을 냈습니다`, kind: 'money' });
    }
  }
  for (const ev of births) {
    const names = ev.children.map((c) => `${c.name}(${c.sex === 'F' ? '♀' : '♂'})`).join(', ');
    const twin = ev.children.length === 2 ? ' 쌍둥이!' : ev.children.length === 3 ? ' 세쌍둥이!' : '';
    log.push({ day: world.day, text: `${josa(ev.mother.name, '이/가')} 출산했습니다: ${names}${twin}`, kind: 'birth' });
  }
  for (const x of world.active()) {
    if (x.source === 'farm' && world.day - x.bornDay === world.babyDays(x)) {
      log.push({ day: world.day, text: `${josa(x.name, '이/가')} 성체가 되었습니다. 종합 ${totalScore(x)}점`, kind: 'adult' });
    }
  }
  const born = births.flatMap((ev) => ev.children.map((c) => c.id));
  const over = overflow(state, world);
  if (over > 0) log.push({ day: world.day, text: `농장 칸이 ${over}칸 모자랍니다. 개체를 팔거나 칸을 늘려야 다음 날로 넘어갈 수 있습니다`, kind: 'info' });
  const market = restock(world, state.market, marketSeed(world.seed, world.day, 0));
  return { ...state, gold, gameOver, order: [...state.order, ...born], market, log: log.slice(-200), world: world.serialize() };
}

/** 교배할 수 없으면 이유, 할 수 있으면 null */
export function mateBlockReason(state: GameState, world: World, mother?: Individual, father?: Individual): string | null {
  if (!mother || !father) return '엄마와 아빠 칸을 채우세요';
  if (pregnantCount(world) >= state.pregnancyRoom) return `임신실이 꽉 찼습니다 (${state.pregnancyRoom}칸)`;
  for (const x of [mother, father]) if (!world.isAdult(x)) return `${josa(x.name, '은/는')} 아직 아기입니다`;
  if (mother.pregnancy) return `${josa(mother.name, '은/는')} 임신 중입니다`;
  if (mother.lastMateDay === world.day) return `${josa(mother.name, '은/는')} 오늘 이미 시도했습니다. 내일 다시`;
  return world.canMate(mother, father);
}

/** 두 개체를 성별에 맞춰 엄마/아빠로 나눈다. 같은 성별이면 null */
export function asPair(a: Individual, b: Individual): [Individual, Individual] | null {
  if (a.sex === b.sex) return null;
  return a.sex === 'F' ? [a, b] : [b, a];
}

export function tryMate(state: GameState, world: World, motherId: string, fatherId: string): { state: GameState; message: string; ok: boolean } {
  const mother = world.get(motherId)!;
  const father = world.get(fatherId)!;
  const blocked = mateBlockReason(state, world, mother, father);
  if (blocked) return { state, ok: false, message: blocked };
  const r = world.tryMate(motherId, fatherId);
  const log = [...state.log, { day: world.day, text: `${mother.name} × ${father.name}: ${r.message}`, kind: 'mate' as const }];
  return { state: { ...state, log: log.slice(-200), world: world.serialize() }, message: r.message, ok: r.ok };
}
