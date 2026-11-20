// 유전형 → 겉모습/능력치. 출생 시 한 번 계산해서 저장한다 (환경 랜덤이 들어가므로).

import { Rng } from './rng';
import type { BloodlineId, BloodlineState, ExtraParts, Genome, Pair, Phenotype, RaceId, Sex, StatId, Tattoo, TraitState } from './types';
import { CONFIG, inbreedingStatPenalty } from './data/config';
import {
  BLOODLINE_GROUPS, BODY, EYE_COLOR, HAIR_COLOR, HAIR_STYLES, SEX_TRAITS, SKIN, SKIN_TONE_NAMES, SLOTS, STATS,
  type AdditiveGroup, type DiscreteLocus,
} from './data/loci';
import { BLOODLINES, BLOODLINE_IDS, COMBOS, NO_PATTERN, TATTOO_OPACITY, patternLocus } from './data/bloodlines';
import { CHOSEN_HYBRID_NAME, HALO_COLOR, HORN_COLOR, HYBRID_FORM, MORPHS, MORPH_IDS, PIGMENT, WING_COLOR, type MorphId } from './data/morphs';
import { HAS, TRAITS, traitLocus } from './data/traits';
import { geneticRace, geneticSum, morphChance } from './genome';

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

/** 뚜렷한 값 유전자의 발현값: 불완전 우성 조합 → 중간형, 아니면 우성 순위가 높은 쪽 */
export function expressDiscrete(
  locus: DiscreteLocus,
  p: Pair,
  race?: Partial<Record<RaceId, number>>,
): string {
  let a = p[0].v as string;
  let b = p[1].v as string;
  if (locus.conditions && race) {
    const ok = (v: string) => {
      const c = locus.conditions![v];
      return !c || (race[c.race] ?? 0) >= c.min;
    };
    if (!ok(a) && !ok(b)) return locus.fallback ?? a;
    if (!ok(a)) a = b;
    if (!ok(b)) b = a;
  }
  if (a !== b && locus.blend) {
    const key = [a, b].sort().join('|');
    if (locus.blend[key]) return locus.blend[key];
  }
  return (locus.rank[b] ?? 0) > (locus.rank[a] ?? 0) ? b : a;
}

function withNoise(g: Genome, group: AdditiveGroup, rng: Rng): number {
  const gen = geneticSum(g, group);
  const sd = Math.max(group.noiseSd, (group.noiseRel ?? 0) * gen);
  return clamp(gen + rng.normal(0, sd), group.min, group.max);
}

function bloodlineState(g: Genome, b: BloodlineId, rng: Rng): BloodlineState {
  const def = BLOODLINES[b];
  const value = round1(withNoise(g, BLOODLINE_GROUPS[b], rng));
  const expressed = value >= def.threshold;
  let tier = 0;
  if (expressed) tier = value >= def.tierStarts[2] ? 3 : value >= def.tierStarts[1] ? 2 : 1;

  let pattern: string | null = null;
  let opacity = 0;
  if (expressed) {
    const p = g[patternLocus(b)];
    const cands = [p[0].v as string, p[1].v as string].filter((v) => v !== NO_PATTERN);
    pattern = cands.length
      ? cands.reduce((best, v) => ((def.patterns[v] ?? 0) > (def.patterns[best] ?? 0) ? v : best))
      : def.defaultPattern;
    const t = (value - def.threshold) / (TATTOO_OPACITY.fullAt - def.threshold);
    opacity = Math.round(clamp(TATTOO_OPACITY.atThreshold + t * (1 - TATTOO_OPACITY.atThreshold), 0, 1) * 100) / 100;
  }
  return {
    value,
    expressed,
    tier,
    tierName: tier ? def.tierNames[tier - 1] : '',
    carrier: !expressed && value >= def.carrierMin,
    pattern,
    opacity,
  };
}

function traitStates(g: Genome): { traits: TraitState[]; carriers: string[] } {
  const traits: TraitState[] = [];
  const carriers: string[] = [];
  for (const t of TRAITS) {
    const counts: number[] = [];
    for (let i = 0; i < t.lociCount; i++) {
      const p = g[traitLocus(t, i)];
      counts.push((p[0].v === HAS ? 1 : 0) + (p[1].v === HAS ? 1 : 0));
    }
    const expressed = t.mode === 'dominant' ? counts.every((c) => c >= 1) : counts.every((c) => c === 2);
    if (expressed) traits.push({ id: t.id, name: t.name, tier: t.tier, good: t.good });
    else if (t.showCarrier && counts.some((c) => c >= 1)) carriers.push(t.name);
  }
  return { traits, carriers };
}

