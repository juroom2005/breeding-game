import type { Individual, World } from '@/engine';
import { totalScore } from '@/game/game';
import Portrait from './Portrait';
import { raceRatio, raceRatioShort } from '@/game/race';

export interface DropHint {
  kind: 'mate' | 'swap' | 'blocked';
  text: string;
}

interface Props {
  ind: Individual;
  world: World;
  selected: boolean;
  focusable: boolean;
  dragging: boolean;
  hint: DropHint | null;
  holdMs: number;
  onSelect: () => void;
  /** 없으면 끌 수 없는 카드 */
  onPointerDown?: (e: React.PointerEvent) => void;
}

/** 농장 칸의 빈 칸, 임신실 칸도 같은 높이를 써야 목록이 흔들리지 않는다 */
export const CARD_HEIGHT = 'h-[184px]';

export default function IndividualCard({ ind, world, selected, focusable, dragging, hint, holdMs, onSelect, onPointerDown }: Props) {
  const adult = world.isAdult(ind);
  const female = ind.sex === 'F';

  return (
    <button
      type="button"
      id={`card-${ind.id}`}
      data-card-id={ind.id}
      tabIndex={focusable ? 0 : -1}
      onClick={onSelect}
      onPointerDown={onPointerDown}
      aria-pressed={selected}
      className={`relative flex ${CARD_HEIGHT} w-full select-none ${onPointerDown ? 'cursor-grab' : 'cursor-pointer'} flex-col items-center rounded-xl border bg-panel p-2.5 text-left ${
        selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-accent/60'
      } ${dragging ? 'opacity-40' : ''} ${hint?.kind === 'mate' ? 'border-female ring-2 ring-female/40' : ''}`}
    >
      <div className="relative size-[104px] shrink-0">
        <Portrait ind={ind} baby={!adult} size={104} decorative />
      </div>
      <div className="mt-2 w-full">
        <div className="flex h-5 items-center gap-1">
          <span aria-hidden="true" className={`text-sm font-bold ${female ? 'text-female' : 'text-male'}`}>{female ? '♀' : '♂'}</span>
          <span className="truncate text-sm font-semibold">{ind.name}</span>
          <span className="sr-only">, {female ? '여성' : '남성'},</span>
        </div>
        <div className="flex h-4 items-center justify-between text-xs text-mute">
          <span className="truncate">{ind.raceLabel}</span>
          <span className={`shrink-0 tabular-nums ${adult ? 'font-semibold text-ink' : ''}`}>
            {adult ? (
              <>
                <span className="sr-only">, 종합 </span>
                {totalScore(ind)}점
              </>
            ) : (
              <>
                <span className="sr-only">, 아기, 성체까지 </span>D-{world.daysUntilAdult(ind)}
              </>
            )}
          </span>
        </div>
        <span aria-hidden="true" className="block h-4 truncate text-[11px] leading-4 tabular-nums text-mute">{raceRatioShort(ind)}</span>
        <span className="sr-only">, 혈통 {raceRatio(ind)}</span>
      </div>
      {hint && (
        <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-panel/90 p-2 text-center text-xs font-semibold">
          <span className={hint.kind === 'mate' ? 'text-female' : hint.kind === 'blocked' ? 'text-danger' : 'text-ink'}>{hint.text}</span>
          {hint.kind === 'mate' && (
            <span className="h-1.5 w-4/5 overflow-hidden rounded-full bg-[#ece5d8]">
              <span className="hold-progress block h-full rounded-full bg-female" style={{ '--hold-ms': `${holdMs}ms` } as React.CSSProperties} />
            </span>
          )}
        </span>
      )}
    </button>
  );
}
