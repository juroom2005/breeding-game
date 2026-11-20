import type { Individual, World } from '@/engine';
import { totalScore } from '@/game/game';
import Portrait from './Portrait';

interface Props {
  ind: Individual;
  world: World;
  selected: boolean;
  onSelect: () => void;
}

export default function IndividualCard({ ind, world, selected, onSelect }: Props) {
  const adult = world.isAdult(ind);
  const female = ind.sex === 'F';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-[168px] w-full flex-col items-center rounded-xl border bg-panel p-2.5 text-left ${
        selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-accent/60'
      }`}
    >
      <div className="relative size-[104px] shrink-0">
        <Portrait ind={ind} baby={!adult} size={104} decorative />
        {ind.pregnancy && (
          <span className="absolute right-1 top-1 rounded-full bg-female px-1.5 py-0.5 text-[10px] font-semibold text-white">
            임신
          </span>
        )}
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
      </div>
    </button>
  );
}
