'use client';

import { useEffect, useRef, useState } from 'react';
import type { Individual, World } from '@/engine';
import { DIFFICULTY_LABEL, asPair, farmCount, mateBlockReason, overflow, totalScore, type GameState } from '@/game/game';
import { buyPrice, sellPrice, slotUpgradeCost } from '@/game/economy';
import { offerList } from '@/game/market';
import { josa } from '@/game/josa';
import { isTypingTarget, loadShortcutsEnabled, saveShortcutsEnabled } from '@/game/shortcuts';
import IndividualCard, { type DropHint } from './IndividualCard';
import DetailPanel, { BreedAction, ConfirmButton } from './DetailPanel';
import MarketView, { buyBlockReason } from './MarketView';
import BreedingPanel from './BreedingPanel';
import PregnancyRoom from './PregnancyRoom';
import ShortcutHelp from './ShortcutHelp';
import Portrait from './Portrait';
import { useCardDrag } from './useCardDrag';

interface ActionResult {
  ok: boolean;
  message: string;
}

interface Props {
  state: GameState;
  world: World;
  onNextDay: () => void;
  onMate: (motherId: string, fatherId: string) => ActionResult;
  onReorder: (order: string[]) => void;
  onBuy: (id: string) => ActionResult;
  onSell: (id: string) => ActionResult;
  onUpgrade: () => ActionResult;
  onRefresh: () => ActionResult;
  onTitle: () => void;
}

type View = 'farm' | 'market';

type SortKey = 'custom' | 'born' | 'score' | 'sex';

const SORTS: [SortKey, string][] = [
  ['custom', '내 순서'],
  ['born', '태어난 순'],
  ['score', '점수순'],
  ['sex', '성별'],
];

const SOON = ['임무', '의뢰', '도감', '농장 관리'];
const HOLD_MS = 900;

