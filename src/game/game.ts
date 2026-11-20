/**
 * 게임 상태: 엔진(World) 위에 돈, 농장 슬롯, 난이도, 기록 같은 "게임 규칙"을 얹는다.
 * 유전 계산은 전부 엔진이 하고, 여기서는 게임 쪽 숫자와 규칙만 다룬다.
 */
import { josa } from './josa';
import { World, CONFIG, type SaveData, type Individual, type StatId } from '@/engine';

export type Difficulty = 'casual' | 'normal';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  casual: '즐기는 모드',
  normal: '일반 모드',
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
  casual: '게임오버 없이 브리딩만 즐깁니다.',
  normal: '세금을 못 내면 게임오버. 재정 관리까지 신경 써야 합니다.',
};

/** 게임 설정값 (임시). 경제 설계가 끝나면 여기 숫자를 바꾼다 */
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
  log: LogEntry[];
  world: SaveData;
}

/** 화면에 보이는 능력치: 엔진 0~100 → 0~20 */
export const SHOWN_STATS: StatId[] = ['vitality', 'strength', 'agility', 'charm'];
export const shownStat = (v: number) => Math.round(v / 5);

/** 종합 점수 = 보이는 능력치 합 (지능 추가 전이라 지금은 4개, 최대 80) */
export function totalScore(ind: Individual): number {
  return SHOWN_STATS.reduce((sum, k) => sum + shownStat(ind.pheno.stats[k]), 0);
}

/**
 * 새 게임: 인간 남녀 한 쌍. "보통 스탯, 보통 등급 트레잇"을 만족할 때까지 시드를 바꿔 다시 뽑는다
 * (다시 뽑을 때 새 World를 만들어서, 버린 개체가 기록에 남지 않게 한다)
 */
export function newGame(farmName: string, difficulty: Difficulty): { state: GameState; world: World } {
  let seed = Math.floor(Math.random() * 2_000_000_000);
  for (let tries = 0; tries < 200; tries++, seed++) {
    const world = new World(seed);
    const f = world.buyFromMarket('human', 'F');
    const m = world.buyFromMarket('human', 'M');
    const ok = [f, m].every(
      (x) => x.pheno.traits.every((t) => t.tier === '보통') && Math.abs(totalScore(x) - 41) <= 4 && x.pheno.morphs.length === 0,
    );
    if (!ok) continue;
    const state: GameState = {
      version: 1,
      farmName: farmName.trim() || '이름 없는 농장',
      difficulty,
      gold: RULES.startGold,
      farmSlots: RULES.farmSlots,
      pregnancyRoom: RULES.pregnancyRoom,
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

/** 다음 날: 출산, 성체가 된 아기 알림. 돈(유지비, 세금)은 경제 설계 후에 넣는다 */
export function nextDay(state: GameState, world: World): GameState {
  const log = [...state.log];
  const births = world.advanceDay();
  for (const ev of births) {
    const names = ev.children.map((c) => `${c.name}(${c.sex === 'F' ? '♀' : '♂'})`).join(', ');
    const twin = ev.children.length === 2 ? ' 쌍둥이!' : ev.children.length === 3 ? ' 세쌍둥이!' : '';
    log.push({ day: world.day, text: `${josa(ev.mother.name, '이/가')} 출산했습니다: ${names}${twin}`, kind: 'birth' });
  }
  for (const x of world.active()) {
    if (x.source === 'farm' && world.day - x.bornDay === CONFIG.babyDays) {
      log.push({ day: world.day, text: `${josa(x.name, '이/가')} 성체가 되었습니다. 종합 ${totalScore(x)}점`, kind: 'adult' });
    }
  }
  return { ...state, log: log.slice(-200), world: world.serialize() };
}

/** 교배 시도 (엔진 규칙 그대로: 하루 1회, 수정 확률) + 임신실 칸 확인 */
export function tryMate(state: GameState, world: World, motherId: string, fatherId: string): { state: GameState; message: string; ok: boolean } {
  if (pregnantCount(world) >= state.pregnancyRoom) {
    return { state, ok: false, message: `임신실이 꽉 찼습니다 (${state.pregnancyRoom}칸).` };
  }
  const mother = world.get(motherId)!;
  const father = world.get(fatherId)!;
  const r = world.tryMate(motherId, fatherId);
  const log = [...state.log, { day: world.day, text: `${mother.name} × ${father.name}: ${r.message}`, kind: 'mate' as const }];
  return { state: { ...state, log: log.slice(-200), world: world.serialize() }, message: r.message, ok: r.ok };
}
