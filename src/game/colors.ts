/**
 * 임시 초상화용 색표. 엔진은 색을 이름("갈색", "청록")으로 주기 때문에 화면용 색으로 바꾼다.
 * 실제 그림이 들어오면 같은 표를 파츠 색 입히기에 그대로 쓸 수 있다.
 */
export const HAIR_HEX: Record<string, string> = {
  검정: '#24201f', 갈색: '#6b4429', 빨강: '#b23a2e', 청록: '#2f8f8a',
  금발: '#e0b75a', 은발: '#c9cbd3', 백금: '#efe6cf', 분홍: '#e48fb0', 백색: '#f4f2ee',
};

export const EYE_HEX: Record<string, string> = {
  검정: '#1c1a1e', 갈색: '#6b4429', 금색: '#d2a227', 청록: '#2a9d8f', 초록: '#3c965a',
  파랑: '#3d6fd0', 회색: '#8a8f98', 보라: '#8a4fc7', 붉은색: '#c23b3b',
};

/** 피부 0(창백함) ~ 6(매우 어두움) */
export const SKIN_HEX = ['#fbeee6', '#f7dfcf', '#f0c8af', '#d9a07a', '#b57a52', '#8a5a3c', '#5e3d2a'];

export const hairHex = (name: string) => HAIR_HEX[name] ?? '#888888';
export const eyeHex = (name: string) => EYE_HEX[name] ?? '#666666';
export const skinHex = (tone: number) => SKIN_HEX[Math.max(0, Math.min(6, tone))];
