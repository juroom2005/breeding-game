// 엔진은 색을 ID("Dewdrop Blue")로 준다. 화면용 HEX와 이름은 엔진 팔레트(data/colors.ts)에서 꺼낸다
import { EYE_COLORS, HAIR_COLORS, PIGMENT, SKIN_COLORS, colorLabel, type Phenotype } from '@/engine';

/** 알비노/루시스틱의 창백한 피부 (유전 색이 아니라 겉모습만) */
const PALE_SKIN = { hex: '#FBF7F4', line: '#6B4A40' };
const FALLBACK = { hex: '#888888', line: '#3a302b' };

export const hairHex = (id: string) => HAIR_COLORS[id]?.hex ?? FALLBACK.hex;
export const eyeHex = (id: string) => EYE_COLORS[id]?.hex ?? FALLBACK.hex;

/** 겉으로 보이는 피부 HEX와 이목구비 선 색 */
export function skinLook(p: Phenotype): { hex: string; line: string } {
  if (p.albino || p.leucistic) return PALE_SKIN;
  return SKIN_COLORS[p.skinColor] ?? FALLBACK;
}

export const hairName = (id: string) => colorLabel(HAIR_COLORS[id], id);
export const eyeName = (id: string) => colorLabel(EYE_COLORS[id], id);

/** 상세 표시용 피부 이름. 창백한 이형은 원래 피부색을 함께 적는다 (자식에게는 원래 색이 전해지므로) */
export function skinName(p: Phenotype): string {
  const own = colorLabel(SKIN_COLORS[p.skinColor], p.skinColor);
  if (p.albino) return `${PIGMENT.albino.skin} · 유전 피부색 ${own}`;
  if (p.leucistic) return `${PIGMENT.leucistic.skin} · 유전 피부색 ${own}`;
  return own;
}

/** 눈색 표시 (오드아이면 왼쪽 / 오른쪽, 캐릭터 기준) */
export const eyeColorName = (p: Phenotype) => (p.oddEye ? `${eyeName(p.eyeLeft)} / ${eyeName(p.eyeRight)}` : eyeName(p.eyeLeft));
