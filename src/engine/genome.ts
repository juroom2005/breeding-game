// 유전형 만들기: 마켓 1세대 생성, 교배(감수분열), 돌연변이, 초대 각성

import { Rng } from './rng';
import type { Allele, BloodlineId, Genome, Pair, RaceId } from './types';
import { CONFIG, curve } from './data/config';
import {
  BLOODLINE_GROUPS, BODY, EYE_COLOR, HAIR_COLOR, LINKAGE_GROUPS, SEX_TRAITS, SKIN_COLOR, SLOTS, STATS,
  locusKey, type AdditiveGroup, type DiscreteLocus,
} from './data/loci';
import { RACES } from './data/races';
import { BLOODLINES, BLOODLINE_IDS, NO_PATTERN, patternLocus } from './data/bloodlines';
import { EXTRA_COLOR_LOCI, MORPHS, MORPH_ALLELE, MORPH_IDS, morphGroupId, type MorphId } from './data/morphs';
import { HAS, NOT, TRAITS, traitLocus } from './data/traits';

const allele = (v: string | number, origin: string, race: RaceId): Allele => ({ v, origin, race, shownBy: null });
const pair = (a: Allele, b: Allele): Pair => [a, b];
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export const DISCRETE_LOCI: DiscreteLocus[] = [EYE_COLOR, HAIR_COLOR, SKIN_COLOR, ...SLOTS];

/** 수치형 그룹 목록 (키 → 그룹 정의, 종족별 대립유전자 평균/표준편차를 꺼내는 함수) */
const ADDITIVE_FOR_RACE: { group: AdditiveGroup; dist: (r: RaceId) => [number, number] }[] = [
  { group: BODY.height, dist: (r) => RACES[r].height },
  { group: BODY.fat, dist: (r) => RACES[r].fat },
  { group: BODY.muscle, dist: (r) => RACES[r].muscle },
  { group: SEX_TRAITS.chest, dist: (r) => RACES[r].chest },
  { group: SEX_TRAITS.genital, dist: (r) => RACES[r].genital },
  { group: STATS.vitality, dist: (r) => RACES[r].stats.vitality },
  { group: STATS.strength, dist: (r) => RACES[r].stats.strength },
  { group: STATS.agility, dist: (r) => RACES[r].stats.agility },
  { group: STATS.charm, dist: (r) => RACES[r].stats.charm },
];

/** 유전자 ID → 수치형 그룹 (돌연변이 상한 확인용) */
const ADDITIVE_GROUP_OF: Record<string, AdditiveGroup> = {};
for (const g of [...ADDITIVE_FOR_RACE.map((x) => x.group), ...Object.values(BLOODLINE_GROUPS)]) {
  for (let i = 0; i < g.loci; i++) ADDITIVE_GROUP_OF[locusKey(g.id, i)] = g;
}
const MORPH_LOCI = new Set<string>();
for (const m of MORPH_IDS) for (let i = 0; i < MORPHS[m].loci; i++) MORPH_LOCI.add(locusKey(morphGroupId(m), i));
/** 돌연변이가 일어날 수 있는 뚜렷한 값 유전자 (색, 파츠, 날개/뿔/헤일로 색) */
const DISCRETE_OF: Record<string, { rank: Record<string, number> }> = Object.fromEntries(
  [...DISCRETE_LOCI, ...EXTRA_COLOR_LOCI].map((l) => [l.id, l]),
);

function founderAlleles(b: BloodlineId, owner: string, race: RaceId, rng: Rng): Record<string, Pair> {
  const def = BLOODLINES[b];
  const g = BLOODLINE_GROUPS[b];
  const out: Record<string, Pair> = {};
  for (let i = 0; i < g.loci; i++) {
    const mk = () => allele(rng.uniform(def.founderRange[0], def.founderRange[1]), owner, race);
    out[locusKey(g.id, i)] = pair(mk(), mk());
  }
  const names = Object.keys(def.patterns);
  // 초대는 전용 문신 무늬 2~3종 중 랜덤
  const e = rng.pick(names);
  out[patternLocus(b)] = pair(allele(e, owner, race), allele(rng.chance(0.7) ? e : rng.pick(names), owner, race));
  return out;
}

