/** 한국어 조사: 이름 끝 글자에 받침이 있는지 보고 이/가, 와/과, 을/를, 은/는을 고른다 */
function hasBatchim(word: string): boolean {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false; // 한글이 아니면 받침 없음으로 처리
  return (c - 0xac00) % 28 !== 0;
}

type Pair = '이/가' | '와/과' | '을/를' | '은/는';

export function josa(word: string, pair: Pair): string {
  const [withB, withoutB] = pair.split('/');
  return word + (hasBatchim(word) ? withB : withoutB);
}
