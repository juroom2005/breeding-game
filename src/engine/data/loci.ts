// 모든 종족이 공유하는 유전자 정의.
// 종족은 이 유전자들의 "시작 값"만 다르다 (races.ts).

import type { BloodlineId, RaceId, StatId } from '../types';

// ─── 뚜렷한 값(색, 파츠)을 갖는 유전자 ─────────────────────────────

export interface DiscreteLocus {
  id: string;
  name: string;
  /** 우성 순위. 숫자가 클수록 우성. 같은 순위면 먼저 받은 쪽(엄마) */
  rank: Record<string, number>;
  /** 불완전 우성: 두 값 조합 → 중간형. 키는 두 값을 가나다순으로 '|'로 이은 것 */
  blend?: Record<string, string>;
  /** 출처 표시 (조부모 유전 등)를 할지 */
  showInheritance: boolean;
  /**
   * 발현 조건: 이 값은 실제 유전 혈통에서 해당 종족 비율이 min 이상일 때만 겉으로 나온다.
   * 조건을 못 채우면 다른 대립유전자가 나오고, 그것도 안 되면 fallback.
   */
  conditions?: Record<string, { race: RaceId; min: number }>;
  fallback?: string;
}

export const EYE_COLOR: DiscreteLocus = {
  id: 'eyeColor',
  name: '눈색',
  rank: { 검정: 8, 갈색: 7, 금색: 6, 청록: 5, 초록: 4, 파랑: 3, 회색: 2, 보라: 1 },
  showInheritance: true,
};

export const HAIR_COLOR: DiscreteLocus = {
  id: 'hairColor',
  name: '머리색',
  rank: { 검정: 8, 갈색: 7, 빨강: 6, 청록: 5, 금발: 4, 은발: 3, 백금: 2, 분홍: 1 },
  showInheritance: true,
};

/** 외모 파츠 슬롯. 같은 공간을 차지하는 파츠는 한 슬롯 */
export const SLOTS: DiscreteLocus[] = [
  {
    id: 'ear',
    name: '귀',
    rank: { '긴 귀': 3, '지느러미 귀': 2, '둥근 귀': 1 },
    // 불완전 우성 예시: 둥근 귀 + 긴 귀 → 반엘프 귀 (그림 1장 추가 필요)
    blend: { '긴 귀|둥근 귀': '반엘프 귀' },
    showInheritance: true,
  },
  {
    id: 'lowerBody',
    name: '하체',
    // 꼬리 열성: 혼혈 1세대는 다리, 꼬리 유전자를 가진 혼혈끼리면 25%로 꼬리.
    // 혈통 % 조건을 추가로 걸 수도 있다: conditions: { 꼬리: { race: 'mermaid', min: 0.4 } }, fallback: '다리'
    rank: { 다리: 2, 꼬리: 1 },
    showInheritance: true,
  },
  {
    id: 'arms',
    name: '팔/손',
    rank: { 기본: 2, '팔 지느러미': 1 },
    showInheritance: true,
  },
  {
    id: 'skinPattern',
    name: '피부 무늬',
    rank: { 없음: 2, 비늘: 1 },
    showInheritance: true,
  },
  {
    id: 'eyeShape',
    name: '눈 모양',
    rank: { '엘프 눈': 3, '인어 눈': 2, 기본: 1 },
    showInheritance: true,
  },
];

// ─── 수치형 유전자 (여러 유전자의 합) ─────────────────────────────

export interface AdditiveGroup {
  id: string;
  name: string;
  loci: number; // 유전자 개수 (대립유전자는 x2)
  base: number; // 기본값
  alleleMax: number; // 대립유전자 하나의 최대값 (상한)
  /** 출생 시 환경 랜덤: 고정 표준편차 */
  noiseSd: number;
  /** 출생 시 환경 랜덤: 유전값에 비례하는 표준편차 (특수 혈통용) */
  noiseRel?: number;
  min: number;
  max: number;
}

