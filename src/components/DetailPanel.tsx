'use client';

import { useId, useState } from 'react';
import { SLOTS, STAT_NAMES, type Individual, type World } from '@/engine';
import { SHOWN_STATS, pregnantCount, shownStat, totalScore, type GameState } from '@/game/game';
import Portrait from './Portrait';

interface Props {
  ind: Individual;
  world: World;
  state: GameState;
  onMate: (motherId: string, fatherId: string) => void;
}

export default function DetailPanel({ ind, world, state, onMate }: Props) {
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
                <span className="text-xs text-mute"> / 80 (지능 추가 전)</span>
              </p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {SHOWN_STATS.map((k) => {
                const v = shownStat(p.stats[k]);
                return (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    <span className="w-9 text-mute">{STAT_NAMES[k]}</span>
                    <span aria-hidden="true" className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#ece5d8]">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(v / 20) * 100}%` }} />
                    </span>
                    <span className="w-12 text-right font-semibold tabular-nums">
                      {v}
                      <span className="sr-only"> / 20</span>
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center gap-2 text-sm text-mute">
                <span className="w-9">지능</span>
                <span className="text-xs">엔진 v0.7에서 추가 예정</span>
              </li>
            </ul>
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

          {ind.sex === 'F' && <MatePanel ind={ind} world={world} state={state} onMate={onMate} />}
        </>
      )}
    </article>
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

function MatePanel({ ind, world, state, onMate }: Props) {
  const selectId = useId();
  const hintId = useId();
  const males = world.active().filter((x) => x.sex === 'M' && world.isAdult(x));
  const [picked, setPicked] = useState('');
  const fatherId = males.some((m) => m.id === picked) ? picked : (males[0]?.id ?? '');
  const father = world.get(fatherId);

  if (ind.pregnancy) {
    return (
      <p className="rounded-xl border border-female/30 bg-[#fbeef3] p-3 text-sm">
        임신 중입니다. <b>{ind.pregnancy.dueDay - world.day}일 뒤</b> 출산 예정 (아빠: {world.get(ind.pregnancy.fatherId)?.name})
      </p>
    );
  }
  if (!males.length) return <p className="text-sm text-mute">교배할 수 있는 성체 수컷이 없습니다.</p>;

  const roomFull = pregnantCount(world) >= state.pregnancyRoom;
  const reason = roomFull ? `임신실이 꽉 찼습니다 (${state.pregnancyRoom}칸)` : father ? world.canMate(ind, father) : '상대를 고르세요';
  const chance = father && !reason ? Math.round(world.conceptionChance(ind, father) * 100) : null;
  const kin = father ? world.kinship(ind, father) : 0;

  return (
    <section aria-labelledby="mate-title" className="rounded-xl border border-line bg-white p-3">
      <h3 id="mate-title" className="mb-2 text-sm font-semibold">교배</h3>
      <label htmlFor={selectId} className="sr-only">교배 상대</label>
      <select
        id={selectId}
        value={fatherId}
        onChange={(e) => setPicked(e.target.value)}
        className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm"
      >
        {males.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · {m.raceLabel} · {totalScore(m)}점
          </option>
        ))}
      </select>
      <p className="mt-2 h-4 text-xs text-mute">
        {chance !== null && `수정 확률 ${chance}%`}
        {kin > 0 && <span className="ml-2 text-danger">근친 계수 {(kin * 100).toFixed(1)}%</span>}
      </p>
      <button
        type="button"
        disabled={!!reason}
        aria-describedby={hintId}
        onClick={() => onMate(ind.id, fatherId)}
        className="mt-2 h-10 w-full rounded-lg bg-accent text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        교배 시도
      </button>
      <p id={hintId} className="mt-1.5 min-h-8 text-xs text-mute">{reason ?? ''}</p>
    </section>
  );
}
