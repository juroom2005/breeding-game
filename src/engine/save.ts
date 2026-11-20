// 저장 형식 압축: 대립유전자 { v, origin, race, shownBy } 객체를 짧은 배열로 바꾼다.
// [값, 출처 ID, 종족 번호, 드러낸 개체 ID 또는 ''] — 수치는 소수점 3자리로 반올림

import type { Allele, Genome, RaceId } from './types';

const RACE_CODES: RaceId[] = ['human', 'elf', 'mermaid'];

type EncodedAllele = [string | number, string, number, string];
export type EncodedGenome = Record<string, [EncodedAllele, EncodedAllele]>;

const enc = (a: Allele): EncodedAllele => [
  typeof a.v === 'number' ? Math.round(a.v * 1000) / 1000 : a.v,
  a.origin,
  RACE_CODES.indexOf(a.race),
  a.shownBy ?? '',
];

const dec = (e: EncodedAllele): Allele => ({ v: e[0], origin: e[1], race: RACE_CODES[e[2]], shownBy: e[3] || null });

export function encodeGenome(g: Genome): EncodedGenome {
  const out: EncodedGenome = {};
  for (const [k, p] of Object.entries(g)) out[k] = [enc(p[0]), enc(p[1])];
  return out;
}

export function decodeGenome(e: EncodedGenome): Genome {
  const out: Genome = {};
  for (const [k, p] of Object.entries(e)) out[k] = [dec(p[0]), dec(p[1])];
  return out;
}