/** 피부색: 유전자 3개, 대립유전자 0/1 → 0~6단계 */
export const SKIN: AdditiveGroup = {
  id: 'skin', name: '피부색', loci: 3, base: 0, alleleMax: 1, noiseSd: 0, min: 0, max: 6,
};
export const SKIN_TONE_NAMES = ['창백함', '매우 밝음', '밝음', '중간', '구릿빛', '어두움', '매우 어두움'];

export const BODY: Record<'height' | 'fat' | 'muscle', AdditiveGroup> = {
  height: { id: 'height', name: '키', loci: 8, base: 100, alleleMax: 8, noiseSd: 4, min: 120, max: 230 },
  fat: { id: 'fat', name: '체지방', loci: 6, base: 0, alleleMax: 8.33, noiseSd: 8, min: 0, max: 100 },
  muscle: { id: 'muscle', name: '근육', loci: 6, base: 0, alleleMax: 8.33, noiseSd: 8, min: 0, max: 100 },
};

/** 한성 형질: 유전자는 양쪽 성별이 다 갖고, 한쪽 성별에서만 발현 */
export const SEX_TRAITS = {
  chest: { id: 'chest', name: '가슴 크기', expressedIn: 'F' as const, loci: 6, base: 0, alleleMax: 8.33, noiseSd: 6, min: 0, max: 100 },
  genital: { id: 'genital', name: '성기 크기', expressedIn: 'M' as const, loci: 6, base: 0, alleleMax: 8.33, noiseSd: 6, min: 0, max: 100 },
};

export const STATS: Record<Exclude<StatId, 'mana'>, AdditiveGroup> = {
  vitality: { id: 'vitality', name: '활력', loci: 6, base: 0, alleleMax: 8.33, noiseSd: 4, min: 0, max: 100 },
  strength: { id: 'strength', name: '근력', loci: 6, base: 0, alleleMax: 8.33, noiseSd: 4, min: 0, max: 100 },
  agility: { id: 'agility', name: '민첩', loci: 6, base: 0, alleleMax: 8.33, noiseSd: 4, min: 0, max: 100 },
  charm: { id: 'charm', name: '매력', loci: 6, base: 0, alleleMax: 8.33, noiseSd: 4, min: 0, max: 100 },
};

export const STAT_NAMES: Record<StatId, string> = {
  vitality: '활력', strength: '근력', agility: '민첩', charm: '매력', mana: '마력',
};

/** 특수 혈통 수치 (문턱 모델). 마법은 '마력' 능력치로 그대로 보인다 */
export const BLOODLINE_GROUPS: Record<BloodlineId, AdditiveGroup> = {
  magic: { id: 'magic', name: '마력', loci: 10, base: 0, alleleMax: 5, noiseSd: 0.05, noiseRel: 0.15, min: 0, max: 100 },
  fire: { id: 'fire', name: '불 혈통 수치', loci: 10, base: 0, alleleMax: 5, noiseSd: 0.05, noiseRel: 0.15, min: 0, max: 100 },
  ice: { id: 'ice', name: '얼음 혈통 수치', loci: 10, base: 0, alleleMax: 5, noiseSd: 0.05, noiseRel: 0.15, min: 0, max: 100 },
};

/**
 * 연관 유전: 같은 그룹 유전자는 한 덩어리로 같은 부모 쪽에서 넘어간다.
 * breakChance 확률로 덩어리 중간이 한 번 끊겨서 앞뒤가 다른 쪽에서 온다.
 * 종족 파츠를 묶어서 혼혈 후손의 외모가 종족별로 정돈되게 한다.
 */
export const LINKAGE_GROUPS: { id: string; loci: string[]; breakChance: number }[] = [
  { id: 'raceParts', loci: ['ear', 'eyeShape', 'arms', 'skinPattern', 'lowerBody'], breakChance: 0.1 },
];

export const HAIR_STYLES = ['짧은 머리', '단발', '긴 생머리', '웨이브', '묶은 머리', '땋은 머리'];

/** 유전자 ID 만들기: 수치형 그룹의 i번째 유전자 */
export const locusKey = (groupId: string, i: number) => `${groupId}.${i}`;
