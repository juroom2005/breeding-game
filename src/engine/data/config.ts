// 밸런스 수치는 전부 여기 모아둔다. 시뮬레이션(sim/simulate.ts)을 돌려보며 조정.

export const CONFIG = {
  /**
   * 마켓 1세대가 눈색/머리색에서 겉으로 보이는 색과 다른 숨은 유전자를 가질 확률.
   * 높을수록 "부모에게 없던 색", "조부모 색"이 자주 나온다.
   */
  marketHiddenColorChance: 0.2,

  /** 색/파츠 대립유전자가 전달될 때 다른 값으로 바뀔 확률 */
  discreteMutationRate: 0.002,
  /** 수치형 대립유전자가 전달될 때 살짝 변할 확률과 폭 */
  additiveMutationRate: 0.01,
  additiveMutationSd: 1,

  /** 특수 혈통 대립유전자 변이: 이 값 이상인 대립유전자만, 이 확률로, 이 폭만큼 */
  bloodlineMutationMinAllele: 0.3,
  bloodlineMutationRate: 0.03,
  bloodlineMutationSd: 0.5,

  /**
   * 근친 효과 곡선: [근친 계수, 값] 점들 사이를 직선으로 잇는다.
   * 참고: 남매/부모자식 교배 1번 = 0.25, 2대 연속 남매 교배 = 0.375, 3대 = 0.5, 4대 = 0.59, 5대 = 0.67
   */
  // 2026-11-21 완화: 플레이해 보니 브리딩이 막힘. 농장 10칸/임신실 2칸 시뮬레이션(sim/inbreeding_farm.ts)에서
  // 작은 농장은 근친이 거의 피할 수 없어서(평균 근친 계수 40% 안팎) 예전 곡선이면 120일 동안 1점 정도밖에 안 올랐다
  inbreeding: {
    /** 능력치(활력/근력/민첩/매력) 감소 비율. 2대 연속 남매 교배(0.375)까지는 없음, 그 뒤로 서서히 */
    statPenalty: [[0, 0], [0.375, 0], [0.5, 0.01], [0.625, 0.03], [0.75, 0.05], [1, 0.08]] as [number, number][],
    /** 나쁜 열성 트레잇 캐리어가 근친 때문에 발현될 추가 확률 (트레잇마다) */
    badTraitExpress: [[0, 0], [0.125, 0.02], [0.25, 0.04], [0.375, 0.06], [0.5, 0.12], [0.75, 0.18], [1, 0.2]] as [number, number][],
    /** 근친이 심하면 없던 나쁜 유전자가 새로 생길 확률 (트레잇마다) */
    newBadAllele: [[0, 0], [0.5, 0], [0.75, 0.02], [1, 0.05]] as [number, number][],
  },

  /** 신체 라벨 기준 (전체 공통 기준) */
  body: {
    shortBelow: 162,
    tallAbove: 180,
    thinBelow: 38,
    plumpAbove: 62,
    muscularAbove: 62,
    sturdyMinHeight: 168, // 이 키 이상 + 근육이 많음 → 건장함
  },

  /** 한성 형질 라벨 기준 */
  sexTrait: {
    smallBelow: 38,
    largeAbove: 62,
  },

  /** 알비노가 특수 혈통 문신도 가릴지 (false = 흰 몸에 문신은 그대로) */
  albinoHidesBloodlineEffect: false,

  /** 아빠 활력이 수정 확률에 주는 영향: 배수 = 0.5 + 활력/100 (활력 50이면 1배, 100이면 1.5배) */
  fertilityVitalityBase: 0.5,
  fertilityMin: 0.05,
  fertilityMax: 0.95,

  /** 유전자 키트: 이형 발현 확률이 최대치(pmax)의 이 비율 이상이면 표시 */
  geneKit: { someAt: 0.2, highAt: 0.5 },

  /** 한성 형질 표시/파츠 교체 옵션 (배포처별로 끌 수 있게) */
  sexTraitsEnabled: true,
};

/** 곡선 값 읽기 (구간 사이는 직선 보간) */
export function curve(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

export const inbreedingStatPenalty = (coi: number) => curve(CONFIG.inbreeding.statPenalty, coi);