export default function FarmScreen({ state, world, onNextDay, onMate, onReorder, onBuy, onSell, onUpgrade, onRefresh, onTitle }: Props) {
  const all = world.active();
  const [view, setView] = useState<View>('farm');
  const [selectedId, setSelectedId] = useState<string | null>(all[0]?.id ?? null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('custom');
  const [toast, setToast] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [shortcutsOn, setShortcutsOn] = useState(loadShortcutsEnabled);
  const [announce, setAnnounce] = useState('');
  const [motherId, setMotherId] = useState<string | null>(null);
  const [fatherId, setFatherId] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const listRef = useRef<HTMLUListElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const offers = offerList(world, state.market).filter((x): x is Individual => !!x);
  const selectedOffer = offers.find((x) => x.id === offerId) ?? offers[0];
  const farmSelected = selectedId ? world.get(selectedId) : undefined;
  const selected = view === 'market' ? selectedOffer : farmSelected?.status === 'active' ? farmSelected : undefined;

  const usable = (id: string | null) => {
    const x = id ? world.get(id) : undefined;
    return x && x.status === 'active' && !x.pregnancy && world.isAdult(x) ? x : undefined;
  };
  const mother = usable(motherId);
  const father = usable(fatherId);

  const orderIndex = new Map(state.order.map((id, i) => [id, i]));
  const list = all
    .filter((x) => !x.pregnancy)
    .sort((a, b) => {
      if (sort === 'score') return (world.isAdult(b) ? totalScore(b) : -1) - (world.isAdult(a) ? totalScore(a) : -1);
      if (sort === 'sex' && a.sex !== b.sex) return a.sex === 'F' ? -1 : 1;
      if (sort === 'custom') return (orderIndex.get(a.id) ?? Infinity) - (orderIndex.get(b.id) ?? Infinity) || a.birthOrder - b.birthOrder;
      return a.birthOrder - b.birthOrder;
    });
  const pregnant = all.filter((x) => x.pregnancy).sort((a, b) => a.pregnancy!.dueDay - b.pregnancy!.dueDay);

  const count = farmCount(world);
  const over = overflow(state, world);
  const upgradeCost = slotUpgradeCost(state.farmUpgrades);
  const nextDayBlock = over > 0 ? `농장 칸이 ${over}칸 모자랍니다. 개체를 팔거나 칸을 늘리세요` : null;
  const emptyCells = Math.max(0, state.farmSlots - count);
  const today = state.log.filter((l) => l.day === world.day).map((l) => l.text).join(' ');
  const focusedId = list.some((x) => x.id === selectedId) ? selectedId : list[0]?.id;

  const showToast = (text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  };

  const run = (r: ActionResult) => {
    showToast(r.message);
    return r.ok;
  };

  const nextDay = () => {
    if (nextDayBlock) return showToast(nextDayBlock);
    onNextDay();
  };

  const sell = (ind: Individual) => {
    const i = list.findIndex((x) => x.id === ind.id);
    if (!run(onSell(ind.id))) return;
    const next = list[i + 1] ?? list[i - 1];
    setSelectedId(next && next.id !== ind.id ? next.id : null);
  };

  const buy = (id: string) => {
    if (run(onBuy(id))) {
      const rest = offers.filter((o) => o.id !== id);
      setOfferId(rest[0]?.id ?? null);
    }
  };

  const select = (id: string, moveFocus: boolean) => {
    setSelectedId(id);
    const card = document.getElementById(`card-${id}`);
    card?.scrollIntoView({ block: 'nearest' });
    if (moveFocus) card?.focus();
  };

  const mate = (m: Individual, f: Individual) => {
    const r = onMate(m.id, f.id);
    showToast(`${m.name} × ${f.name}: ${r.message}`);
    if (r.ok && motherId === m.id) setMotherId(null);
  };

  const toBreeding = (ind: Individual | undefined) => {
    if (!ind) return;
    if (!world.isAdult(ind)) return showToast(`${josa(ind.name, '은/는')} 아직 아기라 교배할 수 없습니다`);
    if (ind.pregnancy) return showToast(`${josa(ind.name, '은/는')} 임신 중입니다`);
    if (ind.sex === 'F') setMotherId(ind.id);
    else setFatherId(ind.id);
    setAnnounce(`${josa(ind.name, '을/를')} ${ind.sex === 'F' ? '엄마' : '아빠'} 칸에 올렸습니다`);
  };

  const swap = (aId: string, bId: string) => {
    const ids = list.map((x) => x.id);
    const i = ids.indexOf(aId);
    const j = ids.indexOf(bId);
    if (i < 0 || j < 0 || i === j) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const rest = state.order.filter((id) => !ids.includes(id));
    onReorder([...ids, ...rest]);
    setSort('custom');
  };

  const holdPair = (aId: string, bId: string) => {
    const a = world.get(aId);
    const b = world.get(bId);
    if (!a || !b) return null;
    const pair = asPair(a, b);
    if (!pair) return { pair: null, reason: null };
    if (!world.isAdult(a) || !world.isAdult(b)) return { pair, reason: '아기는 교배 불가' };
    return { pair, reason: mateBlockReason(state, world, pair[0], pair[1]) };
  };

  const { drag, startDrag, consumeClick } = useCardDrag({
    holdMs: HOLD_MS,
    canHold: (a, b) => {
      const h = holdPair(a, b);
      return !!h?.pair && !h.reason;
    },
    onHoldComplete: (a, b) => {
      const h = holdPair(a, b);
      if (h?.pair && !h.reason) mate(h.pair[0], h.pair[1]);
    },
    onDropCard: swap,
    onDropSlot: (id) => toBreeding(world.get(id)),
  });

  const hintFor = (id: string): DropHint | null => {
    if (!drag || drag.target?.kind !== 'card' || drag.target.id !== id) return null;
    if (drag.holding) return { kind: 'mate', text: '그대로 두면 교배' };
    const h = holdPair(drag.id, id);
    if (h?.pair && h.reason) return { kind: 'blocked', text: `${h.reason} · 놓으면 자리 바꾸기` };
    return { kind: 'swap', text: '놓으면 자리 바꾸기' };
  };

  const onListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (!list.length || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(listRef.current?.children ?? []) as HTMLElement[];
    const cols = Math.max(1, items.filter((el) => el.offsetTop === items[0]?.offsetTop).length);
    const i = Math.max(0, list.findIndex((x) => x.id === focusedId));
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : Math.min(list.length - 1, Math.max(0, i + step[e.key]));
    if (e.shiftKey && focusedId && next !== i) {
      swap(focusedId, list[next].id);
      setAnnounce(`${josa(list[i].name, '을/를')} ${next + 1}번째 자리로 옮겼습니다`);
      requestAnimationFrame(() => document.getElementById(`card-${focusedId}`)?.focus());
      return;
    }
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
      if (key === 'n') nextDay();
      else if (key === '1') setView('farm');
      else if (key === '2') setView('market');
      else if (key === 'd') detailRef.current?.focus();
      else if (view === 'market') {
        if (key === 'r') run(onRefresh());
        else return;
      } else if (key === 's') setSort((s) => SORTS[(SORTS.findIndex(([k]) => k === s) + 1) % SORTS.length][0]);
      else if (key === 'l') document.getElementById(`card-${focusedId}`)?.focus();
      else if (key === 'e') toBreeding(selected);
      else if (key === 'm') {
        const reason = mateBlockReason(state, world, mother, father);
        if (reason) showToast(reason);
        else mate(mother!, father!);
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

  const dragged = drag ? world.get(drag.id) : undefined;

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
            <Stat label="농장" value={`${count} / ${state.farmSlots}`} valueClass={over ? 'text-danger' : ''} />
            <Stat label="임신실" value={`${pregnant.length} / ${state.pregnancyRoom}`} />
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
              onClick={nextDay}
              aria-disabled={!!nextDayBlock}
              aria-describedby={nextDayBlock ? 'next-day-block' : undefined}
              aria-keyshortcuts={shortcutsOn ? 'N' : undefined}
              className={`flex h-11 w-36 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white shadow-sm ${nextDayBlock ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90'}`}
            >
              다음 날
              <kbd aria-hidden="true" className={`rounded bg-white/20 px-1.5 font-sans text-xs ${shortcutsOn ? '' : 'invisible'}`}>
                N
              </kbd>
            </button>
          </div>
        </div>
        <nav aria-label="게임 메뉴" className="mx-auto flex h-12 max-w-7xl items-center gap-1.5 overflow-x-auto px-5">
          {(
            [
              ['farm', '농장', '1'],
              ['market', '마켓', '2'],
            ] as [View, string, string][]
          ).map(([v, label, key]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-current={view === v ? 'page' : undefined}
              aria-keyshortcuts={shortcutsOn ? key : undefined}
              className={`h-8 rounded-lg px-3 text-sm ${view === v ? 'bg-accent-soft font-semibold text-accent' : 'text-ink hover:bg-[#efe9dd]'}`}
            >
              {label}
            </button>
          ))}
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
        {view === 'market' ? (
          <MarketView
            world={world}
            state={state}
            selectedId={selectedOffer?.id ?? null}
            shortcutsOn={shortcutsOn}
            onSelect={setOfferId}
            onBuy={buy}
            onRefresh={() => run(onRefresh())}
          />
        ) : (
        <div className="flex flex-col gap-4 lg:min-h-0">
          <div className="grid shrink-0 gap-4 lg:h-[152px] lg:grid-cols-[minmax(0,1fr)_auto]">
            <BreedingPanel
              world={world}
              state={state}
              mother={mother}
              father={father}
              dropActive={drag?.target?.kind === 'slot'}
              shortcutsOn={shortcutsOn}
              onClear={(r) => (r === 'mother' ? setMotherId(null) : setFatherId(null))}
              onMate={() => mother && father && mate(mother, father)}
            />
            <div className="h-[152px] lg:w-[300px]">
              <PregnancyRoom world={world} capacity={state.pregnancyRoom} mothers={pregnant} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>

          <section aria-labelledby="list-title" className="flex flex-col lg:min-h-0 lg:flex-1">
            <div className="mb-2 flex h-8 shrink-0 items-center gap-3">
              <h2 id="list-title" className="font-semibold">
                농장 <span className="tabular-nums">{count} / {state.farmSlots}</span>
              </h2>
              <p id="next-day-block" className="min-w-0 flex-1 truncate text-sm font-semibold text-danger">
                {nextDayBlock}
              </p>
              <ConfirmInline
                label={`칸 늘리기 ${upgradeCost.toLocaleString()}g`}
                disabled={state.gold < upgradeCost}
                onConfirm={() => run(onUpgrade())}
              />
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
            <p id="list-help" className="sr-only">
              방향키로 이동, Shift와 방향키로 자리 옮기기. 마우스로 끌어서 자리를 바꾸거나, 다른 성별 개체 위에 잠시 대고 있으면 교배합니다.
            </p>
            <ul
              ref={listRef}
              onKeyDown={onListKey}
              aria-labelledby="list-title"
              aria-describedby="list-help"
              className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3 p-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]"
            >
              {list.map((x, i) => (
                <li key={x.id} className={i >= state.farmSlots - pregnant.length ? 'rounded-xl ring-2 ring-danger' : ''}>
                  <IndividualCard
                    ind={x}
                    world={world}
                    selected={x.id === selectedId}
                    focusable={x.id === focusedId}
                    dragging={drag?.id === x.id}
                    hint={hintFor(x.id)}
                    holdMs={HOLD_MS}
                    onSelect={() => !consumeClick() && setSelectedId(x.id)}
                    onPointerDown={(e) => startDrag(e, x.id)}
                  />
                </li>
              ))}
              {pregnant.map((x) => (
                <li key={`room-${x.id}`}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setSelectedId(x.id)}
                    className="flex h-[168px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-female/30 bg-[#fbeef3]/60 p-2 text-center text-xs text-female"
                  >
                    <span className="font-semibold">임신실 사용 중</span>
                    <span className="w-full truncate text-mute">{x.name}의 칸</span>
                  </button>
                </li>
              ))}
              {Array.from({ length: emptyCells }, (_, i) => (
                <li key={`empty-${i}`} aria-hidden="true" className="flex h-[168px] items-center justify-center rounded-xl border border-dashed border-line text-xs text-mute">
                  빈 칸
                </li>
              ))}
            </ul>
          </section>
        </div>
        )}

        <aside aria-label={view === 'market' ? '선택한 매물과 농장 기록' : '선택한 개체와 농장 기록'} className="flex flex-col gap-5 lg:min-h-0">
          <div
            ref={detailRef}
            role="region"
            aria-label={view === 'market' ? '매물 상세' : '개체 상세'}
            tabIndex={0}
            className="rounded-2xl border border-line bg-panel p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]"
          >
            {selected ? (
              <DetailPanel
                key={selected.id}
                ind={selected}
                world={world}
                state={state}
                actions={
                  view === 'market' ? (
                    <ConfirmButton
                      label={`구매 ${buyPrice(selected, world).toLocaleString()}g`}
                      confirmLabel={`정말 ${buyPrice(selected, world).toLocaleString()}g에 살까요?`}
                      tone="accent"
                      disabledReason={buyBlockReason(world, state, selected)}
                      onConfirm={() => buy(selected.id)}
                    />
                  ) : (
                    <>
                      <BreedAction
                        ind={selected}
                        world={world}
                        shortcutsOn={shortcutsOn}
                        inBreeding={selected.id === mother?.id || selected.id === father?.id}
                        onToBreeding={() => toBreeding(selected)}
                      />
                      <ConfirmButton
                        label={`판매 ${sellPrice(selected, world).toLocaleString()}g`}
                        confirmLabel={`정말 ${sellPrice(selected, world).toLocaleString()}g에 팔까요?`}
                        disabledReason={selected.pregnancy ? '임신 중에는 팔 수 없습니다' : null}
                        onConfirm={() => sell(selected)}
                      />
                    </>
                  )
                }
              />
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

      {dragged && drag && (
        <div aria-hidden="true" className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" style={{ left: drag.x, top: drag.y }}>
          <Portrait ind={dragged} baby={!world.isAdult(dragged)} size={72} decorative />
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {world.day + 1}일차. {today}
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <ShortcutHelp open={helpOpen} enabled={shortcutsOn} onEnabledChange={setShortcuts} onClose={() => setHelpOpen(false)} />
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        {toast && <p className="max-w-[90vw] rounded-xl bg-ink px-4 py-2.5 text-sm text-white shadow-lg">{toast}</p>}
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

function ConfirmInline({ label, disabled, onConfirm }: { label: string; disabled: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      onBlur={() => setArmed(false)}
      className={`h-7 w-36 shrink-0 truncate rounded-md border text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        armed ? 'border-danger bg-danger text-white' : 'border-line bg-panel hover:border-accent'
      }`}
    >
      {armed ? '한 번 더 누르면 확정' : label}
    </button>
  );
}
