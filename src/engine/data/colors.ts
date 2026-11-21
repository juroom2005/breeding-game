// 색 팔레트: 유전자 값은 영어 이름(ID)이고, 화면에는 한국어와 영어를 함께 보인다 (영문판 대비).
// 종족별로 어떤 색이 얼마나 나오는지는 races.ts의 skinColor / eyeColor / hairColor 빈도표.
// 2026-11-21 초안. 엘프 피부 6색(Dewdrop Blue ~ Tender Pastel Pink)만 사용자가 정한 색이고 나머지는 임시

export interface NamedColor {
  ko: string;
  en: string;
  hex: string;
}

export interface SkinColor extends NamedColor {
  /** 이목구비/윤곽 선 색. 아주 어두운 피부는 검은 선이 묻히므로 밝은 선을 쓴다 */
  line: string;
}

const c = (ko: string, en: string, hex: string): NamedColor => ({ ko, en, hex });
const s = (ko: string, en: string, hex: string, line: string): SkinColor => ({ ko, en, hex, line });

export const SKIN_COLORS: Record<string, SkinColor> = {
  // 자연스러운 피부 (인간 중심, 밝은 쪽은 엘프도 씀)
  'Moonlit White': s('달빛 흰색', 'Moonlit White', '#FDF8F6', '#6B4A40'),
  Porcelain: s('백자', 'Porcelain', '#FBEEE6', '#6B4A40'),
  Ivory: s('상아', 'Ivory', '#F7E1CF', '#6B4A40'),
  'Peach Cream': s('복숭아 크림', 'Peach Cream', '#F3CDB3', '#6B4436'),
  'Warm Beige': s('따뜻한 베이지', 'Warm Beige', '#E2B08C', '#5E3B2C'),
  'Honey Tan': s('꿀빛', 'Honey Tan', '#C98F65', '#4E2F22'),
  Bronze: s('청동빛', 'Bronze', '#A86E48', '#3E2418'),
  Cocoa: s('코코아', 'Cocoa', '#7A4E33', '#2A1810'),
  Espresso: s('에스프레소', 'Espresso', '#4E3324', '#C9A38C'),

  // 엘프 특유 (사용자 지정)
  'Dewdrop Blue': s('이슬 파랑', 'Dewdrop Blue', '#D1F1FF', '#4A6F8C'),
  'Tender Black': s('부드러운 검정', 'Tender Black', '#3E3D45', '#B8B3C7'),
  'Royal Black': s('칠흑', 'Royal Black', '#030303', '#9E97AD'),
  'Easter Pink': s('봄꽃 분홍', 'Easter Pink', '#FFB2C2', '#8C4357'),
  'Pink Tooth': s('연분홍', 'Pink Tooth', '#F7D9E5', '#7A4A5C'),
  'Tender Pastel Pink': s('파스텔 분홍', 'Tender Pastel Pink', '#FAE6E3', '#7A4E4A'),

  // 인어 특유
  Pearl: s('진주', 'Pearl', '#F4F1EC', '#5C5868'),
  'Coral Blush': s('산호빛', 'Coral Blush', '#F6C9BC', '#7E4638'),
  Sandbar: s('모래톱', 'Sandbar', '#E6C7A3', '#5E4029'),
  Seafoam: s('물거품', 'Seafoam', '#DDF3EA', '#3F6B60'),
  Lagoon: s('석호', 'Lagoon', '#BFE6E4', '#2F5F66'),
  Abalone: s('자개', 'Abalone', '#D8D3E8', '#4F4770'),
  'Tidal Teal': s('물결 청록', 'Tidal Teal', '#6FB3B0', '#1F4A48'),
  'Deep Sea': s('심해', 'Deep Sea', '#3A5A78', '#B5CCE0'),
};

