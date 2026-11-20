// 이형: 돌연변이로 나타나는 겉모습 변화.
// 특수 혈통과 같은 문턱 모델이지만 랜덤 비중이 커서, 부모가 둘 다 이형이어도 잘 안 닮는다.
// 같은 이형끼리 여러 세대 이으면 숨은 소인이 쌓여서 확률이 천천히 오른다.

export type MorphId = 'pigment' | 'oddEye' | 'angel' | 'devil';

export interface MorphDef {
  id: MorphId;
  name: string;
  /** 소인 유전자 개수 (대립유전자는 x2). 일반 개체 대립유전자는 평균 0.8, 표준편차 0.3 */
  loci: number;
  /**
   * 소인 수치 → 발현 확률: pmax / (1 + e^-((소인 - center) / slope))
   * 소인이 높을수록 확률이 오르지만 pmax에서 멈춘다. 소인은 유전되고, 발현 여부는 매번 랜덤
   */
  center: number;
  slope: number;
  pmax: number;
  desc: string;
}

// 숫자는 시뮬레이션으로 맞춤:
//  일반 이형: 일반끼리 약 0.3%, 이형×일반 약 1.5%, 이형×이형 약 5%, 여러 세대 이으면 15% 근처에서 멈춤
//  오드아이: 일반끼리 약 2%, 이형×일반 약 5%, 이형×이형 약 10%, 여러 세대 이으면 30% 근처에서 멈춤
const NORMAL = { loci: 10, center: 19.3, slope: 0.5, pmax: 0.15 };

export const MORPHS: Record<MorphId, MorphDef> = {
  pigment: { id: 'pigment', name: '색소 결핍', ...NORMAL, desc: '알비노 또는 루시스틱 (50:50)' },
  oddEye: { id: 'oddEye', name: '오드아이', loci: 10, center: 18.6, slope: 0.6, pmax: 0.3, desc: '양쪽 눈 색이 다름. 다른 이형보다 잘 나옴' },
  angel: { id: 'angel', name: '엔젤 쵸즌', ...NORMAL, desc: '깃털 날개' },
  devil: { id: 'devil', name: '데빌 쵸즌', ...NORMAL, desc: '피막 날개' },
};

export const MORPH_ALLELE = { mean: 0.8, sd: 0.3, max: 2 };

export const MORPH_IDS: MorphId[] = ['pigment', 'oddEye', 'angel', 'devil'];
export const morphGroupId = (m: MorphId) => `morph.${m}`;

/** 엔젤 쵸즌 + 데빌 쵸즌이 같이 나오면 하이브리드 (이름은 가제) */
export const CHOSEN_HYBRID_NAME = '황혼 쵸즌';

/**
 * 날개/뿔/헤일로 색과 하이브리드 형태는 모든 개체가 숨은 유전자로 갖고 있다.
 * 슬롯이 열렸을 때만 보이고, 평소에도 유전되므로 외형 브리딩이 된다.
 * 마켓 1세대는 색을 고르게 랜덤으로 받는다.
 */
export const WING_COLOR = { id: 'wingColor', name: '날개 색', rank: { 흑색: 7, 붉은색: 6, 보라: 5, 푸른색: 4, 금색: 3, 은색: 2, 백색: 1 } as Record<string, number> };
export const HORN_COLOR = { id: 'hornColor', name: '뿔 색', rank: { 흑색: 5, 붉은색: 4, 금색: 3, 상아색: 2, 백색: 1 } as Record<string, number> };
export const HALO_COLOR = { id: 'haloColor', name: '헤일로 색', rank: { 붉은색: 4, 푸른색: 3, 백색: 2, 금색: 1 } as Record<string, number> };
/** 하이브리드 형태: 깃털형 = 깃털 날개 + 뿔 / 피막형 = 피막 날개 + 헤일로. 서로 다르면 출생 시 50:50 */
export const HYBRID_FORM = { id: 'hybridForm', name: '하이브리드 형태', rank: { 깃털형: 1, 피막형: 1 } as Record<string, number> };

export const EXTRA_COLOR_LOCI = [WING_COLOR, HORN_COLOR, HALO_COLOR, HYBRID_FORM];

export const PIGMENT = {
  albino: { name: '알비노', hair: '백색', eye: '붉은색', skin: '알비노 (창백함)' },
  leucistic: { name: '루시스틱', hair: '백색', skin: '루시스틱 (창백함)' }, // 눈 색은 원래대로
};
