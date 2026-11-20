'use client';

import { useEffect, useRef } from 'react';
import { FARM_SHORTCUTS } from '@/game/shortcuts';

interface Props {
  open: boolean;
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
  onClose: () => void;
}

export default function ShortcutHelp({ open, enabled, onEnabledChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="shortcut-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-6 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <h2 id="shortcut-title" className="text-lg font-bold">단축키</h2>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">농장 화면 단축키</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">키</th>
            <th scope="col">동작</th>
          </tr>
        </thead>
        <tbody>
          {FARM_SHORTCUTS.map((s) => (
            <tr key={s.label} className="border-b border-line last:border-0">
              <td className="w-32 py-2">
                <span className="flex flex-wrap gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className="min-w-7 rounded-md border border-line bg-white px-1.5 py-0.5 text-center font-sans text-xs font-semibold">
                      {k}
                    </kbd>
                  ))}
                </span>
              </td>
              <td className="py-2">{s.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-mute">Tab으로 모든 버튼을 차례로 이동할 수 있고, Enter나 Space로 누릅니다. Esc로 이 창을 닫습니다.</p>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} className="size-4 accent-accent" />
        한 글자 단축키 사용 (스크린 리더를 쓴다면 끄는 것을 권장)
      </label>
      <form method="dialog" className="mt-5 flex justify-end">
        <button className="h-10 w-24 rounded-lg bg-accent font-semibold text-white hover:opacity-90">닫기</button>
      </form>
    </dialog>
  );
}
