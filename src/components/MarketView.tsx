'use client';

import type { Individual, World } from '@/engine';
import { farmCount, totalScore, type GameState } from '@/game/game';
import { buyPrice } from '@/game/economy';
import { MARKET, offerList } from '@/game/market';
import Portrait from './Portrait';
import { raceRatio, raceRatioShort } from '@/game/race';

interface Props {
  world: World;
  state: GameState;
  selectedId: string | null;
  shortcutsOn: boolean;
  onSelect: (id: string) => void;
  onBuy: (id: string) => void;
  onRefresh: () => void;
}

export function rareLabels(ind: Individual): string[] {
  const out = [...ind.pheno.morphs];
  for (const [b, s] of Object.entries(ind.pheno.bloodlines)) {
    if (s.expressed) out.push(`${b === 'magic' ? '마법' : b === 'fire' ? '불' : '얼음'} 혈통`);
  }
  return out;
}

export function buyBlockReason(world: World, state: GameState, ind: Individual): string | null {
  if (state.gold < buyPrice(ind, world)) return '골드 부족';
  if (farmCount(world) >= state.farmSlots) return '농장 칸 꽉 참';
  return null;
}

export default function MarketView({ world, state, selectedId, shortcutsOn, onSelect, onBuy, onRefresh }: Props) {
  const offers = offerList(world, state.market);
  const left = MARKET.refreshesPerDay - (state.market.day === world.day ? state.market.refreshesUsed : 0);

  return (
    <section aria-labelledby="market-title" className="flex flex-col lg:min-h-0 lg:flex-1">
      <div className="mb-2 flex h-10 shrink-0 items-center gap-3">
        <h2 id="market-title" className="font-semibold">오늘의 매물</h2>
        <p className="min-w-0 flex-1 truncate text-sm text-mute">
          농장 <span className="tabular-nums">{farmCount(world)} / {state.farmSlots}</span> · 매일 새 매물이 들어옵니다
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={left <= 0}
          aria-keyshortcuts={shortcutsOn ? 'R' : undefined}
          className="flex h-9 w-44 items-center justify-center gap-2 rounded-lg border border-line bg-panel text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          새로고침 <span className="tabular-nums text-mute">남은 {left}회</span>
          <kbd aria-hidden="true" className={`rounded border border-line px-1.5 font-sans text-xs ${shortcutsOn ? '' : 'invisible'}`}>
            R
          </kbd>
        </button>
      </div>
      <ul className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
        {offers.map((ind, i) =>
          ind ? (
            <li key={ind.id} className="flex flex-col gap-2">
              <OfferCard ind={ind} selected={ind.id === selectedId} onSelect={() => onSelect(ind.id)} />
              <BuyButton ind={ind} world={world} state={state} onBuy={onBuy} />
            </li>
          ) : (
            <li key={`sold-${i}`} className="flex h-[252px] items-center justify-center rounded-xl border border-dashed border-line text-sm text-mute">
              팔림
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function OfferCard({ ind, selected, onSelect }: { ind: Individual; selected: boolean; onSelect: () => void }) {
  const female = ind.sex === 'F';
  const rare = rareLabels(ind);
  const traits = ind.pheno.traits;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex h-[220px] w-full flex-col items-center rounded-xl border bg-panel p-2.5 text-left ${
        selected ? 'border-accent ring-2 ring-accent/30' : rare.length ? 'border-gold/60' : 'border-line hover:border-accent/60'
      }`}
    >
      <Portrait ind={ind} size={104} decorative />
      <span className="mt-2 w-full">
        <span className="flex h-5 items-center gap-1">
          <span aria-hidden="true" className={`text-sm font-bold ${female ? 'text-female' : 'text-male'}`}>{female ? '♀' : '♂'}</span>
          <span className="truncate text-sm font-semibold">{ind.name}</span>
          <span className="sr-only">, {female ? '여성' : '남성'},</span>
        </span>
        <span className="flex h-4 items-center justify-between text-xs text-mute">
          <span className="truncate">{ind.raceLabel}</span>
          <span className="shrink-0 font-semibold tabular-nums text-ink">
            <span className="sr-only">, 종합 </span>
            {totalScore(ind)}점
          </span>
        </span>
        <span aria-hidden="true" className="block h-4 w-full truncate text-[11px] leading-4 tabular-nums text-mute">{raceRatioShort(ind)}</span>
        <span className="sr-only">, 혈통 {raceRatio(ind)}</span>
        <span className="mt-1 block h-8 text-[11px] leading-4">
          <span className="line-clamp-2">
            {rare.length > 0 && <b className="text-gold">{rare.join(' · ')} </b>}
            <span className="text-mute">{traits.length ? traits.map((t) => t.name).join(', ') : '트레잇 없음'}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

function BuyButton({ ind, world, state, onBuy }: { ind: Individual; world: World; state: GameState; onBuy: (id: string) => void }) {
  const price = buyPrice(ind, world);
  const reason = buyBlockReason(world, state, ind);
  return (
    <button
      type="button"
      onClick={() => onBuy(ind.id)}
      disabled={!!reason}
      className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-accent text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="sr-only">{ind.name} </span>
      <span className="tabular-nums">{price.toLocaleString()}g</span>
      <span>{reason ? `· ${reason}` : '구매'}</span>
    </button>
  );
}
