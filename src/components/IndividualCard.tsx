import type { Individual, World } from '@/engine';
import { totalScore } from '@/game/game';
import Portrait from './Portrait';

interface Props {
  ind: Individual;
  world: World;
  selected: boolean;
  onSelect: () => void;
}

/** 목록용 상반신 카드 */
export default function IndividualCard({ ind, world, selected, onSelect }: Props) {
  const adult = world.isAdult(ind);
  const female = ind.sex === 'F';
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center rounded-xl border bg-panel p-2.5 text-left transition ${
        selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-accent/60'
      }`}
    >
      <div className="relative">
        <Portrait ind={ind} baby={!adult} size={104} />
        {ind.pregnancy && (
          <span className="absolute right-1 top-1 rounded-full bg-female px-1.5 py-0.5 text-[10px] font-semibold text-white">
            임신
          </span>
        )}
      </div>
      <div className="mt-2 w-full">
        <div className="flex items-center gap-1">
          <span className={`text-sm font-bold ${female ? 'text-female' : 'text-male'}`}>{female ? '♀' : '♂'}</span>
          <span className="truncate text-sm font-semibold">{ind.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-mute">
          <span className="truncate">{ind.raceLabel}</span>
          {adult ? <span className="font-semibold text-ink">{totalScore(ind)}점</span> : <span>D-{world.daysUntilAdult(ind)}</span>}
        </div>
      </div>
    </button>
  );
}
