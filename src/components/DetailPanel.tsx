'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  BLOODLINES, BLOODLINE_IDS, CONFIG, SLOTS, STAT_NAMES, formatHouses, formatRace, geneticRace,
  type Individual, type World,
} from '@/engine';
import { SHOWN_STATS, STAT_MAX, shownStat, totalScore } from '@/game/game';
import { upkeepOf } from '@/game/economy';
import Portrait from './Portrait';
import { eyeColorName, hairName, skinName } from '@/game/colors';

interface Props {
  ind: Individual;
  world: World;
  actions?: ReactNode;
  onPedigree?: () => void;
  shortcutsOn?: boolean;
}

export default function DetailPanel({ ind, world, actions, onPedigree, shortcutsOn }: Props) {
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
          <p className="truncate text-sm text-mute">
            {ind.raceLabel} · {ind.generation}세대
          </p>
          <p className="h-4 truncate text-xs text-mute">
            {/* 농장에서 태어난 개체는 출신이 늘 이 농장이라, 좁은 머리줄에는 부모만 보인다 */}
            {ind.status === 'market'
              ? '마켓 매물'
              : ind.source === 'market'
                ? '마켓 출신'
                : `부모: ${mother?.name ?? '?'} × ${father?.name ?? '?'}`}
          </p>
          <p className="h-4 text-xs text-mute tabular-nums">하루 유지비 {upkeepOf(ind, world)}g</p>
        </div>
        {onPedigree && (
          <button
            type="button"
            onClick={onPedigree}
            aria-keyshortcuts={shortcutsOn ? 'P' : undefined}
            className="ml-auto flex h-8 w-16 shrink-0 items-center justify-center gap-1 self-start rounded-lg border border-line text-xs font-semibold hover:border-accent"
          >
            족보
            <kbd aria-hidden="true" className={`rounded border border-line px-1 font-sans text-[10px] ${shortcutsOn ? '' : 'invisible'}`}>
              P
            </kbd>
          </button>
        )}
      </header>

      {actions && <div className="flex flex-col gap-2">{actions}</div>}

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
                    <span className="w-20 text-right tabular-nums">
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
              <li className="mt-1 flex items-center gap-2 border-t border-line pt-2 text-sm">
                <span className="w-9 text-mute">{STAT_NAMES.mana}</span>
                <StatBar value={p.stats.mana} tone="mana" />
                <span className="w-20 text-right tabular-nums">
                  <b>{p.stats.mana.toFixed(1)}</b>
                  <span className="text-xs text-mute"> / 100</span>
                </span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-mute">
              능력치는 1~100, 종합 점수는 능력치 평균입니다. 마켓 개체는 50 안팎. 마력은 마법 혈통 수치라 종합에 들어가지 않습니다.
            </p>
          </section>

          <LineageSection ind={ind} world={world} />

          <section aria-labelledby="looks-title">
            <h3 id="looks-title" className="mb-1.5 text-sm font-semibold">외모</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              <Row label="머리색" value={hairName(p.hairColor)} />
              <Row label="눈색" value={eyeColorName(p)} />
              <Row label="피부" value={skinName(p)} />
              <Row label="머리 모양" value={p.hairStyle} />
              {SLOTS.map((s) => (
                <Row key={s.id} label={s.name} value={p.slots[s.id]} />
              ))}
              {p.morphs.length > 0 && <Row label="이형" value={p.morphs.join(', ')} />}
              {p.extraParts.wings && <Row label="날개" value={`${p.extraParts.wings.type} (${p.extraParts.wings.color})`} />}
              {p.extraParts.horns && <Row label="뿔" value={p.extraParts.horns.color} />}
              {p.extraParts.halo && <Row label="헤일로" value={p.extraParts.halo.color} />}
            </dl>
          </section>

          <section aria-labelledby="body-title">
            <h3 id="body-title" className="mb-1.5 text-sm font-semibold">신체</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              <Row label="체형" value={p.body.labels.length ? p.body.labels.join(' · ') : '보통'} />
              {CONFIG.sexTraitsEnabled && <Row label={p.sexTrait.name} value={p.sexTrait.label ?? '보통'} />}
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

          {ind.notes.length > 0 && <NotesSection ind={ind} />}

        </>
      )}
    </article>
  );
}

const TICKS = [25, 50, 75];

