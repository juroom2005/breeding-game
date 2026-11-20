'use client';

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  day: number;
  reason: string;
  farmName: string;
  onTitle: () => void;
}

export default function GameOverDialog({ open, day, reason, farmName, onTitle }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && open && !d.open) d.showModal();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => e.preventDefault()}
      aria-labelledby="gameover-title"
      aria-describedby="gameover-reason"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-7 text-center text-ink shadow-xl backdrop:bg-ink/60"
    >
      <h2 id="gameover-title" className="text-2xl font-bold">농장이 문을 닫았습니다</h2>
      <p id="gameover-reason" className="mt-3 text-sm text-mute">
        {farmName}, {day + 1}일차. {reason}
      </p>
      <p className="mt-2 text-xs text-mute">게임오버가 없는 즐기는 모드로 새로 시작할 수도 있습니다.</p>
      <button type="button" onClick={onTitle} className="mt-6 h-11 w-40 rounded-xl bg-accent font-semibold text-white hover:opacity-90">
        타이틀로
      </button>
    </dialog>
  );
}
