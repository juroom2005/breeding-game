'use client';

import { useState } from 'react';
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Portrait ind={ind} baby={!adult} size={120} />
        <div className="min-w-0">
          <p className={`text-sm font-bold ${ind.sex === 'F' ? 'text-female' : 'text-male'}`}>{ind.sex === 'F' ? '♀ 여성' : '♂ 남성'}</p>
          <h2 className="truncate text-2xl font-bold">{ind.name}</h2>
          <p className="text-sm text-mute">
            {ind.raceLabel} · {ind.generation}세대 · {ind.source === 'market' ? '마켓 출신' : `${state.farmName} 출신`}
          </p>
          {(mother || father) && (
            <p className="text-xs text-mute">
              부모: {mother?.name ?? '?'} × {father?.name ?? '?'}
            </p>
          )}
        </div>
      </div>

      {!adult ? (
        <div className="rounded-xl bg-[#efe9dd] p-4 text-sm text-mute">
          아기 단계입니다. <b className="text-ink">{world.daysUntilAdult(ind)}일 뒤</b> 성체가 되면 능력치와 외모가 공개됩니다.
        </div>
      ) : (
        <>
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">능력치</h3>
              <span className="text-sm">
                종합 <b className="text-lg">{totalScore(ind)}</b>
                <span className="text-xs text-mute"> / 80 (지능 추가 전)</span>
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {SHOWN_STATS.map((k) => {
                const v = shownStat(p.stats[k]);
                return (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <span className="w-9 text-mute">{STAT_NAMES[k]}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#ece5d8]">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(v / 20) * 100}%` }} />
                    </div>
                    <span className="w-6 text-right font-semibold tabular-nums">{v}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-sm text-mute">
                <span className="w-9">지능</span>
                <span className="text-xs">엔진 v0.7에서 추가 예정</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 text-sm font-semibold">외모</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              <dt className="text-mute">머리색</dt><dd>{p.hairColor}</dd>
              <dt className="text-mute">눈색</dt><dd>{p.eyeColor}</dd>
              <dt className="text-mute">피부</dt><dd>{p.skinToneName}</dd>
              {SLOTS.map((s) => (
                <FragmentRow key={s.id} label={s.name} value={p.slots[s.id]} />
              ))}
              {p.morphs.length > 0 && <FragmentRow label="이형" value={p.morphs.join(', ')} />}
            </dl>
          </section>

          <section>
            <h3 className="mb-1.5 text-sm font-semibold">트레잇</h3>
            {p.traits.length === 0 ? (
              <p className="text-sm text-mute">없음</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {p.traits.map((t) => (
                  <span
                    key={t.id}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.good ? 'bg-[#e4f3ea] text-[#24704a]' : 'bg-[#fbe7e7] text-[#a13030]'}`}
                  >
                    {t.name} · {t.tier}
                  </span>
                ))}
              </div>
            )}
          </section>

          {ind.notes.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-sm font-semibold">유전 메모</h3>
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
    </div>
  );
}

function FragmentRow({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-mute">{label}</dt>
      <dd>{value ?? '-'}</dd>
    </>
  );
}

function MatePanel({ ind, world, state, onMate }: Props) {
  const males = world.active().filter((x) => x.sex === 'M' && world.isAdult(x));
  const [picked, setPicked] = useState<string>('');
  const fatherId = males.some((m) => m.id === picked) ? picked : (males[0]?.id ?? '');
  const father = world.get(fatherId);

  if (ind.pregnancy) {
    return (
      <div className="rounded-xl border border-female/30 bg-[#fbeef3] p-3 text-sm">
        임신 중입니다. <b>{ind.pregnancy.dueDay - world.day}일 뒤</b> 출산 예정 (아빠: {world.get(ind.pregnancy.fatherId)?.name})
      </div>
    );
  }
  if (!males.length) return <p className="text-sm text-mute">교배할 수 있는 성체 수컷이 없습니다.</p>;

  const reason = father ? world.canMate(ind, father) : '상대를 고르세요';
  const roomFull = pregnantCount(world) >= state.pregnancyRoom;
  const chance = father && !reason ? Math.round(world.conceptionChance(ind, father) * 100) : null;
  const kin = father ? world.kinship(ind, father) : 0;

  return (
    <section className="rounded-xl border border-line bg-white p-3">
      <h3 className="mb-2 text-sm font-semibold">교배</h3>
      <select
        value={fatherId}
        onChange={(e) => setPicked(e.target.value)}
        className="w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
      >
        {males.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · {m.raceLabel} · {totalScore(m)}점
          </option>
        ))}
      </select>
      <div className="mt-2 text-xs text-mute">
        {chance !== null && <>수정 확률 {chance}%</>}
        {kin > 0 && <span className="ml-2 text-[#a13030]">근친 계수 {(kin * 100).toFixed(1)}%</span>}
      </div>
      <button
        disabled={!!reason || roomFull}
        onClick={() => onMate(ind.id, fatherId)}
        className="mt-2 w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        교배 시도
      </button>
      {(reason || roomFull) && <p className="mt-1.5 text-xs text-mute">{roomFull ? `임신실이 꽉 찼습니다 (${state.pregnancyRoom}칸)` : reason}</p>}
    </section>
  );
}