function StatBar({ value, tone = 'stat' }: { value: number; tone?: 'stat' | 'mana' }) {
  return (
    <span aria-hidden="true" className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[#ece5d8]">
      <span
        className={`block h-full rounded-full ${tone === 'mana' ? 'bg-[#3f7fb0]' : 'bg-accent'}`}
        style={{ width: `${(Math.min(value, STAT_MAX) / STAT_MAX) * 100}%` }}
      />
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

function LineageSection({ ind, world }: { ind: Individual; world: World }) {
  const p = ind.pheno;
  // 판매/사망한 개체는 유전자를 지우므로 실제 유전 %를 계산할 수 없다
  const hasGenome = Object.keys(ind.genome).length > 0;
  const nameOf = (id: string) => world.get(id)?.name ?? '?';
  const lines = BLOODLINE_IDS.filter((b) => p.bloodlines[b].expressed || ind.houses[b] || ind.foundedBloodlines.includes(b));
  const hiddenByAlbino = p.albino && CONFIG.albinoHidesBloodlineEffect && BLOODLINE_IDS.some((b) => p.bloodlines[b].expressed);

  return (
    <section aria-labelledby="lineage-title">
      <h3 id="lineage-title" className="mb-1.5 text-sm font-semibold">혈통</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <Row label="종족 분류" value={ind.raceLabel} />
        <Row label="계보" value={formatRace(ind.pedigreeRace)} />
        <Row label="실제 유전" value={hasGenome ? formatRace(geneticRace(ind.genome)) : undefined} />
      </dl>
      <p className="mt-1 text-xs text-mute">계보는 부모의 평균, 실제 유전은 물려받은 유전자를 센 값입니다.</p>

      <h4 className="mt-3 mb-1 text-xs font-semibold text-mute">특수 혈통</h4>
      {lines.length === 0 ? (
        <p className="text-sm text-mute">없음</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lines.map((b) => {
            const st = p.bloodlines[b];
            const houses = formatHouses(ind, b, nameOf);
            return (
              <li key={b} className="rounded-lg border border-line px-3 py-2 text-sm">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <b>{BLOODLINES[b].name} 혈통</b>
                  <span className={st.expressed ? 'text-ink' : 'text-mute'}>{st.expressed ? st.tierName : '미발현'}</span>
                  {st.expressed && <span className="text-xs text-mute tabular-nums">수치 {st.value.toFixed(1)}</span>}
                  {ind.foundedBloodlines.includes(b) && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">초대</span>
                  )}
                </p>
                {houses && <p className="mt-0.5 text-xs text-mute">{houses}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {p.combos.length > 0 && (
        <p className="mt-2 text-sm">
          <span className="text-mute">연계 혈통 </span>
          <b>{p.combos.join(', ')}</b>
        </p>
      )}

      {(p.tattoos.length > 0 || hiddenByAlbino) && (
        <>
          <h4 className="mt-3 mb-1 text-xs font-semibold text-mute">문신</h4>
          {hiddenByAlbino ? (
            <p className="text-sm text-mute">알비노라 혈통 문신이 나타나지 않습니다.</p>
          ) : (
            <ul className="flex flex-col gap-0.5 text-sm">
              {p.tattoos.map((t) => (
                <li key={t.source}>
                  <b>{t.pattern}</b>
                  <span className="text-mute">
                    {' '}
                    ({t.source}) · {t.areas.join(', ')} · 진하기 <span className="tabular-nums">{Math.round(t.opacity * 100)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

const NOTE_PREVIEW = 6;

function NotesSection({ ind }: { ind: Individual }) {
  const [all, setAll] = useState(false);
  const more = ind.notes.length > NOTE_PREVIEW;
  const shown = all ? ind.notes : ind.notes.slice(0, NOTE_PREVIEW);
  return (
    <section aria-labelledby="notes-title">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 id="notes-title" className="text-sm font-semibold">
          유전 메모 <span className="text-xs font-normal text-mute tabular-nums">{ind.notes.length}개</span>
        </h3>
        {more && (
          <button
            type="button"
            aria-expanded={all}
            aria-controls="notes-list"
            onClick={() => setAll((v) => !v)}
            className="h-7 w-24 rounded-lg border border-line text-xs font-semibold hover:border-accent"
          >
            {all ? '접기' : '전체 보기'}
          </button>
        )}
      </div>
      <ul id="notes-list" className="list-disc pl-5 text-sm text-mute">
        {shown.map((n, i) => (
          <li key={i}>{n.label}</li>
        ))}
      </ul>
    </section>
  );
}

export function BreedAction({
  ind,
  world,
  shortcutsOn,
  inBreeding,
  onToBreeding,
}: {
  ind: Individual;
  world: World;
  shortcutsOn: boolean;
  inBreeding: boolean;
  onToBreeding: () => void;
}) {
  if (!world.isAdult(ind)) return null;
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

/** 실수로 팔지 않게 두 번 눌러야 판다. 버튼 크기는 상태와 상관없이 같다 */
export function ConfirmButton({
  label,
  confirmLabel,
  disabledReason,
  tone = 'neutral',
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  disabledReason?: string | null;
  tone?: 'neutral' | 'accent';
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  const base = tone === 'accent' ? 'bg-accent text-white border-accent' : 'border-line text-ink hover:border-accent';
  return (
    <div>
      <button
        type="button"
        disabled={!!disabledReason}
        onClick={() => {
          if (armed) {
            setArmed(false);
            onConfirm();
          } else setArmed(true);
        }}
        onBlur={() => setArmed(false)}
        className={`h-10 w-full rounded-lg border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${armed ? 'border-danger bg-danger text-white' : base}`}
      >
        {armed ? confirmLabel : label}
      </button>
      <p className="mt-1 h-4 text-xs text-mute" aria-live="polite">
        {disabledReason ?? (armed ? '한 번 더 누르면 확정됩니다' : '')}
      </p>
    </div>
  );
}