function bodyLabels(height: number, fat: number, muscle: number): string[] {
  const c = CONFIG.body;
  const out: string[] = [];
  if (height < c.shortBelow) out.push('키가 작음');
  if (height > c.tallAbove) out.push('키가 큼');
  if (fat < c.thinBelow) out.push('말랐음');
  if (fat > c.plumpAbove) out.push('통통함');
  if (muscle > c.muscularAbove) out.push(height >= c.sturdyMinHeight ? '건장함' : '근육이 많음');
  return out;
}

function sizeLabel(v: number): string | null {
  if (v < CONFIG.sexTrait.smallBelow) return '작음';
  if (v > CONFIG.sexTrait.largeAbove) return '큼';
  return null;
}

export function computePhenotype(g: Genome, sex: Sex, coi: number, rng: Rng): Phenotype {
  // 색
  const skinTone = clamp(Math.round(geneticSum(g, SKIN)), SKIN.min, SKIN.max);

  // 슬롯
  const race = geneticRace(g);
  const slots: Record<string, string> = {};
  for (const s of SLOTS) slots[s.id] = expressDiscrete(s, g[s.id], race);

  // 신체
  const height = Math.round(withNoise(g, BODY.height, rng));
  const fat = Math.round(withNoise(g, BODY.fat, rng));
  const muscle = Math.round(withNoise(g, BODY.muscle, rng));

  // 한성 형질: 발현되는 성별은 수치+라벨, 반대 성별은 숨은 유전값으로 캐리어 표시
  const own = sex === 'F' ? SEX_TRAITS.chest : SEX_TRAITS.genital;
  const other = sex === 'F' ? SEX_TRAITS.genital : SEX_TRAITS.chest;
  const ownValue = Math.round(withNoise(g, own, rng));
  const otherLabel = sizeLabel(geneticSum(g, other));

  // 트레잇
  const { traits, carriers } = traitStates(g);

  // 능력치: 유전값 + 환경 + 트레잇 보정 - 근친 페널티
  const bonus: Partial<Record<StatId, number>> = {};
  for (const t of traits) {
    const def = TRAITS.find((d) => d.id === t.id)!;
    for (const [k, v] of Object.entries(def.effect) as [StatId, number][]) bonus[k] = (bonus[k] ?? 0) + v;
  }
  const penalty = 1 - inbreedingStatPenalty(coi);
  const stats = {} as Record<StatId, number>;
  for (const [k, group] of Object.entries(STATS) as [Exclude<StatId, 'mana'>, AdditiveGroup][]) {
    stats[k] = Math.round(clamp((withNoise(g, group, rng) + (bonus[k] ?? 0)) * penalty, 0, 100));
  }

  // 특수 혈통 (마력 = 마법 혈통 수치)
  const bloodlines = {} as Record<BloodlineId, BloodlineState>;
  for (const b of BLOODLINE_IDS) bloodlines[b] = bloodlineState(g, b, rng);
  stats.mana = bloodlines.magic.value;

  const activeCombos = COMBOS.filter((c) => c.needs.every((b) => bloodlines[b].expressed));
  const combos = activeCombos.map((c) => c.name);

  // 문신: 연계 혈통이면 재료 혈통 문신 대신 연계 문신
  const tattoos: Tattoo[] = [];
  const usedInCombo = new Set<BloodlineId>(activeCombos.flatMap((c) => c.needs));
  for (const c of activeCombos) {
    const op = c.needs.reduce((sum, b) => sum + bloodlines[b].opacity, 0) / c.needs.length;
    tattoos.push({ source: c.name, pattern: c.tattoo, areas: c.tattooAreas, opacity: Math.round(op * 100) / 100 });
  }
  for (const b of BLOODLINE_IDS) {
    const st = bloodlines[b];
    if (st.expressed && !usedInCombo.has(b)) {
      tattoos.push({ source: BLOODLINES[b].name, pattern: st.pattern!, areas: BLOODLINES[b].tattooAreas, opacity: st.opacity });
    }
  }

  // 이형: 소인 수치로 발현 확률을 정하고 매번 랜덤
  const morphOn = {} as Record<MorphId, boolean>;
  for (const m of MORPH_IDS) {
    morphOn[m] = rng.chance(morphChance(g, m));
  }
  const albino = morphOn.pigment && rng.chance(0.5);
  const leucistic = morphOn.pigment && !albino;

  // 눈: 알비노는 붉은 눈. 오드아이는 왼쪽 = 엄마 쪽, 오른쪽 = 아빠 쪽 대립유전자.
  // 두 대립유전자가 같으면 오른쪽 눈은 다른 색으로 변이
  const eyePair = g[EYE_COLOR.id];
  let eyeLeft = expressDiscrete(EYE_COLOR, eyePair);
  let eyeRight = eyeLeft;
  const oddEye = morphOn.oddEye && !albino;
  if (oddEye) {
    eyeLeft = eyePair[0].v as string;
    eyeRight = eyePair[1].v as string;
    if (eyeLeft === eyeRight) eyeRight = rng.pick(Object.keys(EYE_COLOR.rank).filter((c) => c !== eyeLeft));
  }
  if (albino) eyeLeft = eyeRight = PIGMENT.albino.eye;

  // 날개/뿔/헤일로: 엔젤 쵸즌 = 깃털 날개, 데빌 쵸즌 = 피막 날개,
  // 둘 다 = 하이브리드 (깃털형: 깃털 날개 + 뿔 / 피막형: 피막 날개 + 헤일로)
  const colorOf = (l: { id: string; rank: Record<string, number> }) => {
    const p = g[l.id];
    const a = p[0].v as string;
    const b = p[1].v as string;
    if ((l.rank[a] ?? 0) === (l.rank[b] ?? 0)) return rng.chance(0.5) ? a : b;
    return (l.rank[b] ?? 0) > (l.rank[a] ?? 0) ? b : a;
  };
  const extraParts: ExtraParts = { wings: null, horns: null, halo: null };
  const morphs: string[] = [];
  if (albino) morphs.push(PIGMENT.albino.name);
  if (leucistic) morphs.push(PIGMENT.leucistic.name);
  if (oddEye) morphs.push(MORPHS.oddEye.name);
  if (morphOn.angel && morphOn.devil) {
    morphs.push(CHOSEN_HYBRID_NAME);
    if (colorOf(HYBRID_FORM) === '깃털형') {
      extraParts.wings = { type: '깃털 날개', color: colorOf(WING_COLOR) };
      extraParts.horns = { color: colorOf(HORN_COLOR) };
    } else {
      extraParts.wings = { type: '피막 날개', color: colorOf(WING_COLOR) };
      extraParts.halo = { color: colorOf(HALO_COLOR) };
    }
  } else if (morphOn.angel) {
    morphs.push(MORPHS.angel.name);
    extraParts.wings = { type: '깃털 날개', color: colorOf(WING_COLOR) };
  } else if (morphOn.devil) {
    morphs.push(MORPHS.devil.name);
    extraParts.wings = { type: '피막 날개', color: colorOf(WING_COLOR) };
  }

  if (albino && CONFIG.albinoHidesBloodlineEffect) tattoos.length = 0;
  const pale = albino || leucistic;

  return {
    eyeColor: oddEye ? `${eyeLeft} / ${eyeRight}` : eyeLeft,
    eyeLeft,
    eyeRight,
    hairColor: pale ? PIGMENT.albino.hair : expressDiscrete(HAIR_COLOR, g[HAIR_COLOR.id]),
    skinTone: pale ? 0 : skinTone,
    skinToneName: albino ? PIGMENT.albino.skin : leucistic ? PIGMENT.leucistic.skin : SKIN_TONE_NAMES[skinTone],
    albino,
    leucistic,
    oddEye,
    morphs,
    extraParts,
    tattoos,
    hairStyle: rng.pick(HAIR_STYLES),
    slots,
    body: { height, fat, muscle, labels: bodyLabels(height, fat, muscle) },
    sexTrait: { name: own.name, value: ownValue, label: sizeLabel(ownValue) },
    sexCarrier: otherLabel ? { name: other.name, label: otherLabel } : null,
    stats,
    bloodlines,
    combos,
    traits,
    traitCarriers: carriers,
  };
}
