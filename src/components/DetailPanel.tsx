'use client';

import { SLOTS, STAT_NAMES, type Individual, type World } from '@/engine';
import { SHOWN_STATS, STAT_MAX, shownStat, totalScore, type GameState } from '@/game/game';
import Portrait from './Portrait';

interface Props {
  ind: Individual;
  world: World;
  state: GameState;
  shortcutsOn: boolean;
  inBreeding: boolean;
  onToBreeding: () => void;
}

export default function DetailPanel({ ind, world, state, shortcutsOn, inBreeding, onToBreeding }: Props) {
  const adult = world.isAdult(ind);
  const p = ind.pheno;
  const mother = world.get(ind.motherId);
  const father = world.get(ind.fatherId);

  return (
    <article aria-labelledby="detail-name" className="flex flex-col gap-5">
      <header className="flex items-center gap-4">
        <div className="size-[120px] shrink-0">
          <Portrait ind={ind} baby={!adult} size={120} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${ind.sex === 'F' ? 'text-female' : 'text-male'}`}>
            <span aria-hidden="true">{ind.sex === 'F' ? '♀ ' : '♂ '}</span>
            {ind.sex === 'F' ? '여성' : '남성'}
          </p>
          <h2 id="detail-name" className="truncate text-2xl font-bold">{ind.name}</h2>
          <p className="text-sm text-mute">
            {ind.raceLabel} · {ind.generation}세대 · {ind.source === 'market' ? '마켓 출신' : `${state.farmName} 출신`}
          </p>
          <p className="h-4 text-xs text-mute">{(mother || father) && `부모: ${mother?.name ?? '?'} × ${father?.name ?? '?'}`}</p>
        </div>
      </header>

      {!adult ? (
        <p className="rounded-xl bg-[#efe9dd] p-4 text-sm text-mute">
          아기 단계입니다. <b className="text-ink">{world.daysUntilAdult(ind)}일 뒤</b> 성체가 되면 능력치와 외모가 공개됩니다.
        </p>
      ) : (
        <>
          <section aria-labelledby="stats-title">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 id="stats-title" className="text-sm font-semibold">능력치</h3>
              <p className="text-sm">
                종합 <b className="text-lg tabular-nums">{totalScore(ind)}</b>
                <span className="text-xs text-mute"> / 100</span>
              </p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {SHOWN_STATS.map((k) => {
                const v = shownStat(p.stats[k]);
                return (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    <span className="w-9 text-mute">{STAT_NAMES[k]}</span>
                    <StatBar value={v} />
                    <span className="w-16 text-right tabular-nums">
                      <b>{v}</b>
                      <span className="text-xs text-mute"> / 100</span>
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center gap-2 text-sm text-mute">
                <span className="w-9">지능</span>
                <span className="text-xs">엔진 v0.7에서 추가 예정</span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-mute">능력치는 1~100, 종합 점수는 능력치 평균입니다. 마켓 개체는 50 안팎.</p>
          </section>

          <section aria-labelledby="looks-title">
            <h3 id="looks-title" className="mb-1.5 text-sm font-semibold">외모</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              <Row label="머리색" value={p.hairColor} />
              <Row label="눈색" value={p.eyeColor} />
              <Row label="피부" value={p.skinToneName} />
              {SLOTS.map((s) => (
                <Row key={s.id} label={s.name} value={p.slots[s.id]} />
              ))}
              {p.morphs.length > 0 && <Row label="이형" value={p.morphs.join(', ')} />}
            </dl>
          </section>

          <section aria-labelledby="traits-title">
            <h3 id="traits-title" className="mb-1.5 text-sm font-semibold">트레잇</h3>
            {p.traits.length === 0 ? (
              <p className="text-sm text-mute">없음</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {p.traits.map((t) => (
                  <li
                    key={t.id}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.good ? 'bg-[#e4f3ea] text-[#24704a]' : 'bg-danger-soft text-danger'}`}
                  >
                    {t.name} · {t.tier}
                    <span className="sr-only">{t.good ? ' (좋은 트레잇)' : ' (나쁜 트레잇)'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {ind.notes.length > 0 && (
            <section aria-labelledby="notes-title">
              <h3 id="notes-title" className="mb-1.5 text-sm font-semibold">유전 메모</h3>
              <ul className="list-disc pl-5 text-sm text-mute">
                {ind.notes.slice(0, 6).map((n, i) => (
                  <li key={i}>{n.label}</li>
                ))}
              </ul>
            </section>
          )}

          <BreedAction ind={ind} world={world} shortcutsOn={shortcutsOn} inBreeding={inBreeding} onToBreeding={onToBreeding} />
        </>
      )}
    </article>
  );
}

const TICKS = [25, 50, 75];

function StatBar({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[#ece5d8]">
      <span className="block h-full rounded-full bg-accent" style={{ width: `${(value / STAT_MAX) * 100}%` }} />
      {TICKS.map((t) => (
        <span key={t} className="absolute top-0 h-full w-px bg-white/70" style={{ left: `${(t / STAT_MAX) * 100}%` }} />
      ))}
    </span>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-mute">{label}</dt>
      <dd>{value ?? '-'}</dd>
    </>
  );
}

function BreedAction({
  ind,
  world,
  shortcutsOn,
  inBreeding,
  onToBreeding,
}: Pick<Props, 'ind' | 'world' | 'shortcutsOn' | 'inBreeding' | 'onToBreeding'>) {
  if (ind.pregnancy) {
    return (
      <p className="rounded-xl border border-female/30 bg-[#fbeef3] p-3 text-sm">
        임신 중입니다. <b>{ind.pregnancy.dueDay - world.day}일 뒤</b> 출산 예정 (아빠: {world.get(ind.pregnancy.fatherId)?.name})
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={onToBreeding}
      disabled={inBreeding}
      aria-keyshortcuts={shortcutsOn ? 'E' : undefined}
      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-female/50 text-sm font-semibold text-female hover:bg-[#fbeef3] disabled:cursor-default disabled:opacity-60"
    >
      {inBreeding ? '교배 칸에 올라가 있음' : '교배 칸에 올리기'}
      <kbd aria-hidden="true" className={`rounded border border-female/30 px-1.5 font-sans text-xs ${shortcutsOn && !inBreeding ? '' : 'invisible'}`}>
        E
      </kbd>
    </button>
  );
}
