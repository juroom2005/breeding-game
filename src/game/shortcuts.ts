export interface Shortcut {
  keys: string[];
  label: string;
}

export const FARM_SHORTCUTS: Shortcut[] = [
  { keys: ['N'], label: '다음 날' },
  { keys: ['←', '→', '↑', '↓'], label: '개체 목록에서 이동 (목록에 포커스가 있을 때)' },
  { keys: ['[', ']'], label: '이전 / 다음 개체 선택' },
  { keys: ['M'], label: '교배 시도 (선택한 암컷)' },
  { keys: ['P'], label: '교배 상대 고르기' },
  { keys: ['S'], label: '정렬 기준 바꾸기' },
  { keys: ['L'], label: '개체 목록으로 이동' },
  { keys: ['D'], label: '상세 정보로 이동' },
  { keys: ['?'], label: '단축키 도움말' },
];

const STORAGE_KEY = 'shortcuts-enabled';

// 한 글자 단축키는 스크린 리더 사용자와 겹칠 수 있어 끌 수 있게 한다 (WCAG 2.1.4)
export function loadShortcutsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveShortcutsEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(on));
  } catch {}
}

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}
