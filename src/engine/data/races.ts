// 종족별 시작 값. 모든 종족은 같은 유전자를 갖고, 마켓 1세대를 만들 때 쓰는 값만 다르다.
// 수치는 전부 예시값 (밸런스 조정 대상).

import type { RaceId, StatId } from '../types';

export interface RaceDef {
  id: RaceId;
  name: string;
  /** 눈색/머리색 대립유전자 빈도 */
  eyeColor: Record<string, number>;
  hairColor: Record<string, number>;
  /** 피부색 풀과 빈도 (색 ID는 data/colors.ts). 혼혈이 새 색을 받을 때도 이 풀을 혈통 비율대로 섞어 쓴다 */
  skinColor: Record<string, number>;
  /** 슬롯별 고유 파츠 (순종은 양쪽 대립유전자 모두 이 값) */
  slots: Record<string, string>;
  /** 수치형: 대립유전자 하나의 평균과 표준편차 */
  height: [number, number];
  fat: [number, number];
  muscle: [number, number];
  chest: [number, number];
  genital: [number, number];
  /**
   * 능력치 특화: 상한은 모든 종족 공통(100)이고, 종족마다 높게 나오기 쉬운 능력치가 다르다.
   * 대립유전자 평균이 높을수록 그 능력치가 높게 나올 확률이 높다. 혼혈은 받은 유전자에 따라 섞인다.
   */
  stats: Record<Exclude<StatId, 'mana'>, [number, number]>;
  /** 임신 기간 (게임 일 수). 혼혈 엄마는 계보상 혈통 비율로 평균 후 반올림 */
  gestationDays: number;
  /** 아기 단계(정보 숨김) 기간. 혼혈은 계보상 혈통 비율로 섞어서 반올림 */
  babyDays: number;
  /** 기본 수정 확률. 부모 양쪽의 값을 평균하고 아빠 활력으로 보정 */
  fertility: number;
  /** 쌍둥이 확률. 세쌍둥이 = 쌍둥이 확률의 제곱 (헬린의 법칙) */
  twinRate: number;
  babyFace: string;
  /** 이름 후보 (외국식 이름, 임시 목록). 성별별 */
  names: { F: string[]; M: string[] };
}

// 키: 기본 100 + 대립유전자 16개 합. 평균 키 = 100 + 16 × 평균
// 0~100 수치: 대립유전자 12개 합. 평균 50 = 12 × 4.17
const S = (mean: number, sd = 1.0): [number, number] => [mean / 12, sd];

/**
 * 능력치 대립유전자 편차 (2026-11-21, 예전 1.0~1.3 → 2.2).
 * 편차가 작으면 형제끼리 능력치가 비슷해서 골라 교배해도 점수가 거의 안 오른다 (sim/inbreeding_farm.ts).
 * 마켓 매물 점수 분포는 market.ts가 목표 분포에 맞춰 뽑으므로 이 값과 상관없이 유지된다
 */
const STAT_SD = 2.2;