export interface MarketGenomeOptions {
  forceFounder?: BloodlineId[];
  /** false면 초대가 저절로 생기지 않는다 (마켓 희귀 개체를 게임 쪽에서 직접 정할 때) */
  naturalFounders?: boolean;
  /** 능력치 평균을 이만큼 옮긴다 (0~100 단위). 마켓 개체마다 품질 편차를 주는 용도 */
  statShift?: number;
  /** 이 이형의 소인을 발현 문턱 바로 위로 올린다. 일반 이형 개체와 비슷하게 유전되도록 최대치까지는 올리지 않는다 */
  morph?: MorphId;
}

const STAT_GROUP_IDS = new Set<string>(Object.values(STATS).map((s) => s.id));

/** 마켓 1세대 유전형 */
export function createMarketGenome(
  race: RaceId,
  id: string,
  rng: Rng,
  opts: MarketGenomeOptions = {},
): { genome: Genome; founded: BloodlineId[] } {
  const { forceFounder = [], naturalFounders = true, statShift = 0, morph } = opts;
  const r = RACES[race];
  const g: Genome = {};
  const mk = (v: string | number) => allele(v, id, race);

  // 색: 대부분 같은 색 두 벌, 일정 확률로 두 번째가 다른 색 (숨은 유전자가 될 수 있음)
  const colorPair = (table: Record<string, number>) => {
    const first = rng.weighted(table);
    const second = rng.chance(CONFIG.marketHiddenColorChance) ? rng.weighted(table) : first;
    return rng.chance(0.5) ? pair(mk(first), mk(second)) : pair(mk(second), mk(first));
  };
  g[EYE_COLOR.id] = colorPair(r.eyeColor);
  g[HAIR_COLOR.id] = colorPair(r.hairColor);
  const skin = rng.weighted(r.skinColor);
  g[SKIN_COLOR.id] = pair(mk(skin), mk(skin));

  // 슬롯: 순종이므로 종족 고유 파츠 두 개
  for (const s of SLOTS) g[s.id] = pair(mk(r.slots[s.id]), mk(r.slots[s.id]));

  // 수치형
  for (const { group, dist } of ADDITIVE_FOR_RACE) {
    const [base, sd] = dist(race);
    const mean = STAT_GROUP_IDS.has(group.id) ? base + statShift / (group.loci * 2) : base;
    for (let i = 0; i < group.loci; i++) {
      const v = () => clamp(rng.normal(mean, sd), 0, group.alleleMax);
      g[locusKey(group.id, i)] = pair(mk(v()), mk(v()));
    }
  }

  // 특수 혈통: 일반 개체는 낮은 값, 아주 낮은 확률로 초대
  const founded: BloodlineId[] = [];
  for (const b of BLOODLINE_IDS) {
    const def = BLOODLINES[b];
    const grp = BLOODLINE_GROUPS[b];
    if (forceFounder.includes(b) || (naturalFounders && rng.chance(def.marketFounderChance))) {
      Object.assign(g, founderAlleles(b, id, race, rng));
      founded.push(b);
    } else {
      for (let i = 0; i < grp.loci; i++) {
        const v = () => (rng.chance(def.normalZeroP) ? 0 : rng.uniform(0, def.normalMax));
        g[locusKey(grp.id, i)] = pair(mk(v()), mk(v()));
      }
      g[patternLocus(b)] = pair(mk(NO_PATTERN), mk(NO_PATTERN));
    }
  }

  // 이형 소인 (모든 개체가 갖고 있음, 대부분 낮음)
  for (const m of MORPH_IDS) {
    const center = MORPHS[m].center / (MORPHS[m].loci * 2);
    const mean = m === morph ? center + 0.15 : MORPH_ALLELE.mean;
    for (let i = 0; i < MORPHS[m].loci; i++) {
      const v = () => clamp(rng.normal(mean, MORPH_ALLELE.sd), 0, MORPH_ALLELE.max);
      g[locusKey(morphGroupId(m), i)] = pair(mk(v()), mk(v()));
    }
  }

  // 날개/뿔/헤일로 색, 하이브리드 형태: 마켓 개체는 고르게 랜덤 (슬롯이 열릴 때만 보임)
  for (const l of EXTRA_COLOR_LOCI) {
    const opts = Object.keys(l.rank);
    g[l.id] = pair(mk(rng.pick(opts)), mk(rng.pick(opts)));
  }

  // 트레잇
  for (const t of TRAITS) {
    for (let i = 0; i < t.lociCount; i++) {
      g[traitLocus(t, i)] = pair(mk(rng.chance(t.freq) ? HAS : NOT), mk(rng.chance(t.freq) ? HAS : NOT));
    }
  }
  return { genome: g, founded };
}

