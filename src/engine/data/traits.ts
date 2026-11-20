// 트레잇 목록 (구조 확인용 예시, 실제 목록은 미정). 겉모습이 바뀌는 돌연변이는 이형(morphs.ts)으로 분리.

import type { StatId, TraitTier } from '../types';

export interface TraitDef {
  id: string;
  name: string;
  tier: TraitTier;
  good: boolean;
  /** 우성: 하나만 있어도 발현 / 열성: 두 개 다 있어야 발현 */
  mode: 'dominant' | 'recessive';
  /** 필요한 유전자 개수. 2 이상이면 모든 유전자에서 조건을 만족해야 발현 */
  lociCount: number;
  /** 마켓 1세대에서 대립유전자가 있을 확률 (유전자마다) */
  freq: number;
  /** 능력치 보정 */
  effect: Partial<Record<StatId, number>>;
  /** 캐리어 표시 여부 */
  showCarrier: boolean;
  /** 다산: 다태아 확률 배수 */
  twinMultiplier?: number;
  /** 근친 부작용 대상인지 (나쁜 열성 트레잇) */
  inbreedingTarget?: boolean;
  desc: string;
}

export const TRAITS: TraitDef[] = [
  { id: 'gentle', name: '온순함', tier: '보통', good: true, mode: 'dominant', lociCount: 1, freq: 0.08, effect: {}, showCarrier: false, desc: '다루기 쉽다' },
  { id: 'timid', name: '겁많음', tier: '보통', good: false, mode: 'recessive', lociCount: 1, freq: 0.25, effect: { charm: -3 }, showCarrier: false, inbreedingTarget: true, desc: '쉽게 놀란다' },
  { id: 'sturdy', name: '튼튼한 체질', tier: '희귀', good: true, mode: 'recessive', lociCount: 1, freq: 0.12, effect: { vitality: 8 }, showCarrier: true, desc: '활력 +8' },
  { id: 'frail', name: '허약 체질', tier: '희귀', good: false, mode: 'recessive', lociCount: 1, freq: 0.12, effect: { vitality: -10 }, showCarrier: true, inbreedingTarget: true, desc: '활력 -10' },
  { id: 'fertile', name: '다산', tier: '희귀', good: true, mode: 'dominant', lociCount: 1, freq: 0.01, effect: {}, showCarrier: false, twinMultiplier: 4, desc: '쌍둥이/세쌍둥이 확률 4배 (엄마에게 있을 때)' },
  { id: 'starBlessed', name: '별의 축복', tier: '전설', good: true, mode: 'recessive', lociCount: 2, freq: 0.1, effect: { charm: 10, vitality: 5 }, showCarrier: true, desc: '매력 +10, 활력 +5. 유전자 2개가 모두 열성 동형이어야 발현' },
  { id: 'cursedBlood', name: '저주받은 피', tier: '전설', good: false, mode: 'recessive', lociCount: 1, freq: 0.04, effect: { charm: -15 }, showCarrier: true, inbreedingTarget: true, desc: '매력 -15' },
];

export const traitLocus = (t: TraitDef, i: number) => `trait.${t.id}.${i}`;
export const HAS = '+';
export const NOT = '-';
