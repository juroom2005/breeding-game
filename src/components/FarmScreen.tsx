'use client';

import { useState } from 'react';
import type { World } from '@/engine';
import { DIFFICULTY_LABEL, pregnantCount, totalScore, type GameState } from '@/game/game';
import IndividualCard from './IndividualCard';
import DetailPanel from './DetailPanel';

interface Props {
  state: GameState;
  world: World;
  onNextDay: () => void;
  onMate: (motherId: string, fatherId: string) => void;
  onTitle: () => void;
}

type SortKey = 'born' | 'score' | 'sex';

const SOON = ['마켓', '임무', '의뢰', '도감', '농장 관리'];

export default function FarmScreen({ state, world, onNextDay, onMate, onTitle }: Props) {
  const all = world.active();
  const [selectedId, setSelectedId] = useState<string | null>(all[0]?.id ?? null);
  const [sort, setSort] = useState<SortKey>('born');
  const [toast, setToast] = useState<string | null>(null);
  const selected = selectedId ? world.get(selectedId) : undefined;

  const list = [...all].sort((a, b) => {
    if (sort === 'score') return (world.isAdult(b) ? totalScore(b) : -1) - (world.isAdult(a) ? totalScore(a) : -1);
    if (sort === 'sex') return a.sex === b.sex ? 0 : a.sex === 'F' ? -1 : 1;
    return a.birthOrder - b.birthOrder;
  });

  const over = all.length > state.farmSlots;
  const showToast = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <button onClick={onTitle} className="text-left">
            <p className="text-lg font-bold leading-tight">{state.farmName}</p>
            <p className="text-xs text-mute">{DIFFICULTY_LABEL[state.difficulty]}</p>
          </button>
          <Stat label="날짜" value={`${world.day + 1}일차`} />
          <Stat label="골드" value={`${state.gold.toLocaleString()}g`} valueClass="text-gold" />
          <Stat label="농장" value={`${all.length} / ${state.farmSlots}`} valueClass={over ? 'text-[#a13030]' : ''} />
          <Stat label="임신실" value={`${pregnantCount(world)} / ${state.pregnancyRoom}`} />
          <button
            onClick={onNextDay}
            className="ml-auto rounded-xl bg-accent px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-90"
          >
            다음 날 →
          </button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-5 pb-3">
          <span className="rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">농장</span>
          {SOON.map((n) => (
            <button
              key={n}
              onClick={() => showToast(`${n}: 준비 중입니다`)}
              className="rounded-lg px-3 py-1.5 text-sm text-mute hover:bg-[#efe9dd]"
            >
              {n}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-5 py-5 lg:grid-cols-[1fr_380px]">
        {/* 개체 목록 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">개체 {all.length}</h2>
            <div className="flex gap-1 text-xs">
              {(
                [
                  ['born', '태어난 순'],
                  ['score', '점수순'],
                  ['sex', '성별'],
                ] as [SortKey, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={`rounded-md px-2.5 py-1 ${sort === k ? 'bg-ink text-white' : 'bg-panel text-mute hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {over && (
            <p className="mb-3 rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#a13030]">
              농장 칸({state.farmSlots})을 넘었습니다. 판매 기능은 마켓과 함께 추가됩니다.
            </p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
            {list.map((x) => (
              <IndividualCard key={x.id} ind={x} world={world} selected={x.id === selectedId} onSelect={() => setSelectedId(x.id)} />
            ))}
          </div>
        </section>

        {/* 오른쪽: 상세 + 기록 */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-2xl border border-line bg-panel p-5">
            {selected ? (
              <DetailPanel
                key={selected.id}
                ind={selected}
                world={world}
                state={state}
                onMate={(m, f) => onMate(m, f)}
              />
            ) : (
              <p className="text-sm text-mute">개체를 선택하세요.</p>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-panel p-5">
            <h3 className="mb-2 text-sm font-semibold">농장 기록</h3>
            <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto text-sm">
              {state.log.slice(-40).reverse().map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-xs tabular-nums text-mute">{l.day + 1}일</span>
                  <span className={l.kind === 'birth' ? 'text-female' : l.kind === 'adult' ? 'text-accent' : ''}>{l.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}

function Stat({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[11px] text-mute">{label}</p>
      <p className={`font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