/** 부모 한쪽이 자식에게 넘겨줄 대립유전자 (유전자마다 두 개 중 하나를 랜덤으로) */
function transmit(locus: string, p: Pair, childId: string, rng: Rng, idx?: 0 | 1): Allele {
  const a = { ...p[idx ?? (rng.chance(0.5) ? 0 : 1)] };

  // 이형 소인은 그대로 전달 (변이 없음)
  if (MORPH_LOCI.has(locus)) return a;

  const add = ADDITIVE_GROUP_OF[locus];
  if (add) {
    const isBloodline = add.id in BLOODLINE_GROUPS;
    // 특수 혈통: 초대에게서 온 높은 대립유전자만 변이 (순도를 오래 걸려 올릴 수 있게).
    // 일반 개체의 낮은 값은 건드리지 않아서 일반끼리 마력이 오르지 않음
    if (isBloodline) {
      if ((a.v as number) >= CONFIG.bloodlineMutationMinAllele && rng.chance(CONFIG.bloodlineMutationRate)) {
        a.v = clamp((a.v as number) + rng.normal(0, CONFIG.bloodlineMutationSd), 0, add.alleleMax);
        a.origin = childId;
        a.shownBy = null;
      }
      return a;
    }
    if (rng.chance(CONFIG.additiveMutationRate)) {
      a.v = clamp((a.v as number) + rng.normal(0, CONFIG.additiveMutationSd), 0, add.alleleMax);
      a.origin = childId;
      a.shownBy = null;
    }
    return a;
  }

  // 피부색의 새 색은 inheritSkin이 혈통 풀에서 따로 뽑는다
  if (locus === SKIN_COLOR.id) return a;

  const disc = DISCRETE_OF[locus];
  if (disc && rng.chance(CONFIG.discreteMutationRate)) {
    const options = Object.keys(disc.rank).filter((v) => v !== a.v);
    a.v = rng.pick(options);
    a.origin = childId;
    a.shownBy = null;
    return a;
  }

  if (locus.startsWith('trait.') && rng.chance(CONFIG.discreteMutationRate)) {
    a.v = a.v === HAS ? NOT : HAS;
    a.origin = childId;
    a.shownBy = null;
  }
  return a;
}

/** 교배: 엄마에게서 [0], 아빠에게서 [1] */
export function breedGenome(mother: Genome, father: Genome, childId: string, rng: Rng): Genome {
  // 연관 그룹: 부모마다 덩어리 단위로 어느 쪽 대립유전자를 줄지 정함
  const forced = (parent: Genome): Record<string, 0 | 1> => {
    const out: Record<string, 0 | 1> = {};
    for (const grp of LINKAGE_GROUPS) {
      const start: 0 | 1 = rng.chance(0.5) ? 0 : 1;
      const cut = rng.chance(grp.breakChance) ? rng.int(1, grp.loci.length - 1) : grp.loci.length;
      grp.loci.forEach((l, i) => {
        if (parent[l]) out[l] = i < cut ? start : ((1 - start) as 0 | 1);
      });
    }
    return out;
  };
  const fm = forced(mother);
  const ff = forced(father);
  const g: Genome = {};
  for (const locus of Object.keys(mother)) {
    g[locus] = pair(
      transmit(locus, mother[locus], childId, rng, fm[locus]),
      transmit(locus, father[locus], childId, rng, ff[locus]),
    );
  }
  inheritSkin(g, childId, rng);
  return g;
}

