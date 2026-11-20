import { josa } from './josa';
import { World, type SaveData, type Individual, type StatId } from '@/engine';

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
  kind: 'info' | 'birth' | 'mate' | 'adult';
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
  log: LogEntry[];
  world: SaveData;
}

export const STAT_MAX = 100;
export const SHOWN_STATS: StatId[] = ['vitality', 'strength', 'agility', 'charm'];
export const shownStat = (v: number) => Math.max(1, Math.round(v));

/** 능력치 평균 (1~100). 지능이 들어오면 SHOWN_STATS에 추가만 하면 된다 */
export function totalScore(ind: Individual): number {
  const sum = SHOWN_STATS.reduce((s, k) => s + ind.pheno.stats[k], 0);
  return Math.max(1, Math.round(sum / SHOWN_STATS.length));
}

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

/** 임신한 개체는 임신실에 있으므로 농장 칸을 차지하지 않는다 */
export function farmCount(world: World): number {
  return world.active().filter((x) => !x.pregnancy).length;
}

export function withDefaults(s: GameState): GameState {
  return { ...s, order: s.order ?? [] };
}

export function setOrder(state: GameState, order: string[]): GameState {
  return { ...state, order };
}

export function nextDay(state: GameState, world: World): GameState {
  const log = [...state.log];
  const births = world.advanceDay();
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
  return { ...state, order: [...state.order, ...born], log: log.slice(-200), world: world.serialize() };
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
