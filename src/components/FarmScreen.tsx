'use client';

import { useEffect, useRef, useState } from 'react';
import type { World } from '@/engine';
import { DIFFICULTY_LABEL, pregnantCount, totalScore, type GameState } from '@/game/game';
import { isTypingTarget, loadShortcutsEnabled, saveShortcutsEnabled } from '@/game/shortcuts';
import IndividualCard from './IndividualCard';
import DetailPanel from './DetailPanel';
import ShortcutHelp from './ShortcutHelp';

interface Props {
  state: GameState;
  world: World;
  onNextDay: () => void;
  onMate: (motherId: string, fatherId: string) => void;
  onTitle: () => void;
}

type SortKey = 'born' | 'score' | 'sex';

const SORTS: [SortKey, string][] = [
  ['born', '태어난 순'],
  ['score', '점수순'],
  ['sex', '성별'],
];

const SOON = ['마켓', '임무', '의뢰', '도감', '농장 관리'];

export default function FarmScreen({ state, world, onNextDay, onMate, onTitle }: Props) {
  const all = world.active();
  const [selectedId, setSelectedId] = useState<string | null>(all[0]?.id ?? null);
  const [sort, setSort] = useState<SortKey>('born');
  const [toast, setToast] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [shortcutsOn, setShortcutsOn] = useState(loadShortcutsEnabled);
  const [announce, setAnnounce] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const listRef = useRef<HTMLUListElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const selected = selectedId ? world.get(selectedId) : undefined;

  const list = [...all].sort((a, b) => {
    if (sort === 'score') return (world.isAdult(b) ? totalScore(b) : -1) - (world.isAdult(a) ? totalScore(a) : -1);
    if (sort === 'sex') return a.sex === b.sex ? 0 : a.sex === 'F' ? -1 : 1;
    return a.birthOrder - b.birthOrder;
  });

  const over = all.length > state.farmSlots;
  const today = state.log.filter((l) => l.day === world.day).map((l) => l.text).join(' ');

  const showToast = (text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };

  const focusedId = list.some((x) => x.id === selectedId) ? selectedId : list[0]?.id;

  const select = (id: string, moveFocus: boolean) => {
    setSelectedId(id);
    const card = document.getElementById(`card-${id}`);
    card?.scrollIntoView({ block: 'nearest' });
    if (moveFocus) card?.focus();
  };

  const onListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (!list.length || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(listRef.current?.children ?? []) as HTMLElement[];
    const cols = Math.max(1, items.filter((el) => el.offsetTop === items[0]?.offsetTop).length);
    const i = Math.max(0, list.findIndex((x) => x.id === focusedId));
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : Math.min(list.length - 1, Math.max(0, i + step[e.key]));
    select(list[next].id, true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (helpOpen || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (!shortcutsOn) return;
      const key = e.key.toLowerCase();
      const click = (name: string) => document.querySelector<HTMLElement>(`[data-shortcut="${name}"]:not([disabled])`);
      if (key === 'n') onNextDay();
      else if (key === 's') setSort((s) => SORTS[(SORTS.findIndex(([k]) => k === s) + 1) % SORTS.length][0]);
      else if (key === 'l') document.getElementById(`card-${focusedId}`)?.focus();
      else if (key === 'd') detailRef.current?.focus();
      else if (key === 'p') click('mate-partner')?.focus();
      else if (key === 'm') {
        const btn = click('mate-submit');
        if (btn) btn.click();
        else showToast('지금은 교배할 수 없습니다');
      } else if (e.key === '[' || e.key === ']') {
        if (!list.length) return;
        const i = Math.max(0, list.findIndex((x) => x.id === selectedId));
        const next = list[(i + (e.key === ']' ? 1 : -1) + list.length) % list.length];
        select(next.id, false);
        setAnnounce(`${next.name} 선택`);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const setShortcuts = (on: boolean) => {
    setShortcutsOn(on);
    saveShortcutsEnabled(on);
  };

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <header className="shrink-0 border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 pt-3">
          <div className="w-44 min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight">{state.farmName}</h1>
            <p className="text-xs text-mute">{DIFFICULTY_LABEL[state.difficulty]}</p>
          </div>
          <dl className="flex gap-6">
            <Stat label="날짜" value={`${world.day + 1}일차`} />
            <Stat label="골드" value={`${state.gold.toLocaleString()}g`} valueClass="text-gold" />
            <Stat label="농장" value={`${all.length} / ${state.farmSlots}`} valueClass={over ? 'text-danger' : ''} />
            <Stat label="임신실" value={`${pregnantCount(world)} / ${state.pregnancyRoom}`} />
          </dl>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-keyshortcuts="?"
              className="h-11 w-20 rounded-xl border border-line text-sm hover:border-accent"
            >
              단축키
            </button>
            <button type="button" onClick={onTitle} className="h-11 w-20 rounded-xl border border-line text-sm hover:border-accent">
              타이틀
            </button>
            <button
              type="button"
              onClick={onNextDay}
              aria-keyshortcuts={shortcutsOn ? 'N' : undefined}
              className="flex h-11 w-36 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white shadow-sm hover:opacity-90"
            >
              다음 날
              <kbd aria-hidden="true" className={`rounded bg-white/20 px-1.5 font-sans text-xs ${shortcutsOn ? '' : 'invisible'}`}>
                N
              </kbd>
            </button>
          </div>
        </div>
        <nav aria-label="게임 메뉴" className="mx-auto flex h-12 max-w-7xl items-center gap-1.5 overflow-x-auto px-5">
          <button type="button" aria-current="page" className="h-8 rounded-lg bg-accent-soft px-3 text-sm font-semibold text-accent">
            농장
          </button>
          {SOON.map((n) => (
            <button
              key={n}
              type="button"
              aria-disabled="true"
              onClick={() => showToast(`${n}: 준비 중입니다`)}
              className="h-8 rounded-lg px-3 text-sm text-mute hover:bg-[#efe9dd]"
            >
              {n}
              <span className="sr-only"> (준비 중)</span>
            </button>
          ))}
        </nav>
      </header>

      <main id="main" className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-5 py-5 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-labelledby="list-title" className="flex flex-col lg:min-h-0">
          <div className="mb-3 flex h-8 shrink-0 items-center gap-3">
            <h2 id="list-title" className="font-semibold">
              개체 <span className="tabular-nums">{all.length}</span>
            </h2>
            <p className="min-w-0 flex-1 truncate text-sm text-danger">{over && `농장 칸(${state.farmSlots})을 넘었습니다`}</p>
            <div role="group" aria-label="정렬 기준" className="flex shrink-0 gap-1 text-xs">
              {SORTS.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={sort === k}
                  onClick={() => setSort(k)}
                  className={`h-7 w-16 rounded-md ${sort === k ? 'bg-ink text-white' : 'bg-panel text-mute hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p id="list-help" className="sr-only">방향키로 개체 사이를 이동합니다.</p>
          <ul
            ref={listRef}
            onKeyDown={onListKey}
            aria-labelledby="list-title"
            aria-describedby="list-help"
            className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3 p-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]"
          >
            {list.map((x) => (
              <li key={x.id}>
                <IndividualCard
                  ind={x}
                  world={world}
                  selected={x.id === selectedId}
                  focusable={x.id === focusedId}
                  onSelect={() => setSelectedId(x.id)}
                />
              </li>
            ))}
          </ul>
        </section>

        <aside aria-label="선택한 개체와 농장 기록" className="flex flex-col gap-5 lg:min-h-0">
          <div
            ref={detailRef}
            role="region"
            aria-label="개체 상세"
            tabIndex={0}
            className="rounded-2xl border border-line bg-panel p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]"
          >
            {selected ? (
              <DetailPanel key={selected.id} ind={selected} world={world} state={state} onMate={onMate} />
            ) : (
              <p className="text-sm text-mute">개체를 선택하세요.</p>
            )}
          </div>
          <section aria-labelledby="log-title" className="flex h-56 shrink-0 flex-col rounded-2xl border border-line bg-panel p-5">
            <h2 id="log-title" className="mb-2 shrink-0 text-sm font-semibold">농장 기록</h2>
            <ol tabIndex={0} aria-labelledby="log-title" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto text-sm [scrollbar-gutter:stable]">
              {state.log.slice(-40).reverse().map((l, i) => (
                <li key={state.log.length - i} className="flex gap-2">
                  <span className="w-9 shrink-0 text-xs tabular-nums text-mute">{l.day + 1}일</span>
                  <span className={l.kind === 'birth' ? 'text-female' : l.kind === 'adult' ? 'text-accent' : ''}>{l.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </main>

      <p className="sr-only" aria-live="polite">
        {world.day + 1}일차. {today}
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <ShortcutHelp open={helpOpen} enabled={shortcutsOn} onEnabledChange={setShortcuts} onClose={() => setHelpOpen(false)} />
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2">
        {toast && <p className="rounded-xl bg-ink px-4 py-2.5 text-sm text-white shadow-lg">{toast}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="w-20">
      <dt className="text-[11px] text-mute">{label}</dt>
      <dd className={`truncate font-semibold tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