export const EYE_COLORS: Record<string, NamedColor> = {
  Onyx: c('흑요석', 'Onyx', '#1F1B24'),
  Chestnut: c('밤색', 'Chestnut', '#6B4429'),
  Hazel: c('헤이즐', 'Hazel', '#8E7340'),
  Amber: c('호박색', 'Amber', '#D19A2A'),
  Gold: c('금빛', 'Gold', '#E2B93B'),
  Emerald: c('에메랄드', 'Emerald', '#2F9B62'),
  Jade: c('비취', 'Jade', '#5FAF8A'),
  Teal: c('청록', 'Teal', '#2A9D8F'),
  Aquamarine: c('아쿠아마린', 'Aquamarine', '#5CC8D0'),
  Sapphire: c('사파이어', 'Sapphire', '#2F5FC4'),
  'Sky Blue': c('하늘색', 'Sky Blue', '#6FA8DC'),
  'Storm Grey': c('잿빛', 'Storm Grey', '#8A8F98'),
  Violet: c('제비꽃', 'Violet', '#8A4FC7'),
  Lilac: c('라일락', 'Lilac', '#B79AE0'),
  // 알비노 전용 (유전되지 않음)
  Ruby: c('루비', 'Ruby', '#C23B3B'),
};

export const HAIR_COLORS: Record<string, NamedColor> = {
  Raven: c('흑단', 'Raven', '#1E1A1C'),
  'Dark Brown': c('흑갈색', 'Dark Brown', '#3B2A22'),
  Chestnut: c('밤색', 'Chestnut', '#6B4429'),
  Auburn: c('적갈색', 'Auburn', '#8C3B26'),
  'Copper Red': c('구리빛 빨강', 'Copper Red', '#B5482F'),
  'Honey Blonde': c('꿀빛 금발', 'Honey Blonde', '#D9AE62'),
  Golden: c('금발', 'Golden', '#E8C66A'),
  'Deep Teal': c('짙은 청록', 'Deep Teal', '#1F6F73'),
  'Sea Green': c('바다 초록', 'Sea Green', '#3FA39A'),
  Silver: c('은발', 'Silver', '#C9CBD3'),
  Platinum: c('백금', 'Platinum', '#EFE6CF'),
  Lavender: c('라벤더', 'Lavender', '#B9A3D9'),
  'Rose Pink': c('장밋빛 분홍', 'Rose Pink', '#E48FB0'),
  // 알비노/루시스틱 전용 (유전되지 않음)
  'Snow White': c('눈빛 흰색', 'Snow White', '#F4F2EE'),
};

/** 예전 저장(2026-11-21 전)의 한국어 색 이름 → 새 ID */
export const LEGACY_EYE: Record<string, string> = {
  검정: 'Onyx', 갈색: 'Chestnut', 금색: 'Gold', 청록: 'Teal', 초록: 'Emerald', 파랑: 'Sapphire', 회색: 'Storm Grey', 보라: 'Violet', 붉은색: 'Ruby',
};
export const LEGACY_HAIR: Record<string, string> = {
  검정: 'Raven', 갈색: 'Chestnut', 빨강: 'Copper Red', 청록: 'Deep Teal', 금발: 'Golden', 은발: 'Silver', 백금: 'Platinum', 분홍: 'Rose Pink', 백색: 'Snow White',
};
/** 예전 피부 0(창백함)~6(매우 어두움) 단계 → 새 ID */
export const LEGACY_SKIN = ['Porcelain', 'Ivory', 'Peach Cream', 'Warm Beige', 'Bronze', 'Cocoa', 'Espresso'];

const TABLE_OF: Record<string, Record<string, NamedColor>> = { eyeColor: EYE_COLORS, hairColor: HAIR_COLORS, skinColor: SKIN_COLORS };

/** 유전 메모 문구용 이름 (색이면 한국어 이름, 아니면 값 그대로) */
export const valueName = (locusId: string, v: string): string => TABLE_OF[locusId]?.[v]?.ko ?? v;

/** 화면 표시: "이슬 파랑 (Dewdrop Blue)" */
export const colorLabel = (col: NamedColor | undefined, fallback: string): string => (col ? `${col.ko} (${col.en})` : fallback);
