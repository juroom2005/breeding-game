// 실제 그림이 나오면 이 컴포넌트만 파츠 렌더러로 교체한다
import type { Individual } from '@/engine';
import { eyeHex, hairHex, skinHex } from '@/game/colors';

interface Props {
  ind: Individual;
  baby?: boolean;
  size?: number;
  /** 주변 텍스트가 이미 개체를 설명하면 true (스크린 리더가 중복으로 읽지 않게) */
  decorative?: boolean;
}

export default function Portrait({ ind, baby = false, size = 96, decorative = false }: Props) {
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': baby ? `${ind.name} (아기, 외모 비공개)` : `${ind.name} 초상화` };
  const p = ind.pheno;
  const skin = skinHex(p.skinTone);
  const hair = hairHex(p.hairColor);
  const ear = p.slots.ear ?? '둥근 귀';
  const long = ind.sex === 'F';

  if (baby) {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} {...a11y}>
        <rect width="100" height="100" rx="14" fill="#efe9dd" />
        <ellipse cx="50" cy="96" rx="26" ry="16" fill="#e3d8c6" />
        <circle cx="50" cy="56" r="22" fill="#e3d8c6" />
        <text x="50" y="64" textAnchor="middle" fontSize="22" fill="#a89c8a" fontWeight="700">?</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} {...a11y}>
      <rect width="100" height="100" rx="14" fill="#efe9dd" />
      {long && <path d="M26 44 Q24 86 34 92 L66 92 Q76 86 74 44 Z" fill={hair} />}
      <path d="M18 100 Q20 80 40 76 L60 76 Q80 80 82 100 Z" fill="#7c6fae" />
      <rect x="43" y="62" width="14" height="16" fill={skin} />
      {ear === '긴 귀' && (
        <>
          <path d="M30 48 L12 32 L31 56 Z" fill={skin} stroke="#00000022" />
          <path d="M70 48 L88 32 L69 56 Z" fill={skin} stroke="#00000022" />
        </>
      )}
      {ear === '지느러미 귀' && (
        <>
          <path d="M30 46 L16 38 L18 50 L14 58 L31 56 Z" fill="#7fc4c8" stroke="#00000022" />
          <path d="M70 46 L84 38 L82 50 L86 58 L69 56 Z" fill="#7fc4c8" stroke="#00000022" />
        </>
      )}
      {ear === '둥근 귀' && (
        <>
          <ellipse cx="30" cy="51" rx="4" ry="6" fill={skin} />
          <ellipse cx="70" cy="51" rx="4" ry="6" fill={skin} />
        </>
      )}
      <ellipse cx="50" cy="48" rx="20" ry="22" fill={skin} />
      {/* 캐릭터 기준 오른눈이 화면 왼쪽 */}
      <ellipse cx="42" cy="51" rx="3.6" ry="4.2" fill={eyeHex(p.eyeRight)} />
      <ellipse cx="58" cy="51" rx="3.6" ry="4.2" fill={eyeHex(p.eyeLeft)} />
      <circle cx="43" cy="49.5" r="1.1" fill="#fff" />
      <circle cx="59" cy="49.5" r="1.1" fill="#fff" />
      <path d="M29 46 Q28 22 50 22 Q72 22 71 46 Q64 34 50 36 Q38 34 29 46 Z" fill={hair} />
      {p.extraParts.halo && <ellipse cx="50" cy="14" rx="15" ry="4" fill="none" stroke="#f3d37a" strokeWidth="3" />}
      {p.extraParts.horns && (
        <>
          <path d="M36 26 L30 12 L40 24 Z" fill="#4a3b52" />
          <path d="M64 26 L70 12 L60 24 Z" fill="#4a3b52" />
        </>
      )}
    </svg>
  );
}
