'use client';

import { useId } from 'react';
import type { Individual, World } from '@/engine';
import { mateBlockReason, totalScore, type GameState } from '@/game/game';
import Portrait from './Portrait';

interface Props {
  world: World;
  state: GameState;
  mother?: Individual;
  father?: Individual;
  dropActive: boolean;
  shortcutsOn: boolean;
  onClear: (role: 'mother' | 'father') => void;
  onMate: () => void;
}

export default function BreedingPanel({ world, state, mother, father, dropActive, shortcutsOn, onClear, onMate }: Props) {
  const hintId = useId();
  const reason = mateBlockReason(state, world, mother, father);
  const chance = mother && father && !reason ? Math.round(world.conceptionChance(mother, father) * 100) : null;
  const kin = mother && father ? world.kinship(mother, father) : 0;

  return (
    <section
      aria-labelledby="breed-title"
      data-drop="breeding"
      className={`flex h-[152px] min-w-0 flex-col rounded-2xl border bg-panel p-4 lg:h-full ${dropActive ? 'border-female ring-2 ring-female/30' : 'border-line'}`}
    >
      <h2 id="breed-title" className="mb-2 text-sm font-semibold">교배</h2>
      <div className="flex min-h-0 flex-1 items-center gap-2.5">
        <Slot role="mother" ind={mother} world={world} onClear={onClear} />
        <span aria-hidden="true" className="text-lg text-mute">×</span>
        <Slot role="father" ind={father} world={world} onClear={onClear} />
        <div className="flex min-w-[120px] flex-1 flex-col">
          <p className="h-4 truncate text-xs text-mute">
            {chance !== null && `수정 확률 ${chance}%`}
            {kin > 0 && <span className="ml-2 text-danger">근친 {(kin * 100).toFixed(1)}%</span>}
          </p>
          <button
            type="button"
            data-shortcut="mate-submit"
            aria-keyshortcuts={shortcutsOn ? 'M' : undefined}
            disabled={!!reason}
            aria-describedby={hintId}
            onClick={onMate}
            className="mt-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-female text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            교배 시도
            <kbd aria-hidden="true" className={`rounded bg-white/20 px-1.5 font-sans text-xs ${shortcutsOn ? '' : 'invisible'}`}>
              M
            </kbd>
          </button>
          <p id={hintId} className="mt-1 line-clamp-2 h-8 text-xs leading-4 text-mute">{reason ?? ''}</p>
        </div>
      </div>
    </section>
  );
}

function Slot({ role, ind, world, onClear }: { role: 'mother' | 'father'; ind?: Individual; world: World; onClear: (r: 'mother' | 'father') => void }) {
  const label = role === 'mother' ? '엄마' : '아빠';
  return (
    <div
      className={`relative flex h-16 w-36 shrink-0 items-center gap-2 rounded-xl border p-1.5 ${ind ? 'border-line bg-white' : 'border-dashed border-line'}`}
    >
      {ind ? (
        <>
          <Portrait ind={ind} size={44} decorative />
          <div className="min-w-0 pr-5 text-sm">
            <p className="truncate font-semibold">
              <span className="sr-only">{label}: </span>
              {ind.name}
            </p>
            <p className="text-xs text-mute tabular-nums">{world.isAdult(ind) ? `${totalScore(ind)}점` : ''}</p>
          </div>
          <button
            type="button"
            onClick={() => onClear(role)}
            aria-label={`${label} 칸 비우기`}
            className="absolute right-1 top-1 size-6 rounded-md text-mute hover:bg-[#efe9dd] hover:text-ink"
          >
            <span aria-hidden="true">×</span>
          </button>
        </>
      ) : (
        <p className={`w-full text-center text-xs ${role === 'mother' ? 'text-female' : 'text-male'}`}>
          <span aria-hidden="true">{role === 'mother' ? '♀ ' : '♂ '}</span>
          {label} 칸
          <span className="block text-mute">끌어다 놓거나 E</span>
        </p>
      )}
    </div>
  );
}
