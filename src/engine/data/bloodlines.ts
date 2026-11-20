// 특수 혈통 설정 (문턱 모델). 불/얼음의 입수 경로는 미정이라 마법과 같은 값을 임시로 쓴다.
// 혈통이 발현되면 혈통 전용 문신이 생긴다. 위치는 혈통마다 고정, 무늬 종류는 유전, 진하기는 순도에 비례.
// 몸 색은 부모에게서 물려받은 그대로.

import type { BloodlineId } from '../types';

export type TattooArea = '얼굴' | '팔' | '몸통' | '다리';

export interface BloodlineDef {
  id: BloodlineId;
  name: string;
  /** 발현 문턱 */
  threshold: number;
  /** 순도 단계 시작값: [1단계, 2단계, 3단계] */
  tierStarts: [number, number, number];
  tierNames: [string, string, string];
  /** 이 값 이상이면 미발현이어도 캐리어 표시 */
  carrierMin: number;
  /** 마켓 개체가 초대로 생성될 확률 */
  marketFounderChance: number;
  /** 농장 출생 시 일반 부모에게서 초대가 나올 확률 (각성 돌연변이) */
  farmFounderChance: number;
  /** 일반 개체 대립유전자: 0일 확률, 아니면 0~normalMax 균등 */
  normalZeroP: number;
  normalMax: number;
  /** 초대 대립유전자 범위 (균등) */
  founderRange: [number, number];
  /** 문신 무늬 종류와 우성 순위 (클수록 우성). 초대는 이 중 하나를 받고, 가문 대대로 유전된다 */
  patterns: Record<string, number>;
  /** 발현됐는데 무늬 유전자가 없을 때 쓰는 기본 무늬 */
  defaultPattern: string;
  /** 문신 위치 (고정). 그림은 파츠 모양별로 따로 (다리/꼬리, 기본 팔/팔 지느러미) */
  tattooAreas: TattooArea[];
  /** 능력치로 보이는지 (마법 = 마력) */
  shownAsStat: boolean;
}

const COMMON = {
  threshold: 15,
  tierStarts: [15, 30, 50] as [number, number, number],
  tierNames: ['1단계', '2단계', '3단계 (진혈)'] as [string, string, string],
  carrierMin: 7,
  marketFounderChance: 0.005,
  farmFounderChance: 0.002,
  normalZeroP: 0.7,
  normalMax: 0.3,
  founderRange: [0.3, 1.9] as [number, number],
};

export const BLOODLINES: Record<BloodlineId, BloodlineDef> = {
  magic: { id: 'magic', name: '마법', ...COMMON, patterns: { 별빛: 3, 심연: 2, 오로라: 1 }, defaultPattern: '희미한 마력 문양', tattooAreas: ['얼굴', '팔'], shownAsStat: true },
  fire: { id: 'fire', name: '불', ...COMMON, patterns: { 홍염: 3, 잉걸불: 2, 청염: 1 }, defaultPattern: '불씨 문양', tattooAreas: ['몸통', '팔'], shownAsStat: false },
  ice: { id: 'ice', name: '얼음', ...COMMON, patterns: { 서리: 3, 빙하: 2, 설화: 1 }, defaultPattern: '냉기 문양', tattooAreas: ['다리', '얼굴'], shownAsStat: false },
};

export const BLOODLINE_IDS: BloodlineId[] = ['magic', 'fire', 'ice'];

/**
 * 연계 혈통: 필요한 혈통이 모두 발현되면 연계 전용 문신으로 바뀐다 (원래 혈통 문신 대신).
 * 진하기는 재료 혈통들의 진하기 평균.
 */
export const COMBOS: { needs: BloodlineId[]; name: string; tattoo: string; tattooAreas: TattooArea[] }[] = [
  { needs: ['fire', 'magic'], name: '불 마법사', tattoo: '불 마법사 문신', tattooAreas: ['얼굴', '팔', '몸통'] },
  { needs: ['ice', 'magic'], name: '얼음 마법사', tattoo: '얼음 마법사 문신', tattooAreas: ['얼굴', '팔', '다리'] },
  { needs: ['fire', 'ice'], name: '불-얼음 하이브리드', tattoo: '불-얼음 문신', tattooAreas: ['몸통', '다리', '팔'] },
];

/** 문신 진하기: 문턱(15)에서 30%, 50 이상이면 100%, 사이는 직선 */
export const TATTOO_OPACITY = { atThreshold: 0.3, fullAt: 50 };

export const patternLocus = (b: BloodlineId) => `${b}Pattern`;
export const NO_PATTERN = '없음';
