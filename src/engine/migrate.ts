// 예전 저장 형식을 지금 형식으로 옮긴다. World.load가 유전자를 풀어 놓은 뒤 부른다.

import type { Allele, Genome, Individual } from './types';
import { LEGACY_EYE, LEGACY_HAIR, LEGACY_SKIN } from './data/colors';

/** 저장 형식 2 → 3 (2026-11-21): 피부색 0~6단계 → 이름 있는 색, 눈/머리색 한국어 이름 → 영어 ID */
export function migrateV2(ind: Individual) {
  const shownSkin = migrateGenomeV2(ind.genome, ind.pheno.albino || ind.pheno.leucistic ? null : ind.id);
  for (const e of ind.pregnancy?.embryos ?? []) migrateGenomeV2(e.genome, null);

  const p = ind.pheno as Individual['pheno'] & { skinTone?: number; skinToneName?: string };
  p.eyeLeft = LEGACY_EYE[p.eyeLeft] ?? p.eyeLeft;
  p.eyeRight = LEGACY_EYE[p.eyeRight] ?? p.eyeRight;
  p.eyeColor = p.oddEye ? `${p.eyeLeft} / ${p.eyeRight}` : p.eyeLeft;
  p.hairColor = LEGACY_HAIR[p.hairColor] ?? p.hairColor;
  // 판매/사망 개체는 유전자가 없으므로 저장된 단계로 정한다 (창백한 개체는 원래 단계를 알 수 없어 가장 밝은 색)
  p.skinColor = shownSkin ?? LEGACY_SKIN[p.skinTone ?? 0];
  delete p.skinTone;
  delete p.skinToneName;
}

/** 반환: 옮긴 피부색 ID (유전자가 없으면 null) */
function migrateGenomeV2(g: Genome, shownBy: string | null): string | null {
  for (const [locus, table] of [['eyeColor', LEGACY_EYE], ['hairColor', LEGACY_HAIR]] as const) {
    for (const a of g[locus] ?? []) a.v = table[a.v as string] ?? a.v;
  }
  const old = Object.keys(g).filter((k) => k.startsWith('skin.'));
  if (!old.length) return null;
  const tone = old.reduce((sum, k) => sum + (g[k][0].v as number) + (g[k][1].v as number), 0);
  const first = g[old[0]][0];
  for (const k of old) delete g[k];
  const color = LEGACY_SKIN[Math.max(0, Math.min(LEGACY_SKIN.length - 1, Math.round(tone)))];
  const a: Allele = { v: color, origin: first.origin, race: first.race, shownBy };
  g.skinColor = [a, { ...a }];
  return color;
}