/**
 * 피부색: 엄마 색과 아빠 색 중 하나를 반반으로. 낮은 확률로 자식 혈통에 든 종족 풀에서 새 색
 * (종족은 실제 유전 혈통 비율로, 색은 그 종족의 빈도로 뽑는다). 보이는 색만 다음 대에 전해지도록 두 대립유전자를 같게 맞춘다
 */
function inheritSkin(g: Genome, childId: string, rng: Rng) {
  const p = g[SKIN_COLOR.id];
  if (!p) return;
  let shown: Allele;
  if (rng.chance(CONFIG.skinNewColorChance)) {
    const race = rng.weighted(geneticRace(g) as Record<RaceId, number>);
    shown = allele(rng.weighted(RACES[race].skinColor), childId, race);
  } else {
    shown = { ...p[rng.chance(0.5) ? 0 : 1] };
  }
  g[SKIN_COLOR.id] = pair(shown, { ...shown });
}

/** 농장 각성: 일반 부모 사이에서 초대가 태어남 */
export function awakenFounder(g: Genome, b: BloodlineId, childId: string, race: RaceId, rng: Rng) {
  Object.assign(g, founderAlleles(b, childId, race, rng));
}

/** 이형 소인 수치 (대립유전자 합) */
export function morphScore(g: Genome, m: (typeof MORPH_IDS)[number]): number {
  let s = 0;
  for (let i = 0; i < MORPHS[m].loci; i++) {
    const p = g[locusKey(morphGroupId(m), i)];
    s += (p[0].v as number) + (p[1].v as number);
  }
  return s;
}

/** 이형 발현 확률 (소인 수치로 계산) */
export function morphChance(g: Genome, m: (typeof MORPH_IDS)[number]): number {
  const d = MORPHS[m];
  return d.pmax / (1 + Math.exp(-(morphScore(g, m) - d.center) / d.slope));
}

/** 수치형 그룹의 유전값 (대립유전자 합) */
export function geneticSum(g: Genome, group: AdditiveGroup): number {
  let s = group.base;
  for (let i = 0; i < group.loci; i++) {
    const p = g[locusKey(group.id, i)];
    s += (p[0].v as number) + (p[1].v as number);
  }
  return s;
}

/** 실제 유전 혈통 %: 대립유전자가 어느 종족 출신인지 센다 */
export function geneticRace(g: Genome): Partial<Record<RaceId, number>> {
  const count: Partial<Record<RaceId, number>> = {};
  let total = 0;
  for (const p of Object.values(g)) {
    for (const a of p) {
      count[a.race] = (count[a.race] ?? 0) + 1;
      total++;
    }
  }
  for (const k of Object.keys(count) as RaceId[]) count[k] = count[k]! / total;
  return count;
}

/**
 * 근친 부작용: 나쁜 열성 트레잇 캐리어가 추가 확률로 발현되고, 근친이 심하면 나쁜 유전자가 새로 생긴다.
 * 유전형 자체를 바꾸므로 (동형 접합으로 만듦) 이후 자손에게도 그대로 유전된다.
 * 반환: 영향받은 트레잇 이름과 종류
 */
export function applyInbreeding(g: Genome, coi: number, childId: string, rng: Rng): { name: string; kind: 'express' | 'new' }[] {
  const out: { name: string; kind: 'express' | 'new' }[] = [];
  if (coi <= 0) return out;
  const pExpress = curve(CONFIG.inbreeding.badTraitExpress, coi);
  const pNew = curve(CONFIG.inbreeding.newBadAllele, coi);
  for (const t of TRAITS) {
    if (!t.inbreedingTarget || t.mode !== 'recessive' || t.lociCount !== 1) continue;
    const key = traitLocus(t, 0);
    const p = g[key];
    const count = (p[0].v === HAS ? 1 : 0) + (p[1].v === HAS ? 1 : 0);
    if (count === 1 && rng.chance(pExpress)) {
      const i = p[0].v === HAS ? 1 : 0;
      p[i] = { ...p[1 - i], origin: childId, shownBy: null };
      out.push({ name: t.name, kind: 'express' });
    } else if (count === 0 && rng.chance(pNew)) {
      p[rng.chance(0.5) ? 0 : 1] = { ...p[0], v: HAS, origin: childId, shownBy: null };
      out.push({ name: t.name, kind: 'new' });
    }
  }
  return out;
}