export const RACES: Record<RaceId, RaceDef> = {
  human: {
    id: 'human',
    name: '인간',
    eyeColor: { Chestnut: 0.3, Onyx: 0.2, Hazel: 0.15, 'Sky Blue': 0.12, Emerald: 0.08, 'Storm Grey': 0.08, Sapphire: 0.05, Violet: 0.02 },
    hairColor: { 'Dark Brown': 0.25, Raven: 0.2, Chestnut: 0.2, 'Honey Blonde': 0.15, Auburn: 0.08, 'Copper Red': 0.07, Silver: 0.05 },
    skinColor: {
      Porcelain: 0.1, Ivory: 0.15, 'Peach Cream': 0.18, 'Warm Beige': 0.17, 'Honey Tan': 0.14, Bronze: 0.11, Cocoa: 0.09, Espresso: 0.06,
    },
    slots: { ear: '둥근 귀', lowerBody: '다리', arms: '기본', skinPattern: '없음', eyeShape: '기본' },
    height: [70 / 16, 1.2],
    fat: S(50), muscle: S(50), chest: S(50, 1.6), genital: S(50, 1.6),
    // 인간: 근력 특화
    stats: { vitality: S(51, STAT_SD), strength: S(57, STAT_SD), agility: S(50, STAT_SD), charm: S(49, STAT_SD) },
    gestationDays: 2, babyDays: 2, fertility: 0.7, twinRate: 0.012,
    babyFace: '인간 아기 얼굴',
    names: {
      F: ['클라라', '엘리자', '아델', '에밀리', '한나', '로잘린', '베아트리스', '마거릿', '에블린', '소피아', '올리비아', '아멜리아', '샬럿', '루시', '비비안', '헤이즐', '아이린', '플로라'],
      M: ['리암', '노아', '에단', '헨리', '루카스', '오웬', '매튜', '줄리안', '테오', '아서', '에드워드', '사무엘', '벤자민', '레오', '해리슨', '에밋', '펠릭스', '토비아스'],
    },
  },
  elf: {
    id: 'elf',
    name: '엘프',
    eyeColor: { Gold: 0.2, Emerald: 0.15, Jade: 0.15, Sapphire: 0.12, Amber: 0.1, Lilac: 0.1, 'Storm Grey': 0.1, Violet: 0.08 },
    hairColor: { Golden: 0.3, Platinum: 0.25, Silver: 0.15, 'Honey Blonde': 0.1, Lavender: 0.1, 'Rose Pink': 0.05, Chestnut: 0.05 },
    // 미백/밝은 피부가 대부분, 특유 색은 사용자 지정. 칠흑(Royal Black)은 5%
    skinColor: {
      Porcelain: 0.18, 'Moonlit White': 0.14, 'Tender Pastel Pink': 0.14, Ivory: 0.12, 'Pink Tooth': 0.12,
      'Dewdrop Blue': 0.09, 'Easter Pink': 0.08, 'Tender Black': 0.08, 'Royal Black': 0.05,
    },
    slots: { ear: '긴 귀', lowerBody: '다리', arms: '기본', skinPattern: '없음', eyeShape: '엘프 눈' },
    height: [80 / 16, 1.2],
    fat: S(44), muscle: S(45), chest: S(46, 1.6), genital: S(46, 1.6),
    // 엘프: 민첩, 매력 특화. 근력은 낮은 편
    stats: { vitality: S(46, STAT_SD), strength: S(42, STAT_SD), agility: S(61, STAT_SD), charm: S(58, STAT_SD) },
    gestationDays: 3, babyDays: 3, fertility: 0.5, twinRate: 0.007,
    babyFace: '엘프 아기 얼굴',
    names: {
      F: ['셀레스트', '아에린', '엘로웬', '리셀', '에일라', '나리엘', '페이웬', '아엘리스', '루미엔', '엘라나', '실레아', '미렌', '이살리', '오렐리아'],
      M: ['엘라리온', '리안델', '탈리스', '에반델', '갈란드', '페이리엔', '나엘', '라에길', '카엘런', '테린', '아세리온', '벨라도르', '실바엔', '엘리온'],
    },
  },
  mermaid: {
    id: 'mermaid',
    name: '인어',
    eyeColor: { Teal: 0.3, Aquamarine: 0.25, Sapphire: 0.15, 'Storm Grey': 0.1, Violet: 0.1, Jade: 0.1 },
    hairColor: { 'Deep Teal': 0.25, 'Sea Green': 0.2, Silver: 0.15, 'Rose Pink': 0.15, Platinum: 0.1, Raven: 0.1, Lavender: 0.05 },
    skinColor: {
      Pearl: 0.2, 'Coral Blush': 0.15, Seafoam: 0.14, Sandbar: 0.12, Lagoon: 0.12, Abalone: 0.1, 'Tidal Teal': 0.1, 'Deep Sea': 0.07,
    },
    slots: { ear: '지느러미 귀', lowerBody: '꼬리', arms: '팔 지느러미', skinPattern: '비늘', eyeShape: '인어 눈' },
    height: [68 / 16, 1.2],
    fat: S(52), muscle: S(50), chest: S(52, 1.6), genital: S(50, 1.6),
    // 인어: 활력, 매력 특화
    stats: { vitality: S(60, STAT_SD), strength: S(46, STAT_SD), agility: S(50, STAT_SD), charm: S(56, STAT_SD) },
    gestationDays: 3, babyDays: 3, fertility: 0.55, twinRate: 0.007,
    babyFace: '인어 아기 얼굴',
    names: {
      F: ['마리나', '코랄리', '네리사', '오셀리아', '시렌', '테티스', '나이아', '펄리', '에리나', '도리스', '토마시나', '아쿠아린', '세렌', '로렐라이'],
      M: ['케일럽', '마린', '오시안', '네레우스', '트리톤', '코랄', '델핀', '나우텔', '포르쿠스', '마리우스', '테론', '카이로스', '이아손', '레비'],
    },
  },
};

export const RACE_IDS: RaceId[] = ['human', 'elf', 'mermaid'];
