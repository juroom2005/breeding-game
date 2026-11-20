'use client';

import { useEffect, useRef, useState } from 'react';

export type DropTarget = { kind: 'card'; id: string } | { kind: 'slot' } | null;

export interface DragState {
  id: string;
  x: number;
  y: number;
  target: DropTarget;
  holding: boolean;
}

interface Options {
  holdMs: number;
  canHold: (dragId: string, targetId: string) => boolean;
  onHoldComplete: (dragId: string, targetId: string) => void;
  onDropCard: (dragId: string, targetId: string) => void;
  onDropSlot: (dragId: string) => void;
}

const START_DISTANCE = 6;

function targetAt(x: number, y: number, dragId: string): DropTarget {
  const el = document.elementFromPoint(x, y);
  const card = el?.closest<HTMLElement>('[data-card-id]');
  if (card && card.dataset.cardId !== dragId) return { kind: 'card', id: card.dataset.cardId! };
  if (el?.closest('[data-drop="breeding"]')) return { kind: 'slot' };
  return null;
}

const sameTarget = (a: DropTarget, b: DropTarget) =>
  a?.kind === b?.kind && (a?.kind !== 'card' || a.id === (b as { id: string }).id);

/** 포인터로 카드를 끌어 자리 바꾸기, 교배 칸에 놓기, 다른 개체 위에서 버티면 교배 */
export function useCardDrag(options: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const opts = useRef(options);
  const suppressClick = useRef(false);

  useEffect(() => {
    opts.current = options;
  });

  const startDrag = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    let current: DragState | null = null;
    let timer: number | undefined;

    const finish = () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('keydown', key);
      document.body.style.cursor = '';
      setDrag(null);
    };

    const move = (ev: PointerEvent) => {
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < START_DISTANCE) return;
        active = true;
        document.body.style.cursor = 'grabbing';
      }
      const target = targetAt(ev.clientX, ev.clientY, id);
      const changed = !current || !sameTarget(current.target, target);
      let holding = current?.holding ?? false;
      if (changed) {
        window.clearTimeout(timer);
        holding = target?.kind === 'card' && opts.current.canHold(id, target.id);
        if (holding && target?.kind === 'card') {
          const targetId = target.id;
          timer = window.setTimeout(() => {
            finish();
            suppressClick.current = true;
            window.addEventListener('pointerup', () => window.setTimeout(() => (suppressClick.current = false), 0), { once: true });
            opts.current.onHoldComplete(id, targetId);
          }, opts.current.holdMs);
        }
      }
      current = { id, x: ev.clientX, y: ev.clientY, target, holding };
      setDrag(current);
    };

    const up = () => {
      if (active && current) {
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 0);
        const t = current.target;
        finish();
        if (t?.kind === 'card') opts.current.onDropCard(id, t.id);
        else if (t?.kind === 'slot') opts.current.onDropSlot(id);
      } else finish();
    };

    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') finish();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('keydown', key);
  };

  /** 끌기가 끝난 직후 따라오는 클릭은 선택으로 치지 않는다 */
  const consumeClick = () => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  };

  return { drag, startDrag, consumeClick };
}
